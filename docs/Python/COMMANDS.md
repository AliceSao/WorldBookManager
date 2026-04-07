# Python CLI — 完整命令参考

所有命令在 `src/` 目录下运行：`python main.py <命令> [参数]`

每条命令都有一个短别名，完整名和别名效果相同。

---

## 文件操作类

---

### `split` / `sp` — 拆分世界书 JSON

将 SillyTavern 导出的 JSON 世界书拆分为每条目一个 TXT 文件。

```bash
python main.py split [json_file] [-o <输出目录>]
```

| 参数 | 说明 |
|------|------|
| `json_file` | JSON 文件路径（可选，默认自动从 `JSON/` 目录查找唯一或最新文件）|
| `-o <目录>` | 输出目录（默认：`TXT/{世界书名}/`）|

**示例**：

```bash
python main.py split "YouWorldBook.json"
python main.py sp
python main.py sp "JSON/old/世界.json" -o TXT/世界/
```

---

### `merge` / `mg` — 合并 TXT 为世界书 JSON

将 TXT 目录中的条目文件合并为 JSON 世界书。

```bash
python main.py merge -n <名称> -t <TXT目录> [-o <输出目录>] [-f new|old]
```

| 参数 | 说明 |
|------|------|
| `-n <名称>` | 输出世界书名称（必填）|
| `-t <目录>` | TXT 文件来源目录或通配符（必填）|
| `-o <目录>` | 输出目录（默认：`JSON/new/`）|
| `-f new\|old` | 输出格式（默认：new）|

**示例**：

```bash
python main.py merge -n "YouWorldBook" -t TXT/YouWorldBook
python main.py mg -n "导出世界" -t "TXT/YouWorldBook/*.txt"
```

---

### `create` / `cr` — 创建 TXT 模板

创建一个空白的 TXT 条目文件。

```bash
python main.py create -n <名称> [-u <UID>] [-o <数值>] [-d <目录>]
```

| 参数 | 说明 |
|------|------|
| `-n <名称>` | 条目标题（Comment，必填）|
| `-u <UID>` | UID（可选，不填则自动生成）|
| `-o <数值>` | Order（可选，默认 100）|
| `-d <目录>` | 输出目录（默认：`TXT/TMP/`）|

**示例**：

```bash
python main.py create -n "新角色" -u 999 -o 90
python main.py cr -n "地名条目" -d TXT/YouWorldBook
```

---

### `list` / `ls` — 列出 TXT 文件

列出指定目录中的所有 TXT 条目文件及基本信息。

```bash
python main.py list [-t <目录>]
```

**示例**：

```bash
python main.py ls
python main.py ls -t TXT/YouWorldBook
```

---

### `remove` / `rm` — 删除目录或文件

```bash
python main.py remove <路径> [-r]
```

| 参数 | 说明 |
|------|------|
| `<路径>` | 目录或文件路径 |
| `-r` | 递归删除目录（非空目录必须加此参数）|

**示例**：

```bash
python main.py rm TXT/OldWorldBook -r
python main.py rm TXT/TMP/entry_999.txt
```

---

### `batch-move` / `bm` — 批量移动 TXT 文件

```bash
python main.py batch-move <source> -o <目标目录>
```

| 参数 | 说明 |
|------|------|
| `<source>` | 源文件路径（支持通配符，如 `TXT/OldDir/*.txt`）|
| `-o <目录>` | 目标目录（必填）|

**示例**：

```bash
python main.py bm "TXT/OldDir/*.txt" -o TXT/NewDir
```

---

## 批量属性设置类

以下命令均支持 `-s <起始UID>` 和 `-e <结束UID>` 来限定操作范围，省略则对目录内所有文件生效。

---

### `batch-set-uid` / `bsu` — 批量设置 UID

```bash
python main.py batch-set-uid <uid_spec> [-t <目录>]
```

| 参数 | 说明 |
|------|------|
| `<uid_spec>` | UID 规格：范围 `"1-100"` 或列表 `"1,7,10"` |
| `-t <目录>` | TXT 目录（默认 `TXT/`）|

