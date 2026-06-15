/** Local dev only — set DISABLE_AUTH=true in .env.local. Never on production. */
export function isAuthDisabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true';
}
