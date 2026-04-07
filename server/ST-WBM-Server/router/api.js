/**
 * router/api.js — REST API 路由
 *
 * 统一响应格式：{ success, message, data, files }
 *
 * 路由列表：
 *   GET  /ping               健康检查
 *   GET  /list-dirs          列出子目录
 *   GET  /list-files         列出 TXT 文件（含元信息）
 *   GET  /read-file          读取 TXT 文件内容
 *   POST /write-file         写入 TXT 文件
 *   POST /delete-file        删除单个 TXT 文件
 *   POST /batch-delete       批量删除 TXT 文件
 *   POST /rename-file        重命名 TXT 文件
 *   POST /batch-replace      批量替换字段
 *   POST /batch-add-keys     批量添加关键字
 *   POST /batch-clear-keys   批量清空关键字
 *   POST /split              世界书 → TXT 文件导出
 */

import path from "node:path";
import fs from "node:fs/promises";
import { listTxtFiles, listDirs, readTxtFile, writeTxtFile, deleteTxtFile, batchDeleteTxtFiles, renameTxtFile } from "../services/file.js";
import { batchReplaceField, batchAddKeywords, batchClearKeywords } from "../services/batch.js";
import { entryToTxt, entryFileName } from "../services/worldbook.js";

/**
 * 统一响应包装。
 * @param {import("express").Response} res
 * @param {{success, message, data?, files?, status?}} payload
 */
function respond(res, { success, message, data = null, files = null, status = 200 }) {
  const body = { success, message };
  if (data !== null) body.data = data;
  if (files !== null) body.files = files;
  res.status(status).json(body);
}

/**
 * 注册所有 API 路由。
 * @param {import("express").Router} router
 */
