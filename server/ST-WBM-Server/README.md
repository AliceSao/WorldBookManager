# ST-WBM-Server

  SillyTavern 世界书管理器后端插件 (TypeScript)。

  > 完整文档、安装说明与 API 参考见主仓库文档目录：
  >
  > **📖 [WorldBookManager 文档](https://github.com/AliceSao/WorldBookManager/tree/main/docs/st_wbm)**

  ## 概述

  - **功能**：为 SillyTavern 提供 `/api/plugins/wb-manager/` REST API，托管 Web UI 静态资源
  - **安装**：克隆本仓库到 `SillyTavern/plugins/ST-WBM-Server/`，**无需 npm install**（`dist/` 已预编译）
  - **前端**：Web UI 已嵌入 `web/dist/`，自动托管于 `/api/plugins/wb-manager/ui/`
  - **配合使用**：[ST-WBM-UI](https://github.com/AliceSao/ST-WBM-UI) SillyTavern 前端扩展
  