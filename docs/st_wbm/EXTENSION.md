# ST 扩展说明（v1.1.0）

ST-WBM-UI 扩展在 SillyTavern 中注入入口面板，通过 iframe 弹窗打开双面板 Vue UI 管理界面。

> **v1.1.0 变更**：斜杠命令已全部移除，不再依赖 JS-Slash-Runner。命令行批量操作请使用
> [Python CLI](../Python/README.md)。

---

## 扩展功能

- **入口面板注入**：在 SillyTavern 扩展面板中显示 WorldBosok Manager 入口
- **iframe 弹窗**：点击「📖 打开管理面板」按钮，以 iframe modal 方式打开双面板 Web UI
- **后端状态显示**：面板中显示后端连接状态

  ---

  ## 依赖

- **ST-WBM-Server** 后端插件（必须已安装并运行）
- 无其他扩展依赖

  ---

  ## 使用方式

  1. 在 SillyTavern → 扩展 → 启用 **WorldBook Manager**
  2. 扩展面板中出现 WorldBook Manager 入口
  3. 点击 **📖 打开管理面板** 打开双面板 Web UI

  或直接在浏览器中访问：`http://localhost:8000/api/plugins/wb-manager/ui/`

  ---

  ## 相关文档

- [Web UI 使用指南](WEBUI.md) — 双面板界面操作说明
- [后端 REST API](API.md) — API 接口文档
- [安装指南](INSTALL.md) — 安装步骤
- [ST-WBM 总览](README.md)