export function registerApiRoutes(router) {

  // -------------------------------------------------------------------------
  // GET /ping
  // -------------------------------------------------------------------------
  router.get("/ping", (_req, res) => {
    respond(res, {
      success: true,
      message: "wb-manager v3.0 运行正常",
      data: { version: "3.0.0" },
    });
  });

  // -------------------------------------------------------------------------
  // GET /list-dirs?base=<目录>
  // -------------------------------------------------------------------------
  router.get("/list-dirs", async (req, res) => {
    const base = req.query.base;
    if (!base) return respond(res, { success: false, message: "缺少 base 参数", status: 400 });
    try {
      const dirs = await listDirs(base);
      respond(res, { success: true, message: `找到 ${dirs.length} 个子目录`, data: { dirs } });
    } catch (e) {
      const status = e.code === "PATH_TRAVERSAL" ? 403 : 500;
      respond(res, { success: false, message: e.message, status });
    }
  });

  // -------------------------------------------------------------------------
  // GET /list-files?dir=<目录>
  // -------------------------------------------------------------------------
  router.get("/list-files", async (req, res) => {
    const dir = req.query.dir;
    if (!dir) return respond(res, { success: false, message: "缺少 dir 参数", status: 400 });
    try {
      const files = await listTxtFiles(dir);
      respond(res, { success: true, message: `找到 ${files.length} 个 TXT 文件`, data: { files } });
    } catch (e) {
      const status = e.code === "PATH_TRAVERSAL" ? 403 : 500;
      respond(res, { success: false, message: e.message, status });
    }
  });

  // -------------------------------------------------------------------------
  // GET /read-file?path=<文件路径>
  // -------------------------------------------------------------------------
  router.get("/read-file", async (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return respond(res, { success: false, message: "缺少 path 参数", status: 400 });
    try {
      const result = await readTxtFile(filePath);
      respond(res, {
        success: true,
        message: `已读取文件: ${path.basename(result.path)}`,
        data: result,
      });
    } catch (e) {
      const status = e.code === "PATH_TRAVERSAL" ? 403 : 500;
      respond(res, { success: false, message: e.message, status });
    }
  });

  // -------------------------------------------------------------------------
  // POST /write-file
  //   Body: { path: string, content: string }
  // -------------------------------------------------------------------------
  router.post("/write-file", async (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath || content == null)
      return respond(res, { success: false, message: "缺少 path 或 content 参数", status: 400 });
    try {
      const result = await writeTxtFile(filePath, content);
      respond(res, {
        success: true,
        message: `文件${result.action === "created" ? "创建" : "保存"}成功: ${result.name}`,
        files: [result],
      });
    } catch (e) {
      const status = e.code === "PATH_TRAVERSAL" ? 403 : 500;
      respond(res, { success: false, message: e.message, status });
    }
  });

  // -------------------------------------------------------------------------
  // POST /delete-file
  //   Body: { path: string }
  // -------------------------------------------------------------------------
  router.post("/delete-file", async (req, res) => {
    const { path: filePath } = req.body;
    if (!filePath) return respond(res, { success: false, message: "缺少 path 参数", status: 400 });
    try {
      const result = await deleteTxtFile(filePath);
      respond(res, {
        success: true,
        message: `已删除文件: ${result.name}`,
        files: [result],
      });
    } catch (e) {
      const status = e.code === "PATH_TRAVERSAL" ? 403 : 500;
      respond(res, { success: false, message: e.message, status });
    }
  });

  // -------------------------------------------------------------------------
  // POST /batch-delete
  //   Body: { paths: string[] }
  // -------------------------------------------------------------------------
  router.post("/batch-delete", async (req, res) => {
    const { paths } = req.body;
    if (!Array.isArray(paths) || paths.length === 0)
      return respond(res, { success: false, message: "缺少 paths 参数（需为非空数组）", status: 400 });
    try {
      const result = await batchDeleteTxtFiles(paths);
      respond(res, {
        success: result.failed === 0,
        message: `批量删除：成功 ${result.deleted} 个，失败 ${result.failed} 个`,
        data: { deleted: result.deleted, failed: result.failed },
        files: result.files,
      });
    } catch (e) {
      respond(res, { success: false, message: e.message, status: 500 });
    }
  });

  // -------------------------------------------------------------------------
  // POST /rename-file
  //   Body: { path: string, newName: string }
  // -------------------------------------------------------------------------
  router.post("/rename-file", async (req, res) => {
    const { path: filePath, newName } = req.body;
    if (!filePath || !newName)
      return respond(res, { success: false, message: "缺少 path 或 newName 参数", status: 400 });
    try {
      const result = await renameTxtFile(filePath, newName);
      respond(res, {
        success: true,
        message: `已重命名为: ${result.name}`,
        files: [{ path: result.newPath, name: result.name, action: "renamed" }],
      });
    } catch (e) {
      const status = e.code === "PATH_TRAVERSAL" ? 403 : 500;
      respond(res, { success: false, message: e.message, status });
    }
  });

  // -------------------------------------------------------------------------
  // POST /batch-replace
  //   Body: { dir, replacements: Record<string,string>, uidStart?, uidEnd? }
  // -------------------------------------------------------------------------
  router.post("/batch-replace", async (req, res) => {
    const { dir, replacements, uidStart, uidEnd } = req.body;
    if (!dir || !replacements || typeof replacements !== "object")
      return respond(res, { success: false, message: "缺少 dir 或 replacements 参数", status: 400 });
    try {
      const result = await batchReplaceField(
        dir, replacements,
        uidStart != null ? Number(uidStart) : null,
        uidEnd != null ? Number(uidEnd) : null,
      );
      respond(res, {
        success: true,
        message: `批量替换完成：更新 ${result.updated} 个，跳过 ${result.skipped} 个`,
        data: { updated: result.updated, skipped: result.skipped },
        files: result.files,
      });
    } catch (e) {
      const status = e.code === "PATH_TRAVERSAL" ? 403 : 500;
      respond(res, { success: false, message: e.message, status });
    }
  });

  // -------------------------------------------------------------------------
  // POST /batch-add-keys
  //   Body: { dir, keywords: string[], uidStart?, uidEnd? }
  // -------------------------------------------------------------------------
  router.post("/batch-add-keys", async (req, res) => {
    const { dir, keywords, uidStart, uidEnd } = req.body;
    if (!dir || !Array.isArray(keywords))
      return respond(res, { success: false, message: "缺少 dir 或 keywords 参数（需为数组）", status: 400 });
    try {
      const result = await batchAddKeywords(
        dir, keywords,
        uidStart != null ? Number(uidStart) : null,
        uidEnd != null ? Number(uidEnd) : null,
      );
      respond(res, {
        success: true,
        message: `批量添加关键字完成：更新 ${result.updated} 个，跳过 ${result.skipped} 个`,
        data: { updated: result.updated, skipped: result.skipped },
        files: result.files,
      });
    } catch (e) {
      const status = e.code === "PATH_TRAVERSAL" ? 403 : 500;
      respond(res, { success: false, message: e.message, status });
    }
  });

  // -------------------------------------------------------------------------
  // POST /batch-clear-keys
  //   Body: { dir, uidStart?, uidEnd? }
  // -------------------------------------------------------------------------
  router.post("/batch-clear-keys", async (req, res) => {
    const { dir, uidStart, uidEnd } = req.body;
    if (!dir) return respond(res, { success: false, message: "缺少 dir 参数", status: 400 });
    try {
      const result = await batchClearKeywords(
        dir,
        uidStart != null ? Number(uidStart) : null,
        uidEnd != null ? Number(uidEnd) : null,
      );
      respond(res, {
        success: true,
        message: `批量清空关键字完成：更新 ${result.updated} 个，跳过 ${result.skipped} 个`,
        data: { updated: result.updated, skipped: result.skipped },
        files: result.files,
      });
    } catch (e) {
      const status = e.code === "PATH_TRAVERSAL" ? 403 : 500;
      respond(res, { success: false, message: e.message, status });
    }
  });

  // -------------------------------------------------------------------------
  // POST /split — 世界书条目 → TXT 文件导出
  //   Body: { name: string, outDir: string, entries: WorldBookEntry[] }
  // -------------------------------------------------------------------------
  router.post("/split", async (req, res) => {
    const { name, outDir, entries } = req.body;
    if (!outDir || !Array.isArray(entries))
      return respond(res, { success: false, message: "缺少 outDir 或 entries 参数", status: 400 });
    if (outDir.includes("..")) {
      return respond(res, { success: false, message: "路径不合法：包含路径穿越序列", status: 403 });
    }
    try {
      await fs.mkdir(path.resolve(outDir), { recursive: true });
      const files = [];
      let created = 0, skipped = 0;
      for (const entry of entries) {
        if (entry.index == null) { skipped++; continue; }
        try {
          const fileName = entryFileName(entry);
          const filePath = path.join(path.resolve(outDir), fileName);
          const content = entryToTxt(entry);
          await fs.writeFile(filePath, content, "utf-8");
          const stat = await fs.stat(filePath);
          files.push({ path: filePath, name: fileName, size: stat.size, action: "created" });
          created++;
        } catch (e) {
          console.warn(`[split] 跳过条目 ${entry.index}: ${e.message}`);
          skipped++;
        }
      }
      console.log(`[wb-manager] split「${name || "unnamed"}」→ ${outDir}：${created} 个文件`);
      respond(res, {
        success: true,
        message: `导出完成：生成 ${created} 个文件，跳过 ${skipped} 个`,
        data: { created, skipped, outDir: path.resolve(outDir), worldbook: name },
        files,
      });
    } catch (e) {
      respond(res, { success: false, message: e.message, status: 500 });
    }
  });
}
