/**
 * services/batch.js — TXT 文件批量操作服务
 *
 * 提供对 TXT 文件目录的批量操作：
 *   - batchReplaceField(dir, replacements, uidStart?, uidEnd?)
 *   - batchAddKeywords(dir, keywords, uidStart?, uidEnd?)
 *   - batchClearKeywords(dir, uidStart?, uidEnd?)
 *   - batchEditFiles(dir, transformFn, uidStart?, uidEnd?)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { replaceFields, addKeywords, clearKeywords } from "./entry.js";

/**
 * 从 TXT 内容中提取 UID 值。
 * @param {string} content
 * @returns {number|null}
 */
function extractUID(content) {
  const match = content.match(/^UID:\s*(\d+)/m);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 校验路径不含路径穿越序列。
 * @param {string} p
 * @returns {string}
 */
function validatePath(p) {
  if (!p || p.includes("..")) {
    const err = new Error("路径不合法：包含路径穿越序列或为空");
    err.code = "PATH_TRAVERSAL";
    throw err;
  }
  return path.resolve(p);
}

/**
 * 安全拼接路径。
 * @param {string} base
 * @param {string} rel
 * @returns {string}
 */
function safeJoin(base, rel) {
  const resolved = path.resolve(base, rel);
  if (!resolved.startsWith(path.resolve(base) + path.sep) &&
      resolved !== path.resolve(base)) {
    throw new Error(`路径穿越检测: ${rel}`);
  }
  return resolved;
}

/**
 * 通用批量编辑：遍历目录内 TXT 文件，对 UID 在范围内的文件应用变换函数。
 * @param {string} dir 目录
 * @param {(content: string) => string} transformFn 内容变换函数
 * @param {number|null} uidStart 起始 UID（含）
 * @param {number|null} uidEnd 结束 UID（含）
 * @returns {Promise<{updated: number, skipped: number, files: Array}>}
 */
export async function batchEditFiles(dir, transformFn, uidStart = null, uidEnd = null) {
  const safeDir = validatePath(dir);
  let entries;
  try {
    entries = await fs.readdir(safeDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") throw new Error(`目录不存在: ${safeDir}`);
    throw e;
  }
  const txtFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".txt"))
    .map((e) => safeJoin(safeDir, e.name));

  let updated = 0, skipped = 0;
  const files = [];
  for (const filePath of txtFiles) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const uid = extractUID(content);
      if (uid === null) { skipped++; continue; }
      if (uidStart !== null && uid < uidStart) { skipped++; continue; }
      if (uidEnd !== null && uid > uidEnd) { skipped++; continue; }
      const newContent = transformFn(content);
      await fs.writeFile(filePath, newContent, "utf-8");
      const stat = await fs.stat(filePath);
      files.push({ path: filePath, name: path.basename(filePath), size: stat.size, action: "modified" });
      updated++;
    } catch (e) {
      console.warn(`[batch] 跳过 ${path.basename(filePath)}: ${e.message}`);
      skipped++;
    }
  }
  return { updated, skipped, files };
}

/**
 * 批量替换字段值。
 * @param {string} dir
 * @param {Record<string, string>} replacements 字段名→新值
 * @param {number|null} uidStart
 * @param {number|null} uidEnd
 */
export async function batchReplaceField(dir, replacements, uidStart = null, uidEnd = null) {
  return batchEditFiles(dir, (c) => replaceFields(c, replacements), uidStart, uidEnd);
}

/**
 * 批量添加关键字。
 * @param {string} dir
 * @param {string[]} keywords
 * @param {number|null} uidStart
 * @param {number|null} uidEnd
 */
export async function batchAddKeywords(dir, keywords, uidStart = null, uidEnd = null) {
  return batchEditFiles(dir, (c) => addKeywords(c, keywords), uidStart, uidEnd);
}

/**
 * 批量清空关键字。
 * @param {string} dir
 * @param {number|null} uidStart
 * @param {number|null} uidEnd
 */
export async function batchClearKeywords(dir, uidStart = null, uidEnd = null) {
  return batchEditFiles(dir, clearKeywords, uidStart, uidEnd);
}
