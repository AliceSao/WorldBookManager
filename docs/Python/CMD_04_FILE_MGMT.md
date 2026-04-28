# Python CLI — 第四类：文件管理与工具命令

> 这一类命令处理 TXT 文件和目录的物理管理，以及高级编辑工具：  
> 按策略提取特定文件、跨目录批量移动、删除不再需要的文件或目录、快速清理、UID重映射、Content编辑。  
> 操作直接作用于文件系统，请在执行前确认路径无误。

---

## 命令总览

| 序号 | 命令 | 别名 | 功能 |
|------|------|------|------|
| 19 | `extract-constant` | `ec` | 提取所有常量（蓝灯）条目到指定目录（支持复制模式） |
| 20 | `batch-move` | `bm` | 批量移动 TXT 文件（支持通配符） |
| 21 | `remove` | `rm` | 删除 TXT 文件或目录 |
| 22 | `clean` | `cl` | 快速清理拆分/合并产物 |
| 23 | `remap-uid` | `rmu` | UID 重映射（批量重新编号） |
| 24 | `edit-content` | `edc` | 编辑条目 Content 字段（插入/追加/替换） |

---

## 19. `extract-constant` — 提取常量条目

**别名：** `ec`

扫描源 TXT 目录，将所有激活策略为 `constant`（蓝灯，即 `Constant: true`）的条目  
复制到指定目录。不修改源文件。

### 用法

```bash
python main.py extract-constant <源目录> [--output-dir 输出目录] [--copy]
python main.py ec               -t <TXT目录> [-o 输出目录] [-c]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `source_dir` | 否 | 源 TXT 目录（位置参数，也可用 `--txt -t` 代替） |
| `--txt` / `-t` | 否 | 源 TXT 目录（与位置参数等效） |
| `--output-dir` / `-o` | 否 | 输出目录；默认 `TXT/constant/{源目录名}/` |
| `--copy` / `-c` | 否 | 复制模式（不移动源文件） |

### 筛选条件

- 文件中存在 `Constant: true`（大小写不敏感前缀匹配）

### 输出

- 默认将匹配文件**移动**到输出目录
- 使用 `--copy` 时**复制**（保留源文件）
- 打印提取的文件数量和输出路径

### 示例

```bash
# 提取（移动模式）
python main.py ec "TXT/MyWB"
# → 默认输出到 TXT/constant/MyWB/

# 复制模式（推荐，不影响源目录）
python main.py ec -t "TXT/MyWB" -c
python main.py ec "TXT/MyWB" --copy -o "TXT/AlwaysOn"
```

### 使用场景

- 在合并世界书时，先提取所有蓝灯条目做独立备份
- 检查哪些条目被设置为常量（始终插入），避免上下文过载
- 将常量条目单独整理为一个小世界书后导出

---

## 20. `batch-move` — 批量移动文件

**别名：** `bm`

将指定路径（支持通配符）匹配的 TXT 文件批量移动到目标目录。  
源位置的文件在移动后会被删除。

### 用法

```bash
python main.py batch-move <源路径> --output-dir <目标目录>
python main.py bm         <源路径> -o <目标目录>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `source` | **是** | 源文件路径，支持通配符（如 `TXT/MyWB/*.txt`）或目录 |
| `--output-dir` / `-o` | **是** | 目标目录（不存在时自动创建） |

### 示例

```bash
# 将 TXT/MyWB/ 中所有文件移动到 TXT/Archive/
python main.py bm "TXT/MyWB/*.txt" -o "TXT/Archive"
python main.py batch-move "TXT/MyWB/*.txt" --output-dir "TXT/Archive"

# 将通过通配符筛选的特定文件移动
python main.py bm "TXT/MyWB/42_*.txt" -o "TXT/Special"

# 整个目录的文件移到另一目录（不含子目录）
python main.py bm "TXT/Source/*.txt" -o "TXT/Destination"
```

### 注意事项

- 目标目录不存在时会自动创建
- 若目标目录下已有同名文件，会被覆盖（无确认提示）
- 移动成功后源文件删除；移动失败的文件保留在源位置
- 不支持递归移动子目录

---

## 21. `remove` — 删除文件或目录

**别名：** `rm`

删除指定的 TXT 文件或 TXT 子目录。  
支持递归删除整个目录树（`--recursive`）。

### 用法

```bash
python main.py remove <路径> [--recursive]
python main.py rm     <路径> [-r]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `path` | **是** | 要删除的文件或目录路径 |
| `--recursive` / `-r` | 否 | 递归删除目录及其所有内容 |

### 示例

```bash
# 删除单个 TXT 文件
python main.py rm "TXT/MyWB/42_角色.txt"

# 删除空目录
python main.py rm "TXT/MyWB"

# 递归删除整个目录（包含所有文件和子目录）
python main.py rm "TXT/MyWB" --recursive
python main.py rm "TXT/MyWB" -r
```

### 注意事项

- **不可撤销**：删除操作直接作用于文件系统，无法恢复
- 删除非空目录时必须加 `--recursive`，否则会报错
- 建议删除前先用 `list` 命令确认内容

---

## 22. `clean` — 快速清理临时文件

**别名：** `cl`

快速清理拆分/合并过程产生的目录和文件，支持确认提示。

### 用法

```bash
python main.py clean [--txt] [--json] [--all] [--target <目录>] [-y]
python main.py cl --target "TXT/OldData" -y
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--txt` | 否 | 清理 TXT 子目录 |
| `--json` | 否 | 清理 JSON/new 目录 |
| `--all` | 否 | 清理全部（TXT + JSON） |
| `--target` | 否 | 指定要清理的具体目录路径 |
| `--confirm` / `-y` | 否 | 跳过确认提示 |

### 示例

```bash
# 清理指定目录（跳过确认）
python main.py cl --target "TXT/_test_wb" -y

