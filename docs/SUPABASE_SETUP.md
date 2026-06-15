# Supabase setup

## 1. Environment variables

Copy keys into **`.env.local`** only (never commit real keys to `.env.example`).

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Use the **base** project URL (no `/rest/v1/` suffix).

## 2. Run database migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Paste and run the full contents of:

   `supabase/migrations/001_initial_schema.sql`

## 3. Auth redirect URLs

**Authentication → URL configuration**

- **Site URL:** `http://localhost:3000` (dev)
- **Redirect URLs:** add
  - `http://localhost:3000/auth/callback`
  - Your production Render URL + `/auth/callback` when deployed

Enable **Email** provider (magic link).

## 3b. Skip login locally (optional)

In `.env.local`:

```env
DISABLE_AUTH=true
```

On first project create, the app auto-creates `dev@local.test` in Auth (needs `SUPABASE_SERVICE_ROLE_KEY`).

Restart `npm run dev`. App opens at `/` with no login.  
Do **not** set `DISABLE_AUTH` on Render production.

## 4. Storage bucket (for audience/dealership uploads)

Run in **SQL Editor** (or use Supabase MCP):

`supabase/migrations/002_storage_bucket.sql`

This creates the private `uploads` bucket and storage policies.

Then run:

`supabase/migrations/003_storage_rls_project_scope.sql`

This scopes storage access to project owners (path `{project_id}/...`).

## 5. Transfer to client later

Create a new Supabase project under the client org, re-run this migration, update Render env vars, redeploy. See [DECISIONS.md](./DECISIONS.md).
