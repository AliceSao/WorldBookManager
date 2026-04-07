# ST-WBM 扩展 — 第一类：查询命令

> 查询命令不修改任何数据，仅读取并展示信息。  
> 可在 SillyTavern 的聊天输入框中随时输入，不影响当前世界书状态。  
> 返回结果直接显示在聊天框中。

---

## 命令总览

| 序号 | 命令 | 功能 |
|------|------|------|
| 1 | `/wb-list` | 列出所有世界书名称 |
| 2 | `/wb-info` | 查看指定世界书的统计信息 |
| 3 | `/wb-search` | 在世界书中搜索匹配条目 |
| 4 | `/wb-constants` | 列出世界书中所有常量（蓝灯）条目 |

---

## 1. `/wb-list` — 列出所有世界书

列出服务器上所有可用的世界书名称。  
适合在开始操作前快速确认有哪些世界书，以及核实名称的准确拼写。

### 用法

```
/wb-list
```

### 无参数

此命令不接受任何参数。

### 返回示例

```
共找到 5 个世界书：
  • MyWorldBook
  • CharacterSheet
  • LoreBook_v2
  • Archive_2024
  • TempMerge
```

### 使用场景

- 开始任何操作前先确认世界书名称（名称拼写错误会导致后续命令失败）
- 检查服务器是否有预期的世界书文件

---

## 2. `/wb-info` — 世界书统计

读取指定世界书并输出详细的统计概况，包括条目总数、各策略分布、关键字覆盖率等。

### 用法

```
/wb-info <名称>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `<名称>` | **是** | 世界书名称（不含 `.json` 后缀） |

### 返回内容

- 条目总数
- 激活策略分布：constant / selective / vectorized 各有多少条
- Position 分布（按插入位置统计）
- 有关键字的条目数 vs 无关键字的条目数
- UID 范围（最小 UID 到最大 UID）

### 示例

```
/wb-info MyWorldBook
/wb-info CharacterSheet
```

### 返回示例

```
📖 MyWorldBook 统计信息
━━━━━━━━━━━━━━━━━━━━
条目总数：42 条
  constant（蓝灯）：8 条
  selective（关键字）：31 条
  vectorized（向量）：3 条

Position 分布：
  before_char_defs：20 条
  after_char_defs：12 条
  before_author_note：10 条

关键字覆盖：34 条有关键字，8 条无关键字
UID 范围：1 ~ 100
```

---

## 3. `/wb-search` — 搜索条目

在指定世界书中搜索条目，匹配条目的标题（Comment）、内容（Content）或关键字（Key）。  
返回所有命中条目的 UID 和标题列表。

### 用法

```
/wb-search name=<世界书名称> q=<搜索词>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `name=` | **是** | 世界书名称 |
| `q=` | **是** | 搜索词（不区分大小写） |

### 匹配范围

- `Comment`（条目标题）
- `Content`（条目正文）
- `Key`（关键字列表中的任意一项）

匹配采用**包含匹配**（不要求完整词边界），例如搜索 `角色` 可以匹配到 `主角色设`。

### 示例

```
/wb-search name=MyWorldBook q=炭治郎
/wb-search name=CharacterSheet q=主角
/wb-search name=LoreBook q=战斗
```

### 返回示例

```
🔍 在 MyWorldBook 中搜索 "炭治郎"
━━━━━━━━━━━━━━━━━━━━
找到 3 条匹配：
  [UID 5]  炭治郎基础设定
  [UID 12] 炭治郎技能列表
  [UID 38] 关键字含"炭治郎"的背景条目
```

---

## 4. `/wb-constants` — 列出常量条目

列出指定世界书中所有激活策略为 `constant`（蓝灯，始终插入）的条目。  
用于检查哪些条目会一直消耗上下文 Token，有助于优化上下文效率。

### 用法

```
/wb-constants <名称>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `<名称>` | **是** | 世界书名称 |

### 示例

```
/wb-constants MyWorldBook
/wb-constants CharacterSheet
```

### 返回示例

```
📌 MyWorldBook 常量条目（共 8 条）
━━━━━━━━━━━━━━━━━━━━
  [UID 1]  世界观总述
  [UID 2]  主要角色列表
  [UID 3]  故事背景
  [UID 7]  时间线
  [UID 8]  地名词典
  [UID 10] 势力关系图
  [UID 11] 核心规则
  [UID 15] 作者注释模板
```

### 使用场景

- 世界书条目过多时，检查哪些条目始终在消耗 Token
- 验证重要的设定条目（如世界观框架）已正确设为常量
- 在优化 Token 使用前，快速定位可以改为 selective 的候选条目

---

## 查询命令使用技巧

### 操作前先查询

在使用任何批量操作命令之前，养成先查询的习惯：

```
# 1. 确认世界书存在
/wb-list

# 2. 了解结构概况
/wb-info MyWorldBook

# 3. 找到目标条目的 UID
/wb-search name=MyWorldBook q=目标词

# 4. 然后再执行操作（如删除特定条目）
/wb-del-entry name=MyWorldBook uid=42
```

### 组合使用 info 和 constants

```
# 先看总体分布
/wb-info LargeWorldBook

# 如果 constant 条目过多，再列出详情
/wb-constants LargeWorldBook

# 找到不需要常量的条目，改为 selective
/wb-set-strategy name=LargeWorldBook strategy=selective uids=8,10,15
```

---

## 相关文档

- [CMD_02 — 管理命令](CMD_02_MANAGE.md) — 创建、删除、导出、跨书复制
- [CMD_03 — 批量字段操作](CMD_03_BATCH_FIELDS.md) — 批量修改策略、位置、关键字等
- [CMD_04 — 行为与工具](CMD_04_BEHAVIOR.md) — 递归控制、效果、UI 面板
- [扩展命令参考](EXTENSION.md) | [Web UI 使用指南](WEBUI.md) | [ST-WBM 总览](README.md)
