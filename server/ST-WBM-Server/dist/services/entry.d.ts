/**
 * services/entry.ts — 条目 CRUD 操作逻辑
 */
import { RawEntry } from "./worldbook.js";
/** 根据 uid 查找条目 */
export declare function findByUid(entries: RawEntry[], uid: number): RawEntry | undefined;
/** 根据多个 uid 查找条目 */
export declare function findByUids(entries: RawEntry[], uids: number[]): RawEntry[];
/** 搜索条目（按标题或关键字匹配，忽略大小写） */
export declare function searchEntries(entries: RawEntry[], query: string): RawEntry[];
/**
 * 向条目列表添加新条目
 * @param entries 当前条目列表（会被修改）
 * @param overrides 新条目的字段覆盖
 * @returns 新建的条目
 */
export declare function addEntry(entries: RawEntry[], overrides?: Partial<RawEntry>): RawEntry;
/**
 * 批量添加新条目
 * @param entries 当前条目列表（会被修改）
 * @param overridesList 每个新条目的字段覆盖列表
 * @returns 新建的条目列表
 */
export declare function addEntries(entries: RawEntry[], overridesList: Partial<RawEntry>[]): RawEntry[];
/**
 * 删除指定 uid 的条目
 * @param entries 当前条目列表（会被修改）
 * @param uids 要删除的 uid 列表
 * @returns 被删除的条目
 */
export declare function removeEntries(entries: RawEntry[], uids: number[]): RawEntry[];
/**
 * 更新单个条目的字段
 * @param entries 条目列表
 * @param uid 目标 uid
 * @param updates 要更新的字段
 * @returns 更新后的条目，若不存在则返回 null
 */
export declare function updateEntry(entries: RawEntry[], uid: number, updates: Partial<RawEntry>): RawEntry | null;
/**
 * 重新分配 uid（按 displayIndex 顺序从 0 开始连续编号）
 * @param entries 条目列表（会被修改）
 */
export declare function reassignUids(entries: RawEntry[]): RawEntry[];
//# sourceMappingURL=entry.d.ts.map