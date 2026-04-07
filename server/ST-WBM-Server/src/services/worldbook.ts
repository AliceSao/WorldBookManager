/**
 * services/worldbook.ts — 世界书 JSON 文件读写服务
 *
 * 直接操作文件系统，不经过 SillyTavern HTTP API（绕过 CSRF）。
 * 默认路径：{ST根目录}/data/{user}/worlds/{name}.json
 */

import fs from "node:fs/promises";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义（原始 ST JSON 格式）
// ─────────────────────────────────────────────────────────────────────────────

export interface RawEntry {
  uid: number;
  displayIndex: number;
  comment: string;
  disable: boolean;
  constant: boolean;
  selective: boolean;
  key: string[];
  selectiveLogic: 0 | 1 | 2 | 3;
  keysecondary: string[];
  scanDepth: number | null;
  vectorized: boolean;
  position: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  role: 0 | 1 | 2 | null;
  depth: number;
  order: number;
  content: string;
  useProbability: boolean;
  probability: number;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  delayUntilRecursion: boolean | number;
  sticky: number | null;
  cooldown: number | null;
  delay: number | null;
  extra: Record<string, unknown>;
  group: string;
  groupOverride: boolean;
  groupWeight: number;
  caseSensitive: boolean | null;
  matchWholeWords: boolean | null;
  useGroupScoring: boolean | null;
  automationId: string;
  ignoreBudget: boolean;
  characterFilter: { names: string[]; tags: string[]; isExclude: boolean } | null;
  [key: string]: unknown;
}

export interface RawWorldbook {
  entries: Record<string, RawEntry>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────

/** 获取 SillyTavern 根目录（插件运行时 cwd 即为 ST 根目录） */
export function getStRoot(): string {
  return process.cwd();
}

/** 获取世界书目录路径 */
export function getWorldsDir(user = "default-user"): string {
  return path.join(getStRoot(), "data", user, "worlds");
}

/** 获取某个世界书 JSON 的路径 */
export function getWorldbookPath(name: string, user = "default-user"): string {
  return path.join(getWorldsDir(user), `${name}.json`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 核心读写操作
// ─────────────────────────────────────────────────────────────────────────────

/** 列出所有世界书名称 */
export async function listWorldbooks(user = "default-user"): Promise<string[]> {
  const dir = getWorldsDir(user);
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -5))
      .sort();
  } catch {
    return [];
  }
}

/**
 * 将单个条目归一化：补全所有缺失字段，确保与标准 ST 格式完全一致。
 * 用于导入/读取时的兼容处理。
 */
export function normalizeEntry(raw: Partial<RawEntry>, uid: number): RawEntry {
  return {
    uid,
    displayIndex: raw.displayIndex ?? uid,
    comment: raw.comment ?? "",
    disable: raw.disable ?? false,
    constant: raw.constant ?? false,
    selective: raw.selective ?? true,
    key: Array.isArray(raw.key) ? raw.key : [],
    selectiveLogic: (raw.selectiveLogic as 0 | 1 | 2 | 3) ?? 0,
    keysecondary: Array.isArray(raw.keysecondary) ? raw.keysecondary : [],
    scanDepth: raw.scanDepth ?? null,
    vectorized: raw.vectorized ?? false,
    position: (raw.position as 0 | 1 | 2 | 3 | 4 | 5 | 6) ?? 0,
    role: (raw.role as 0 | 1 | 2 | null) ?? 0,
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
export async function readWorldbook(name: string, user = "default-user"): Promise<RawEntry[]> {
  const filePath = getWorldbookPath(name, user);
  const raw = await fs.readFile(filePath, "utf-8");
  const json: RawWorldbook = JSON.parse(raw);
  if (!json.entries || typeof json.entries !== "object") {
    throw new Error(`世界书文件格式错误：缺少 entries 字段（${name}）`);
  }
  return Object.values(json.entries)
    .sort((a, b) => (a.uid ?? 0) - (b.uid ?? 0))
    .map((e, i) => normalizeEntry(e, e.uid ?? i));
}

/** 将条目数组写回世界书 JSON 文件 */
export async function writeWorldbook(
  name: string,
  entries: RawEntry[],
  user = "default-user"
): Promise<void> {
  const filePath = getWorldbookPath(name, user);
  const entriesObj: Record<string, RawEntry> = {};
  entries.forEach((entry, idx) => {
    entry.displayIndex = idx;
    entriesObj[String(idx)] = entry;
  });
  const json: RawWorldbook = { entries: entriesObj };
  await fs.writeFile(filePath, JSON.stringify(json, null, 2), "utf-8");
}

/** 创建新世界书（若已存在则覆盖） */
export async function createWorldbook(
  name: string,
  entries: RawEntry[] = [],
  user = "default-user"
): Promise<boolean> {
  const filePath = getWorldbookPath(name, user);
  let exists = false;
  try {
    await fs.access(filePath);
    exists = true;
  } catch {
    exists = false;
  }
  await writeWorldbook(name, entries, user);
  return !exists;
}

/** 删除世界书 */
export async function deleteWorldbook(name: string, user = "default-user"): Promise<boolean> {
  const filePath = getWorldbookPath(name, user);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/** 检查世界书是否存在 */
export async function worldbookExists(name: string, user = "default-user"): Promise<boolean> {
  try {
    await fs.access(getWorldbookPath(name, user));
    return true;
  } catch {
    return false;
  }
}

/** 生成下一个可用的 uid */
export function nextUid(entries: RawEntry[]): number {
  if (entries.length === 0) return 0;
  return Math.max(...entries.map((e) => e.uid)) + 1;
}

/** 创建空白条目（填充所有必要字段） */
export function createBlankEntry(uid: number, overrides: Partial<RawEntry> = {}): RawEntry {
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
