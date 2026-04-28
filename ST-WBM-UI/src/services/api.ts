/**
 * services/api.ts — 后端 API 调用封装
 *
 * 所有请求指向 /api/plugins/wb-manager/
 * 自动获取并携带 CSRF token（绕过 SillyTavern 全局 CSRF 保护）
 */

import type { RawEntry } from "../utils/worldbook";

const BASE = "/api/plugins/wb-manager";

interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data: T | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSRF Token 管理
// ─────────────────────────────────────────────────────────────────────────────

let _csrfToken: string | null = null;
let _csrfFetching: Promise<string | null> | null = null;

async function getCsrfToken(): Promise<string | null> {
  if (_csrfToken !== null) return _csrfToken;
  if (_csrfFetching) return _csrfFetching;
  _csrfFetching = fetch(`${BASE}/csrf-token`, { credentials: "include" })
    .then((r) => r.json())
    .then((d) => {
      _csrfToken = d.token ?? null;
      return _csrfToken;
    })
    .catch(() => {
      _csrfToken = null;
      return null;
    })
    .finally(() => {
      _csrfFetching = null;
    });
  return _csrfFetching;
}

export function resetCsrfToken() {
  _csrfToken = null;
}

const MUTATING = new Set(["POST", "PUT", "DELETE", "PATCH"]);

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const upper = method.toUpperCase();
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (MUTATING.has(upper)) {
    const token = await getCsrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }

  const makeOpts = (tok?: string | null): RequestInit => {
    const h = { ...headers };
    if (tok) h["X-CSRF-Token"] = tok;
    const opts: RequestInit = { method, headers: h, credentials: "include" };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return opts;
  };

  let res = await fetch(`${BASE}${path}`, makeOpts());

  // CSRF token 过期（403）→ 刷新 token 并重试一次
  if (res.status === 403 && MUTATING.has(upper)) {
    resetCsrfToken();
    const freshToken = await getCsrfToken();
    res = await fetch(`${BASE}${path}`, makeOpts(freshToken));
  }

  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, message: `HTTP ${res.status}`, data: null as T };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 世界书 CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function listWorldbooks(user = "default-user") {
  return request<{ worldbooks: string[]; user: string }>(
    "GET",
    `/worldbooks?user=${encodeURIComponent(user)}`
  );
}

export async function getWorldbook(name: string, user = "default-user") {
  return request<{ name: string; entries: RawEntry[]; count: number }>(
    "GET",
    `/worldbooks/${encodeURIComponent(name)}?user=${encodeURIComponent(user)}`
  );
}

export async function saveWorldbook(name: string, entries: RawEntry[], user = "default-user") {
  return request<{ name: string; count: number }>(
    "PUT",
    `/worldbooks/${encodeURIComponent(name)}`,
    { entries, user }
  );
}

export async function createWorldbook(name: string, entries: RawEntry[] = [], user = "default-user") {
  return request<{ name: string; created: boolean }>(
    "POST",
    `/worldbooks`,
    { name, entries, user }
  );
}

export async function deleteWorldbook(name: string, user = "default-user") {
  return request<null>(
    "DELETE",
    `/worldbooks/${encodeURIComponent(name)}?user=${encodeURIComponent(user)}`
  );
}

