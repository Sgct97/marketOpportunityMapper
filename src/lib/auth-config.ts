/**
 * Skip Supabase login and act as the dev user (service role + dev@local.test).
 * Set DISABLE_AUTH=true in .env.local or on Render for internal/demo deployments.
 * Leave unset on any public-facing production URL.
 */
export function isAuthDisabled(): boolean {
  return process.env.DISABLE_AUTH === 'true';
}
