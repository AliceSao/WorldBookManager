# Python CLI — 第二类：批量字段操作命令

> 这一类命令对 TXT 目录下的一批文件批量修改特定字段，无需逐个打开文件。  
> 所有批量操作均支持通过 `--uid-start` / `--uid-end` 限定 UID 范围，省略则处理全部文件。  
> 修改直接写入 TXT 文件，不影响 JSON 源文件（需要 `merge` 后才会写入 JSON）。

---

## 命令总览

| 序号 | 命令 | 别名 | 功能 |
|------|------|------|------|
| 5 | `batch-set-uid` | `bsu` | 按顺序批量重新分配 UID |
| 6 | `batch-set-newname` | `bsn` | 批量设置 `WorldBook_NewName` 字段 |
| 7 | `batch-set-order` | `bso` | 批量设置 `Order`（插入顺序权重） |
| 8 | `batch-set-position` | `bsp` | 批量设置 `Position`（上下文插入位置） |
| 9 | `batch-set-strategy` | `bss` | 批量设置激活策略（constant / selective / vectorized） |
| 10 | `batch-set-recursion` | `bsr` | 批量设置递归控制（三参数） |
| 11 | `batch-set-effect` | `bse` | 批量设置效果控制（sticky / cooldown / delay） |
| 12 | `batch-update-field` | `buf` | 批量更新任意自定义字段 |

---

## 通用参数说明

以下参数被大多数批量字段命令共享：

| 参数 | 别名 | 默认值 | 说明 |
|------|------|--------|------|
| `--txt` | `-t` | `TXT/` | TXT 文件所在目录 |
| `--uid-start` | `-s` | 无（不限） | 处理 UID ≥ 此值的文件 |
| `--uid-end` | `-e` | 无（不限） | 处理 UID ≤ 此值的文件 |

> `batch-set-uid` 不支持 UID 范围参数（它按文件排序顺序整体赋值）。

---

## 5. `batch-set-uid` — 批量重新分配 UID

**别名：** `bsu`

按照文件名字母顺序，将目录中的 TXT 文件依次赋予新 UID。  
适合在 `split` 后需要重新整理 UID 序列（例如合并多个世界书时消除冲突）时使用。

### 用法

```bash
python main.py batch-set-uid <UID规格> [--txt 目录]
python main.py bsu           <UID规格> [--txt 目录]
```

### UID 规格格式

| 格式 | 示例 | 含义 |
|------|------|------|
| 范围 | `"1-100"` | 生成 1, 2, 3, … 100（共 100 个） |
| 列表 | `"1,7,10,99"` | 按此顺序逐个赋值 |
| 单个 | `"42"` | 只赋值给第一个文件 |

### 注意事项

- 文件按**文件名字母顺序**排列后依次赋值，与文件内原有 UID 无关
- 若 UID 数量少于文件数量，多余的文件不被处理（会输出警告）
- 此命令无 `--uid-start` / `--uid-end` 参数

### 示例

```bash
# 将 TXT/MyWB/ 中所有文件按顺序编号为 1~N
python main.py bsu "1-50" -t "TXT/MyWB"

# 用指定列表精确赋值
python main.py bsu "100,200,300" -t "TXT/MyWB"
```

---

## 6. `batch-set-newname` — 批量设置新世界书名

**别名：** `bsn`

批量将 TXT 文件中的 `WorldBook_NewName` 字段修改为指定值。  
适用于将一批条目重新归属到另一个世界书时批量打标。

### 用法

```bash
python main.py batch-set-newname <新名称> [--txt 目录] [-s UID起始] [-e UID结束]
python main.py bsn               <新名称> [--txt 目录] [-s UID起始] [-e UID结束]
```

### 示例

```bash
# 将所有文件的 WorldBook_NewName 改为 "NewWorldBook"
python main.py bsn "NewWorldBook" -t "TXT/MyWB"

# 仅修改 UID 10~30 的文件
python main.py bsn "PartB" -t "TXT/MyWB" -s 10 -e 30
```

---

## 7. `batch-set-order` — 批量设置 Order

**别名：** `bso`

