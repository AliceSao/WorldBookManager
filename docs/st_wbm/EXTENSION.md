# ST 扩展命令参考（v1.0）

  ST-WBM-UI 扩展在 SillyTavern 中注册 23 条斜杠命令。

  **依赖**：JS-Slash-Runner 已安装并启用（提供 `getWorldbook`、`updateWorldbookWith` 等全局函数）

  ---

  ## 通用参数说明

  - **name**：世界书名称（必须与 ST 中显示的名称完全一致）
  - **uids**：条目 UID 列表，逗号分隔（如 `uids=0,1,5`），省略则对全部条目生效
  - 所有命令返回文本可用于 STscript 管道（`|`）

  ---

  ## 查询类（4条）

  ### /wb-list
  列出所有世界书名称。

  ### /wb-info `<名称>`
  查看世界书统计信息（总条目数、策略分布、启用/禁用）。

  ### /wb-search `name=<名称> q=<搜索词>`
  在世界书中搜索条目（匹配标题、关键字、内容，最多返回20条）。

  ### /wb-constants `<名称>`
  列出世界书中所有常量（蓝灯）条目。

  ---

  ## 世界书与条目管理（4条）

  ### /wb-new `<名称>`
  创建一个新的空世界书。

  ### /wb-new-entry `name=<名称> [title=<标题>] [strategy=selective] [order=100]`
  在指定世界书中创建新条目。

  ### /wb-del-entry `name=<名称> uid=<UID>`
  删除指定 UID 的条目（不可撤销）。

  ### /wb-copy `from=<源世界书> to=<目标世界书> [uids=<UID列表>]`
  将源世界书中的指定条目（省略 `uids` 则全部）复制到目标世界书。  
  目标世界书中的条目自动重新分配 UID，原世界书保持不变。  
  用于实现世界书**拆分**（copy 部分到新书）和**合并**（copy 全部到主书）。

  ---

  ## 批量属性设置（12条）

  所有批量命令均支持可选的 `uids=<UID列表>` 参数。

  ### /wb-set-strategy `name=<名> strategy=constant|selective|vectorized [uids=...]`

  ### /wb-set-position `name=<名> pos=<位置> [uids=...]`
  位置简码：`bc`(0) `ac`(1) `be`(2) `ae`(3) `ad`(4) `bn`(5) `an`(6)

  ### /wb-set-order `name=<名> order=<数值> [uids=...]`

  ### /wb-set-depth `name=<名> depth=<数值> [uids=...]`

  ### /wb-set-prob `name=<名> prob=<0-100> [uids=...]`

  ### /wb-set-name `name=<名> title=<新标题> [uids=...]`

  ### /wb-add-keys `name=<名> keys=<词1,词2> [uids=...]`
  向条目现有关键字中追加（不重复）。

  ### /wb-set-keys `name=<名> keys=<词1,词2> [uids=...]`
  替换条目的全部关键字。

  ### /wb-clear-keys `name=<名> [uids=...]`
  清空条目的所有关键字。

  ### /wb-set-recursion `name=<名> [pi=true|false] [po=true|false] [uids=...]`
  - `pi`：`prevent_incoming` — 禁止被其他条目递归激活
  - `po`：`prevent_outgoing` — 禁止递归激活其他条目

  ### /wb-set-effect `name=<名> [sticky=n] [cooldown=n] [delay=n] [uids=...]`
  传 `null` 清除该字段（如 `sticky=null`）。

  ### /wb-enable `name=<名> [enabled=true|false] [uids=...]`
  默认 `enabled=true`（启用）。

  ---

  ## 其他工具（3条）

  ### /wb-export `<名称>`
  触发浏览器下载世界书 JSON 文件（通过后端 API）。

  ### /wb-ui
  在新标签页打开双面板管理界面。

  ### /wb-help
  在聊天框中显示完整命令列表。

  ---

  ## 命令详细参考

  - [CMD_01 — 查询命令](CMD_01_QUERY.md)（/wb-list、/wb-info、/wb-search、/wb-constants）
  - [CMD_02 — 管理命令](CMD_02_MANAGE.md)（/wb-new、/wb-new-entry、/wb-del-entry、/wb-export、/wb-copy）
  - [CMD_03 — 批量字段操作](CMD_03_BATCH_FIELDS.md)（/wb-set-strategy、/wb-set-position 等 10 条）
  - [CMD_04 — 行为与工具](CMD_04_BEHAVIOR.md)（/wb-set-recursion、/wb-set-effect、/wb-ui、/wb-help）

  ---

  ## 示例 STscript

  ```
  # 将"角色库"世界书的所有条目策略改为常量
  /wb-set-strategy name=角色库 strategy=constant

  # 搜索包含"龙"的条目
  /wb-search name=世界设定 q=龙 |
  echo 搜索结果: {{pipe}}

  # 批量将 UID 0-5 的条目 Order 设为 50
  /wb-set-order name=我的世界书 order=50 uids=0,1,2,3,4,5
  ```
  