**示例**：

```bash
python main.py bsu "1-50" -t TXT/YouWorldBook
python main.py bsu "0,5,10" -t TXT/YouWorldBook
```

---

### `batch-set-newname` / `bsn` — 批量设置世界书名称

修改 TXT 文件中的 `WorldBook_NewName` 字段（合并时使用的目标名称）。

```bash
python main.py batch-set-newname <new_name> [-t <目录>] [-s <UID>] [-e <UID>]
```

**示例**：

```bash
python main.py bsn "新世界书名" -t TXT/YouWorldBook
python main.py bsn "角色库" -t TXT/YouWorldBook -s 1 -e 20
```

---

### `batch-set-order` / `bso` — 批量设置 Order

```bash
python main.py batch-set-order <order_value> [-t <目录>] [-s <UID>] [-e <UID>]
```

**示例**：

```bash
python main.py bso 100 -t TXT/YouWorldBook
python main.py bso 50 -t TXT/YouWorldBook -s 1 -e 30
```

---

### `batch-set-position` / `bsp` — 批量设置插入位置

```bash
python main.py batch-set-position <position> [-t <目录>] [-s <UID>] [-e <UID>]
```

**position 可选值**：

| 值 | 含义 |
|----|------|
| `before_character_definition` | 角色定义之前 |
| `after_character_definition` | 角色定义之后 |
| `before_example_messages` | 示例消息之前 |
| `after_example_messages` | 示例消息之后 |
| `at_depth` | 固定深度 |
| `before_author_note` | 作者注释之前 |
| `after_author_note` | 作者注释之后 |

**示例**：

```bash
python main.py bsp before_author_note -t TXT/YouWorldBook
python main.py bsp at_depth -t TXT/YouWorldBook -s 1 -e 10
```

---

### `batch-set-strategy` / `bss` — 批量设置激活策略

```bash
python main.py batch-set-strategy <strategy> [-t <目录>] [-s <UID>] [-e <UID>]
```

| strategy 值 | 含义 |
|-------------|------|
| `constant` | 🔵 常量（始终插入）|
| `selective` | 🟢 可选（关键字触发）|
| `vectorized` | 🔗 向量化 |

**示例**：

```bash
python main.py bss constant -t TXT/YouWorldBook
python main.py bss selective -t TXT/YouWorldBook -s 51 -e 100
```

---

### `batch-set-recursion` / `bsr` — 批量设置递归控制

```bash
python main.py batch-set-recursion <prevent_incoming,prevent_outgoing,delay_until> [-t <目录>] [-s <UID>] [-e <UID>]
```

参数为三个逗号分隔的值：

| 字段 | 说明 |
|------|------|
| `prevent_incoming` | 禁止被其他条目递归激活（true/false）|
| `prevent_outgoing` | 禁止递归激活其他条目（true/false）|
| `delay_until` | 延迟递归触发（false 或数字）|

**示例**：

```bash
python main.py bsr "true,false,false" -t TXT/YouWorldBook
python main.py bsr "false,false,false" -t TXT/YouWorldBook -s 1 -e 20
```

---

### `batch-set-effect` / `bse` — 批量设置效果

```bash
python main.py batch-set-effect <sticky,cooldown,delay> [-t <目录>] [-s <UID>] [-e <UID>]
```

三个逗号分隔的值（整数或 null）：

| 字段 | 说明 |
|------|------|
| `sticky` | 粘性（激活后保持几轮）|
| `cooldown` | 冷却（激活后几轮内不再激活）|
| `delay` | 延迟（几轮后才开始激活）|

**示例**：

```bash
python main.py bse "0,0,0" -t TXT/YouWorldBook
python main.py bse "3,null,null" -t TXT/YouWorldBook -s 1 -e 10
```

---

### `batch-update-field` / `buf` — 批量更新任意字段

更新 TXT 文件中任意前缀字段的值。

