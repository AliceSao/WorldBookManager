/**
 * routes/batch.ts — 批量操作路由
 *
 * POST /worldbooks/:name/batch/strategy      批量设置激活策略
 * POST /worldbooks/:name/batch/position      批量设置插入位置
 * POST /worldbooks/:name/batch/depth         批量设置深度
 * POST /worldbooks/:name/batch/order         批量设置排序
 * POST /worldbooks/:name/batch/name          批量设置标题
 * POST /worldbooks/:name/batch/probability   批量设置触发概率
 * POST /worldbooks/:name/batch/keys/set      批量替换主要关键字
 * POST /worldbooks/:name/batch/keys/add      批量添加主要关键字
 * POST /worldbooks/:name/batch/keys/clear    批量清空主要关键字
 * POST /worldbooks/:name/batch/recursion     批量设置递归控制
 * POST /worldbooks/:name/batch/effect        批量设置效果（粘性/冷却/延迟）
 * POST /worldbooks/:name/batch/group-weight  批量设置组权重
 * POST /worldbooks/:name/batch/char-filter   批量设置角色/标签绑定
 * POST /worldbooks/:name/batch/enabled       批量启用/禁用
 * POST /worldbooks/:name/copy                跨世界书复制条目
 */

import type { Router, Request, Response } from "express";
import { readWorldbook, writeWorldbook, RawEntry } from "../services/worldbook.js";
import { addEntries } from "../services/entry.js";
import {
  batchSetStrategy,
  batchSetPosition,
  batchSetDepth,
  batchSetOrder,
  batchSetName,
  batchSetProbability,
  batchSetKeys,
  batchAddKeys,
  batchClearKeys,
  batchReplaceKey,
  batchSetRecursion,
  batchSetEffect,
  batchSetGroupWeight,
  batchSetCharacterFilter,
  batchSetEnabled,
  batchOffsetUids,
  batchSetUidsSequential,
} from "../services/batch.js";

function ok(res: Response, message: string, data?: unknown) {
  res.json({ success: true, message, data: data ?? null });
}

function fail(res: Response, message: string, status = 400) {
  res.status(status).json({ success: false, message, data: null });
}

async function withBatch(
  res: Response,
  name: string,
  user: string,
  uids: number[],
  fn: (entries: RawEntry[], uids: number[]) => RawEntry[],
  successMsg: string
) {
  if (!Array.isArray(uids) || uids.length === 0) {
    return fail(res, "参数错误：uids 必须是非空整数数组");
  }
  const entries = await readWorldbook(name, user);
  const modified = fn(entries, uids);
  await writeWorldbook(name, entries, user);
  ok(res, successMsg, {
    name,
    modified_uids: modified.map((e) => e.uid),
    count: modified.length,
  });
}

