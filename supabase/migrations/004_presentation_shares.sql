-- Presentation share links: unguessable tokens for read-only map/dashboard/PDF access.
-- Public viewers never use RLS; the Next.js server validates the token then loads
-- project data with the service role. Owners manage rows via their own auth session.

create table if not exists public.presentation_shares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  label text
);

create index if not exists presentation_shares_token_idx
  on public.presentation_shares (token);

create index if not exists presentation_shares_project_id_idx
  on public.presentation_shares (project_id);

alter table public.presentation_shares enable row level security;

-- Owners can manage shares for their projects. No anon/public policies.
create policy "presentation_shares_select_own" on public.presentation_shares
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create policy "presentation_shares_insert_own" on public.presentation_shares
  for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    and created_by = auth.uid()
  );

create policy "presentation_shares_update_own" on public.presentation_shares
  for update using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );
