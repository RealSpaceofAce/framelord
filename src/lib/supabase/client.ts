// =============================================================================
// SUPABASE CLIENT — Browser client for Supabase
// =============================================================================
// Singleton Supabase client for browser-side operations.
// Uses anon key for client-side auth and RLS-protected queries.
// =============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Missing configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

// =============================================================================
// CLIENT INSTANCE
// =============================================================================

// Only create client if configuration is available
let supabaseInstance: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
}

export const supabase = supabaseInstance as SupabaseClient;
export const isSupabaseConfigured = (): boolean => supabaseInstance !== null;

// =============================================================================
// EXPORTS
// =============================================================================

export { SUPABASE_URL };
export default supabase;
