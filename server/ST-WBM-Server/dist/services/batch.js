/**
 * services/batch.ts — 批量操作业务逻辑
 *
 * 所有批量操作接收 entries 数组的引用，直接修改并返回被修改的条目列表。
 * 调用方负责在操作后调用 writeWorldbook() 持久化。
 */
import { findByUids } from "./entry.js";
// ─────────────────────────────────────────────────────────────────────────────
// 激活策略相关
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 批量设置激活策略
 * @param strategy 'constant'=蓝灯 | 'selective'=绿灯 | 'vectorized'=向量化
 */
export function batchSetStrategy(entries, uids, strategy) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.constant = strategy === "constant";
        e.selective = strategy === "selective";
        e.vectorized = strategy === "vectorized";
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 插入位置
// ─────────────────────────────────────────────────────────────────────────────
export function batchSetPosition(entries, uids, position) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.position = position;
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 插入深度
// ─────────────────────────────────────────────────────────────────────────────
export function batchSetDepth(entries, uids, depth) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.depth = depth;
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// Order
// ─────────────────────────────────────────────────────────────────────────────
export function batchSetOrder(entries, uids, order) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.order = order;
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 标题（comment）
// ─────────────────────────────────────────────────────────────────────────────
export function batchSetName(entries, uids, name) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.comment = name;
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 触发概率
// ─────────────────────────────────────────────────────────────────────────────
export function batchSetProbability(entries, uids, probability) {
    const clamped = Math.min(100, Math.max(0, probability));
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.probability = clamped;
        e.useProbability = true;
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 关键字操作
// ─────────────────────────────────────────────────────────────────────────────
/** 批量替换主要关键字 */
export function batchSetKeys(entries, uids, keys) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.key = [...keys];
    }
    return targets;
}
/** 批量添加主要关键字（不重复） */
export function batchAddKeys(entries, uids, keys) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        const existing = new Set(e.key);
        for (const k of keys) {
            if (!existing.has(k)) {
                e.key.push(k);
                existing.add(k);
            }
        }
    }
    return targets;
}
/** 批量清空主要关键字 */
export function batchClearKeys(entries, uids) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.key = [];
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 递归控制
// ─────────────────────────────────────────────────────────────────────────────
export function batchSetRecursion(entries, uids, options) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        if (options.excludeRecursion !== undefined)
            e.excludeRecursion = options.excludeRecursion;
        if (options.preventRecursion !== undefined)
            e.preventRecursion = options.preventRecursion;
        if (options.delayUntilRecursion !== undefined)
            e.delayUntilRecursion = options.delayUntilRecursion;
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 效果（sticky / cooldown / delay）
// ─────────────────────────────────────────────────────────────────────────────
export function batchSetEffect(entries, uids, options) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        if (options.sticky !== undefined)
            e.sticky = options.sticky;
        if (options.cooldown !== undefined)
            e.cooldown = options.cooldown;
        if (options.delay !== undefined)
            e.delay = options.delay;
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 组权重
// ─────────────────────────────────────────────────────────────────────────────
export function batchSetGroupWeight(entries, uids, groupWeight) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.groupWeight = groupWeight;
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 角色/标签绑定
// ─────────────────────────────────────────────────────────────────────────────
export function batchSetCharacterFilter(entries, uids, filter) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.characterFilter = filter;
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 启用/禁用
// ─────────────────────────────────────────────────────────────────────────────
export function batchSetEnabled(entries, uids, enabled) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.disable = !enabled;
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// 关键字：查找替换
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 批量查找替换主要关键字
 * findKey: 要查找的关键字字符串
 * replaceWith: 替换为（空字符串则删除该关键字）
 */
export function batchReplaceKey(entries, uids, findKey, replaceWith) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        const idx = e.key.indexOf(findKey);
        if (idx !== -1) {
            if (replaceWith) {
                e.key[idx] = replaceWith;
            }
            else {
                e.key.splice(idx, 1);
            }
        }
    }
    return targets;
}
// ─────────────────────────────────────────────────────────────────────────────
// UID 重编
// ─────────────────────────────────────────────────────────────────────────────
/** 批量偏移 uid（在指定范围内的所有 uid 加上 offset） */
export function batchOffsetUids(entries, uids, offset) {
    const targets = findByUids(entries, uids);
    for (const e of targets) {
        e.uid = Math.max(0, e.uid + offset);
        e.displayIndex = e.uid;
    }
    return targets;
}
/**
 * 批量顺序设定 UID（从 startFrom 开始，跳过与非选中条目的冲突值）
 * 按选中顺序依次分配 startFrom, startFrom+1, startFrom+2...
 */
export function batchSetUidsSequential(entries, uids, startFrom) {
    const targets = findByUids(entries, uids);
    const nonTargetUids = new Set(entries.filter((e) => !uids.includes(e.uid)).map((e) => e.uid));
    let current = startFrom;
    for (const e of targets) {
        while (nonTargetUids.has(current))
            current++;
        e.uid = current;
        e.displayIndex = current;
        nonTargetUids.add(current);
        current++;
    }
    return targets;
}
//# sourceMappingURL=batch.js.map