export function exportWorldbookUrl(name: string, user = "default-user"): string {
  return `${BASE}/worldbooks/${encodeURIComponent(name)}/export?user=${encodeURIComponent(user)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 条目操作
// ─────────────────────────────────────────────────────────────────────────────

export async function searchEntries(name: string, q: string, user = "default-user") {
  return request<{ entries: RawEntry[]; count: number; total: number }>(
    "GET",
    `/worldbooks/${encodeURIComponent(name)}/entries?q=${encodeURIComponent(q)}&user=${encodeURIComponent(user)}`
  );
}

export async function addEntries(name: string, entries: Partial<RawEntry>[], user = "default-user") {
  return request<{ new_entries: RawEntry[]; count: number }>(
    "POST",
    `/worldbooks/${encodeURIComponent(name)}/entries`,
    { entries, user }
  );
}

export async function updateEntry(name: string, uid: number, updates: Partial<RawEntry>, user = "default-user") {
  return request<{ entry: RawEntry }>(
    "PUT",
    `/worldbooks/${encodeURIComponent(name)}/entries/${uid}`,
    { ...updates, user }
  );
}

export async function deleteEntries(name: string, uids: number[], user = "default-user") {
  return request<{ deleted_uids: number[]; count: number; remaining: number }>(
    "DELETE",
    `/worldbooks/${encodeURIComponent(name)}/entries`,
    { uids, user }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 批量操作
// ─────────────────────────────────────────────────────────────────────────────

export async function batchOp(name: string, op: string, body: Record<string, unknown>, user = "default-user") {
  return request<{ modified_uids: number[]; count: number }>(
    "POST",
    `/worldbooks/${encodeURIComponent(name)}/batch/${op}`,
    { ...body, user }
  );
}

export async function copyEntries(
  sourceName: string,
  uids: number[],
  targetWorldbook: string,
  user = "default-user"
) {
  return request<{ copied_uids: number[]; count: number }>(
    "POST",
    `/worldbooks/${encodeURIComponent(sourceName)}/copy`,
    { uids, target_worldbook: targetWorldbook, user }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ST 同步：调用 SillyTavern 原生 API 更新内存缓存
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ST 原生同步（使用 SillyTavern 提供的稳定接口）
// ─────────────────────────────────────────────────────────────────────────────

/** ST 上下文类型（简化声明，完整类型见 @types/iframe/exported.sillytavern.d.ts） */
interface STContext {
  getRequestHeaders: () => Record<string, string>;
  loadWorldInfo: (name: string) => Promise<any | null>;
  saveWorldInfo: (name: string, data: any, immediately?: boolean) => Promise<void>;
  reloadWorldInfoEditor?: (file: string, loadIfNotSelected?: boolean) => void;
  updateWorldInfoList?: () => Promise<void>;
}

/** 获取 ST 上下文（从 iframe 的 parent window 获取） */
function getSTContext(): STContext | null {
  try {
    const st = (window.parent as any)?.SillyTavern;
    if (st?.getRequestHeaders) return st as STContext;
    const st2 = (window as any)?.SillyTavern;
    if (st2?.getRequestHeaders) return st2 as STContext;
  } catch { /* cross-origin，无法访问 */ }
  return null;
}

/**
 * 将条目同步到 SillyTavern 内存。
 * 使用 ST 原生 saveWorldInfo API（内存操作，不走 HTTP，完全绕过 CSRF）。
 * 如果 ST 原生 API 不可用（跨域 iframe 等），静默失败——数据已保存在文件系统中。
 */
export async function syncWorldbookToST(
  name: string,
  entries: RawEntry[]
): Promise<boolean> {
  const st = getSTContext();
  if (!st?.loadWorldInfo || !st?.saveWorldInfo) {
    // ST 原生 API 不可用，文件已由后端保存，用户刷新即可看到
    return false;
  }

  try {
    const data = await st.loadWorldInfo(name);
    if (!data) return false;

    // 构建新 entries，保留原始 data 的其他元数据（originalData 等）
    const entriesObj: Record<string, RawEntry> = {};
    entries.forEach((e, i) => { entriesObj[String(i)] = e; });
    const updated = { ...data, entries: entriesObj };

    // saveWorldInfo 是内存操作，不走 HTTP，不触发 CSRF
    await st.saveWorldInfo(name, updated, true);

    // 刷新原生编辑器
    try { st.reloadWorldInfoEditor?.(name); } catch { /* 静默 */ }
    try { await st.updateWorldInfoList?.(); } catch { /* 静默 */ }
    return true;
  } catch {
    // 文件已由后端保存，同步失败不影响数据安全
    return false;
  }
}

/**
 * 获取 SillyTavern 中所有角色卡名称列表
 * 用于批量绑定时的下拉选择
 */
export async function getSTCharacters(): Promise<string[]> {
  try {
    const st = getSTContext();
    const headers: Record<string, string> = st?.getRequestHeaders
      ? { ...st.getRequestHeaders() }
      : { "Content-Type": "application/json" };
    const res = await fetch("/api/characters/", { credentials: "include", headers });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) {
      return data
        .map((c: { name?: string } | string) =>
          typeof c === "string" ? c : (c.name ?? "")
        )
        .filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 健康检查
// ─────────────────────────────────────────────────────────────────────────────

export async function ping() {
  return request<{ version: string }>("GET", "/ping");
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE（Server-Sent Events）实时同步
// ─────────────────────────────────────────────────────────────────────────────

export type SseCallback = (data: { name: string; user: string; count: number; timestamp: number }) => void;

let _sseSource: EventSource | null = null;
const _sseListeners: Set<SseCallback> = new Set();

/**
 * 连接 SSE 端点。多次调用只会建立一个连接。
 * 当后端世界书被写入时，所有注册的 listener 会被调用。
 */
export function connectSse(): void {
  if (_sseSource) return;
  _sseSource = new EventSource(`${BASE}/events`);

  _sseSource.addEventListener("worldbook-updated", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      for (const cb of _sseListeners) {
        try { cb(data); } catch { /* listener error, ignore */ }
      }
    } catch { /* parse error, ignore */ }
  });

  _sseSource.onerror = () => {
    // 连接断开后自动重连（EventSource 内置重连机制）
    // 如果完全关闭则清理
    if (_sseSource?.readyState === EventSource.CLOSED) {
      _sseSource = null;
    }
  };
}

/** 注册一个世界书变更回调 */
export function onWorldbookUpdate(cb: SseCallback): void {
  _sseListeners.add(cb);
  // 确保 SSE 已连接
  connectSse();
}

/** 注销一个世界书变更回调 */
export function offWorldbookUpdate(cb: SseCallback): void {
  _sseListeners.delete(cb);
}

/** 断开 SSE 连接 */
export function disconnectSse(): void {
  if (_sseSource) {
    _sseSource.close();
    _sseSource = null;
  }
  _sseListeners.clear();
}
