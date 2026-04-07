# ST-WBM 扩展 — 第二类：管理命令

> 管理命令负责世界书和条目的创建、删除、导出以及跨书复制。  
> 这一类命令直接作用于服务器文件系统，部分操作不可撤销，请谨慎使用。

---

## 命令总览

| 序号 | 命令 | 功能 |
|------|------|------|
| 5 | `/wb-new` | 创建新世界书（空白 JSON 文件） |
| 6 | `/wb-new-entry` | 在世界书中创建新条目 |
| 7 | `/wb-del-entry` | 删除世界书中的指定条目 |
| 8 | `/wb-export` | 下载世界书 JSON 文件到本地 |
| 9 | `/wb-copy` | 跨世界书复制条目（拆分 / 合并） |

---

## 5. `/wb-new` — 创建新世界书

在服务器上创建一个新的空白世界书 JSON 文件。  
如果同名世界书已存在，会覆盖（输出警告而非报错）。

### 用法

```
/wb-new <名称>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `<名称>` | **是** | 新世界书的名称（不含 `.json` 后缀） |

### 返回

- 成功：`✅ 已创建新世界书「名称」`
- 覆盖已有：`⚠️ 已覆盖现有世界书「名称」`
- 失败：`[错误] ...` 含错误原因

### 示例

```
/wb-new MyNewWorldBook
/wb-new TempWorkspace
/wb-new CharacterSheet_v2
```

### 使用场景

- 开始一个全新的世界书项目
- 创建临时工作区用于 `/wb-copy` 拆分操作
- 创建测试用世界书

---

## 6. `/wb-new-entry` — 创建新条目

在已有世界书中新增一个空白条目。条目会被分配一个自动生成的 UID，  
默认 Order 为 100，策略为 selective。

### 用法

```
/wb-new-entry name=<世界书名称> [title=<条目标题>]
```

### 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `name=` | **是** | — | 目标世界书名称 |
| `title=` | 否 | `新条目` | 条目的 Comment（标题）字段 |

### 新条目默认字段值

| 字段 | 默认值 |
|------|--------|
| UID | 自动生成（当前最大 UID + 1） |
| Comment | `新条目`（或指定的 title） |
| Order | 100 |
| Position | `before_char_defs` |
| 激活策略 | `selective` |
| Key | `[]`（空） |
| Content | `""`（空） |

### 返回

```
✅ 已在「MyWorldBook」创建新条目 [UID 43]「新章节」
  策略: selective  Order: 100
```

### 示例

```
/wb-new-entry name=MyWorldBook
/wb-new-entry name=MyWorldBook title=主角背景设定
/wb-new-entry name=CharacterSheet title=新角色
```

### 注意事项

- 创建后需要使用双面板 UI（`/wb-ui`）编辑条目内容
- 条目在服务器端立即保存，无需额外保存操作

---

## 7. `/wb-del-entry` — 删除条目

从指定世界书中永久删除一个条目。操作不可撤销。

### 用法

```
/wb-del-entry name=<世界书名称> uid=<UID>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `name=` | **是** | 世界书名称 |
| `uid=` | **是** | 要删除的条目 UID |

### 返回

- 成功：`✅ 已从「MyWorldBook」删除条目 [UID 42]`
- 失败：`[错误] 找不到 UID 为 42 的条目`

### 示例

```
/wb-del-entry name=MyWorldBook uid=42
/wb-del-entry name=CharacterSheet uid=7
```

### 注意事项

- **不可撤销**：删除后无法通过命令恢复，建议先用 `/wb-export` 备份
- 建议先用 `/wb-search` 确认 UID 对应的条目内容，再执行删除
- 如需删除多个条目，可在双面板 UI 中多选后批量删除

---

## 8. `/wb-export` — 下载世界书 JSON

触发浏览器下载，将指定世界书的完整 JSON 文件保存到本地。  
这是将服务器上的世界书备份到本地的标准方式。

### 用法

