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

/**
 * 将条目同步到 SillyTavern 内存（调用 ST 自身的 /api/worldbooks/edit 端点）
 * 只有通过此端点保存，ST 的运行时状态才会更新，世界书修改才会实时生效。
 */
export async function syncWorldbookToST(
  name: string,
  entries: RawEntry[]
): Promise<boolean> {
  const entriesObj: Record<string, RawEntry> = {};
  entries.forEach((e, i) => {
    entriesObj[String(i)] = e;
  });

  const token = await getCsrfToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-CSRF-Token"] = token;

  try {
    const res = await fetch("/api/worldbooks/edit", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ name, data: { entries: entriesObj } }),
    });
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
