# ST-WBM 扩展 — 第三类：批量字段操作命令

> 这一类命令对世界书内的一批条目（可按 UID 列表精确指定，或不填则全部）  
> 批量修改特定字段。操作立即写入服务器文件，无法撤销，建议先导出备份。

---

## 命令总览

| 序号 | 命令 | 功能 |
|------|------|------|
| 10 | `/wb-set-strategy` | 批量设置激活策略（constant / selective / vectorized） |
| 11 | `/wb-set-position` | 批量设置插入位置（Position） |
| 12 | `/wb-set-order` | 批量设置排列顺序（Order） |
| 13 | `/wb-set-depth` | 批量设置扫描深度（Depth） |
| 14 | `/wb-set-prob` | 批量设置触发概率（Probability） |
| 15 | `/wb-set-name` | 批量设置条目标题（Comment） |
| 16 | `/wb-add-keys` | 批量追加关键字 |
| 17 | `/wb-set-keys` | 批量替换关键字（覆盖原有） |
| 18 | `/wb-clear-keys` | 批量清空关键字 |
| 19 | `/wb-enable` | 批量启用 / 禁用条目 |

---

## 通用参数说明

以下参数被所有批量字段命令共享：

| 参数 | 必填 | 说明 |
|------|------|------|
| `name=` | **是** | 世界书名称 |
| `uids=` | 否 | 逗号分隔的 UID 列表（如 `uids=1,5,10`）；省略则处理所有条目 |

---

## 10. `/wb-set-strategy` — 批量设置激活策略

将指定条目的激活策略批量更改为 `constant`、`selective` 或 `vectorized` 之一。  
内部同时写入 Constant、Selective、Vectorized 三个字段，保证三者互斥。

### 用法

```
/wb-set-strategy name=<世界书> strategy=<策略> [uids=<UID列表>]
```

### 策略值

| 值 | 含义 |
|----|------|
| `constant` | 蓝灯：始终插入上下文，不依赖关键字 |
| `selective` | 绿灯：仅在关键字出现时插入 |
| `vectorized` | 向量检索触发 |

### 示例

```
# 将全部条目设为关键字触发
/wb-set-strategy name=MyWorldBook strategy=selective

# 将 UID 1、2、3 设为常量（始终插入）
/wb-set-strategy name=MyWorldBook strategy=constant uids=1,2,3

# 将特定条目改为向量模式
/wb-set-strategy name=MyWorldBook strategy=vectorized uids=20,21,22
```

---

## 11. `/wb-set-position` — 批量设置插入位置

批量修改条目的 `Position` 字段，控制条目内容在上下文中插入的位置。

### 用法

```
/wb-set-position name=<世界书> pos=<位置> [uids=<UID列表>]
```

### Position 可选值

命令接受**短码**或**完整字符串**或**数字**，均等效：

| 短码 | 完整字符串 | 数字 | 含义 |
|------|-----------|------|------|
| `bc` | `before_character_definition` | 0 | 角色定义之前（默认） |
| `ac` | `after_character_definition` | 1 | 角色定义之后 |
| `be` | `before_example_messages` | 2 | 示例消息之前 |
| `ae` | `after_example_messages` | 3 | 示例消息之后 |
| `ad` | `at_depth` | 4 | 指定深度位置 |
| `bn` | `before_author_note` | 5 | 作者注释之前（临近上下文） |
| `an` | `after_author_note` | 6 | 作者注释之后 |

> Python CLI 的 `batch-set-position` 使用完整字符串（`before_character_definition` 等），  
> 与此处短码不同。详见 → [Python CLI CMD_02_BATCH_FIELDS.md](../Python/CMD_02_BATCH_FIELDS.md)

### 示例

