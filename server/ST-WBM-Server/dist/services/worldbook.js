/**
 * services/worldbook.ts — 世界书 JSON 文件读写服务
 *
 * 直接操作文件系统，不经过 SillyTavern HTTP API（绕过 CSRF）。
 * 默认路径：{ST根目录}/data/{user}/worlds/{name}.json
 */
import fs from "node:fs/promises";
import path from "node:path";
// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────
/** 获取 SillyTavern 根目录（插件运行时 cwd 即为 ST 根目录） */
export function getStRoot() {
    return process.cwd();
}
/** 获取世界书目录路径 */
export function getWorldsDir(user = "default-user") {
    return path.join(getStRoot(), "data", user, "worlds");
}
/**
 * 校验名称安全性（防止路径穿越）
 * 拒绝包含路径分隔符、..、或其他危险字符的输入
 */
function validateName(name, label = "name") {
    if (!name || typeof name !== "string") {
        throw new Error(`${label} 不能为空`);
    }
    if (/[\/\\]/.test(name) || name.includes("..")) {
        throw new Error(`${label} 包含非法字符`);
    }
}
/** 获取某个世界书 JSON 的路径（含路径穿越防护） */
export function getWorldbookPath(name, user = "default-user") {
    validateName(name, "世界书名称");
    validateName(user, "用户名");
    const resolved = path.resolve(getWorldsDir(user), `${name}.json`);
    const worldsDir = path.resolve(getWorldsDir(user));
    if (!resolved.startsWith(worldsDir + path.sep) && resolved !== worldsDir) {
        throw new Error("路径安全检查失败");
    }
    return resolved;
}
// ─────────────────────────────────────────────────────────────────────────────
// 核心读写操作
// ─────────────────────────────────────────────────────────────────────────────
/** 列出所有世界书名称 */
export async function listWorldbooks(user = "default-user") {
    const dir = getWorldsDir(user);
    try {
        const files = await fs.readdir(dir);
        return files
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.slice(0, -5))
            .sort();
    }
    catch {
        return [];
    }
}
/**
 * 将单个条目归一化：补全所有缺失字段，确保与标准 ST 格式完全一致。
 * 用于导入/读取时的兼容处理。
 */
