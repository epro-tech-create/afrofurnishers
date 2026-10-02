// Thin client for the shop backend, proxied same-origin via /shop-api/*
// (see admin/next.config.ts rewrites). Auth uses a bearer token kept in
// localStorage — never cookies, so the two ports stay independent.

const KEY = 'afro-admin-token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(KEY, token);
  } catch { /* private mode */ }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* noop */ }
}

export async function api<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`/shop-api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearToken();
    throw new Error('Session expired — sign in again.');
  }
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Request failed');
  return data as T;
}
