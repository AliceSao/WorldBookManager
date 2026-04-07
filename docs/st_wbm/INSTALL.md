# 安装指南

  ## 系统要求

  - SillyTavern（最新版）
  - Node.js 18+（SillyTavern 自带）
  - JS-Slash-Runner 扩展（可选，启用斜杠命令功能）

  ---

  ## 目录结构

  ```
  WorldBookManager/
  ├── ST-WBM-UI/                  ← 前端扩展（安装到 ST extensions）
  │   ├── manifest.json
  │   ├── style.css
  │   ├── index.js                ← 主扩展文件（注入面板 + 23条命令）
  │   ├── src/                    ← Vue 3 源代码（无需修改）
  │   └── ...
  ├── server/
  │   └── ST-WBM-Server/         ← 后端插件（安装到 ST plugins）
  │       ├── dist/               ← 编译后的 JS（直接可用）
  │       ├── web/dist/           ← 编译后的 Web UI（直接可用）
  │       ├── src/                ← TypeScript 源代码
  │       └── package.json
  └── src/                        ← Python CLI 工具（独立，不受影响）
  ```

  ---

  ## 步骤一：安装后端插件

  ### 1.1 从独立仓库克隆（推荐）

  ```bash
  cd /path/to/SillyTavern/plugins
  git clone https://github.com/AliceSao/ST-WBM-Server.git wb-manager
  ```

  > **注意**：目录名必须为 `wb-manager`（插件路由前缀为 `/api/plugins/wb-manager/`）  
  > `dist/` 已包含编译后的 JavaScript，**无需执行 `npm install`**。

  ### 1.1（备用）从主仓库复制

  ```bash
  cp -r server/ST-WBM-Server /path/to/SillyTavern/plugins/wb-manager
  ```

  ### 1.2 验证安装

  启动 SillyTavern 后，访问：

  ```
  http://localhost:8000/api/plugins/wb-manager/ping
  ```

  如果返回 `{"success":true,"data":{"version":"1.0.0"}}`，则后端安装成功。

  ---

  ## 步骤二：安装前端扩展

  ### 2.1 从独立仓库克隆（推荐）

  ```bash
  cd /path/to/ST数据目录/extensions/third-party
  git clone https://github.com/AliceSao/ST-WBM-UI.git ST-WBM-UI
  ```

  ### 2.1（备用）从主仓库复制

  ```bash
  # ST 数据目录通常为 SillyTavern/data/default-user/
  cp -r ST-WBM-UI /path/to/ST数据目录/extensions/third-party/ST-WBM-UI
  ```

  ### 2.2 启用扩展

  在 SillyTavern 中：
  1. 点击顶部 **扩展（Extensions）** 图标
  2. 找到 **WorldBook Manager**
  3. 勾选启用

  ---

  ## 步骤三：安装 JS-Slash-Runner（推荐）

  JS-Slash-Runner 提供 `getWorldbook()`、`updateWorldbookWith()` 等全局函数，是斜杠命令的依赖。

  1. 在 ST 扩展面板中搜索 `JS-Slash-Runner`
  2. 安装并启用
  3. 重启 SillyTavern

  ---

  ## 数据路径配置

  后端默认从以下路径读写世界书文件：

  ```
  {ST根目录}/data/{用户名}/worlds/{世界书名}.json
  ```

  如使用非默认用户名，在 API 请求中通过 `?user=<用户名>` 参数指定。

  ---

  ## 从源码构建（可选）

  如需修改源码后重新构建：

  ```bash
  # 构建前端 Vue 应用
  cd ST-WBM-UI
  npm install
  npm run build   # 输出到 ../server/ST-WBM-Server/web/dist/

  # 编译后端 TypeScript
  cd ../server/ST-WBM-Server
  npm install
  npx tsc         # 输出到 dist/
  ```
  