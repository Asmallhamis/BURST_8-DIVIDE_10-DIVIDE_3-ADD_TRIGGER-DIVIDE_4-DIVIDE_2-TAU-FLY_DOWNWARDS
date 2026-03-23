# A/D Source Notes for `wand_eval_tree`
A=Action / D=Draw
## 背景

本笔记用于记录 `wand_eval_tree` 中法术节点 `A / D` 来源标记的研究结论、当前实现方式、已知局限，以及未来若出现误判时的排查与扩展方向。

目标不是完整复刻参考项目内部所有实现细节，而是：

- 尽量贴近 `noita-wand-simulator-master` 的 A/D 语义
- 在当前 `wand_eval_tree` 架构下，以较小改动实现稳定可用的节点来源标记
- 为将来出现边缘案例时提供可追溯的设计说明

---

## 参考项目的真实语义

参考项目 `noita-wand-simulator-master` 中，A/D 不是 UI 猜测，也不是节点事后推断，而是 evaluator 在“每次 action 调用”时显式传入的 source。

关键点：

### 1. `ActionSource` 是显式枚举

`src/app/calc/eval/types.ts`

```ts
export enum ActionSource {
  DRAW = 'draw',
  ACTION = 'action',
  PERK = 'perk',
  MULTIPLE = 'multiple',
}
```

### 2. 通过抽牌流程执行的 action 被标为 `DRAW`

`src/app/calc/gun.ts`

```ts
function play_action(action: Action) {
  ...
  set_current_action(action);
  call_action(ActionSource.DRAW, action, c);
  ...
}
```

并且 `draw_action()` 中从 deck 抽出 action 后调用 `play_action(action)`。

因此：

- 裸抽
- 多重抽牌
- trigger 里的 draw_shot / create_shot 继续抽牌
- 其他所有“从牌堆抽出来再执行”的情况

都属于 `D`。

### 3. direct invoke 被标为 `ACTION`

参考项目自动生成的法术逻辑中，大量存在：

```ts
call_action(ActionSource.ACTION, data, c, ...)
```

典型场景包括：

- Gamma / Greek letters
- Duplicate / copy 类逻辑
- Divide / recursion / recursive invoke
- 其他 action 内部直接调用另一 action 的情况

因此：

- `D` = 这一次 action 调用来自 draw 流程
- `A` = 这一次 action 调用来自 action 内部的 direct invoke

注意：

> A/D 是“每个节点对应那一次调用的来源标签”，不是牌本身属性，也不是整段上下文统一继承。

---

## `wand_eval_tree` 中的关键现实约束

`wand_eval_tree` 使用的是 Lua 侧 `gun.lua` + `fake_engine.lua` 包装，而不是参考项目那种显式的：

```ts
call_action(source, action, ...)
```

原版 `gun.lua` 的调用形式是：

```lua
play_action(action)
  -> set_current_action(action)
  -> action.action()
```

也就是说，Lua 原始主流程本身并没有现成的 source 参数。

因此在 `wand_eval_tree` 中要做 A/D，只能自己建立“调用来源传递机制”。

---

## 对 `gun.lua` 的研究结论

### 1. `D` 的统一主入口是 `play_action(action)`

在 `noitadata/data/scripts/gun/gun.lua` 中：

```lua
function draw_action( instant_reload_if_empty )
    ...
    if action ~= nil then
        play_action( action )
    end
end
```

```lua
function play_action( action )
    ...
    set_current_action( action )
    action.action()
    ...
end
```

因此所有标准 draw-based 执行最终都会经过：

- `draw_action -> play_action`

### 2. trigger 抽牌链也回到 `play_action`

`gun.lua` 中的 trigger 逻辑：

```lua
add_projectile_trigger_timer(...)
    draw_shot( create_shot( action_draw_count ), true )

add_projectile_trigger_hit_world(...)
    draw_shot( create_shot( action_draw_count ), true )

add_projectile_trigger_death(...)
    draw_shot( create_shot( action_draw_count ), true )
```

而 `draw_shot()` 内部继续走：

- `draw_actions`
- `draw_action`
- `play_action`

因此：

