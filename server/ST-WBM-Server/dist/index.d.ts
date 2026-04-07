/**
 * ST-WBM-Server v1.0 — 入口文件
 *
 * SillyTavern Server Plugin 格式：
 *   export const info = { id, name, description }
 *   export async function init(router: Router): Promise<void>
 *
 * 路由前缀（由 SillyTavern 管理）：/api/plugins/wb-manager/
 * 管理界面：<ST地址>/api/plugins/wb-manager/ui/
 */
import type { Router } from "express";
export declare const info: {
    id: string;
    name: string;
    description: string;
};
export declare function init(router: Router): Promise<void>;
//# sourceMappingURL=index.d.ts.map