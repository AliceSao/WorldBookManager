/**
 * routes/entry.ts — 单条目操作路由
 *
 * GET  /worldbooks/:name/entries          搜索/列出条目
 * POST /worldbooks/:name/entries          批量添加条目
 * PUT  /worldbooks/:name/entries/:uid     更新单条目
 * DELETE /worldbooks/:name/entries        批量删除条目
 */

import type { Router, Request, Response } from "express";
import {
  readWorldbook,
  writeWorldbook,
  RawEntry,
} from "../services/worldbook.js";
import {
  searchEntries,
  addEntries,
  removeEntries,
  updateEntry,
} from "../services/entry.js";

function ok(res: Response, message: string, data?: unknown) {
  res.json({ success: true, message, data: data ?? null });
}

function fail(res: Response, message: string, status = 400) {
  res.status(status).json({ success: false, message, data: null });
}

export function registerEntryRoutes(router: Router): void {
  // ────────────────────────────────────────────────────────────────────────
  // GET /worldbooks/:name/entries?q=<query>&user=<username>
  // ────────────────────────────────────────────────────────────────────────
  router.get("/worldbooks/:name/entries", async (req: Request, res: Response) => {
    const { name } = req.params;
    const user = String(req.query.user || "default-user");
    const q = String(req.query.q || "");
    try {
      const entries = await readWorldbook(name, user);
      const results = searchEntries(entries, q);
      ok(res, `找到 ${results.length} 条条目`, {
        name,
        entries: results,
        count: results.length,
        total: entries.length,
        query: q,
      });
    } catch (e: unknown) {
      fail(res, `读取条目失败：${(e as Error).message}`, 500);
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // POST /worldbooks/:name/entries
  // body: { entries: Partial<RawEntry>[], user?: string }
  // ────────────────────────────────────────────────────────────────────────
  router.post("/worldbooks/:name/entries", async (req: Request, res: Response) => {
    const { name } = req.params;
    const { entries: overridesList = [{}], user = "default-user" } = req.body as {
      entries?: Partial<RawEntry>[];
      user?: string;
    };
    if (!Array.isArray(overridesList)) {
      return fail(res, "参数错误：entries 必须是数组");
    }
    try {
      const currentEntries = await readWorldbook(name, user);
      const newEntries = addEntries(currentEntries, overridesList);
      await writeWorldbook(name, currentEntries, user);
      ok(res, `已添加 ${newEntries.length} 条条目到 "${name}"`, {
        name,
        new_entries: newEntries,
        count: newEntries.length,
      });
    } catch (e: unknown) {
      fail(res, `添加条目失败：${(e as Error).message}`, 500);
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // PUT /worldbooks/:name/entries/:uid
  // body: Partial<RawEntry> & { user?: string }
  // ────────────────────────────────────────────────────────────────────────
  router.put("/worldbooks/:name/entries/:uid", async (req: Request, res: Response) => {
    const { name } = req.params;
    const uid = parseInt(req.params.uid, 10);
    if (isNaN(uid)) return fail(res, "参数错误：uid 必须是整数");
    const { user = "default-user", ...updates } = req.body as Partial<RawEntry> & {
      user?: string;
    };
    try {
      const entries = await readWorldbook(name, user);
      const updated = updateEntry(entries, uid, updates);
      if (!updated) return fail(res, `条目 uid=${uid} 不存在`, 404);
      await writeWorldbook(name, entries, user);
      ok(res, `已更新条目 uid=${uid}（"${updated.comment}"）`, { entry: updated });
    } catch (e: unknown) {
      fail(res, `更新条目失败：${(e as Error).message}`, 500);
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // DELETE /worldbooks/:name/entries
  // body: { uids: number[], user?: string }
  // ────────────────────────────────────────────────────────────────────────
  router.delete("/worldbooks/:name/entries", async (req: Request, res: Response) => {
    const { name } = req.params;
    const { uids, user = "default-user" } = req.body as {
      uids: number[];
      user?: string;
    };
    if (!Array.isArray(uids) || uids.length === 0) {
      return fail(res, "参数错误：uids 必须是非空数组");
    }
    try {
      const entries = await readWorldbook(name, user);
      const deleted = removeEntries(entries, uids);
      await writeWorldbook(name, entries, user);
      ok(res, `已删除 ${deleted.length} 条条目`, {
        name,
        deleted_uids: deleted.map((e) => e.uid),
        count: deleted.length,
        remaining: entries.length,
      });
    } catch (e: unknown) {
      fail(res, `删除条目失败：${(e as Error).message}`, 500);
    }
  });
}