# 清理所有 TXT 子目录（需确认）
python main.py cl --txt

# 清理全部
python main.py cl --all -y
```

---

## 23. `remap-uid` — UID 重映射

**别名：** `rmu`

批量重新映射条目的 UID。同步更新文件内的 UID、DisplayIndex、WorldBook_FileName 三个字段，并重命名文件。
自动处理命名冲突（通过临时目录），出错时自动回滚。

### 用法

```bash
python main.py remap-uid -t <TXT目录> --map "旧UID:新UID,旧UID:新UID"
python main.py rmu -t <TXT目录> -m "12:0,9:1,13:2"
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--txt` / `-t` | **是** | TXT 文件目录 |
| `--map` / `-m` | **是** | UID 映射字符串（`旧:新` 逗号分隔） |

### 示例

```bash
# 将 UID 12→0, 9→1, 13→2
python main.py rmu -t "TXT/MyWB" -m "12:0,9:1,13:2"

# 互换两个 UID
python main.py rmu -t "TXT/MyWB" -m "3:99,5:3,99:5"
```

### 注意事项

- 新 UID 不可重复
- 操作会同步更新 UID、DisplayIndex 和文件名
- 出错时文件自动从临时目录恢复

---

## 24. `edit-content` — 编辑 Content 字段

**别名：** `edc`

编辑条目的 Content 多行字段。支持在开头插入（prepend）、末尾追加（append）、正则替换（replace）三种互斥模式。
支持单条目（`--uid`）和批量（`--uid-start`/`--uid-end`）操作。

### 用法

```bash
python main.py edit-content -t <TXT目录> -u <UID> --prepend "文本"
python main.py edc -t <TXT目录> -s <起始UID> -e <结束UID> --append "文本"
python main.py edc -t <TXT目录> -u <UID> --replace "正则" "替换"
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--txt` / `-t` | **是** | TXT 文件目录 |
| `--uid` / `-u` | 否 | 指定 UID（单条目） |
| `--uid-start` / `-s` | 否 | 起始 UID（批量） |
| `--uid-end` / `-e` | 否 | 结束 UID（批量） |
| `--prepend` | 互斥 | 在 Content 开头插入文本 |
| `--append` | 互斥 | 在 Content 末尾追加文本 |
| `--replace` | 互斥 | 正则替换（两个参数：模式 替换文本） |

### 示例

```bash
python main.py edc -t "TXT/MyWB" -u 0 --prepend "[重要]"
python main.py edc -t "TXT/MyWB" -s 1 -e 10 --append "--- END ---"
python main.py edc -t "TXT/MyWB" -u 5 --replace "旧文本" "新文本"
```

---

## 典型使用场景

### 场景一：归档旧世界书

```bash
# 提取常量条目单独保存
python main.py ec "TXT/OldWB" -o "TXT/OldWB_constants"

# 将整个旧目录移到归档位置
python main.py bm "TXT/OldWB/*.txt" -o "TXT/Archive/OldWB"

# 确认归档完成后删除源目录
python main.py rm "TXT/OldWB" -r
```

### 场景二：拆分大型世界书

```bash
# 1. 先拆分 JSON
python main.py split "JSON/old/LargeWB.json"

# 2. 提取常量条目到单独目录（会做成另一个世界书）
python main.py ec "TXT/LargeWB" -o "TXT/LargeWB_AlwaysOn"

# 3. 按关键词提取某一主题的条目
python main.py ebk "TXT/LargeWB" "主角" -o "TXT/LargeWB_Protagonist"

# 4. 移动处理完的文件
python main.py bm "TXT/LargeWB_AlwaysOn/*.txt" -o "TXT/FinalAlwaysOn"

# 5. 各自合并为 JSON
python main.py mg -n "LargeWB_AlwaysOn" -t "TXT/FinalAlwaysOn"
python main.py mg -n "LargeWB_Protagonist" -t "TXT/LargeWB_Protagonist"
```

### 场景三：清理临时文件

```bash
# 使用 clean 命令快速清理（推荐）
python main.py cl --target "TXT/TMP" -y
python main.py cl --all -y

# 也可以用 rm 逐个删除
python main.py rm "TXT/TMP" -r
python main.py rm "TXT/extracted" -r
```

---

## 相关文档

- [CMD_01 — 转换命令](CMD_01_CONVERSION.md) — split/merge，TXT 文件的创建和合并
- [CMD_02 — 批量字段操作](CMD_02_BATCH_FIELDS.md) — 提取后可批量修改字段
- [CMD_03 — 关键字操作](CMD_03_KEYWORDS.md) — 提取后可批量管理关键字
- [完整命令参考](COMMANDS.md) | [工作流教程](WORKFLOW.md) | [使用指南](README.md)
