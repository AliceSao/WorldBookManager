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
import { listWorldbooks, readWorldbook, writeWorldbook, createWorldbook, deleteWorldbook, } from "../services/worldbook.js";
function ok(res, message, data) {
    res.json({ success: true, message, data: data ?? null });
}
function fail(res, message, status = 400) {
    res.status(status).json({ success: false, message, data: null });
}
export function registerWorldbookRoutes(router) {
    // ────────────────────────────────────────────────────────────────────────
    // GET /ping
    // ────────────────────────────────────────────────────────────────────────
    router.get("/ping", (_req, res) => {
        ok(res, "ST-WBM-Server v1.0 运行正常", { version: "1.0.0" });
    });
    // ────────────────────────────────────────────────────────────────────────
    // GET /csrf-token
    // 返回当前会话的 CSRF token（供前端 Vue 应用包含在写请求 Header 中）
    // ────────────────────────────────────────────────────────────────────────
    router.get("/csrf-token", (req, res) => {
        try {
            const token = typeof req.csrfToken === "function"
                ? req.csrfToken()
                : null;
            res.json({ success: true, token });
        }
        catch {
            res.json({ success: true, token: null });
        }
    });
    // ────────────────────────────────────────────────────────────────────────
    // GET /worldbooks?user=<username>
    // ────────────────────────────────────────────────────────────────────────
    router.get("/worldbooks", async (req, res) => {
        const user = String(req.query.user || "default-user");
        try {
            const names = await listWorldbooks(user);
            ok(res, `找到 ${names.length} 个世界书`, { worldbooks: names, user });
        }
        catch (e) {
            fail(res, `列出世界书失败：${e.message}`, 500);
        }
    });
    // ────────────────────────────────────────────────────────────────────────
    // GET /worldbooks/:name?user=<username>
    // ────────────────────────────────────────────────────────────────────────
    router.get("/worldbooks/:name", async (req, res) => {
        const { name } = req.params;
        const user = String(req.query.user || "default-user");
        try {
            const entries = await readWorldbook(name, user);
            ok(res, `已加载世界书 "${name}"（${entries.length} 条条目）`, {
                name,
                entries,
                count: entries.length,
            });
        }
        catch (e) {
            fail(res, `读取世界书失败：${e.message}`, 500);
        }
    });
    // ────────────────────────────────────────────────────────────────────────
    // PUT /worldbooks/:name
    // body: { entries: RawEntry[], user?: string }
    // ────────────────────────────────────────────────────────────────────────
    router.put("/worldbooks/:name", async (req, res) => {
        const { name } = req.params;
        const { entries, user = "default-user" } = req.body;
        if (!Array.isArray(entries)) {
            return fail(res, "参数错误：entries 必须是数组");
        }
        try {
            await writeWorldbook(name, entries, user);
            ok(res, `已保存世界书 "${name}"（${entries.length} 条条目）`, {
                name,
                count: entries.length,
            });
        }
        catch (e) {
            fail(res, `保存世界书失败：${e.message}`, 500);
        }
    });
    // ────────────────────────────────────────────────────────────────────────
    // POST /worldbooks
    // body: { name: string, entries?: RawEntry[], user?: string }
    // ────────────────────────────────────────────────────────────────────────
    router.post("/worldbooks", async (req, res) => {
        const { name, entries = [], user = "default-user" } = req.body;
        if (!name || typeof name !== "string") {
            return fail(res, "参数错误：name 不能为空");
        }
        try {
            const created = await createWorldbook(name, entries, user);
            ok(res, created
                ? `已创建世界书 "${name}"`
                : `已覆盖世界书 "${name}"`, { name, created });
        }
        catch (e) {
            fail(res, `创建世界书失败：${e.message}`, 500);
        }
    });
    // ────────────────────────────────────────────────────────────────────────
    // DELETE /worldbooks/:name?user=<username>
    // ────────────────────────────────────────────────────────────────────────
    router.delete("/worldbooks/:name", async (req, res) => {
        const { name } = req.params;
        const user = String(req.query.user || "default-user");
        try {
            const deleted = await deleteWorldbook(name, user);
            if (deleted) {
                ok(res, `已删除世界书 "${name}"`);
            }
            else {
                fail(res, `世界书 "${name}" 不存在或删除失败`, 404);
            }
        }
        catch (e) {
            fail(res, `删除世界书失败：${e.message}`, 500);
        }
    });
    // ────────────────────────────────────────────────────────────────────────
    // GET /worldbooks/:name/export?user=<username>
    // 返回原始 JSON 文件内容（用于浏览器下载）
    // ────────────────────────────────────────────────────────────────────────
    router.get("/worldbooks/:name/export", async (req, res) => {
        const { name } = req.params;
        const user = String(req.query.user || "default-user");
        try {
            const entries = await readWorldbook(name, user);
            const entriesObj = {};
            entries.forEach((e, i) => {
                entriesObj[String(i)] = e;
            });
            const json = { entries: entriesObj };
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(name)}.json"`);
            res.json(json);
        }
        catch (e) {
            fail(res, `导出世界书失败：${e.message}`, 500);
        }
    });
    // ────────────────────────────────────────────────────────────────────────
    // POST /worldbooks/:name/import
    // body: 标准 ST 世界书 JSON { entries: { "0": {...}, "1": {...} } }
    // ────────────────────────────────────────────────────────────────────────
    router.post("/worldbooks/:name/import", async (req, res) => {
        const { name } = req.params;
        const { user = "default-user", entries: rawEntries } = req.body;
        if (!rawEntries || typeof rawEntries !== "object") {
            return fail(res, "参数错误：请传入标准 SillyTavern 世界书格式 { entries: {...} }");
        }
        try {
            const entries = Object.values(rawEntries).sort((a, b) => a.uid - b.uid);
            await writeWorldbook(name, entries, user);
            ok(res, `已导入世界书 "${name}"（${entries.length} 条条目）`, {
                name,
                count: entries.length,
            });
        }
        catch (e) {
            fail(res, `导入世界书失败：${e.message}`, 500);
        }
    });
}
//# sourceMappingURL=worldbook.js.map