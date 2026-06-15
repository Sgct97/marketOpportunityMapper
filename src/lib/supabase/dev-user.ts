import { createClient as createAdminClient } from '@supabase/supabase-js';

const DEV_EMAIL = process.env.DEV_USER_EMAIL ?? 'dev@local.test';

let cachedDevUserId: string | null = null;

/** Ensures a real auth.users row exists for local DISABLE_AUTH mode. */
export async function resolveDevUserId(): Promise<string> {
  if (cachedDevUserId) return cachedDevUserId;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const configured = process.env.DEV_USER_ID?.trim();
  if (configured) {
    const { data } = await admin.auth.admin.getUserById(configured);
    if (data.user) {
      cachedDevUserId = data.user.id;
      return cachedDevUserId;
    }
  }

  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const match = data.users.find(
      u => u.email?.toLowerCase() === DEV_EMAIL.toLowerCase()
    );
    if (match) {
      cachedDevUserId = match.id;
      return cachedDevUserId;
    }
    if (data.users.length < 200) break;
  }

  const password = process.env.DEV_USER_PASSWORD ?? 'devpassword123';
  const { data: created, error } = await admin.auth.admin.createUser({
    email: DEV_EMAIL,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create dev user (${DEV_EMAIL}): ${error.message}`);
  }

  cachedDevUserId = created.user.id;
  return cachedDevUserId;
}