- 普通抽牌
- 多重抽牌
- trigger payload 抽牌

都属于同一条 draw 主链。

### 3. `_play_permanent_card()` 也会走 `play_action`

`gun.lua` 中：

```lua
function _play_permanent_card(action_id)
    ...
    play_action( action_clone )
end
```

这意味着：

- `play_action` 虽然是 draw 主入口
- 但也混入了少量“系统级直接执行”的入口（例如 permanent / always cast）

当前实现中，这类调用会被归为 `draw`。这在现阶段是一个可接受的近似，但需要被记录为已知限制。

---

## 当前实现（第一阶段最小骨架）

### 实现目标

先建立一个稳定、简单、容易验证的最小版本：

- 明确把 draw 主流程标成 `draw`
- 其余调用先默认落成 `action`
- 不做 `deck_index` 等不可靠推断

### 已做修改

#### 1. 在 `fake_engine.lua` hook `play_action`

进入 `play_action(action)` 时：

- 设置 `M.pending_source = "draw"`
- 然后调用原始 `play_action`

作用：

- 普通抽牌
- 多重抽牌
- trigger 里的 draw 抽牌链

在进入 `action.action()` 包装层前，都能显式带上 `draw`。

#### 2. 在节点创建包装层读取并写入 `source`

`fake_engine.lua` 中，所有 action 都会被统一包装：

```lua
v.action = function(clone, ...)
    local new = function(...)
        local new_node = { ... }
        local res = { _a(...) }
        ...
    end
end
```

这里是每个树节点的真实创建点。

当前实现改为：

- 创建节点前读取 `M.pending_source or "action"`
- 读取后清空 `M.pending_source`
- 将其写入 `new_node.source`

因此：

- 来自 `play_action` 的调用 → `source = "draw"`
- 其他未显式设置来源的调用 → `source = "action"`

#### 3. 在 `renderer.lua` 的 JSON 输出中加入 `source`

当前 JSON 树节点中会包含：

```json
"source": "draw"
```

或

```json
"source": "action"
```

方便前端显示与调试。

---

## 为什么当前实现目前可用

虽然当前没有做第二阶段“所有 direct invoke 显式包装”，但这版实现已经在主干上足够接近参考项目语义。

原因是：

### 1. draw 主流程在 `gun.lua` 中高度统一

绝大多数 `D` 情况最终都会走 `play_action(action)`。

### 2. direct invoke 通常会绕过 `play_action`

大量复制/递归/Greek/Gamma/Divide 一类逻辑，本质上是 action 内部直接调用另一 action，而不是再经过 deck draw。

因此在当前结构下：

- 显式命中 `play_action` 的 → `draw`
- 没命中 `play_action` 的 → 默认 `action`

对于当前大部分原版/生成法术场景，通常就已经是正确或接近正确的。

### 3. 初步测试结果正常

当前版本已做初步人工测试，未观察到明显错误，说明这套最小骨架至少在现有重点例子上是成立的。

---

## 为什么没有采用 `deck_index => draw/action` 推断

此前尝试过一种错误思路：

```lua
clone.deck_index ~= nil => draw
否则 => action
```

这个方案已放弃，原因如下：

### 1. `deck_index` 是牌对象属性，不是调用来源

`deck_index` 表示这张牌在牌组中的位置，不表示这一次调用是 draw 还是 direct invoke。

### 2. direct invoke 的目标 action 也可能带 `deck_index`

例如 action 从 hand / deck 中取到某张牌后直接：

```lua
v.action(rec)
```

此时 `v` 依然可能带 `deck_index`，但它的语义应是 `action`，而不是 `draw`。

### 3. 会误判你最关心的场景

例如：

- Gamma
- Duplicate
- Divide
- 递归直接调用

都可能被错误标成 `draw`。

因此当前版本改为：

> 只接受“显式入口设置 source”，不再接受“根据 action 对象字段猜 source”。

---

## 已知局限 / 风险

这部分是未来出现问题时最应该回来看的一段。

### 1. 当前 `action` 仍然是默认兜底，不是所有 direct invoke 都显式包装

也就是说当前模型是：

- `play_action` 显式标 `draw`
- 其余默认算 `action`