export function registerBatchRoutes(router: Router): void {
  // ──────────────── 激活策略 ────────────────
  router.post("/worldbooks/:name/batch/strategy", async (req, res) => {
    const { name } = req.params;
    const { uids, strategy, user = "default-user" } = req.body;
    if (!["constant", "selective", "vectorized"].includes(strategy)) {
      return fail(res, "参数错误：strategy 须为 constant / selective / vectorized");
    }
    try {
      await withBatch(res, name, user, uids, (e, u) => batchSetStrategy(e, u, strategy), `已更新 ${uids?.length} 条条目的激活策略为 "${strategy}"`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 插入位置 ────────────────
  router.post("/worldbooks/:name/batch/position", async (req, res) => {
    const { name } = req.params;
    const { uids, position, user = "default-user" } = req.body;
    if (![0,1,2,3,4,5,6].includes(position)) {
      return fail(res, "参数错误：position 须为 0-6 的整数");
    }
    try {
      await withBatch(res, name, user, uids, (e, u) => batchSetPosition(e, u, position), `已更新 ${uids?.length} 条条目的插入位置为 ${position}`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 深度 ────────────────
  router.post("/worldbooks/:name/batch/depth", async (req, res) => {
    const { name } = req.params;
    const { uids, depth, user = "default-user" } = req.body;
    if (typeof depth !== "number") return fail(res, "参数错误：depth 须为整数");
    try {
      await withBatch(res, name, user, uids, (e, u) => batchSetDepth(e, u, depth), `已更新 ${uids?.length} 条条目的深度为 ${depth}`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── Order ────────────────
  router.post("/worldbooks/:name/batch/order", async (req, res) => {
    const { name } = req.params;
    const { uids, order, user = "default-user" } = req.body;
    if (typeof order !== "number") return fail(res, "参数错误：order 须为整数");
    try {
      await withBatch(res, name, user, uids, (e, u) => batchSetOrder(e, u, order), `已更新 ${uids?.length} 条条目的 Order 为 ${order}`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 标题 ────────────────
  router.post("/worldbooks/:name/batch/name", async (req, res) => {
    const { name } = req.params;
    const { uids, title, user = "default-user" } = req.body;
    if (typeof title !== "string") return fail(res, "参数错误：title 须为字符串");
    try {
      await withBatch(res, name, user, uids, (e, u) => batchSetName(e, u, title), `已更新 ${uids?.length} 条条目的标题为 "${title}"`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 触发概率 ────────────────
  router.post("/worldbooks/:name/batch/probability", async (req, res) => {
    const { name } = req.params;
    const { uids, probability, user = "default-user" } = req.body;
    if (typeof probability !== "number" || probability < 0 || probability > 100) {
      return fail(res, "参数错误：probability 须为 0-100 的整数");
    }
    try {
      await withBatch(res, name, user, uids, (e, u) => batchSetProbability(e, u, probability), `已更新 ${uids?.length} 条条目的触发概率为 ${probability}%`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 关键字：替换 ────────────────
  router.post("/worldbooks/:name/batch/keys/set", async (req, res) => {
    const { name } = req.params;
    const { uids, keys, user = "default-user" } = req.body;
    if (!Array.isArray(keys)) return fail(res, "参数错误：keys 须为字符串数组");
    try {
      await withBatch(res, name, user, uids, (e, u) => batchSetKeys(e, u, keys), `已替换 ${uids?.length} 条条目的主要关键字`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 关键字：添加 ────────────────
  router.post("/worldbooks/:name/batch/keys/add", async (req, res) => {
    const { name } = req.params;
    const { uids, keys, user = "default-user" } = req.body;
    if (!Array.isArray(keys)) return fail(res, "参数错误：keys 须为字符串数组");
    try {
      await withBatch(res, name, user, uids, (e, u) => batchAddKeys(e, u, keys), `已向 ${uids?.length} 条条目添加 ${keys.length} 个关键字`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 关键字：清空 ────────────────
  router.post("/worldbooks/:name/batch/keys/clear", async (req, res) => {
    const { name } = req.params;
    const { uids, user = "default-user" } = req.body;
    try {
      await withBatch(res, name, user, uids, (e, u) => batchClearKeys(e, u), `已清空 ${uids?.length} 条条目的主要关键字`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 递归控制 ────────────────
  router.post("/worldbooks/:name/batch/recursion", async (req, res) => {
    const { name } = req.params;
    const { uids, excludeRecursion, preventRecursion, delayUntilRecursion, user = "default-user" } = req.body;
    try {
      await withBatch(res, name, user, uids, (e, u) =>
        batchSetRecursion(e, u, { excludeRecursion, preventRecursion, delayUntilRecursion }),
        `已更新 ${uids?.length} 条条目的递归控制`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 效果（粘性/冷却/延迟） ────────────────
  router.post("/worldbooks/:name/batch/effect", async (req, res) => {
    const { name } = req.params;
    const { uids, sticky, cooldown, delay, user = "default-user" } = req.body;
    try {
      await withBatch(res, name, user, uids, (e, u) =>
        batchSetEffect(e, u, { sticky, cooldown, delay }),
        `已更新 ${uids?.length} 条条目的效果设置`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 组权重 ────────────────
  router.post("/worldbooks/:name/batch/group-weight", async (req, res) => {
    const { name } = req.params;
    const { uids, groupWeight, user = "default-user" } = req.body;
    if (typeof groupWeight !== "number") return fail(res, "参数错误：groupWeight 须为整数");
    try {
      await withBatch(res, name, user, uids, (e, u) => batchSetGroupWeight(e, u, groupWeight), `已更新 ${uids?.length} 条条目的组权重为 ${groupWeight}`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 角色/标签绑定 ────────────────
  router.post("/worldbooks/:name/batch/char-filter", async (req, res) => {
    const { name } = req.params;
    const { uids, filter, user = "default-user" } = req.body;
    try {
      await withBatch(res, name, user, uids, (e, u) => batchSetCharacterFilter(e, u, filter ?? null), `已更新 ${uids?.length} 条条目的角色绑定`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 关键字：查找替换 ────────────────
  router.post("/worldbooks/:name/batch/keys/replace", async (req, res) => {
    const { name } = req.params;
    const { uids, findKey, replaceWith = "", user = "default-user" } = req.body;
    if (typeof findKey !== "string" || !findKey) return fail(res, "参数错误：findKey 须为非空字符串");
    try {
      await withBatch(res, name, user, uids, (e, u) => batchReplaceKey(e, u, findKey, replaceWith),
        replaceWith
          ? `已将 ${uids?.length} 条条目中的关键字 "${findKey}" 替换为 "${replaceWith}"`
          : `已从 ${uids?.length} 条条目中删除关键字 "${findKey}"`
      );
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── UID 顺序设定 ────────────────
  router.post("/worldbooks/:name/batch/uid/set", async (req, res) => {
    const { name } = req.params;
    const { uids, startFrom, user = "default-user" } = req.body;
    if (typeof startFrom !== "number" || startFrom < 0) {
      return fail(res, "参数错误：startFrom 须为非负整数");
    }
    try {
      const entries = await readWorldbook(name, user);
      const modified = batchSetUidsSequential(entries, uids, startFrom);
      await writeWorldbook(name, entries, user);
      ok(res, `已将 ${modified.length} 条条目的 UID 从 ${startFrom} 开始顺序设定`, {
        name,
        modified_uids: modified.map((e) => e.uid),
        count: modified.length,
        startFrom,
      });
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── UID 偏移 ────────────────
  router.post("/worldbooks/:name/batch/uid", async (req, res) => {
    const { name } = req.params;
    const { uids, offset, user = "default-user" } = req.body;
    if (typeof offset !== "number") return fail(res, "参数错误：offset 须为整数（正负均可）");
    try {
      const entries = await readWorldbook(name, user);
      const targets = entries.filter((e) => uids.includes(e.uid));
      if (targets.length === 0) return fail(res, "未找到指定 uid 的条目");
      // 检查偏移后是否冲突
      const existingUids = new Set(entries.map((e) => e.uid));
      for (const e of targets) {
        const newUid = e.uid + offset;
        if (newUid < 0) return fail(res, `uid ${e.uid} 偏移后为负数（${newUid}），不允许`);
        if (existingUids.has(newUid) && !targets.some((t) => t.uid === newUid)) {
          return fail(res, `uid ${e.uid} 偏移后（${newUid}）与现有条目冲突`);
        }
      }
      const modified = batchOffsetUids(entries, uids, offset);
      await writeWorldbook(name, entries, user);
      ok(res, `已将 ${modified.length} 条条目的 UID 偏移 ${offset > 0 ? "+" : ""}${offset}`, {
        name,
        modified_uids: modified.map((e) => e.uid),
        count: modified.length,
        offset,
      });
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 启用/禁用 ────────────────
  router.post("/worldbooks/:name/batch/enabled", async (req, res) => {
    const { name } = req.params;
    const { uids, enabled, user = "default-user" } = req.body;
    if (typeof enabled !== "boolean") return fail(res, "参数错误：enabled 须为 true/false");
    try {
      await withBatch(res, name, user, uids, (e, u) => batchSetEnabled(e, u, enabled), `已${enabled ? "启用" : "禁用"} ${uids?.length} 条条目`);
    } catch (e: unknown) { fail(res, (e as Error).message, 500); }
  });

  // ──────────────── 跨世界书复制 ────────────────
  router.post("/worldbooks/:name/copy", async (req, res) => {
    const { name } = req.params;
    const { uids, target_worldbook, user = "default-user" } = req.body as {
      uids: number[];
      target_worldbook: string;
      user?: string;
    };
    if (!Array.isArray(uids) || uids.length === 0) return fail(res, "参数错误：uids 不能为空");
    if (!target_worldbook) return fail(res, "参数错误：target_worldbook 不能为空");
    try {
      const sourceEntries = await readWorldbook(name, user);
      const toCopy = sourceEntries.filter((e) => uids.includes(e.uid));
      if (toCopy.length === 0) return fail(res, "指定的 uid 在源世界书中均不存在", 404);

      const targetEntries = await readWorldbook(target_worldbook, user);
      const copies = toCopy.map(({ uid: _uid, displayIndex: _di, ...rest }) => rest as Partial<RawEntry>);
      const newEntries = addEntries(targetEntries, copies);
      await writeWorldbook(target_worldbook, targetEntries, user);

      ok(res, `已将 ${newEntries.length} 条条目从 "${name}" 复制到 "${target_worldbook}"`, {
        source: name,
        target: target_worldbook,
        copied_uids: newEntries.map((e) => e.uid),
        count: newEntries.length,
      });
    } catch (e: unknown) {
      fail(res, `复制条目失败：${(e as Error).message}`, 500);
    }
  });
}
