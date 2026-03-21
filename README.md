# Noita Wand Exhaustion Analytics
🔗 **[在线查询工具 (Live Tool)](https://asmallhamis.github.io/BURST_8-DIVIDE_10-DIVIDE_3-ADD_TRIGGER-DIVIDE_4-DIVIDE_2-TAU-FLY_DOWNWARDS/)**

本项目是一个针对游戏 *Noita*（女巫）中特定法术排列组合的全量穷举与查询工具。通过模拟引擎，我们计算了数百万种可能的魔杖配置与其产出的法术总量。

## 项目特性
- **海量数据**：涵盖 768 万种魔杖组合（1-8 槽位）。
- **极速查询**：采用“物理分片”技术，在不依赖后端服务器的情况下实现毫秒级数据检索。
- **最简优先**：查询结果自动按法术数量排序，帮助玩家找到最高效的魔杖配置。

## 数据组成
- **法术池**：包含 `BURST_8`, `DIVIDE_10`, `DIVIDE_3`, `ADD_TRIGGER`, `DIVIDE_4`, `DIVIDE_2`, `TAU`, `FLY_DOWNWARDS`。
- **模拟范围**：1 到 8 个魔杖槽位的所有排列。

## 关于法术回绕 (Spell Wrap)
在查询结果中，出现 `BURST_8` 的配置可能触发了 **法术回绕** 机制。
- **可能性**：并不是所有包含 `BURST_8` 的配方都会回绕。但通常排名靠前（长度较短）且含有 `BURST_8` 的配方大概率利用了回绕。
- **示例**：配置 `BURST_8, DIVIDE_2, DIVIDE_10, DIVIDE_2, DIVIDE_4, FLY_DOWNWARDS` 是一个成功触发回绕的典型案例。
  ![Spell Wrap Example](./assets/spell_wrap_example.png)

## 如何本地运行
1.  进入项目目录。
2.  启动任意 HTTP 服务（例如 `python -m http.server 18000`）。
3.  通过浏览器访问相应端口即可进行交互式查询。

## 部署说明
本项目设计初衷即为适配 GitHub Pages 等静态托管平台。只需将全量文件上传，即可零成本运行。
您也可以直接访问：[在线查询地址](https://asmallhamis.github.io/BURST_8-DIVIDE_10-DIVIDE_3-ADD_TRIGGER-DIVIDE_4-DIVIDE_2-TAU-FLY_DOWNWARDS/)

---

# Noita Wand Exhaustion Analytics (EN)
🔗 **[Live Tool (在线查询工具)](https://asmallhamis.github.io/BURST_8-DIVIDE_10-DIVIDE_3-ADD_TRIGGER-DIVIDE_4-DIVIDE_2-TAU-FLY_DOWNWARDS/)**

This project is an exhaustive enumeration and query tool for specific wand spell combinations in the game *Noita*. Using an emulation engine, we have calculated millions of potential wand configurations and their total spell output.

## Features
- **Massive Data**: Covers 7.68 million wand combinations (1-8 slots).
- **Instant Query**: Uses "physical sharding" technology to achieve millisecond-level data retrieval without a backend server.
- **Efficiency First**: Query results are automatically sorted by spell count, helping players find the most efficient wand configurations.

## Data Composition
- **Spell Pool**: Includes `BURST_8`, `DIVIDE_10`, `DIVIDE_3`, `ADD_TRIGGER`, `DIVIDE_4`, `DIVIDE_2`, `TAU`, `FLY_DOWNWARDS`.
- **Simulation Range**: All permutations for 1 to 8 wand slots.

## About Spell Wrap
Configurations featuring `BURST_8` may utilize the **Spell Wrap** mechanism.
- **Possibility**: Not all recipes involving `BURST_8` wrap. However, shorter recipes containing `BURST_8` appearing early in search results are highly likely to have utilized wrapping.
- **Example**: The sequence `BURST_8, DIVIDE_2, DIVIDE_10, DIVIDE_2, DIVIDE_4, FLY_DOWNWARDS` is a verified successful wrap.
  ![Spell Wrap Example](./assets/spell_wrap_example.png)

## How to Run Locally
1. Enter the project directory.
2. Start any HTTP server (e.g., `python -m http.server 18000`).
3. Access the corresponding port through a browser for interactive queries.

## Deployment
This project is designed for static hosting platforms like GitHub Pages. Simply upload all files to run at zero cost.
Live URL: [https://asmallhamis.github.io/...](https://asmallhamis.github.io/BURST_8-DIVIDE_10-DIVIDE_3-ADD_TRIGGER-DIVIDE_4-DIVIDE_2-TAU-FLY_DOWNWARDS/)

---
## 致谢与致敬 (Credits)
核心枚举逻辑基于 [NathanSnail/wand_eval_tree](https://github.com/NathanSnail/wand_eval_tree) 开发。感谢其为 Noita 社区提供的高效模拟工具。
The core enumeration logic is based on [NathanSnail/wand_eval_tree](https://github.com/NathanSnail/wand_eval_tree). Thanks to the author for providing this efficient simulation tool to the Noita community.

## 许可协议 (License)
本项目及所使用的核心引擎均遵循 **GPL-3.0** 开源协议。
Both this project and its core engine follow the **GPL-3.0** open-source license.
详细条款请参阅 [LICENSE](LICENSE) 文件。 See the [LICENSE](LICENSE) file for details.
