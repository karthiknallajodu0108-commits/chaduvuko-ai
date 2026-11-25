import { auth } from '../lib/firebase';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError('Please sign in to access your CHADHUVUKO workspace.', 401);
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
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
  const headers = await getAuthHeaders(
    options.formData ? undefined : { 'Content-Type': 'application/json' }
  );

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
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
