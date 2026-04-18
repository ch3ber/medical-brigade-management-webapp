import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase admin client must never run in the browser.');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
