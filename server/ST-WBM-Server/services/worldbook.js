/**
 * services/worldbook.js — 世界书 TXT 格式工具函数
 *
 * 提供 ST_API 条目对象与 TXT 格式互转的纯函数工具。
 */

import path from "node:path";

/**
 * 从 TXT 内容中提取 UID 值。
 * @param {string} content
 * @returns {number|null}
 */
export function extractUID(content) {
  const match = content.match(/^UID:\s*(\d+)/m);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 将 ST_API WorldBookEntry 对象转换为 TXT 文件内容。
 * 格式与 Python CLI split 命令保持完全一致。
 * @param {object} entry
 * @returns {string}
 */
export function entryToTxt(entry) {
  const nullStr = (v) => (v === null || v === undefined ? "null" : String(v));
  return [
    `UID: ${entry.index}`,
    `Name: ${entry.name || ""}`,
    `Key: ${JSON.stringify(entry.key || [])}`,
    `SecondaryKey: ${JSON.stringify(entry.secondaryKey || [])}`,
    `ActivationMode: ${entry.activationMode || "keyword"}`,
    `Position: ${entry.position || "beforeChar"}`,
    `Order: ${entry.order ?? 100}`,
    `Depth: ${entry.depth ?? 4}`,
    `Role: ${nullStr(entry.role)}`,
    `Enabled: ${entry.enabled !== false ? "true" : "false"}`,
    `Probability: ${entry.probability ?? 100}`,
    `ExcludeRecursion: ${entry.excludeRecursion ? "true" : "false"}`,
    `PreventRecursion: ${entry.preventRecursion ? "true" : "false"}`,
    `---`,
    entry.content || "",
  ].join("\n");
}

/**
 * 生成安全的文件名（UID 补零 + 条目名称）。
 * @param {object} entry
 * @returns {string}
 */
export function entryFileName(entry) {
  const safeName = (entry.name || "entry")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 60);
  return `${String(entry.index).padStart(4, "0")}_${safeName}.txt`;
}
