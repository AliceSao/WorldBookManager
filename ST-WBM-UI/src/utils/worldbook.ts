/**
 * utils/worldbook.ts — 世界书数据处理工具
 */

export interface RawEntry {
  uid: number;
  displayIndex: number;
  comment: string;
  disable: boolean;
  constant: boolean;
  selective: boolean;
  vectorized: boolean;
  key: string[];
  selectiveLogic: 0 | 1 | 2 | 3;
  keysecondary: string[];
  scanDepth: number | null;
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

export const POSITION_LABELS: Record<number, string> = {
  0: "角色定义之前",
  1: "角色定义之后",
  2: "示例消息之前",
  3: "示例消息之后",
  4: "固定深度",
  5: "作者注释之前",
  6: "作者注释之后",
};

export const ROLE_LABELS: Record<number, string> = {
  0: "System",
  1: "User",
  2: "Assistant",
};

export const LOGIC_LABELS: Record<number, string> = {
  0: "AND任意",
  1: "NOT全部",
  2: "NOT任意",
  3: "AND全部",
};

/** 获取条目的激活策略标签 */
export function strategyLabel(entry: RawEntry): string {
  if (entry.constant) return "🔵 常量";
  if (entry.selective) return "🟢 可选";
  if (entry.vectorized) return "🔗 向量";
  return "🔵 常量";
}

/** 获取条目的位置标签 */
export function positionLabel(entry: RawEntry): string {
  return POSITION_LABELS[entry.position] ?? `位置${entry.position}`;
}

/** 条目是否处于激活状态（简单判断：启用且概率>0） */
export function isActive(entry: RawEntry): boolean {
  return !entry.disable && entry.probability > 0;
}

/** 将 ST JSON 格式（entries对象）转换为数组 */
export function parseWorldbookJson(json: unknown): RawEntry[] {
  const obj = json as { entries?: Record<string, RawEntry> };
  if (!obj.entries) return [];
  return Object.values(obj.entries).sort((a, b) => a.uid - b.uid);
}

/** 将条目数组转换为 ST JSON 格式 */
export function entriesToJson(entries: RawEntry[]): { entries: Record<string, RawEntry> } {
  const obj: Record<string, RawEntry> = {};
  entries.forEach((e, i) => {
    obj[String(i)] = { ...e, displayIndex: i };
  });
  return { entries: obj };
}

/** 深拷贝条目（用于编辑时的本地副本） */
export function cloneEntries(entries: RawEntry[]): RawEntry[] {
  return JSON.parse(JSON.stringify(entries));
}

/** 创建空白条目模板 */
export function createBlankEntry(uid: number): RawEntry {
  return {
    uid,
    displayIndex: uid,
    comment: "",
    disable: false,
    constant: false,
    selective: true,
    vectorized: false,
    key: [],
    selectiveLogic: 0,
    keysecondary: [],
    scanDepth: null,
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
  };
}
