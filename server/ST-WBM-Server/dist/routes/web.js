/**
 * routes/web.ts — 独立网页路由
 *
 * GET /ui/       → 服务前端 Vue 应用（dist/index.html）
 * GET /ui/*      → 服务前端静态资源
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export function registerWebRoutes(router) {
    const distPath = path.join(__dirname, "..", "..", "web", "dist");
    router.use("/ui", express.static(distPath));
    router.get("/ui/*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"), (err) => {
            if (err) {
                res.status(404).json({
                    success: false,
                    message: "管理界面未找到，请确认已构建前端（运行 pnpm build）",
                });
            }
        });
    });
    router.get("/", (_req, res) => {
        res.json({
            success: true,
            message: "ST-WBM-Server v1.0 运行正常",
            data: {
                version: "1.0.0",
                ui: "/api/plugins/wb-manager/ui/",
                api: {
                    worldbooks: "GET /api/plugins/wb-manager/worldbooks",
                    entries: "GET /api/plugins/wb-manager/worldbooks/:name/entries",
                },
            },
        });
    });
}
//# sourceMappingURL=web.js.map