```
# 全部条目移到 before_author_note（高优先级，临近上下文）
/wb-set-position name=MyWorldBook pos=bn

# UID 1-5 放在角色定义之前（等效写法均可）
/wb-set-position name=MyWorldBook pos=bc uids=1,2,3,4,5
/wb-set-position name=MyWorldBook pos=0 uids=1,2,3,4,5
/wb-set-position name=MyWorldBook pos=before_character_definition uids=1,2,3,4,5
```

---

## 12. `/wb-set-order` — 批量设置 Order

批量设置条目的 `Order` 值。同一 Position 下的条目按 Order 从小到大排列，数值越小越先插入。

### 用法

```
/wb-set-order name=<世界书> order=<数值> [uids=<UID列表>]
```

### 参数

| 参数 | 说明 |
|------|------|
| `order=` | 整数，范围通常 0 ~ 999，默认 100 |

### 示例

```
# 将所有条目 Order 重置为 100
/wb-set-order name=MyWorldBook order=100

# 将重要的条目优先级提高（Order 值更小）
/wb-set-order name=MyWorldBook order=10 uids=1,2,3

# 将不重要的条目降低优先级
/wb-set-order name=MyWorldBook order=500 uids=40,41,42
```

---

## 13. `/wb-set-depth` — 批量设置扫描深度

批量设置条目的 `Depth` 字段，控制在多少层递归扫描中该条目会被触发。

### 用法

```
/wb-set-depth name=<世界书> depth=<数值> [uids=<UID列表>]
```

### 参数

| 参数 | 说明 |
|------|------|
| `depth=` | 整数，表示从当前上下文往前扫描多少轮对话 |

### 示例

```
# 将全部条目深度设为 4（扫描最近 4 轮对话）
/wb-set-depth name=MyWorldBook depth=4

# 让特定条目只在浅层被扫描
/wb-set-depth name=MyWorldBook depth=1 uids=10,11,12
```

---

## 14. `/wb-set-prob` — 批量设置触发概率

批量设置条目被激活时的随机触发概率（百分比）。仅对 selective 策略的条目有效。

### 用法

```
/wb-set-prob name=<世界书> prob=<0-100> [uids=<UID列表>]
```

### 参数

| 参数 | 说明 |
|------|------|
| `prob=` | 整数，0（从不触发）~ 100（始终触发，默认） |

### 示例

```
# 全部条目恢复 100% 触发率
/wb-set-prob name=MyWorldBook prob=100

# 让某些条目以 50% 概率触发（营造随机感）
/wb-set-prob name=MyWorldBook prob=50 uids=20,21,22

# 临时禁用（0% 触发）
/wb-set-prob name=MyWorldBook prob=0 uids=30,31
```

---

## 15. `/wb-set-name` — 批量设置条目标题

批量将多个条目的 `Comment`（标题）字段更改为同一值。  
适合批量重命名分组条目（如给一批条目统一加前缀）。

### 用法

```
/wb-set-name name=<世界书> title=<新标题> [uids=<UID列表>]
```

### 参数

| 参数 | 说明 |
|------|------|
| `title=` | 新的条目标题字符串 |

### 示例

```
# 批量重命名指定条目
/wb-set-name name=MyWorldBook title="[副本]角色设定" uids=10,11,12

# 给所有条目加统一前缀（整体标注）
/wb-set-name name=Archive title="[已归档]"
```

---

## 16. `/wb-add-keys` — 批量追加关键字

向指定条目的 `Key` 列表中追加新关键字，不清除原有关键字。  
已存在的关键字不会重复添加。

### 用法

```
/wb-add-keys name=<世界书> keys=<关键字列表> [uids=<UID列表>]
```

### 参数

| 参数 | 说明 |
|------|------|
| `keys=` | 关键字，多个用逗号分隔，如 `keys=炭治郎,主角,鬼杀队` |

### 示例

```
# 给所有条目添加一个分类标签
/wb-add-keys name=MyWorldBook keys=主线

# 给特定条目添加多个关键字
/wb-add-keys name=MyWorldBook keys=炭治郎,鬼杀队,主角 uids=5,6,7

# 给单个条目添加关键字
/wb-add-keys name=MyWorldBook keys=战斗 uids=42
```

