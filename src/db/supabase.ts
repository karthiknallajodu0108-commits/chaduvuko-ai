import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isCloudSqlConfigured } from './index.ts';

export class SupabaseSchemaError extends Error {
  readonly statusCode = 503;
  readonly code = 'SUPABASE_SCHEMA_MISSING';
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseSchemaError';
  }
}

export function isSupabaseMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errObj = error as { code?: unknown; message?: unknown; details?: unknown };
  const code = typeof errObj.code === 'string' ? errObj.code : '';
  const msg = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : '';
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

function parseValidSupabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('MY_')) return null;
  try {
    const parsed = new URL(trimmed);
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocal)) {
      return parsed.origin;
    }
    return null;
  } catch {
    return null;
  }
}

function readCleanKey(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('MY_')) return null;
  return trimmed;
}

function getSupabaseEnv() {
  const url = parseValidSupabaseUrl(process.env.SUPABASE_URL);
  const anonKey = readCleanKey(process.env.SUPABASE_ANON_KEY);
  const secretKey =
    readCleanKey(process.env.SUPABASE_SECRET_KEY) ??
    readCleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return { url, anonKey, secretKey };
}

let cachedServerClient: SupabaseClient | null = null;
let cachedConfigFingerprint = '';

// Cached schema readiness state (re-checked every 15s while unready so applying
// the SQL migration in Supabase takes effect automatically without restart)
let cachedSchemaReady: boolean | null = null;
let cachedSchemaCheckedAt = 0;
let cachedSchemaFingerprint = '';
let cachedSchemaReason = '';
let loggedMissingSchemaWarning = false;
const SCHEMA_RETRY_INTERVAL_MS = 15_000;

/**
 * Returns true when SUPABASE_URL and at least one Supabase API key
 * (SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY)
 * are configured in server environment variables.
 */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey, secretKey } = getSupabaseEnv();
  return Boolean(url && (secretKey || anonKey));
}

export function markSupabaseSchemaUnavailable(reason?: string) {
  cachedSchemaReady = false;
  cachedSchemaCheckedAt = Date.now();
  cachedSchemaReason = reason || "Could not find the table 'public.profiles' in the schema cache";
  if (!loggedMissingSchemaWarning) {
    loggedMissingSchemaWarning = true;
    console.warn(
      `Supabase schema check: public.profiles is not yet available in Supabase (${cachedSchemaReason}). ` +
        `Run supabase/migrations/001_careerpilot_schema.sql in Supabase SQL Editor.`
    );
  }
}

/**
 * Checks whether the configured Supabase project has the `public.profiles` table
 * accessible in its PostgREST schema cache.
 */
export async function isSupabaseSchemaReady(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const { url, anonKey, secretKey } = getSupabaseEnv();
  const activeKey = secretKey || anonKey || '';
  const fingerprint = `${url}::${activeKey.length}:${Boolean(secretKey)}`;

  if (cachedSchemaFingerprint !== fingerprint) {
    cachedSchemaReady = null;
    cachedSchemaCheckedAt = 0;
    cachedSchemaFingerprint = fingerprint;
    loggedMissingSchemaWarning = false;
  }

  if (cachedSchemaReady === true) {
    return true;
  }

  if (cachedSchemaReady === false && Date.now() - cachedSchemaCheckedAt < SCHEMA_RETRY_INTERVAL_MS) {
    return false;
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('profiles')
      .select(
        'id, uid, email, full_name, headline, current_role, target_role, career_goal, years_experience, education, experience_summary, skills, preferred_roles, preferred_locations, created_at, updated_at'
      )
      .limit(1);
    if (error) {
      if (isSupabaseMissingTableError(error)) {
        markSupabaseSchemaUnavailable(error.message);
        return false;
      }
      // Other errors (e.g., missing columns, RLS, or transient network) mean
      // the table is not ready for queries — surface honestly in logs & health.
      markSupabaseSchemaUnavailable(error.message);
      return false;
    }

    cachedSchemaReady = true;
    cachedSchemaCheckedAt = Date.now();
    loggedMissingSchemaWarning = false;
    return true;
  } catch (err) {
    console.warn('Supabase profiles probe failed:', err instanceof Error ? err.message : 'Unknown error');
    cachedSchemaReady = false;
    cachedSchemaCheckedAt = Date.now();
    return false;
  }
}

export async function getDatabaseHealthStatus(): Promise<{
  provider: 'supabase' | 'cloudsql' | 'unconfigured';
  supabaseConfigured: boolean;
  supabaseSchemaReady: boolean;
  warning?: string;
}> {
  const configured = isSupabaseConfigured();
  if (configured) {
    const ready = await isSupabaseSchemaReady();
    if (ready) {
      return {
        provider: 'supabase',
        supabaseConfigured: true,
        supabaseSchemaReady: true,
      };
    }
    const reasonDetail = cachedSchemaReason || "Could not find the table 'public.profiles' in the schema cache";
    if (isCloudSqlConfigured()) {
      return {
        provider: 'cloudsql',
        supabaseConfigured: true,
        supabaseSchemaReady: false,
        warning: `Supabase schema not ready (${reasonDetail}). Run supabase/migrations/001_careerpilot_schema.sql in Supabase SQL Editor. Using Cloud SQL fallback until applied.`,
      };
    }
    return {
      provider: 'unconfigured',
      supabaseConfigured: true,
      supabaseSchemaReady: false,
      warning: `Supabase schema not ready (${reasonDetail}). Run supabase/migrations/001_careerpilot_schema.sql in Supabase SQL Editor.`,
    };
  }

  return {
    provider: isCloudSqlConfigured() ? 'cloudsql' : 'unconfigured',
    supabaseConfigured: false,
    supabaseSchemaReady: false,
  };
}

/**
 * Returns a lazily initialized server-side Supabase client.
 * Prefers server-only SUPABASE_SECRET_KEY (when available) so Express routes
 * authenticated via Firebase Admin can execute user-scoped CRUD safely,
 * falling back to SUPABASE_ANON_KEY when only the publishable key is configured.
 */
export function getSupabaseClient(): SupabaseClient {
  const { url, anonKey, secretKey } = getSupabaseEnv();
  const activeKey = secretKey || anonKey;

  if (!url || !activeKey) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY (plus SUPABASE_SECRET_KEY for server-side access) in environment secrets.'
    );
  }

  const fingerprint = `${url}::${activeKey.length}:${Boolean(secretKey)}`;
  if (!cachedServerClient || cachedConfigFingerprint !== fingerprint) {
    cachedServerClient = createClient(url, activeKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    cachedConfigFingerprint = fingerprint;
  }

  return cachedServerClient;
}

/**
 * Creates a request-scoped Supabase client using SUPABASE_URL and SUPABASE_ANON_KEY,
 * optionally forwarding a caller's bearer token for Row Level Security enforcement.
 */
export function createScopedSupabaseClient(bearerToken?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured in environment secrets.');
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(bearerToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          },
        }
      : {}),
  });
}
