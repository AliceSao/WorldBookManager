# Python CLI — 第一类：数据转换命令

> 这一类命令是 WorldBook Manager 的核心工作流入口。  
> 典型流程：`split` 拆出 TXT → 手动编辑 → `merge` 合回 JSON。  
> `create` 负责快速生成单个空白条目模板；`list` 用于浏览当前目录下的文件清单。

---

## 命令总览

| 序号 | 命令 | 别名 | 功能 |
|------|------|------|------|
| 1 | `split` | `sp` | 将 JSON 世界书拆分为多个 TXT 文件 |
| 2 | `merge` | `mg` | 将多个 TXT 文件合并为 JSON 世界书 |
| 3 | `create` | `cr` | 创建单个空白 TXT 模板条目 |
| 4 | `list` | `ls` | 列出目录中所有 TXT 文件及其基本信息 |

---

## 1. `split` — 拆分世界书

**别名：** `sp`

将一个完整的 JSON 世界书文件拆分为多个 TXT 文件，每个条目对应一个文件。  
这是进行手动批量编辑前的标准第一步。

### 用法

```bash
python main.py split [JSON文件路径] [--output-dir 输出目录]
python main.py sp    [JSON文件路径] [--output-dir 输出目录]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `json_file` | 否 | JSON 文件路径；省略时自动从 `JSON/old/` 目录中选取最新 `.json` 文件 |
| `--output-dir` / `-o` | 否 | 输出目录；默认为 `TXT/{世界书名}/` |

### 自动文件发现规则

- 若 `JSON/old/` 中只有一个 `.json` 文件 → 自动选取并告知文件名
- 若有多个文件 → 按最近修改时间排序，选取最新的，并打印前 5 个候选
- 若目录为空 → 输出错误，提示手动指定路径

### 输出

- 每个条目生成一个 `TXT` 文件，文件名格式为 `{UID}_{Comment}.txt`
- 打印成功生成的文件数量、输出目录，以及条目统计（按策略分类）

### 示例

```bash
# 自动选取 JSON/old/ 中最新的文件
python main.py split

# 指定文件路径
python main.py split "JSON/old/MyWorldBook.json"
python main.py sp "JSON/old/MyWorldBook.json"