```bash
python main.py batch-update-field <field> <value> [-t <目录>] [-s <UID>] [-e <UID>]
```

**示例**：

```bash
# 批量将 Probability 改为 80
python main.py buf Probability 80 -t TXT/YouWorldBook

# 批量将 Enabled 改为 false
python main.py buf Enabled false -t TXT/YouWorldBook -s 1 -e 5
```

---

## 关键字操作类

---

### `add-keywords` / `ak` — 添加关键字（单条目）

向指定 UID 的条目添加关键字。

```bash
python main.py add-keywords <keywords> -t <目录> -u <UID>
```

| 参数 | 说明 |
|------|------|
| `<keywords>` | 关键字（单个 `"词"` 或多个 `"词1,词2"`）|
| `-t <目录>` | TXT 目录（必填）|
| `-u <UID>` | 条目 UID（必填）|

**示例**：

```bash
python main.py ak "炭治郎,鬼杀队" -t TXT/YouWorldBook -u 5
```

---

### `remove-keywords` / `rk` — 删除关键字（单条目）

```bash
python main.py remove-keywords <keywords> -t <目录> -u <UID>
```

**示例**：

```bash
python main.py rk "旧关键字" -t TXT/YouWorldBook -u 5
```

---

### `clear-keywords` / `ck` — 清空关键字（单条目）

清空指定 UID 条目的所有关键字。

```bash
python main.py clear-keywords -t <目录> -u <UID>
```

**示例**：

```bash
python main.py ck -t TXT/YouWorldBook -u 5
```

---

### `batch-add-keywords` / `bak` — 批量添加关键字

向范围内的条目批量添加关键字。

```bash
python main.py batch-add-keywords <keywords> [-t <目录>] [-s <UID>] [-e <UID>]
```

**示例**：

```bash
python main.py bak "鬼,恶魔" -t TXT/YouWorldBook
python main.py bak "炎柱" -t TXT/YouWorldBook -s 1 -e 20
```

---

### `batch-clear-keywords` / `bck` — 批量清空关键字

```bash
python main.py batch-clear-keywords [-t <目录>] [-s <UID>] [-e <UID>]
```

**示例**：

```bash
python main.py bck -t TXT/YouWorldBook
python main.py bck -t TXT/YouWorldBook -s 1 -e 10
```

---

## 提取操作类

---

### `extract-by-key` / `ebk` — 按关键字提取条目

将包含指定关键字的条目提取（复制）到新目录。

```bash
python main.py extract-by-key <keyword> [-t <目录>] [-o <输出目录>]
```

**示例**：

```bash
python main.py ebk "炭治郎" -t TXT/YouWorldBook
python main.py ebk "龙" -t TXT/YouWorldBook -o TXT/Dragon/
```

---

### `extract-constant` / `ec` — 提取常量（蓝灯）条目

将目录中所有 Strategy 为 `constant` 的条目提取到新目录。

```bash
python main.py extract-constant <source_dir> [-o <输出目录>]
```

**示例**：

```bash
python main.py ec TXT/YouWorldBook
python main.py ec TXT/YouWorldBook -o TXT/YouWorldBook_constants
```

---

## 获取帮助

```bash
# 查看所有命令
python main.py --help

# 查看单个命令详细用法
python main.py split --help
python main.py bss --help
```

---

## 命令详细参考

每类命令的详细说明（参数、示例、注意事项）见以下文档：

- [CMD_01 — 转换命令](CMD_01_CONVERSION.md)（split、merge、create、list）
- [CMD_02 — 批量字段操作](CMD_02_BATCH_FIELDS.md)（bsu、bsn、bso、bsp、bss、bsr、bse、buf）
- [CMD_03 — 关键字操作](CMD_03_KEYWORDS.md)（add-keywords、remove-keywords、batch-add-keywords 等）
- [CMD_04 — 文件管理](CMD_04_FILE_MGMT.md)（extract-constant、batch-move、remove）

基本使用流程见：[README.md](README.md) | 实际场景示例见：[WORKFLOW.md](WORKFLOW.md)
