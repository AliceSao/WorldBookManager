/**
 * services/batch.ts — 批量操作业务逻辑
 *
 * 所有批量操作接收 entries 数组的引用，直接修改并返回被修改的条目列表。
 * 调用方负责在操作后调用 writeWorldbook() 持久化。
 */
import { RawEntry } from "./worldbook.js";
type StrategyType = "constant" | "selective" | "vectorized";
/**
 * 批量设置激活策略
 * @param strategy 'constant'=蓝灯 | 'selective'=绿灯 | 'vectorized'=向量化
 */
export declare function batchSetStrategy(entries: RawEntry[], uids: number[], strategy: StrategyType): RawEntry[];
export declare function batchSetPosition(entries: RawEntry[], uids: number[], position: 0 | 1 | 2 | 3 | 4 | 5 | 6): RawEntry[];
export declare function batchSetDepth(entries: RawEntry[], uids: number[], depth: number): RawEntry[];
export declare function batchSetOrder(entries: RawEntry[], uids: number[], order: number): RawEntry[];
export declare function batchSetName(entries: RawEntry[], uids: number[], name: string): RawEntry[];
export declare function batchSetProbability(entries: RawEntry[], uids: number[], probability: number): RawEntry[];
/** 批量替换主要关键字 */
export declare function batchSetKeys(entries: RawEntry[], uids: number[], keys: string[]): RawEntry[];
/** 批量添加主要关键字（不重复） */
export declare function batchAddKeys(entries: RawEntry[], uids: number[], keys: string[]): RawEntry[];
/** 批量清空主要关键字 */
export declare function batchClearKeys(entries: RawEntry[], uids: number[]): RawEntry[];
export declare function batchSetRecursion(entries: RawEntry[], uids: number[], options: {
    excludeRecursion?: boolean;
    preventRecursion?: boolean;
    delayUntilRecursion?: boolean | number;
}): RawEntry[];
export declare function batchSetEffect(entries: RawEntry[], uids: number[], options: {
    sticky?: number | null;
    cooldown?: number | null;
    delay?: number | null;
}): RawEntry[];
export declare function batchSetGroupWeight(entries: RawEntry[], uids: number[], groupWeight: number): RawEntry[];
export declare function batchSetCharacterFilter(entries: RawEntry[], uids: number[], filter: {
    names: string[];
    tags: string[];
    isExclude: boolean;
} | null): RawEntry[];
export declare function batchSetEnabled(entries: RawEntry[], uids: number[], enabled: boolean): RawEntry[];
/**
 * 批量查找替换主要关键字
 * findKey: 要查找的关键字字符串
 * replaceWith: 替换为（空字符串则删除该关键字）
 */
export declare function batchReplaceKey(entries: RawEntry[], uids: number[], findKey: string, replaceWith: string): RawEntry[];
/** 批量偏移 uid（在指定范围内的所有 uid 加上 offset） */
export declare function batchOffsetUids(entries: RawEntry[], uids: number[], offset: number): RawEntry[];
/**
 * 批量顺序设定 UID（从 startFrom 开始，跳过与非选中条目的冲突值）
 * 按选中顺序依次分配 startFrom, startFrom+1, startFrom+2...
 */
export declare function batchSetUidsSequential(entries: RawEntry[], uids: number[], startFrom: number): RawEntry[];
export {};
//# sourceMappingURL=batch.d.ts.map