批量将 `Order` 字段设置为同一个值。  
Order 决定同一 Position 下条目的插入顺序，数值越小越靠前。

### 用法

```bash
python main.py batch-set-order <Order值> [--txt 目录] [-s UID起始] [-e UID结束]
python main.py bso             <Order值> [--txt 目录] [-s UID起始] [-e UID结束]
```

### 示例

```bash
# 将 TXT/MyWB/ 全部文件 Order 设为 100
python main.py bso 100 -t "TXT/MyWB"

# 仅将 UID 51~100 的文件 Order 设为 200
python main.py bso 200 -t "TXT/MyWB" -s 51 -e 100
```

---

## 8. `batch-set-position` — 批量设置插入位置

**别名：** `bsp`

批量修改 `Position` 字段，控制条目内容插入上下文的位置。

### 用法

```bash
python main.py batch-set-position <位置> [--txt 目录] [-s UID起始] [-e UID结束]
python main.py bsp                <位置> [--txt 目录] [-s UID起始] [-e UID结束]
```

### Position 可选值

与 SillyTavern 世界书 JSON 中的 `position.type` 字段一致：

| 值 | 数字 | 含义 |
|----|------|------|
| `before_character_definition` | 0 | 角色定义之前（默认） |
| `after_character_definition` | 1 | 角色定义之后 |
| `before_example_messages` | 2 | 示例消息之前 |
| `after_example_messages` | 3 | 示例消息之后 |
| `at_depth` | 4 | 指定深度位置 |
| `before_author_note` | 5 | 作者注释之前（临近上下文） |
| `after_author_note` | 6 | 作者注释之后 |

> 与 ST-WBM 扩展的 `/wb-set-position` 短码（`bc`/`ac`/`bn`/`an` 等）不同，  
> Python CLI 直接写入完整字符串到 TXT 文件的 `Position:` 字段，保持与 ST JSON 一致。  
> 详见 → [ST-WBM CMD_03_BATCH_FIELDS.md](../st_wbm/CMD_03_BATCH_FIELDS.md)

### 示例

```bash
# 全部文件设为 before_author_note
python main.py bsp before_author_note -t "TXT/MyWB"

# UID 1-20 设为 after_character_definition
python main.py bsp after_character_definition -t "TXT/MyWB" -s 1 -e 20

# 使用数字编号（等效）
python main.py bsp 5 -t "TXT/MyWB"
```

---

## 9. `batch-set-strategy` — 批量设置激活策略

**别名：** `bss`

批量设置条目的激活策略。策略决定条目何时会被加入上下文。  
内部同时修改 `Constant`、`Selective`、`Vectorized` 三个字段，确保三者互斥。

### 用法

```bash
python main.py batch-set-strategy <策略> [--txt 目录] [-s UID起始] [-e UID结束]
python main.py bss                <策略> [--txt 目录] [-s UID起始] [-e UID结束]
```

### 策略类型

| 策略值 | Constant | Selective | Vectorized | 含义 |
|--------|----------|-----------|------------|------|
| `constant` | `true` | `false` | `false` | 始终插入（蓝灯） |
| `selective` | `false` | `true` | `false` | 关键字触发（绿灯） |
| `vectorized` | `false` | `false` | `true` | 向量搜索触发 |

### 示例

```bash
# 将所有条目设为关键字触发
python main.py bss selective -t "TXT/MyWB"

# 将 UID 1-10 设为常量（始终触发）
python main.py bss constant -t "TXT/MyWB" -s 1 -e 10

# 将 UID 50 以上设为向量模式
python main.py bss vectorized -t "TXT/MyWB" -s 50
```

---

## 10. `batch-set-recursion` — 批量设置递归控制

**别名：** `bsr`

批量修改三个递归控制字段，控制条目在递归扫描时的行为。

### 用法

```bash
python main.py batch-set-recursion <参数串> [--txt 目录] [-s UID起始] [-e UID结束]
python main.py bsr                 <参数串> [--txt 目录] [-s UID起始] [-e UID结束]
```

### 参数串格式

`"<ExcludeRecursion>,<PreventRecursion>,<DelayUntilRecursion>"`

