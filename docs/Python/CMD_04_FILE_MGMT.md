# Python CLI — 第四类：文件管理命令

> 这一类命令处理 TXT 文件和目录的物理管理：  
> 按策略提取特定文件、跨目录批量移动、删除不再需要的文件或目录。  
> 操作直接作用于文件系统，请在执行前确认路径无误。

---

## 命令总览

| 序号 | 命令 | 别名 | 功能 |
|------|------|------|------|
| 19 | `extract-constant` | `ec` | 提取所有常量（蓝灯）条目到指定目录 |
| 20 | `batch-move` | `bm` | 批量移动 TXT 文件（支持通配符） |
| 21 | `remove` | `rm` | 删除 TXT 文件或目录 |

---

## 19. `extract-constant` — 提取常量条目

**别名：** `ec`

扫描源 TXT 目录，将所有激活策略为 `constant`（蓝灯，即 `Constant: true`）的条目  
复制到指定目录。不修改源文件。

### 用法

```bash
python main.py extract-constant <源目录> [--output-dir 输出目录]
python main.py ec               <源目录> [--output-dir 输出目录]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `source_dir` | **是** | 源 TXT 目录 |
| `--output-dir` / `-o` | 否 | 输出目录；默认 `TXT/constant/{源目录名}/` |

### 筛选条件

- 文件中存在 `Constant: true`（大小写不敏感前缀匹配）

### 输出

- 将匹配文件**复制**（不移动）到输出目录
- 打印提取的文件数量和输出路径

### 示例

```bash
# 提取 TXT/MyWB/ 中所有常量条目
python main.py ec "TXT/MyWB"
python main.py extract-constant "TXT/MyWB"
# → 默认输出到 TXT/constant/MyWB/

# 指定输出目录
python main.py ec "TXT/MyWB" -o "TXT/AlwaysOn"
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
# 删除 TMP 目录中的临时模板
python main.py rm "TXT/TMP" -r

# 删除提取操作生成的临时目录
python main.py rm "TXT/extracted" -r
python main.py rm "TXT/constant" -r
```

---

## 相关文档

- [CMD_01 — 转换命令](CMD_01_CONVERSION.md) — split/merge，TXT 文件的创建和合并
- [CMD_02 — 批量字段操作](CMD_02_BATCH_FIELDS.md) — 提取后可批量修改字段
- [CMD_03 — 关键字操作](CMD_03_KEYWORDS.md) — 提取后可批量管理关键字
- [完整命令参考](COMMANDS.md) | [工作流教程](WORKFLOW.md) | [使用指南](README.md)
