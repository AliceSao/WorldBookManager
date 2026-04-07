# Python CLI — 使用指南

## 概述

WorldBook Manager Python CLI 是一套命令行工具，用于批量管理 SillyTavern 世界书条目。

核心思路：将世界书 JSON 拆分为单独的 TXT 文件（每条目一个文件），然后用命令行批量修改，再合并回 JSON 导入 ST。

---

## 安装

```bash
git clone https://github.com/AliceSao/WorldBookManager.git
cd WorldBookManager/src
```

**依赖**：Python 3.10+，无需安装任何第三方库。

---

## TXT 文件格式

每个 TXT 文件代表一个世界书条目，使用固定前缀行格式：

```
WorldBook_Name: 世界名称
WorldBook_NewName: 目标合并名称（可选）
UID: 0
Comment: 条目标题
Order: 100
Position: before_character_definition
Strategy: selective
Recursion: false,false,false
Effect: null,null,null
Keys: 关键字1,关键字2
SecondaryKeys:
Enabled: true
Probability: 100
Content:
这里是条目的正文内容
可以有多行
```

---

## 基本工作流

### 步骤一：从 ST 导出世界书

在 SillyTavern 中，进入世界信息 → 选择世界书 → 点击导出。将 `.json` 文件放入 `JSON/` 目录。

### 步骤二：拆分为 TXT

```bash
python main.py split "YouWorldBook.json"
# 输出到 TXT/YouWorldBook/（每条目一个 TXT 文件）
```

如果 `JSON/` 目录中只有一个 JSON 文件，可以省略文件名：

```bash
python main.py sp   # 自动找到唯一的 JSON 文件
```

### 步骤三：批量编辑

```bash
# 把所有条目改为常量（蓝灯）
python main.py bss constant -t TXT/YouWorldBook

# 只改 UID 1-20 的条目 Order
python main.py bso 50 -t TXT/YouWorldBook -s 1 -e 20

# 批量添加关键字
python main.py bak "龙,火之呼吸" -t TXT/YouWorldBook
```

### 步骤四：合并回 JSON

```bash
python main.py merge -n "YouWorldBook" -t TXT/YouWorldBook
# 生成 JSON/new/YouWorldBook.json
```

### 步骤五：导入 ST

在 SillyTavern 中，进入世界信息 → 导入 → 选择 `JSON/new/YouWorldBook.json`。

---

## 常用参数说明

| 参数 | 说明 |
|------|------|
| `-t <目录>` | 指定 TXT 目录（大多数命令必须指定） |
| `-s <UID>` | 批量操作起始 UID（含） |
| `-e <UID>` | 批量操作结束 UID（含） |
| `-o <目录>` | 输出目录 |
| `-n <名称>` | 世界书名称 |

---

## Position 位置值对照

| 字符串 | 含义 |
|--------|------|
| `before_character_definition` | 角色定义之前 |
| `after_character_definition` | 角色定义之后 |
| `before_example_messages` | 示例消息之前 |
| `after_example_messages` | 示例消息之后 |
| `at_depth` | 固定深度 |
| `before_author_note` | 作者注释之前 |
| `after_author_note` | 作者注释之后 |

---

## Strategy 激活策略

| 值 | 含义 |
|----|------|
| `constant` | 🔵 常量（蓝灯）— 始终插入 |
| `selective` | 🟢 可选（绿灯）— 关键字触发 |
| `vectorized` | 🔗 向量化 — 语义相似度触发 |

---

## 更多

- [完整命令参考](COMMANDS.md)
- [工作流教程](WORKFLOW.md)

### 命令详细参考（Python CLI）

- [CMD_01 — 转换命令](CMD_01_CONVERSION.md)（split、merge、create、list）
- [CMD_02 — 批量字段操作](CMD_02_BATCH_FIELDS.md)（bsu、bsn、bso、bsp、bss、bsr、bse、buf）
- [CMD_03 — 关键字操作](CMD_03_KEYWORDS.md)（add-keywords、remove-keywords、batch-add-keywords 等）
- [CMD_04 — 文件管理](CMD_04_FILE_MGMT.md)（extract-constant、batch-move、remove）

### ST-WBM 扩展文档

- [ST-WBM 使用指南](../st_wbm/README.md)
- [ST-WBM 扩展命令参考](../st_wbm/EXTENSION.md)
