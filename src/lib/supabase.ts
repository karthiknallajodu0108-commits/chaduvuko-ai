import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function isValidSupabaseUrl(raw: string | undefined): raw is string {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocal);
  } catch {
    return false;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isBrowserSupabaseConfigured(): boolean {
  return isValidSupabaseUrl(supabaseUrl) && Boolean(supabaseAnonKey?.trim());
}

/**
 * Browser-safe Supabase client using only the public/publishable anon key.
 * Private secret keys must never be referenced in client code.
 */
export const supabase: SupabaseClient | null = isBrowserSupabaseConfigured()
  ? createClient(supabaseUrl!.trim(), supabaseAnonKey!.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
