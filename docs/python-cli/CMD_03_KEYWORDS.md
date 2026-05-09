# Python CLI — 第三类：关键字操作命令

> 关键字（Key）决定一个 selective 策略条目何时被激活。  
> 这一类命令覆盖了对 TXT 文件中 `Key: [...]` 字段的所有增删查操作，  
> 以及按关键词从文件集合中提取匹配文件的筛选功能。

---

## 命令总览

| 序号 | 命令 | 别名 | 作用范围 | 功能 |
|------|------|------|---------|------|
| 13 | `extract-by-key` | `ebk` | 多文件 | 按关键词从目录中提取匹配的 TXT 文件 |
| 14 | `add-keywords` | `ak` | 单文件 | 为指定 UID 的文件追加关键字 |
| 15 | `batch-add-keywords` | `bak` | 多文件 | 批量为多个 UID 的文件追加关键字 |
| 16 | `remove-keywords` | `rk` | 单文件 | 从指定 UID 的文件中删除指定关键字 |
| 17 | `clear-keywords` | `ck` | 单文件 | 清空指定 UID 的文件的所有关键字 |
| 18 | `batch-clear-keywords` | `bck` | 多文件 | 批量清空多个文件的所有关键字 |

---

## 关键字字段格式说明

TXT 文件中，关键字以 JSON 数组格式存储在 `Key:` 行：

```
Key: ["词条一","词条二","词条三"]
```

- 空关键字：`Key: []`
- 关键字列表在添加/删除操作后保持去重（不会有重复项）
- 关键字大小写敏感

---

## 13. `extract-by-key` — 按关键词提取文件

**别名：** `ebk`

从源目录中搜索所有 TXT 文件，将 `Key:` 字段中**包含指定关键词**的文件复制到输出目录。  
不修改源文件，仅做筛选复制。

### 用法

```bash
python main.py extract-by-key <源目录> <关键词> [--output-dir 输出目录]
python main.py ebk             <源目录> <关键词> [--output-dir 输出目录]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `source_dir` | **是** | 源 TXT 文件目录 |
| `keywords` | **是** | 关键词，单个 `"词"` 或多个 `"词A,词B,词C"`（逗号分隔） |
| `--output-dir` / `-o` | 否 | 输出目录；默认 `TXT/extracted/{源目录名}/` |

### 匹配规则

- 多个关键词之间为**或**关系：文件的 `Key` 中包含任意一个关键词即被提取
- 匹配精确（大小写敏感）

### 示例

```bash
# 提取包含关键词 "炭治郎" 的文件
python main.py ebk "TXT/MyWB" "炭治郎"
python main.py extract-by-key "TXT/MyWB" "炭治郎"

# 提取包含 "炭治郎" 或 "鬼杀队" 的文件
python main.py ebk "TXT/MyWB" "炭治郎,鬼杀队"

# 指定输出目录
python main.py ebk "TXT/MyWB" "炭治郎" -o "TXT/FilteredResult"
```

---

## 14. `add-keywords` — 为指定 UID 添加关键字

**别名：** `ak`

找到目录中 UID 匹配的 TXT 文件，将新关键字追加到其 `Key` 列表中。  
已存在的关键字不会重复添加。

### 用法

```bash
python main.py add-keywords <关键词> --txt <目录> --uid <UID>
python main.py ak           <关键词> --txt <目录> --uid <UID>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `keywords` | **是** | 关键字，单个 `"词"` 或多个 `"词A,词B"`（逗号分隔） |
| `--txt` / `-t` | **是** | TXT 文件目录 |
| `--uid` / `-u` | **是** | 目标条目的 UID |

### 示例

```bash
# 为 UID 42 的条目添加两个关键字
python main.py ak "炭治郎,主角" --txt "TXT/MyWB" --uid 42
python main.py add-keywords "炭治郎,主角" -t "TXT/MyWB" -u 42

# 添加单个关键字
python main.py ak "鬼" -t "TXT/MyWB" -u 42
```

### 注意事项

- `--txt` 和 `--uid` 均为必填参数
- 找不到指定 UID 的文件时会输出错误信息
- 操作前会自动读取现有关键字列表，合并后写回（保留原有关键字）

---

## 15. `batch-add-keywords` — 批量添加关键字

**别名：** `bak`

对指定 UID 范围内的**所有** TXT 文件追加相同的关键字。  
适合需要给一批条目打相同标签的场景。

### 用法

```bash
python main.py batch-add-keywords <关键词> [--txt 目录] [-s UID起始] [-e UID结束]
python main.py bak                <关键词> [--txt 目录] [-s UID起始] [-e UID结束]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `keywords` | **是** | 关键字，单个或逗号分隔多个 |
| `--txt` / `-t` | 否 | TXT 目录，默认 `TXT/` |
| `--uid-start` / `-s` | 否 | 起始 UID |
| `--uid-end` / `-e` | 否 | 结束 UID |

### 示例

```bash
# 给所有条目添加 "鬼杀队" 标签
python main.py bak "鬼杀队" -t "TXT/MyWB"

