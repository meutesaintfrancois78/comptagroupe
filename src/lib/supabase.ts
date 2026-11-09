import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { mockClientInstance, MockSupabaseClient } from './mockSupabase';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isRealSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
);

// Exporte soit le vrai client Supabase soit le client mock ultra-complet
export const supabase: SupabaseClient | MockSupabaseClient = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : (mockClientInstance as unknown as SupabaseClient);

export const isMockMode = !isRealSupabaseConfigured;
