/**
 * routes/worldbook.ts — 世界书 CRUD 路由
 *
 * GET  /ping                      健康检查
 * GET  /worldbooks                列出所有世界书
 * GET  /worldbooks/:name          获取世界书所有条目
 * PUT  /worldbooks/:name          保存世界书（覆盖全部条目）
 * POST /worldbooks                创建新世界书
 * DELETE /worldbooks/:name        删除世界书
 * GET  /worldbooks/:name/export   导出世界书 JSON 文件
 * POST /worldbooks/:name/import   从 JSON body 导入世界书
 */
import type { Router } from "express";
export declare function registerWorldbookRoutes(router: Router): void;
//# sourceMappingURL=worldbook.d.ts.map