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
  data: T;
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
// ST 全局 CSRF Token（与插件 CSRF token 是不同的！）
// ST 原生 API（/api/worldbooks/edit 等）需要的是 ST 全局 /csrf-token
// ─────────────────────────────────────────────────────────────────────────────

let _stGlobalCsrf: string | null = null;

async function getStGlobalCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch("/csrf-token", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      _stGlobalCsrf = data?.token ?? null;
      return _stGlobalCsrf;
    }
  } catch { /* ST 可能未启用 CSRF */ }
  return null;
}

/**
 * 将条目同步到 SillyTavern 内存（调用 ST 自身的 /api/worldbooks/edit 端点）
 * 使用 ST 全局 CSRF token（非插件 token）
 */
export async function syncWorldbookToST(
  name: string,
  entries: RawEntry[]
): Promise<boolean> {
  const entriesObj: Record<string, RawEntry> = {};
  entries.forEach((e, i) => {
    entriesObj[String(i)] = e;
  });

  // 获取 ST 全局 CSRF token
  if (!_stGlobalCsrf) await getStGlobalCsrfToken();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (_stGlobalCsrf) headers["X-CSRF-Token"] = _stGlobalCsrf;

  try {
    let res = await fetch("/api/worldbooks/edit", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ name, data: { entries: entriesObj } }),
    });

    // 403 = token 过期，刷新后重试
    if (res.status === 403) {
      _stGlobalCsrf = null;
      await getStGlobalCsrfToken();
      if (_stGlobalCsrf) headers["X-CSRF-Token"] = _stGlobalCsrf;
      res = await fetch("/api/worldbooks/edit", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ name, data: { entries: entriesObj } }),
      });
    }

    if (res.ok) {
      // 额外：通知 ST 重新加载世界书选择器（刷新原生编辑器视图）
      try {
        // 通过 ST 的 eventSource 触发 WORLDINFO_UPDATED 事件（如果可用）
        const stWindow = window.parent as any;
        if (stWindow?.eventSource && stWindow?.event_types?.WORLDINFO_UPDATED) {
          stWindow.eventSource.emit(stWindow.event_types.WORLDINFO_UPDATED);
        }
      } catch { /* 事件总线不可用，静默 */ }
    }
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 获取 SillyTavern 中所有角色卡名称列表
 * 用于批量绑定时的下拉选择
 */
export async function getSTCharacters(): Promise<string[]> {
  try {
    const res = await fetch("/api/characters/", { credentials: "include" });
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