# 仅给 UID 1-20 的条目添加
python main.py bak "鬼杀队,炭治郎" -t "TXT/MyWB" -s 1 -e 20

# 从 UID 50 开始的所有条目添加
python main.py bak "剧情标签" -t "TXT/MyWB" -s 50
```

---

## 16. `remove-keywords` — 删除指定关键字

**别名：** `rk`

从指定 UID 的 TXT 文件的 `Key` 列表中删除特定关键字，其他关键字保持不变。

### 用法

```bash
python main.py remove-keywords <关键词> --txt <目录> --uid <UID>
python main.py rk              <关键词> --txt <目录> --uid <UID>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `keywords` | **是** | 要删除的关键字，单个或逗号分隔多个 |
| `--txt` / `-t` | **是** | TXT 文件目录 |
| `--uid` / `-u` | **是** | 目标条目的 UID |

### 示例

```bash
# 从 UID 42 的条目中删除 "旧标签"
python main.py rk "旧标签" -t "TXT/MyWB" -u 42
python main.py remove-keywords "旧标签" --txt "TXT/MyWB" --uid 42

# 同时删除多个关键字
python main.py rk "标签A,标签B" -t "TXT/MyWB" -u 42
```

### 注意事项

- 如果指定的关键字在文件中不存在，操作静默完成（不报错）
- 只删除精确匹配的关键字，不影响其他关键字

---

## 17. `clear-keywords` — 清空指定 UID 的所有关键字

**别名：** `ck`

将指定 UID 的 TXT 文件的 `Key` 字段重置为空列表 `[]`，删除该条目的全部关键字。

### 用法

```bash
python main.py clear-keywords --txt <目录> --uid <UID>
python main.py ck             --txt <目录> --uid <UID>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--txt` / `-t` | **是** | TXT 文件目录 |
| `--uid` / `-u` | **是** | 目标条目的 UID |

### 示例

```bash
# 清空 UID 42 的所有关键字
python main.py ck -t "TXT/MyWB" -u 42
python main.py clear-keywords --txt "TXT/MyWB" --uid 42
```

---

## 18. `batch-clear-keywords` — 批量清空关键字

**别名：** `bck`

批量将指定 UID 范围内所有 TXT 文件的 `Key` 字段重置为 `[]`。  
常用于重构关键字方案时的"清空重来"操作。

### 用法

```bash
python main.py batch-clear-keywords [--txt 目录] [-s UID起始] [-e UID结束]
python main.py bck                  [--txt 目录] [-s UID起始] [-e UID结束]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--txt` / `-t` | 否 | TXT 目录，默认 `TXT/` |
| `--uid-start` / `-s` | 否 | 起始 UID |
| `--uid-end` / `-e` | 否 | 结束 UID |

### 示例

```bash
# 清空所有条目的关键字
python main.py bck -t "TXT/MyWB"

# 仅清空 UID 1-10 的条目
python main.py bck -t "TXT/MyWB" -s 1 -e 10
```

---

## 典型使用场景

### 场景一：重新规划关键字体系

```bash
# 1. 先清空所有条目的现有关键字
python main.py bck -t "TXT/MyWB"

# 2. 为不同分组批量添加新关键字
python main.py bak "组A标签" -t "TXT/MyWB" -s 1 -e 30
python main.py bak "组B标签" -t "TXT/MyWB" -s 31 -e 60

# 3. 为特定条目手动精调
python main.py ak "特殊标签" -t "TXT/MyWB" -u 15
```

### 场景二：拆分条目到子集

```bash
# 提取含有特定关键字的条目（复制到新目录）
python main.py ebk "TXT/MyWB" "主线剧情,主角"

# 查看提取结果
python main.py ls -t "TXT/extracted/MyWB"

# 在提取的子集上进行处理
python main.py bss selective -t "TXT/extracted/MyWB"
```

### 场景三：给合并进来的条目打标记

```bash
# 从 UID 100 开始的条目是外部合并进来的
python main.py bak "外部导入,待审核" -t "TXT/MyWB" -s 100
```

---

## 相关文档

- [CMD_01 — 转换命令](CMD_01_CONVERSION.md) — split/merge，TXT 文件来源和合并
- [CMD_02 — 批量字段操作](CMD_02_BATCH_FIELDS.md) — 批量修改策略、位置等字段
- [CMD_04 — 文件管理](CMD_04_FILE_MGMT.md) — 按关键字提取条目（extract-by-key）
- [完整命令参考](COMMANDS.md) | [工作流教程](WORKFLOW.md) | [使用指南](README.md)
