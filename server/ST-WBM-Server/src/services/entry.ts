/**
 * services/entry.ts — 条目 CRUD 操作逻辑
 */

import { RawEntry, nextUid, createBlankEntry } from "./worldbook.js";

/** 根据 uid 查找条目 */
export function findByUid(entries: RawEntry[], uid: number): RawEntry | undefined {
  return entries.find((e) => e.uid === uid);
}

/** 根据多个 uid 查找条目 */
export function findByUids(entries: RawEntry[], uids: number[]): RawEntry[] {
  const set = new Set(uids);
  return entries.filter((e) => set.has(e.uid));
}

/** 搜索条目（按标题或关键字匹配，忽略大小写） */
export function searchEntries(entries: RawEntry[], query: string): RawEntry[] {
  if (!query) return entries;
  const q = query.toLowerCase();
  return entries.filter((e) => {
    const inComment = e.comment.toLowerCase().includes(q);
    const inContent = e.content.toLowerCase().includes(q);
    const inKeys = e.key.some((k) => k.toLowerCase().includes(q));
    return inComment || inContent || inKeys;
  });
}

/**
 * 向条目列表添加新条目
 * @param entries 当前条目列表（会被修改）
 * @param overrides 新条目的字段覆盖
 * @returns 新建的条目
 */
export function addEntry(entries: RawEntry[], overrides: Partial<RawEntry> = {}): RawEntry {
  const uid = nextUid(entries);
  const newEntry = createBlankEntry(uid, overrides);
  entries.push(newEntry);
  return newEntry;
}

/**
 * 批量添加新条目
 * @param entries 当前条目列表（会被修改）
 * @param overridesList 每个新条目的字段覆盖列表
 * @returns 新建的条目列表
 */
export function addEntries(entries: RawEntry[], overridesList: Partial<RawEntry>[]): RawEntry[] {
  return overridesList.map((overrides) => addEntry(entries, overrides));
}

/**
 * 删除指定 uid 的条目
 * @param entries 当前条目列表（会被修改）
 * @param uids 要删除的 uid 列表
 * @returns 被删除的条目
 */
export function removeEntries(entries: RawEntry[], uids: number[]): RawEntry[] {
  const set = new Set(uids);
  const deleted: RawEntry[] = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    if (set.has(entries[i].uid)) {
      deleted.push(...entries.splice(i, 1));
    }
  }
  return deleted;
}

/**
 * 更新单个条目的字段
 * @param entries 条目列表
 * @param uid 目标 uid
 * @param updates 要更新的字段
 * @returns 更新后的条目，若不存在则返回 null
 */
export function updateEntry(
  entries: RawEntry[],
  uid: number,
  updates: Partial<RawEntry>
): RawEntry | null {
  const entry = findByUid(entries, uid);
  if (!entry) return null;
  Object.assign(entry, updates);
  return entry;
}

/**
 * 重新分配 uid（按 displayIndex 顺序从 0 开始连续编号）
 * @param entries 条目列表（会被修改）
 */
export function reassignUids(entries: RawEntry[]): RawEntry[] {
  entries.sort((a, b) => a.displayIndex - b.displayIndex);
  entries.forEach((e, i) => {
    e.uid = i;
    e.displayIndex = i;
  });
  return entries;
}
