/**
 * utils/response.ts — 统一响应工具
 */
import type { Response } from "express";
export declare function ok(res: Response, message: string, data?: unknown): void;
export declare function fail(res: Response, message: string, status?: number): void;
/**
 * 安全的错误消息提取——移除文件系统路径泄露
 * 将 ENOENT/EACCES 等 Node.js 文件系统错误转为用户友好消息
 */
export declare function safeErrorMessage(e: unknown, fallback?: string): string;
//# sourceMappingURL=response.d.ts.map