这在大多数情况下可用，但严格来说仍不是参考项目那种：

```ts
call_action(ActionSource.ACTION, ...)
```

的完全等价实现。

### 2. `_play_permanent_card()` 当前会落成 `draw`

因为它内部也调用了 `play_action(action_clone)`。

这在当前版本中是接受的近似，但如果未来你希望更细分 always cast / permanent card 的来源语义，这里可能需要调整。

### 3. 若未来接入更复杂的 evaluator 特殊调用，默认 `action` 可能过粗

如果将来出现：

- 新的系统级 action 执行入口
- 绕开 `play_action` 且不属于 direct invoke 的特殊流程
- 更复杂的第三方 mod 执行方式

那么当前“非 draw 即 action”的模型可能会不够精细。

### 4. 当前目标是“接近参考项目语义”，不是“内部机制完全一致”

当前方案优先保证：

- 结果稳定
- 主干正确
- 改动小
- 好维护

而不是在实现手段上 100% 模仿 TS evaluator。

---

## 如果未来出现误判，优先怎么排查

建议按下面顺序排查：

### 步骤 1：先判断该节点是否经过 `play_action`

如果该节点对应的 action 执行来自：

- `draw_action`
- `draw_actions`
- `draw_shot`
- trigger draw

那么理论上它应该命中 `play_action`，并标为 `draw`。

若没有，则优先检查：

- `play_action` hook 是否被绕过
- 节点创建前 `M.pending_source` 是否被覆盖或清空

### 步骤 2：若不是 `play_action` 进来的，检查它是否属于 direct invoke

例如：

- `v.action(...)`
- `data.action(...)`
- `data1.action(...)`
- `data2.action(...)`

如果是，则当前版本通常会默认落成 `action`。

### 步骤 3：若发现某类 direct invoke 或系统调用被误标

可以进入第二阶段方案：

- 引入统一包装函数，例如：

```lua
twwe_call_action("action", action_ref, ...)
```

- 在 generated Lua 的 direct invoke 调用点统一改写：

```lua
data.action(...)
```

改成：

```lua
twwe_call_action("action", data, ...)
```

这样可以把当前“默认 action”升级成“显式 action”。

---

## 第二阶段预案（目前未实施）

如果将来需要把实现做得更接近参考项目，可考虑第二阶段。

### 目标

不再满足于：

- `draw` 显式设置
- 其余默认 `action`

而是进一步做到：

- `draw` 显式设置
- `direct invoke` 也显式设置 `action`

### 可能方案

#### 方案方向

建立统一包装函数：

```lua
twwe_call_action(source, action_ref, ...)
```

由它负责：

- 设置本次调用来源
- 调用真实 `action.action(...)`
- 让节点创建包装层读取到 source

#### `draw` 路径

仍然在 `play_action` 中设置：

```lua
source = "draw"
```

#### `action` 路径

将 generated Lua 中的 direct invoke 统一改写，例如：

```lua
v.action(rec)
data.action(rec)
```

改写为：

```lua
twwe_call_action("action", v, rec)
twwe_call_action("action", data, rec)
```

### 何时值得做第二阶段

仅当满足以下任一情况时才建议继续做：

- 已观察到实际误判
- 希望进一步精确区分系统级来源
- 需要尽可能接近参考项目的显式调用语义
- 当前默认 `action` 的近似已不足以支撑新需求

若当前测试稳定，则不建议为了理论完美而提前做第二阶段。

---

## 当前结论

### 当前版本的定位

当前实现不是最终极版本，但已经是：

- 简单
- 可解释
- 主干正确
- 初测有效
- 风险可控

的一个稳定近似方案。

### 实用判断

如果当前没有测出问题：

> 可以先不做第二阶段，保留现状，并通过本文档记录设计意图与未来扩展路径。

这通常比继续修改更稳。

---

## 维护建议

未来如果再次调整 A/D 机制，建议同时更新本文档中的以下部分：

- “当前实现”
- “已知局限 / 风险”
- “如果未来出现误判，优先怎么排查”
- “第二阶段预案”

这样可以保证后续修改不会再次回到“靠 deck_index 猜 source”的错误方向。