export function normalizeEntry(raw, uid) {
    return {
        uid,
        displayIndex: raw.displayIndex ?? uid,
        comment: raw.comment ?? "",
        disable: raw.disable ?? false,
        // 保证三个策略字段严格互斥：constant > vectorized > selective
        constant: raw.constant ?? false,
        selective: raw.constant ? false : (raw.vectorized ? false : (raw.selective ?? true)),
        vectorized: raw.constant ? false : (raw.vectorized ?? false),
        key: Array.isArray(raw.key) ? raw.key : [],
        selectiveLogic: raw.selectiveLogic ?? 0,
        keysecondary: Array.isArray(raw.keysecondary) ? raw.keysecondary : [],
        scanDepth: raw.scanDepth ?? null,
        position: raw.position ?? 0,
        role: raw.role ?? 0,
        depth: raw.depth ?? 4,
        order: raw.order ?? 100,
        content: raw.content ?? "",
        useProbability: raw.useProbability ?? true,
        probability: raw.probability ?? 100,
        excludeRecursion: raw.excludeRecursion ?? false,
        preventRecursion: raw.preventRecursion ?? false,
        delayUntilRecursion: raw.delayUntilRecursion ?? false,
        sticky: raw.sticky ?? null,
        cooldown: raw.cooldown ?? null,
        delay: raw.delay ?? null,
        extra: raw.extra && typeof raw.extra === "object" ? raw.extra : { addMemo: false },
        group: raw.group ?? "",
        groupOverride: raw.groupOverride ?? false,
        groupWeight: raw.groupWeight ?? 100,
        caseSensitive: raw.caseSensitive ?? null,
        matchWholeWords: raw.matchWholeWords ?? null,
        useGroupScoring: raw.useGroupScoring ?? null,
        automationId: raw.automationId ?? "",
        ignoreBudget: raw.ignoreBudget ?? false,
        characterFilter: raw.characterFilter ?? null,
    };
}
/** 读取世界书（返回条目数组，保留原始字段，补全缺失字段） */
export async function readWorldbook(name, user = "default-user") {
    const filePath = getWorldbookPath(name, user);
    const raw = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(raw);
    if (!json.entries || typeof json.entries !== "object") {
        throw new Error(`世界书文件格式错误：缺少 entries 字段（${name}）`);
    }
    return Object.values(json.entries)
        .sort((a, b) => (a.uid ?? 0) - (b.uid ?? 0))
        .map((e, i) => normalizeEntry(e, e.uid ?? i));
}
const sseClients = new Set();
/** 注册一个 SSE 客户端 */
export function addSseClient(res) {
    sseClients.add(res);
    res.on("close", () => sseClients.delete(res));
}
/** 向所有 SSE 客户端广播事件 */
function broadcastSse(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        try {
            client.write(payload);
        }
        catch {
            sseClients.delete(client);
        }
    }
}
/** 获取当前 SSE 客户端数量 */
export function getSseClientCount() {
    return sseClients.size;
}
/** 将条目数组写回世界书 JSON 文件 */
export async function writeWorldbook(name, entries, user = "default-user") {
    const filePath = getWorldbookPath(name, user);
    const entriesObj = {};
    entries.forEach((entry, idx) => {
        entry.displayIndex = idx;
        entriesObj[String(idx)] = entry;
    });
    const json = { entries: entriesObj };
    await fs.writeFile(filePath, JSON.stringify(json, null, 2), "utf-8");
    // 通知所有 SSE 客户端（前端收到后会自行通过 CSRF token 同步到 ST 内存）
    broadcastSse("worldbook-updated", { name, user, count: entries.length, timestamp: Date.now() });
}
/** 创建新世界书（若已存在则覆盖） */
export async function createWorldbook(name, entries = [], user = "default-user") {
    const filePath = getWorldbookPath(name, user);
    let exists = false;
    try {
        await fs.access(filePath);
        exists = true;
    }
    catch {
        exists = false;
    }
    await writeWorldbook(name, entries, user);
    return !exists;
}
/** 删除世界书 */
export async function deleteWorldbook(name, user = "default-user") {
    const filePath = getWorldbookPath(name, user);
    try {
        await fs.unlink(filePath);
        return true;
    }
    catch {
        return false;
    }
}
/** 检查世界书是否存在 */
export async function worldbookExists(name, user = "default-user") {
    try {
        await fs.access(getWorldbookPath(name, user));
        return true;
    }
    catch {
        return false;
    }
}
/** 生成下一个可用的 uid */
export function nextUid(entries) {
    if (entries.length === 0)
        return 0;
    return Math.max(...entries.map((e) => e.uid)) + 1;
}
/** 创建空白条目（填充所有必要字段） */
export function createBlankEntry(uid, overrides = {}) {
    return {
        uid,
        displayIndex: uid,
        comment: "",
        disable: false,
        constant: false,
        selective: true,
        key: [],
        selectiveLogic: 0,
        keysecondary: [],
        scanDepth: null,
        vectorized: false,
        position: 0,
        role: 0,
        depth: 4,
        order: 100,
        content: "",
        useProbability: true,
        probability: 100,
        excludeRecursion: false,
        preventRecursion: false,
        delayUntilRecursion: false,
        sticky: null,
        cooldown: null,
        delay: null,
        extra: { addMemo: false },
        group: "",
        groupOverride: false,
        groupWeight: 100,
        caseSensitive: null,
        matchWholeWords: null,
        useGroupScoring: null,
        automationId: "",
        ignoreBudget: false,
        characterFilter: null,
        ...overrides,
    };
}
//# sourceMappingURL=worldbook.js.map