# Python CLI

Python CLI 已从主仓库根级 `src/` 收拢到 `tools/python-cli/`。

## 目录结构

```text
tools/python-cli/
├── README.md          # 本文件，CLI 入口索引
├── src/               # CLI 源码
│   ├── main.py        # 主入口
│   ├── commands.py    # 命令定义
│   ├── batch_ops.py   # 批量操作
│   ├── json_parser.py
│   ├── json_generator.py
│   ├── txt_parser.py
│   ├── txt_generator.py
│   ├── config_manager.py
│   └── utils.py
├── JSON/              # 本地世界书 JSON 工作区（gitignore 排除）
├── TXT/               # 本地 TXT 工作区（gitignore 排除）
└── config/            # 本地配置目录（gitignore 排除）
```

## 运行方式

```bash
cd WorldBookManager/tools/python-cli/src
python main.py --help
```

## 文档入口

- `../../docs/python-cli/README.md`：使用指南
- `../../docs/python-cli/COMMANDS.md`：完整命令参考
- `../../docs/python-cli/WORKFLOW.md`：工作流教程

## 说明

- Python CLI 完整源码只在主仓库维护。
- Python CLI 文档统一在主仓库顶层 `docs/python-cli/` 维护，不在子目录重复维护。
- `ST-WBM-UI` 与 `ST-WBM-Server` 两个独立仓库不保存 Python CLI 源码。
- `JSON/`、`TXT/`、`config/` 属于本地工作区，不会推送到远程。
