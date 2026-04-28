/**
 * services/worldbook.ts — 世界书 JSON 文件读写服务
 *
 * 直接操作文件系统，不经过 SillyTavern HTTP API（绕过 CSRF）。
 * 默认路径：{ST根目录}/data/{user}/worlds/{name}.json
 */
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
    characterFilter: {
        names: string[];
        tags: string[];
        isExclude: boolean;
    } | null;
    [key: string]: unknown;
}
export interface RawWorldbook {
    entries: Record<string, RawEntry>;
}
/** 获取 SillyTavern 根目录（插件运行时 cwd 即为 ST 根目录） */
export declare function getStRoot(): string;
/** 获取世界书目录路径 */
export declare function getWorldsDir(user?: string): string;
/** 获取某个世界书 JSON 的路径（含路径穿越防护） */
export declare function getWorldbookPath(name: string, user?: string): string;
/** 列出所有世界书名称 */
export declare function listWorldbooks(user?: string): Promise<string[]>;
/**
 * 将单个条目归一化：补全所有缺失字段，确保与标准 ST 格式完全一致。
 * 用于导入/读取时的兼容处理。
 */
export declare function normalizeEntry(raw: Partial<RawEntry>, uid: number): RawEntry;
/** 读取世界书（返回条目数组，保留原始字段，补全缺失字段） */
export declare function readWorldbook(name: string, user?: string): Promise<RawEntry[]>;
import type { Response as ExpressResponse } from "express";
/** 注册一个 SSE 客户端 */
export declare function addSseClient(res: ExpressResponse): void;
/** 获取当前 SSE 客户端数量 */
export declare function getSseClientCount(): number;
/** 将条目数组写回世界书 JSON 文件 */
export declare function writeWorldbook(name: string, entries: RawEntry[], user?: string): Promise<void>;
/** 创建新世界书（若已存在则覆盖） */
export declare function createWorldbook(name: string, entries?: RawEntry[], user?: string): Promise<boolean>;
/** 删除世界书 */
export declare function deleteWorldbook(name: string, user?: string): Promise<boolean>;
/** 检查世界书是否存在 */
export declare function worldbookExists(name: string, user?: string): Promise<boolean>;
/** 生成下一个可用的 uid */
export declare function nextUid(entries: RawEntry[]): number;
/** 创建空白条目（填充所有必要字段） */
export declare function createBlankEntry(uid: number, overrides?: Partial<RawEntry>): RawEntry;
//# sourceMappingURL=worldbook.d.ts.map