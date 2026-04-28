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
    const msg = typeof e === "string" ? e : (e?.message ?? fallback);
    // 将 Node.js 文件系统错误转为安全消息
    if (/ENOENT/.test(msg))
        return "file or directory not found";
    if (/EACCES|EPERM/.test(msg))
        return "permission denied";
    if (/EEXIST/.test(msg))
        return "file already exists";
    if (/EISDIR/.test(msg))
        return "target is a directory";
    // 检测并移除路径泄露（Windows 大小写 + Unix 绝对路径）
    if (/[a-zA-Z]:\\|\/data\/|\/worlds\/|\/home\/|\/tmp\/|\/etc\//.test(msg))
        return fallback;
    // 处理字符串类型的异常
    return msg;
}
//# sourceMappingURL=response.js.map