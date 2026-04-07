/**
 * ST-WBM-Server v1.0 — 入口文件
 *
 * SillyTavern Server Plugin 格式：
 *   export const info = { id, name, description }
 *   export async function init(router: Router): Promise<void>
 *
 * 路由前缀（由 SillyTavern 管理）：/api/plugins/wb-manager/
 * 管理界面：<ST地址>/api/plugins/wb-manager/ui/
 */

import type { Router } from "express";
import { registerWorldbookRoutes } from "./routes/worldbook.js";
import { registerEntryRoutes } from "./routes/entry.js";
import { registerBatchRoutes } from "./routes/batch.js";
import { registerWebRoutes } from "./routes/web.js";

export const info = {
  id: "wb-manager",
  name: "WorldBook Manager",
  description: "ST-WBM-Server v1.0：双面板世界书管理器，直接读写世界书 JSON，支持批量操作。",
};

export async function init(router: Router): Promise<void> {
  console.log("[wb-manager] ST-WBM-Server v1.0 正在加载...");

  registerWorldbookRoutes(router);
  console.log("[wb-manager] 世界书路由已注册");

  registerEntryRoutes(router);
  console.log("[wb-manager] 条目路由已注册");

  registerBatchRoutes(router);
  console.log("[wb-manager] 批量操作路由已注册");

  registerWebRoutes(router);
  console.log("[wb-manager] 网页路由已注册");

  console.log("[wb-manager] 加载完成。路由前缀: /api/plugins/wb-manager/");
  console.log("[wb-manager] 管理界面: <ST地址>/api/plugins/wb-manager/ui/");
}