```
/wb-export <名称>
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `<名称>` | **是** | 世界书名称 |

### 行为

- 在浏览器中触发文件下载，文件名为 `{名称}.json`
- 下载的是服务器当前保存状态（如有未保存修改请先保存）
- 命令返回一个通知，并在聊天框中显示下载链接

### 示例

```
/wb-export MyWorldBook
/wb-export CharacterSheet
```

### 使用场景

- 在进行大规模批量操作前备份当前状态
- 将世界书迁移到另一个 SillyTavern 实例
- 导出后交给 Python CLI 工具（`split` 拆分）进行离线编辑

> 双面板 UI 中每个面板标题旁的 📤 按钮提供相同功能（直接点击即可下载）。

---

## 9. `/wb-copy` — 跨世界书复制条目

将一个世界书中的指定条目（或全部条目）复制到另一个世界书。  
这是实现世界书**拆分**和**合并**操作的核心命令。

### 用法

```
/wb-copy from=<源世界书> to=<目标世界书> [uids=<UID列表>]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `from=` 或 `source=` | **是** | 源世界书名称 |
| `to=` 或 `target=` | **是** | 目标世界书名称 |
| `uids=` | 否 | 要复制的 UID，逗号分隔；省略则复制全部条目 |

### 返回

```
✅ 已将 12 条条目从「TempWB」复制到「MainWB」
  新 UID: 101, 102, 103, 104, 105...
```

### 拆分操作（将部分条目移出主世界书）

```
# 1. 创建临时工作区
/wb-new TempWorkspace

# 2. 找到要拆分的条目 UID
/wb-search name=MainWB q=副线剧情

# 3. 将这些条目复制到临时世界书
/wb-copy from=MainWB to=TempWorkspace uids=30,31,32,33,34

# 4. 在 TempWorkspace 中编辑这些条目
/wb-ui

# 5. 导出 TempWorkspace 作为独立世界书
/wb-export TempWorkspace
```

### 合并操作（将临时世界书的条目合回主世界书）

```
# 将 TempWorkspace 中所有条目合并回 MainWB
/wb-copy from=TempWorkspace to=MainWB

# 或只合并部分条目
/wb-copy from=TempWorkspace to=MainWB uids=1,2,3
```

### 注意事项

- 复制到目标世界书时，UID 会**重新分配**（避免与目标书中现有 UID 冲突）
- 原世界书中的条目**不会被删除**（这是复制而非移动）
- 如需移动（复制后删除源），需手动在源世界书中删除对应条目
- 目标世界书必须已存在（可先用 `/wb-new` 创建）
- 复制完成后会**自动调用 ST `/api/worldbooks/edit`** 将目标世界书同步到运行时内存，生效无需重启；若同步失败输出结果中会有 ⚠️ 提示

---

## 管理命令工作流示例

### 从零建立新世界书

```
# 创建空白世界书
/wb-new CharacterLore

# 批量创建初始条目
/wb-new-entry name=CharacterLore title=世界观总述
/wb-new-entry name=CharacterLore title=主角基础设定
/wb-new-entry name=CharacterLore title=反派背景

# 打开 UI 填写内容
/wb-ui
```

### 备份 → 修改 → 验证

```
# 操作前备份
/wb-export MainWB

# 执行批量修改（见批量字段命令）
/wb-set-strategy name=MainWB strategy=selective

# 验证结果
/wb-info MainWB
```

---

## 相关文档

- [CMD_01 — 查询命令](CMD_01_QUERY.md) — 操作前先用查询确认目标（list、info、search）
- [CMD_03 — 批量字段操作](CMD_03_BATCH_FIELDS.md) — 创建后批量设置字段
- [CMD_04 — 行为与工具](CMD_04_BEHAVIOR.md) — 递归控制、效果设置、UI 面板
- [扩展命令参考](EXTENSION.md) | [Web UI 使用指南](WEBUI.md) | [ST-WBM 总览](README.md)