| 位置 | 字段名 | 含义 |
|------|--------|------|
| 第 1 个 | `ExcludeRecursion` | 排除此条目被递归扫描（不可递归） |
| 第 2 个 | `PreventRecursion` | 此条目不触发其他条目的递归（防止进一步递归） |
| 第 3 个 | `DelayUntilRecursion` | 延迟到递归时才激活 |

值为 `true` 或 `false`。

### 示例

```bash
# 所有条目：禁止被递归扫描，但允许触发递归，不延迟
python main.py bsr "true,false,false" -t "TXT/MyWB"

# UID 1-30：全部关闭递归控制（恢复默认行为）
python main.py bsr "false,false,false" -t "TXT/MyWB" -s 1 -e 30
```

---

## 11. `batch-set-effect` — 批量设置效果控制

**别名：** `bse`

批量修改 `Sticky`、`Cooldown`、`Delay` 三个效果字段，控制条目的触发频率行为。

### 用法

```bash
python main.py batch-set-effect <参数串> [--txt 目录] [-s UID起始] [-e UID结束]
python main.py bse              <参数串> [--txt 目录] [-s UID起始] [-e UID结束]
```

### 参数串格式

`"<Sticky>,<Cooldown>,<Delay>"`

| 位置 | 字段名 | 含义 |
|------|--------|------|
| 第 1 个 | `Sticky` | 粘性（触发后保持多少轮）|
| 第 2 个 | `Cooldown` | 冷却（触发后多少轮内不再触发）|
| 第 3 个 | `Delay` | 延迟（触发后等待多少轮才生效）|

值为整数（0 表示禁用）。

### 示例

```bash
# 所有条目重置为无效果
python main.py bse "0,0,0" -t "TXT/MyWB"

# 让 UID 1-10 的条目粘性为 3 轮
python main.py bse "3,0,0" -t "TXT/MyWB" -s 1 -e 10

# UID 50-100：触发后冷却 5 轮
python main.py bse "0,5,0" -t "TXT/MyWB" -s 50 -e 100
```

---

## 12. `batch-update-field` — 批量更新任意字段

**别名：** `buf`

通用字段更新命令，可修改 TXT 文件中任何以 `字段名:` 格式存储的字段。  
适合处理以上专用命令未覆盖的边缘情况。

### 用法

```bash
python main.py batch-update-field <字段名> <字段值> [--txt 目录] [-s UID起始] [-e UID结束]
python main.py buf                <字段名> <字段值> [--txt 目录] [-s UID起始] [-e UID结束]
```

### 示例

```bash
# 将 Comment 字段改为 "已归档"
python main.py buf Comment "已归档" -t "TXT/MyWB"

# 将 UID 1-5 的 Order 设置为 999（与 bso 等效）
python main.py buf Order 999 -t "TXT/MyWB" -s 1 -e 5

# 修改自定义字段
python main.py buf MyCustomField "value" -t "TXT/MyWB"
```

### 注意事项

- 字段名区分前缀匹配，不区分大小写（内部使用 lower 匹配）
- 每个文件中只替换**第一个**匹配的行
- 如果字段不存在，该文件不会被修改（不会追加新行）

---

## UID 范围筛选原理

所有支持 `-s` / `-e` 参数的命令都采用相同的筛选逻辑：

```
  -s 10  -e 50  → 处理 UID 在 [10, 50] 区间内的文件
  -s 10          → 处理 UID ≥ 10 的所有文件
         -e 50   → 处理 UID ≤ 50 的所有文件
  （两者都省略） → 处理目录下所有 TXT 文件
```

UID 从每个 TXT 文件的 `UID: <数字>` 行中读取。无法读取 UID 的文件会被跳过。

---

## 相关文档

- [CMD_01 — 转换命令](CMD_01_CONVERSION.md) — split/merge/create，TXT 文件的来源和去处
- [CMD_03 — 关键字操作](CMD_03_KEYWORDS.md) — 批量管理条目关键字
- [CMD_04 — 文件管理](CMD_04_FILE_MGMT.md) — 提取常量条目、移动文件
- [完整命令参考](COMMANDS.md) | [工作流教程](WORKFLOW.md) | [使用指南](README.md)