---

## 17. `/wb-set-keys` — 批量替换关键字

将指定条目的 `Key` 列表**完全替换**为新的关键字。原有关键字全部丢弃。

### 用法

```
/wb-set-keys name=<世界书> keys=<关键字列表> [uids=<UID列表>]
```

### 与 `/wb-add-keys` 的区别

| 命令 | 行为 |
|------|------|
| `/wb-add-keys` | 追加到现有列表，保留原有关键字 |
| `/wb-set-keys` | **替换**现有列表，丢弃所有原有关键字 |

### 示例

```
# 将 UID 10 的关键字完全替换
/wb-set-keys name=MyWorldBook keys=新关键字A,新关键字B uids=10

# 统一设定所有条目的关键字（覆盖操作，慎用）
/wb-set-keys name=MyWorldBook keys=标准关键字
```

---

## 18. `/wb-clear-keys` — 批量清空关键字

将指定条目的 `Key` 列表重置为空 `[]`，清除所有关键字。

### 用法

```
/wb-clear-keys name=<世界书> [uids=<UID列表>]
```

### 示例

```
# 清空所有条目的关键字
/wb-clear-keys name=MyWorldBook

# 只清空特定条目的关键字
/wb-clear-keys name=MyWorldBook uids=1,2,3,4,5
```

### 使用场景

- 关键字体系重构前的"清空重来"
- 清除不再需要的旧标签
- 在 `selective` 改为 `constant` 策略时，顺手清空无用关键字

---

## 19. `/wb-enable` — 批量启用/禁用条目

批量切换条目的启用状态（enabled 字段）。禁用的条目不参与上下文注入。

### 用法

```
/wb-enable name=<世界书> [enabled=true|false] [uids=<UID列表>]
```

### 参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `enabled=` | `true` | `true` 启用，`false` 禁用 |

### 示例

```
# 禁用所有条目（临时停用整个世界书内容）
/wb-enable name=MyWorldBook enabled=false

# 重新启用
/wb-enable name=MyWorldBook enabled=true

# 只禁用特定条目
/wb-enable name=MyWorldBook enabled=false uids=30,31,32

# 启用特定条目
/wb-enable name=MyWorldBook enabled=true uids=5,6,7
```

### 使用场景

- 调试时临时禁用某些条目，快速测试对上下文的影响
- 将"草稿状态"的条目暂时禁用，等内容完善后再启用
- 在不删除条目的情况下让其暂时不生效

---

## 批量操作最佳实践

### 1. 操作前先备份

```
/wb-export MyWorldBook
```

### 2. 小范围测试后再全量执行

```
# 先测试 3 个条目
/wb-set-strategy name=MyWorldBook strategy=selective uids=1,2,3

# 确认正确后再全量
/wb-set-strategy name=MyWorldBook strategy=selective
```

### 3. 组合操作示例：规范化一批条目

```
# 同时设置策略、位置、顺序和概率
/wb-set-strategy name=MyWorldBook strategy=selective uids=10,11,12
/wb-set-position name=MyWorldBook pos=bn uids=10,11,12
/wb-set-order name=MyWorldBook order=50 uids=10,11,12
/wb-set-prob name=MyWorldBook prob=100 uids=10,11,12
```

---

## 相关文档

- [CMD_01 — 查询命令](CMD_01_QUERY.md) — 操作前先查询确认目标 UID
- [CMD_02 — 管理命令](CMD_02_MANAGE.md) — 创建条目（/wb-new-entry）、导出备份
- [CMD_04 — 行为与工具](CMD_04_BEHAVIOR.md) — 递归控制与效果（/wb-set-recursion、/wb-set-effect）
- [后端 REST API](API.md) — 批量操作对应的 API 端点
- [扩展命令参考](EXTENSION.md) | [ST-WBM 总览](README.md)