# 指定输出目录
python main.py split "MyWorldBook.json" --output-dir "TXT/backup"
```

### 注意事项

- `JSON/old/` 目录需在工作目录下存在（或提供完整路径）
- 输出目录不存在时会自动创建
- 拆分操作不修改源 JSON 文件

---

## 2. `merge` — 合并为世界书

**别名：** `mg`

将一个目录（或通配符匹配的文件集合）下的 TXT 条目文件合并为一个 JSON 世界书文件。  
支持新旧两种 JSON 格式输出。

### 用法

```bash
python main.py merge -n <名称> -t <TXT路径> [--output-dir 输出目录] [--format new|old]
python main.py mg    -n <名称> -t <TXT路径> [--output-dir 输出目录] [--format new|old]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--name` / `-n` | **是** | 输出世界书的名称（用作文件名和 JSON 内的 `name` 字段） |
| `--txt` / `-t` | **是** | 输入 TXT 文件路径，可以是目录（`TXT/MyWB/`）或通配符（`TXT/MyWB/*.txt`） |
| `--output-dir` / `-o` | 否 | 输出目录；默认为 `JSON/new/` |
| `--format` / `-f` | 否 | JSON 格式：`new`（默认，推荐）或 `old`（兼容旧版本） |

### 输出

- 生成 `{名称}.json` 到指定目录
- 打印解析条目数、输出文件路径、条目统计（含 Order 分布）

### 示例

```bash
# 最常用：合并 TXT/MyWorldBook/ 目录下所有文件
python main.py merge -n "MyWorldBook" -t "TXT/MyWorldBook"
python main.py mg -n "MyWorldBook" -t "TXT/MyWorldBook"

# 使用通配符
python main.py mg -n "MyWorldBook" -t "TXT/MyWorldBook/*.txt"

# 指定旧格式输出
python main.py mg -n "MyWorldBook" -t "TXT/MyWorldBook" --format old

# 指定输出目录
python main.py mg -n "MyWorldBook" -t "TXT/MyWorldBook" -o "JSON/export"
```

### 注意事项

- `--name` 和 `--txt` 均为必填参数
- TXT 目录中的所有 `.txt` 文件都会被处理
- 若有解析失败的条目，会单独报错并继续处理其余文件

---

## 3. `create` — 创建 TXT 模板

**别名：** `cr`

快速创建一个带有基本字段的空白 TXT 条目文件，可指定名称、UID 和 Order。  
适合需要从零新建条目时使用，无需手动拼写字段格式。

### 用法

```bash
python main.py create -n <名称> [-u UID] [-o Order] [-d 输出目录]
python main.py cr     -n <名称> [-u UID] [-o Order] [-d 输出目录]
```

### 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--name` / `-n` | **是** | — | 条目名称（TXT 中的 `Comment` 字段）|
| `--uid` / `-u` | 否 | 自动生成 | 条目 UID，不指定则由工具自动分配 |
| `--order` / `-o` | 否 | `100` | 条目 Order 值 |
| `--output-dir` / `-d` | 否 | `TXT/TMP/` | 输出目录 |

### 输出

- 生成 `{UID}_{名称}.txt` 到输出目录
- 打印 UID（自动或指定）、Order 值、完整文件路径

### 示例

```bash
# 最简用法（UID 自动生成，Order=100）
python main.py create -n "新条目名称"
python main.py cr -n "新条目"

# 指定 UID 和 Order
python main.py cr -n "重要条目" -u 999 -o 990

# 指定输出目录
python main.py cr -n "测试条目" -d "TXT/Draft"
```

### TXT 文件格式（生成示例）

```
WorldBook_OldName: (名称)
WorldBook_NewName: (名称)
UID: 42
Comment: 新条目
Order: 100
Position: before_character_definition
Constant: false
Selective: true
Vectorized: false
ExcludeRecursion: false
PreventRecursion: false
DelayUntilRecursion: false
Sticky: 0
Cooldown: 0
Delay: 0
Key: []
Content:
```

---

## 4. `list` — 列出 TXT 文件

**别名：** `ls`

列出指定目录下所有 TXT 文件的概要信息，包括 UID、注释、世界书名称、文件大小。  
用于快速盘点当前有哪些条目，无需打开每个文件。

### 用法

```bash
python main.py list [--txt-dir 目录]
python main.py ls   [--txt-dir 目录]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--txt-dir` / `-t` | 否 | TXT 文件目录；默认为配置中的 `TXT/` |

### 输出格式（每个文件）

```
文件: 42_角色介绍.txt
  UID:    42
  注释:   角色介绍
  旧名称: OriginalWorldBook
  新名称: MyWorldBook
  大小:   1.2 KB
```

### 示例

```bash
# 列出默认 TXT/ 目录
python main.py list
python main.py ls

# 指定目录
python main.py ls --txt-dir "TXT/MyWorldBook"
python main.py ls -t "TXT/MyWorldBook"
```

---

## 典型工作流

```bash
# 步骤 1：将已有世界书拆分为可编辑的 TXT 文件
python main.py split "JSON/old/MyWB.json"
# → 输出到 TXT/MyWB/

# 步骤 2：查看文件列表确认
python main.py ls -t "TXT/MyWB"

# 步骤 3：手动编辑 TXT 文件（添加内容、修改字段）

# 步骤 4：需要新增条目时
python main.py cr -n "新章节" -u 200 -o 200

# 步骤 5：合并回 JSON
python main.py merge -n "MyWB" -t "TXT/MyWB"
# → 输出到 JSON/new/MyWB.json
```

---

## 相关文档

- [CMD_02 — 批量字段操作](CMD_02_BATCH_FIELDS.md) — 拆分后可对 TXT 文件批量修改字段
- [CMD_03 — 关键字操作](CMD_03_KEYWORDS.md) — 批量管理条目关键字
- [CMD_04 — 文件管理](CMD_04_FILE_MGMT.md) — 提取常量、移动文件
- [完整命令参考](COMMANDS.md) | [工作流教程](WORKFLOW.md) | [使用指南](README.md)
