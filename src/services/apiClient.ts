import { auth } from '../lib/firebase';

const DEPLOYED_FRONTEND_HOST = 'chaduvuko-ai.vercel.app';
const DEFAULT_DEPLOYED_API_ORIGIN = 'https://chaduvuko-ai.onrender.com';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function normalizeOrigin(raw: string | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.origin;
    }
    return '';
  } catch {
    return '';
  }
}

export function getApiBaseUrl(): string {
  const envBase = normalizeOrigin(import.meta.env.VITE_API_BASE_URL);
  if (envBase) {
    return envBase;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === DEPLOYED_FRONTEND_HOST) {
      return DEFAULT_DEPLOYED_API_ORIGIN;
    }
  }

  return '';
}

export function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

async function getAuthHeaders(
  extra?: Record<string, string>,
  forceRefresh = false
): Promise<Record<string, string>> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError('Please sign in to access your CHADHUVUKO workspace.', 401);
  }
  const token = await user.getIdToken(forceRefresh);
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function executeFetch(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  options: {
    body?: unknown;
    formData?: FormData;
    timeoutMs: number;
  }
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    return await fetch(targetUrl, {
      method,
      headers,
      signal: controller.signal,
      body: options.formData
        ? options.formData
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('The request timed out while waiting for the server. Please try again.', 504);
    }
    throw new ApiError('Unable to reach the server. Please check your connection and try again.', 503);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequest<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    formData?: FormData;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const method = options.method || 'GET';
  const targetUrl = resolveApiUrl(url);
  const timeoutMs = options.timeoutMs ?? 45_000;
  const extraHeaders = options.formData ? undefined : { 'Content-Type': 'application/json' };

  let headers = await getAuthHeaders(extraHeaders, false);
  let response = await executeFetch(targetUrl, method, headers, {
    body: options.body,
    formData: options.formData,
    timeoutMs,
  });

  // If the cached Firebase ID token just expired, refresh it once and retry
  if (response.status === 401 && auth.currentUser) {
    headers = await getAuthHeaders(extraHeaders, true);
    response = await executeFetch(targetUrl, method, headers, {
      body: options.body,
      formData: options.formData,
      timeoutMs,
    });
  }

  const text = await response.text();
  let data: unknown = null;
  let parsedJson = true;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      parsedJson = false;
      data = { error: text };
    }
  }

  if (!response.ok) {
    const message =
      (parsedJson && (data as { error?: string })?.error) ||
      `Request failed (${response.status}). Please try again.`;
    throw new ApiError(message, response.status);
  }

  if (text && !parsedJson) {
    throw new ApiError('Received an unexpected response from the server. Please refresh and try again.', 502);
  }

  return data as T;
}
