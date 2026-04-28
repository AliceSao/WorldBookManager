# WorldBook Manager v1.1.0

> SillyTavern 世界书管理器 — 双面板 Web UI + ST 扩展注入 + 后端插件

---

## 项目组成

| 组件              | 路径                             | 功能                                                        |
| ----------------- | -------------------------------- | ----------------------------------------------------------- |
| **ST-WBM-UI**     | `ST-WBM-UI/`                     | SillyTavern 前端扩展：注入入口面板 + iframe 弹窗打开 Vue UI |
| **ST-WBM-Server** | `server/ST-WBM-Server/`          | Node.js 后端插件：REST API + Web UI 静态服务                |
| **Web UI**        | `server/ST-WBM-Server/web/dist/` | Vue 3 双面板管理界面（已编译）                              |
| **Python CLI**    | `src/`                           | 离线批量操作工具（26 条命令），命令行操作请使用此工具       |

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

---

## Web UI 访问

打开浏览器访问：`http://localhost:8000/api/plugins/wb-manager/ui/`

或在 SillyTavern 扩展面板中点击 **📖 打开管理面板**（通过 iframe 弹窗打开）。

---

## 独立仓库

组件已拆分为独立仓库，可单独安装：

| 仓库              | 地址                                                                           | 说明                                       |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| **ST-WBM-UI**     | [github.com/AliceSao/ST-WBM-UI](https://github.com/AliceSao/ST-WBM-UI)         | 前端扩展（仅运行时文件）                   |
| **ST-WBM-Server** | [github.com/AliceSao/ST-WBM-Server](https://github.com/AliceSao/ST-WBM-Server) | 后端插件（仅运行时文件，无需 npm install） |

---

## 文档

- [安装指南](INSTALL.md)
- [后端 REST API](API.md)
- [Web UI 使用指南](WEBUI.md)
- [扩展说明](EXTENSION.md)
- [更新日志](CHANGELOG.md)

### 斜杠命令参考（已废弃）

> 斜杠命令已在 v1.1.0 中移除。命令行操作请使用 Python CLI。

- [CMD_01 — 查询命令](CMD_01_QUERY.md)（历史参考）
- [CMD_02 — 管理命令](CMD_02_MANAGE.md)（历史参考）
- [CMD_03 — 批量字段操作](CMD_03_BATCH_FIELDS.md)（历史参考）
- [CMD_04 — 行为与工具](CMD_04_BEHAVIOR.md)（历史参考）

### Python CLI 文档

- [Python CLI 使用指南](../Python/README.md)
- [Python CLI 完整命令参考](../Python/COMMANDS.md)
- [Python CLI 工作流教程](../Python/WORKFLOW.md)

---

## 技术栈

- **后端**：TypeScript + Express（SillyTavern 插件体系）
- **前端**：Vue 3 + Vite + TypeScript（双面板 SPA）
- **扩展**：原生 JavaScript（面板注入 + iframe 弹窗）

## 作者

AliceSao · MIT License
