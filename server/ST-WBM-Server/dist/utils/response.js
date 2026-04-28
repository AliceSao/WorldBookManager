/**
 * utils/response.ts — 统一响应工具
 */
export function ok(res, message, data) {
    res.json({ success: true, message, data: data ?? null });
}
export function fail(res, message, status = 400) {
    res.status(status).json({ success: false, message, data: null });
}
/**
 * 安全的错误消息提取——移除文件系统路径泄露
 * 将 ENOENT/EACCES 等 Node.js 文件系统错误转为用户友好消息
 */
export function safeErrorMessage(e, fallback = "操作失败") {
    const msg = e?.message ?? fallback;
    // 移除文件路径信息（Windows 和 Unix 路径格式）
    if (/ENOENT/.test(msg))
        return "文件或目录不存在";
    if (/EACCES|EPERM/.test(msg))
        return "权限不足，无法访问文件";
    if (/EEXIST/.test(msg))
        return "文件已存在";
    if (/EISDIR/.test(msg))
        return "目标是目录而非文件";
    // 如果消息包含路径特征，替换为安全消息
    if (/[A-Z]:\\|\/data\/|\/worlds\//.test(msg))
        return fallback;
    return msg;
}
//# sourceMappingURL=response.js.map