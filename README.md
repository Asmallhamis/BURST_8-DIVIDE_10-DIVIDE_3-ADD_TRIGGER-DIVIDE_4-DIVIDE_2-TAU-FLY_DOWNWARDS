# Noita Wand Exhaustion Analytics

本项目是一个针对游戏 *Noita*（女巫）中特定魔杖排列组合的全量穷举与查询工具。通过模拟引擎，我们计算了数百万种可能的魔杖配置与其产出的法术总量。

## 项目特性
- **海量数据**：涵盖 768 万种魔杖组合（1-8 槽位）。
- **极速查询**：采用“物理分片”技术，在不依赖后端服务器的情况下实现毫秒级数据检索。
- **最简优先**：查询结果自动按法术数量排序，帮助玩家找到最高效的魔杖配置。

## 数据组成
- **法术池**：包含 `BURST_8`, `DIVIDE_10`, `DIVIDE_3`, `ADD_TRIGGER`, `DIVIDE_4`, `DIVIDE_2`, `TAU`, `FLY_DOWNWARDS`。
- **模拟范围**：1 到 8 个魔杖槽位的所有排列。

## 如何本地运行
1.  进入项目目录。
2.  启动任意 HTTP 服务（例如 `python -m http.server 18000`）。
3.  通过浏览器访问相应端口即可进行交互式查询。

## 部署说明
本项目设计初衷即为适配 GitHub Pages 等静态托管平台。只需将全量文件上传，即可零成本运行。

---
## 致谢与致敬 (Credits)
核心枚举逻辑基于 [NathanSnail/wand_eval_tree](https://github.com/NathanSnail/wand_eval_tree) 开发。感谢其为 Noita 社区提供的高效模拟工具。

## 许可协议 (License)
本项目及所使用的核心引擎均遵循 **GPL-3.0** 开源协议。
详细条款请参阅 [LICENSE](LICENSE) 文件。
