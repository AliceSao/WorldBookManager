/**
 * services/entry.js — TXT 条目文件字段操作
 * 提供在 TXT 文件内容中读取/替换字段、操作关键字等纯函数。
 */

/**
 * 替换 TXT 内容中指定字段的值（仅替换第一个匹配行）。
 * @param {string} content
 * @param {string} fieldName
 * @param {string} newValue
 * @returns {string}
 */
export function replaceField(content, fieldName, newValue) {
  const regex = new RegExp(`^(${fieldName}:).*`, "m");
  if (regex.test(content)) {
    return content.replace(regex, `$1 ${newValue}`);
  }
  return content;
}

/**
 * 批量替换多个字段。
 * @param {string} content
 * @param {Record<string, string>} replacements
 * @returns {string}
 */
export function replaceFields(content, replacements) {
  let result = content;
  for (const [field, value] of Object.entries(replacements)) {
    result = replaceField(result, field, value);
  }
  return result;
}

/**
 * 在 TXT 内容中追加不重复的关键字。
 * @param {string} content
 * @param {string[]} toAdd
 * @returns {string}
 */
export function addKeywords(content, toAdd) {
  return content.replace(/^(Key:)\s*(.*)/m, (_, prefix, existing) => {
    let arr = [];
    try { arr = JSON.parse(existing.trim() || "[]"); } catch { arr = []; }
    const merged = [...new Set([...arr, ...toAdd])];
    return `${prefix} ${JSON.stringify(merged)}`;
  });
}

/**
 * 清空 TXT 内容中的 Key 字段。
 * @param {string} content
 * @returns {string}
 */
export function clearKeywords(content) {
  return content.replace(/^(Key:)\s*.*/m, "$1 []");
}
