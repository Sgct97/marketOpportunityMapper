import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js';
import { isAuthDisabled } from '@/lib/auth-config';
import { resolveDevUserId } from '@/lib/supabase/dev-user';
import { createClient } from '@/lib/supabase/server';

export async function createDataClient(): Promise<SupabaseClient> {
  if (isAuthDisabled()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    return createAdminClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return createClient();
}

/** When auth is off, ensures dev@local.test exists in auth.users. */
export async function getActingUserId(supabase: SupabaseClient): Promise<string | null> {
  if (isAuthDisabled()) {
    try {
      return await resolveDevUserId();
    } catch (e) {
      console.error('[getActingUserId]', e);
      return null;
    }
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
