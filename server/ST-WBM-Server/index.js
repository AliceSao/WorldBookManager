/**
 * ST-WBM-Server v3.0 — SillyTavern 后端 Server Plugin
 *
 * 架构：
 *   入口文件，向 Express 路由器注册所有子路由。
 *   路由前缀（由 SillyTavern 管理）：/api/plugins/wb-manager/
 *
 * 安装：
 *   将整个 ST-WBM-Server/ 目录复制到 SillyTavern/plugins/wb-manager/
 *   确保 config.yaml 中 enableServerPlugins: true
 *   重启 SillyTavern 后自动加载。
 *
 * 子路由：
 *   router/api.js  — REST API（TXT 文件管理、批量操作、世界书导出）
 *   router/web.js  — 独立网页（/wb-manager 路径）
 */

import { registerApiRoutes } from "./router/api.js";
import { registerWebRoutes } from "./router/web.js";

// =========================================================================
// Plugin 元信息（SillyTavern Server Plugin 规范）
// =========================================================================

export const info = {
  id: "wb-manager",
  name: "WorldBook Manager",
  description:
    "ST-WBM-Server v3.0：提供独立管理网页及 TXT 文件读写、批量操作、世界书导出等 REST API。",
};

// =========================================================================
// Plugin init（SillyTavern Server Plugin 入口）
// =========================================================================

/**
 * @param {import("express").Router} router
 */
export async function init(router) {
  console.log("[wb-manager] ST-WBM-Server v3.0 正在加载...");

  // 注册 REST API 路由
  registerApiRoutes(router);
  console.log("[wb-manager] REST API 路由已注册");

  // 注册独立网页路由
  registerWebRoutes(router);
  console.log("[wb-manager] 独立网页路由已注册");

  console.log("[wb-manager] 加载完成。路由前缀: /api/plugins/wb-manager/");
  console.log("[wb-manager] 管理界面: <ST 地址>/api/plugins/wb-manager/wb-manager");
}
