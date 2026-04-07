/**
 * services/file.js — TXT 文件管理服务
 *
 * 提供完整的 TXT 文件管理能力：
 *   - listTxtFiles(dir)                    → 列出目录下所有 TXT 文件（含元信息）
 *   - readTxtFile(filePath)                → 读取 TXT 文件内容
 *   - writeTxtFile(filePath, content)      → 写入 / 修改 TXT 文件
 *   - deleteTxtFile(filePath)              → 删除单个 TXT 文件
 *   - batchDeleteTxtFiles(filePaths)       → 批量删除
 *   - renameTxtFile(filePath, newName)     → 重命名文件
 *   - listDirs(base)                       → 列出子目录
 *
 * 每个函数均包含路径安全检查、文件存在性检查和详细错误信息。
 */

import fs from "node:fs/promises";
import path from "node:path";

/**
 * 校验路径不含路径穿越序列，返回规范化绝对路径。
 * @param {string} filePath
 * @returns {string}
 */
function validatePath(filePath) {
  if (!filePath || filePath.includes("..")) {
    const err = new Error("路径不合法：包含路径穿越序列或为空");
    err.code = "PATH_TRAVERSAL";
    throw err;
  }
  return path.resolve(filePath);
}

/**
 * 安全拼接路径，防止路径穿越。
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
 * 从 TXT 内容中提取 UID 值。
 * @param {string} content
 * @returns {number|null}
 */
function extractUID(content) {
  const match = content.match(/^UID:\s*(\d+)/m);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 列出目录下所有 TXT 文件，附带元信息。
 * @param {string} dir 目标目录绝对路径
 * @returns {Promise<Array<{name, path, uid, size, mtime}>>}
 */
export async function listTxtFiles(dir) {
  const safeDir = validatePath(dir);
  let entries;
  try {
    entries = await fs.readdir(safeDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") throw new Error(`目录不存在: ${safeDir}`);
    throw e;
  }
  const files = await Promise.all(
    entries
      .filter((e) => e.isFile() && e.name.endsWith(".txt"))
      .map(async (e) => {
        const filePath = path.join(safeDir, e.name);
        const stat = await fs.stat(filePath);
        let uid = null;
        try {
          const content = await fs.readFile(filePath, "utf-8");
          uid = extractUID(content);
        } catch { /* 忽略读取失败 */ }
        return { name: e.name, path: filePath, uid, size: stat.size, mtime: stat.mtime };
      })
  );
  files.sort((a, b) => (a.uid ?? Infinity) - (b.uid ?? Infinity));
  return files;
}

/**
 * 列出目录下所有子目录。
 * @param {string} base
 * @returns {Promise<Array<{name, path}>>}
 */
export async function listDirs(base) {
  const safeBase = validatePath(base);
  let entries;
  try {
    entries = await fs.readdir(safeBase, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") throw new Error(`目录不存在: ${safeBase}`);
    throw e;
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, path: path.join(safeBase, e.name) }));
}

/**
 * 读取 TXT 文件内容。
 * @param {string} filePath 文件绝对路径
 * @returns {Promise<{path, content, uid}>}
 */
export async function readTxtFile(filePath) {
  const safePath = validatePath(filePath);
  let content;
  try {
    content = await fs.readFile(safePath, "utf-8");
  } catch (e) {
    if (e.code === "ENOENT") throw new Error(`文件不存在: ${safePath}`);
    throw e;
  }
  const uid = extractUID(content);
  return { path: safePath, content, uid };
}

/**
 * 写入 / 修改 TXT 文件内容。会自动创建父目录。
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise<{path, size, action}>}
 */
export async function writeTxtFile(filePath, content) {
  const safePath = validatePath(filePath);
  let action = "created";
  try {
    await fs.access(safePath);
    action = "modified";
  } catch { /* 文件不存在，将新建 */ }
  await fs.mkdir(path.dirname(safePath), { recursive: true });
  await fs.writeFile(safePath, content, "utf-8");
  const stat = await fs.stat(safePath);
  return { path: safePath, name: path.basename(safePath), size: stat.size, action };
}

/**
 * 删除单个 TXT 文件。
 * @param {string} filePath
 * @returns {Promise<{path, name, action}>}
 */
export async function deleteTxtFile(filePath) {
  const safePath = validatePath(filePath);
  try {
    await fs.access(safePath);
  } catch {
    throw new Error(`文件不存在: ${safePath}`);
  }
  const name = path.basename(safePath);
  await fs.unlink(safePath);
  return { path: safePath, name, action: "deleted" };
}

/**
 * 批量删除 TXT 文件。
 * @param {string[]} filePaths
 * @returns {Promise<{deleted: number, failed: number, files: Array}>}
 */
export async function batchDeleteTxtFiles(filePaths) {
  let deleted = 0, failed = 0;
  const files = [];
  for (const fp of filePaths) {
    try {
      const result = await deleteTxtFile(fp);
      files.push(result);
      deleted++;
    } catch (e) {
      files.push({ path: fp, name: path.basename(fp), action: "delete_failed", error: e.message });
      failed++;
    }
  }
  return { deleted, failed, files };
}

/**
 * 重命名 TXT 文件（在同目录内）。
 * @param {string} filePath 原文件路径
 * @param {string} newName 新文件名（不含路径）
 * @returns {Promise<{oldPath, newPath, name, action}>}
 */
export async function renameTxtFile(filePath, newName) {
  const safePath = validatePath(filePath);
  if (!newName || newName.includes("/") || newName.includes("\\") || newName.includes("..")) {
    throw new Error("新文件名不合法");
  }
  if (!newName.endsWith(".txt")) newName = newName + ".txt";
  const dir = path.dirname(safePath);
  const newPath = path.join(dir, newName);
  try {
    await fs.access(safePath);
  } catch {
    throw new Error(`原文件不存在: ${safePath}`);
  }
  await fs.rename(safePath, newPath);
  return { oldPath: safePath, newPath, name: newName, action: "renamed" };
}
