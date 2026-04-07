# WorldBook Manager v1.0

> SillyTavern 世界书全套管理工具 — Python CLI + ST 扩展注入 + 后端插件 + 双面板 Web UI

---

## 这是什么？

**WorldBook Manager** 是一套完整的 SillyTavern 世界书管理工具，由三个独立部分组成：

| 组件 | 仓库 | 功能 |
|---|---|---|
| **Python CLI** | `src/`（本仓库） | 离线批量操作：拆分、合并、批量编辑世界书 JSON/TXT |
| **ST-WBM-UI** | [AliceSao/ST-WBM-UI](https://github.com/AliceSao/ST-WBM-UI) | SillyTavern 前端扩展：注入入口面板 + 23 条斜杠命令 |
| **ST-WBM-Server** | [AliceSao/ST-WBM-Server](https://github.com/AliceSao/ST-WBM-Server) | SillyTavern 后端插件：REST API + 双面板 Web UI |

三个部分**独立可用**，也可组合使用。

---

## 快速安装（ST 扩展，推荐方式）

### 第一步：安装后端插件

```bash
cd /path/to/SillyTavern/plugins
git clone https://github.com/AliceSao/ST-WBM-Server.git wb-manager
```

> 目录名必须为 `wb-manager`。`dist/` 已包含编译好的代码，**无需 `npm install`**。

启动 SillyTavern，访问 `http://localhost:8000/api/plugins/wb-manager/ping`，返回 `{"success":true}` 即安装成功。

### 第二步：安装前端扩展

```bash
cd /path/to/ST数据目录/extensions/third-party
git clone https://github.com/AliceSao/ST-WBM-UI.git ST-WBM-UI
```

然后在 SillyTavern → 扩展 → 启用 **WorldBook Manager**。

### 第三步：安装 JS-Slash-Runner（可选）

前往Discord搜索安装 **JS-Slash-Runner（酒馆助手）**，启用后 23 条斜杠命令全部可用。

---

## Web UI 使用

打开管理面板有三种方式：

1. 在 SillyTavern 扩展面板中点击 **📖 打开管理面板**
2. 直接访问 `http://localhost:8000/api/plugins/wb-manager/ui/`
3. 使用斜杠命令 `/wb-ui`

双面板界面主要功能：

- 左右两个面板同时打开不同世界书，方便对比和跨世界书复制条目
- **新建世界书**：点击世界书选择框右侧的 **＋** 按钮，输入名称即可创建
- 条目搜索（支持全文 / 标题 / 关键字 / 内容 四种模式）
- 批量选中（按策略 / 关键字 / UID 区间）
- 内联编辑每条条目的所有字段
- 一键保存并自动同步到 ST 运行时（无需手动刷新）
- 导入本地 JSON 文件 / 导出为 JSON 文件

---

## 斜杠命令（共 23 条）

> 所有批量命令支持 `uids=0,1,2` 参数（逗号分隔 UID），省略则对全部条目生效。

### 查询类

| 命令 | 功能 |
|---|---|
| `/wb-list` | 列出所有世界书名称 |
| `/wb-info <名称>` | 查看世界书统计信息（条目数、各策略占比） |
| `/wb-search name=<名> q=<词>` | 搜索条目（匹配标题、内容、关键字） |
| `/wb-constants <名称>` | 列出所有常量（蓝灯）条目 |

### 世界书管理

| 命令 | 功能 |
|---|---|
| `/wb-new <名称>` | 创建新世界书 |
| `/wb-new-entry name=<名> [title=<标>] [strategy=constant\|selective]` | 创建新条目 |
| `/wb-del-entry name=<名> uid=<UID>` | 删除指定条目 |
| `/wb-export <名称>` | 下载世界书 JSON 文件 |
| `/wb-copy from=<源> to=<目标> [uids=0,1,2]` | 跨世界书复制条目（拆分/合并），自动同步 ST |

### 批量字段操作

| 命令 | 功能 | 必要参数 |
|---|---|---|
| `/wb-set-strategy` | 批量设置激活策略 | `name=` `strategy=constant\|selective\|vectorized` |
| `/wb-set-position` | 批量设置插入位置 | `name=` `pos=bc\|ac\|be\|ae\|ad\|bn\|an` |
| `/wb-set-order` | 批量设置 Order | `name=` `order=<数值>` |
| `/wb-set-depth` | 批量设置深度 | `name=` `depth=<数值>` |
| `/wb-set-prob` | 批量设置触发概率 | `name=` `prob=<0-100>` |
| `/wb-set-name` | 批量重命名条目标题 | `name=` `title=<新标题>` |
| `/wb-add-keys` | 批量添加关键字 | `name=` `keys=<词1,词2>` |
| `/wb-set-keys` | 批量替换关键字 | `name=` `keys=<词1,词2>` |
| `/wb-clear-keys` | 批量清空关键字 | `name=` |
| `/wb-set-recursion` | 批量设置递归控制 | `name=` `[pi=true\|false]` `[po=true\|false]` |

### 行为与工具

| 命令 | 功能 |
|---|---|
| `/wb-set-effect name=<名> [sticky=n] [cooldown=n] [delay=n]` | 批量设置粘附/冷却/延迟 |
| `/wb-enable name=<名> [enabled=true\|false]` | 批量启用/禁用条目 |
| `/wb-ui` | 打开双面板管理界面 |
| `/wb-help` | 显示所有命令帮助 |

---

## API 同步机制

所有通过 Web UI 或后端 REST API 进行的写操作，完成后都会自动调用 SillyTavern 内置的 `/api/worldbooks/edit` 端点，将更改同步到 ST 运行时内存，**手动重启或刷新才可以显示文件**。

如同步失败会有提示，用户可在 ST 世界书页面手动点击刷新。

---

## Python CLI（离线工具）

适合大批量、复杂操作，或在 ST 外部处理世界书文件。

### 工作流程

```
ST 导出 JSON → split 拆分为 TXT → 批量编辑 TXT → merge 合并为 JSON → ST 导入
```

### 常用命令

```bash
# 进入工具目录
cd WorldBookManager/src

# 拆分世界书 JSON 为独立 TXT 文件
python main.py split "YourWorldBook.json"

# 批量设置激活策略为常量（蓝灯）
python main.py bss constant -t TXT/YourWorldBook

# 批量添加关键字
python main.py bak "关键词1,关键词2" -t TXT/YourWorldBook

# 合并回 JSON（输出到 JSON/new/）
python main.py merge -n "YourWorldBook" -t TXT/YourWorldBook
```

### Python CLI 命令速查（21 条）

| 命令 | 别名 | 功能 |
|---|---|---|
| `split` | `sp` | 拆分 JSON 为 TXT |
| `merge` | `mg` | 合并 TXT 为 JSON |
| `create` | `cr` | 创建 TXT 条目模板 |
| `list` | `ls` | 列出 TXT 文件 |
| `batch-set-uid` | `bsu` | 批量设置 UID |
| `batch-set-newname` | `bsn` | 批量设置世界书名称 |
| `batch-set-order` | `bso` | 批量设置 Order |
| `batch-set-position` | `bsp` | 批量设置插入位置 |
| `batch-set-strategy` | `bss` | 批量设置激活策略 |
| `batch-set-recursion` | `bsr` | 批量设置递归控制 |
| `batch-set-effect` | `bse` | 批量设置效果 |
| `batch-update-field` | `buf` | 批量更新任意字段 |
| `extract-by-key` | `ebk` | 按关键字提取条目 |
| `add-keywords` | `ak` | 添加关键字（单条目）|
| `batch-add-keywords` | `bak` | 批量添加关键字 |
| `remove-keywords` | `rk` | 删除关键字（单条目）|
| `clear-keywords` | `ck` | 清空关键字（单条目）|
| `batch-clear-keywords` | `bck` | 批量清空关键字 |
| `extract-constant` | `ec` | 提取常量（蓝灯）条目 |
| `batch-move` | `bm` | 批量移动 TXT 文件 |
| `remove` | `rm` | 删除目录或文件 |

---

## 目录结构

```
WorldBookManager/
├── src/                    ← Python CLI（离线工具，禁止修改）
│   ├── main.py             ← 主入口
│   ├── commands.py         ← 命令定义（21 条）
│   ├── batch_ops.py        ← 批量操作核心
│   ├── json_parser.py      ← JSON 解析
│   ├── json_generator.py   ← JSON 生成
│   ├── txt_parser.py       ← TXT 解析
│   ├── txt_generator.py    ← TXT 生成
│   ├── config_manager.py   ← 配置管理
│   ├── utils.py            ← 工具函数
│   ├── JSON/               ← 世界书 JSON 文件（gitignore 排除）
│   └── TXT/                ← 拆分后的 TXT 文件（gitignore 排除）
├── ST-WBM-UI/              ← ST 前端扩展源码
│   ├── index.js            ← 扩展主文件（注入面板 + 23条命令）
│   ├── manifest.json
│   ├── style.css
│   └── src/                ← Vue 3 源代码
├── server/
│   └── ST-WBM-Server/      ← ST 后端插件
│       ├── dist/           ← 编译后的 TypeScript（直接可用）
│       ├── web/dist/       ← 编译后的 Vue 3 Web UI
│       └── src/            ← TypeScript 源代码
├── @types/                 ← ST / JS-Slash-Runner 类型定义
├── docs/                   ← 详细文档
└── README.md               ← 本文件
```

---

## 文档索引

| 文档 | 说明 |
|---|---|
| [安装指南](docs/st_wbm/INSTALL.md) | ST-WBM 安装步骤（后端 + 前端 + JS-Slash-Runner） |
| [Web UI 使用指南](docs/st_wbm/WEBUI.md) | 双面板界面操作说明 |
| [后端 REST API 参考](docs/st_wbm/API.md) | `/api/plugins/wb-manager/` 完整接口文档 |
| [CMD_01 查询命令](docs/st_wbm/CMD_01_QUERY.md) | `/wb-list`、`/wb-info`、`/wb-search`、`/wb-constants` |
| [CMD_02 管理命令](docs/st_wbm/CMD_02_MANAGE.md) | `/wb-new`、`/wb-new-entry`、`/wb-del-entry`、`/wb-export`、`/wb-copy` |
| [CMD_03 批量字段操作](docs/st_wbm/CMD_03_BATCH_FIELDS.md) | `/wb-set-strategy`、`/wb-set-position` 等 10 条 |
| [CMD_04 行为与工具](docs/st_wbm/CMD_04_BEHAVIOR.md) | `/wb-set-recursion`、`/wb-set-effect`、`/wb-ui`、`/wb-help` |
| [更新日志](docs/st_wbm/CHANGELOG.md) | 版本变更记录 |

---

## 依赖说明

| 依赖 | 是否必须 | 说明 |
|---|---|---|
| SillyTavern（最新版） | ✅ 必须 | 基础运行环境 |
| Node.js 18+ | ✅ 必须 | ST 自带，无需额外安装 |
| JS-Slash-Runner 扩展 | 推荐 | 提供 23 条斜杠命令所需的全局函数 |
| Python 3.10+ | 可选 | 仅使用 Python CLI 时需要，无第三方库依赖 |

---

## 技术栈

- **后端**：TypeScript + Express（SillyTavern 插件体系）
- **Web UI**：Vue 3 + Vite + TypeScript（双面板 SPA）
- **ST 扩展**：原生 JavaScript（兼容 JS-Slash-Runner）
- **Python CLI**：Python 3 纯标准库

---

## 作者

AliceSao · MIT License
