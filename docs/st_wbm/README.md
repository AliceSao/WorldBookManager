# WorldBook Manager v1.0

  > SillyTavern 世界书管理器 — 双面板 Web UI + ST 扩展注入 + 后端插件

  ---

  ## 项目组成

  | 组件 | 路径 | 功能 |
  |------|------|------|
  | **ST-WBM-UI** | `ST-WBM-UI/` | SillyTavern 前端扩展：注入面板 + 23条斜杠命令 |
  | **ST-WBM-Server** | `server/ST-WBM-Server/` | Node.js 后端插件：REST API + Web UI 静态服务 |
  | **Web UI** | `server/ST-WBM-Server/web/dist/` | Vue 3 双面板管理界面（已编译） |

  Python CLI 工具（`src/` 目录）**保持不变**，与 v1.0 重构无关。

  ---

  ## 快速安装

  ### 1. 安装后端插件

  ```bash
  cp -r server/ST-WBM-Server <SillyTavern根目录>/plugins/wb-manager
  # 无需 npm install，dist/ 已包含编译后的 JS
  ```

  ### 2. 安装前端扩展

  ```bash
  cp -r ST-WBM-UI <ST数据目录>/extensions/third-party/ST-WBM-UI
  ```

  然后在 SillyTavern → 扩展 → 启用 **WorldBook Manager**。

  ### 3. 安装 JS-Slash-Runner（推荐）

  前往 ST 扩展市场安装 **JS-Slash-Runner**，以启用 23 条斜杠命令功能。

  ---

  ## Web UI 访问

  打开浏览器访问：`http://localhost:8000/api/plugins/wb-manager/ui/`

  或在 SillyTavern 扩展面板中点击 **📖 打开管理面板**。

  ---

  ## 斜杠命令（共 23 条）

  | 命令 | 功能 |
  |------|------|
  | `/wb-list` | 列出所有世界书 |
  | `/wb-info <名称>` | 查看世界书统计 |
  | `/wb-search name=<名> q=<词>` | 搜索条目 |
  | `/wb-constants <名称>` | 列出常量条目 |
  | `/wb-new <名称>` | 创建世界书 |
  | `/wb-new-entry name=<名> [title=<标>]` | 创建条目 |
  | `/wb-del-entry name=<名> uid=<UID>` | 删除条目 |
  | `/wb-export <名称>` | 下载世界书 JSON |
  | `/wb-copy from=<源> to=<目标> [uids=...]` | 跨世界书复制条目（拆分/合并） |
  | `/wb-set-strategy name=<名> strategy=constant|selective|vectorized` | 批量设置激活策略 |
  | `/wb-set-position name=<名> pos=bc|ac|be|ae|ad|bn|an` | 批量设置插入位置 |
  | `/wb-set-order name=<名> order=<数值>` | 批量设置 Order |
  | `/wb-set-depth name=<名> depth=<数值>` | 批量设置深度 |
  | `/wb-set-prob name=<名> prob=<0-100>` | 批量设置触发概率 |
  | `/wb-set-name name=<名> title=<新标题>` | 批量重命名条目 |
  | `/wb-add-keys name=<名> keys=<词1,词2>` | 批量添加关键字 |
  | `/wb-set-keys name=<名> keys=<词1,词2>` | 批量替换关键字 |
  | `/wb-clear-keys name=<名>` | 批量清空关键字 |
  | `/wb-set-recursion name=<名> [pi=true|false] [po=true|false]` | 批量设置递归控制 |
  | `/wb-set-effect name=<名> [sticky=n] [cooldown=n] [delay=n]` | 批量设置效果 |
  | `/wb-enable name=<名> [enabled=true|false]` | 批量启用/禁用 |
  | `/wb-ui` | 打开双面板管理界面 |
  | `/wb-help` | 显示命令帮助 |

  所有批量命令支持 `uids=0,1,2` 参数（逗号分隔 UID 列表），省略则对全部条目生效。

  ---

  ## 独立仓库

组件已拆分为独立仓库，可单独安装：

| 仓库 | 地址 | 说明 |
|------|------|------|
| **ST-WBM-UI** | [github.com/AliceSao/ST-WBM-UI](https://github.com/AliceSao/ST-WBM-UI) | 前端扩展（index.js + Vue 3 源代码） |
| **ST-WBM-Server** | [github.com/AliceSao/ST-WBM-Server](https://github.com/AliceSao/ST-WBM-Server) | 后端插件（dist/ 已编译，无需 npm install） |

---

## 文档

  - [安装指南](INSTALL.md)
  - [后端 REST API](API.md)
  - [Web UI 使用指南](WEBUI.md)
  - [扩展命令参考](EXTENSION.md)
  - [更新日志](CHANGELOG.md)

  ### 命令详细参考（ST-WBM）

  - [CMD_01 — 查询命令](CMD_01_QUERY.md)（/wb-list、/wb-info、/wb-search、/wb-constants）
  - [CMD_02 — 管理命令](CMD_02_MANAGE.md)（/wb-new、/wb-new-entry、/wb-del-entry、/wb-export、/wb-copy）
  - [CMD_03 — 批量字段操作](CMD_03_BATCH_FIELDS.md)（/wb-set-strategy、/wb-set-position 等 10 条）
  - [CMD_04 — 行为与工具](CMD_04_BEHAVIOR.md)（/wb-set-recursion、/wb-set-effect、/wb-ui、/wb-help）

  ### Python CLI 文档

  - [Python CLI 使用指南](../Python/README.md)
  - [Python CLI 完整命令参考](../Python/COMMANDS.md)
  - [Python CLI 工作流教程](../Python/WORKFLOW.md)

  ---

  ## 技术栈

  - **后端**：TypeScript + Express（SillyTavern 插件体系）
  - **前端**：Vue 3 + Vite + TypeScript（双面板 SPA）
  - **扩展**：原生 JavaScript（兼容 JS-Slash-Runner）

  ## 作者

  AliceSao · MIT License
  