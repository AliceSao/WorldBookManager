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
import type { Router } from "express";
export declare function registerBatchRoutes(router: Router): void;
//# sourceMappingURL=batch.d.ts.map