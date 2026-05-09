# 更新日志

## v1.1.0（2026-04）

### 变更

- **移除所有斜杠命令**：ST-WBM-UI 不再注册任何斜杠命令
- **移除 JS-Slash-Runner 依赖**：前端扩展不再依赖 JS-Slash-Runner（酒馆助手）
- **ST-WBM-UI 简化为面板注入 + iframe 弹窗**：仅提供入口面板和 iframe modal 打开 Vue UI
- 命令行批量操作统一由 Python CLI（26 条命令）承担

  ***

  ## v1.0.0（2026-04）

  ### 新增

- **双面板 Web UI**（Vue 3 + TypeScript）
  - 左右两个独立面板，分别加载不同世界书
  - 实时搜索条目（标题/关键字/内容）
  - 多选 + 批量操作（14种批量操作）
  - 内联条目编辑器（展开式）
  - 双面板条目复制
  - 从本地 JSON 文件导入世界书
  - 未保存提醒（橙色标记 + 离页拦截）

- **后端 REST API**（TypeScript + Express）
  - 完整 CRUD：世界书 + 条目
  - 14 种批量操作端点
  - 世界书导出
  - 条目复制（跨世界书）
  - CSRF 绕过：直接 fs 读写，无需 ST HTTP 代理

- **ST 扩展（ST-WBM-UI）**
  - 23 条斜杠命令（完全基于 JS-Slash-Runner API）
  - 注入面板：后端/JSR 状态显示 + 管理界面入口
  - 所有命令支持 STscript 管道返回值

### 变更

- 版本号从 v3.0.0 升级到 v1.0.0（语义化重置，v1.0 标志完全重构）
- 移除 `window.ST_API` 依赖，全面改用 JS-Slash-Runner 全局函数
- 斜杠命令名称前缀统一为 `/wb-`（部分命令名称变更，见命令参考）

  ### 未变更

- Python CLI 工具已独立收拢到 `tools/python-cli/`，功能与工作流保持不变
