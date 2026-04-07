# 后端 REST API 参考

  Base URL：`/api/plugins/wb-manager`

  ---

## 健康检查

### GET /ping

  ```json
  { "success": true, "message": "WB Manager running", "data": { "version": "1.0.0" } }
  ```

  ---

## 世界书（Worldbook）

### GET /worldbooks?user=<用户名>

  列出所有世界书名称。

  ```json
  { "success": true, "data": { "worldbooks": ["世界1", "世界2"], "user": "default-user" } }
  ```

### GET /worldbooks/:name?user=<用户名>

  获取指定世界书的所有条目（数组格式，按 uid 升序）。

### POST /worldbooks

  创建世界书。

  Body：`{ "name": "新世界书", "entries": [], "user": "default-user" }`

### PUT /worldbooks/:name

  覆盖保存世界书。

  Body：`{ "entries": [...], "user": "default-user" }`

### DELETE /worldbooks/:name?user=<用户名>

  删除世界书文件。

### GET /worldbooks/:name/export?user=<用户名>

  下载世界书 JSON 文件（Content-Disposition: attachment）。

  ---

## 条目（Entry）

### GET /worldbooks/:name/entries?q=<搜索词>&user=<用户名>

  搜索条目（匹配标题、内容、关键字）。

### POST /worldbooks/:name/entries

  添加条目（批量）。

  Body：`{ "entries": [{ "comment": "标题", "content": "...", ... }], "user": "..." }`

### PUT /worldbooks/:name/entries/:uid

  更新单个条目。

### DELETE /worldbooks/:name/entries

  删除条目（批量）。

  Body：`{ "uids": [0, 1, 2], "user": "..." }`

  ---

## 批量操作（Batch）

### POST /worldbooks/:name/batch/:op

  支持的 op：

  | op | 说明 | 必要 body 字段 |
  |----|------|--------------|
  | `strategy` | 批量设置激活策略 | `uids`, `strategy: constant|selective|vectorized` |
  | `position` | 批量设置插入位置 | `uids`, `position: 0-6` |
  | `depth` | 批量设置深度 | `uids`, `depth: number` |
  | `order` | 批量设置 Order | `uids`, `order: number` |
  | `probability` | 批量设置触发概率 | `uids`, `probability: 0-100` |
  | `name` | 批量重命名 | `uids`, `title: string` |
  | `keys/set` | 批量替换关键字 | `uids`, `keys: string[]` |
  | `keys/add` | 批量添加关键字 | `uids`, `keys: string[]` |
  | `keys/clear` | 批量清空关键字 | `uids` |
  | `recursion` | 批量设置递归控制 | `uids`, `excludeRecursion`, `preventRecursion` |
  | `effect` | 批量设置效果 | `uids`, `sticky`, `cooldown`, `delay` |
  | `enabled` | 批量启用/禁用 | `uids`, `enabled: boolean` |
  | `group-weight` | 批量设置组权重 | `uids`, `groupWeight: number` |
  | `char-filter` | 批量设置角色绑定 | `uids`, `filter: { names, tags, isExclude }` |

  `uids` 为空数组或省略时对全部条目生效。

### POST /worldbooks/:name/copy

  将指定条目复制到另一个世界书。

  Body：`{ "uids": [0,1,2], "target_worldbook": "目标世界书", "user": "..." }`

  ---

## 错误响应格式

  ```json
  { "success": false, "message": "错误描述", "data": null }
  ```
  