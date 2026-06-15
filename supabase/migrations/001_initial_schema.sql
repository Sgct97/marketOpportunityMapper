-- Market Opportunity Mapper — initial schema
-- Run in Supabase SQL Editor if not using Supabase CLI

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand_id text not null default 'dealer-media-house',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);

-- Upload metadata (original files in Storage)
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('audience', 'dealership')),
  file_name text not null,
  storage_path text not null,
  row_count integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists uploads_project_id_idx on public.uploads (project_id);

-- Audience dataset versions
create table if not exists public.audience_datasets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  upload_id uuid references public.uploads (id) on delete set null,
  label text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists audience_datasets_project_id_idx on public.audience_datasets (project_id);

-- ZIP-level audience counts
create table if not exists public.audience_zip_counts (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.audience_datasets (id) on delete cascade,
  zip text not null check (zip ~ '^\d{5}$'),
  audience_type text not null,
  audience_count integer not null check (audience_count >= 0),
  unique (dataset_id, zip, audience_type)
);

create index if not exists audience_zip_counts_dataset_id_idx on public.audience_zip_counts (dataset_id);
create index if not exists audience_zip_counts_zip_idx on public.audience_zip_counts (zip);

-- Dealership dataset versions
create table if not exists public.dealership_datasets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  upload_id uuid references public.uploads (id) on delete set null,
  label text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists dealership_datasets_project_id_idx on public.dealership_datasets (project_id);

-- Dealerships
create table if not exists public.dealerships (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.dealership_datasets (id) on delete cascade,
  name text not null,
  brand text not null,
  role text not null check (role in ('client', 'competitor')),
  latitude double precision,
  longitude double precision,
  address text,
  geocode_status text check (geocode_status in ('ok', 'pending', 'failed')),
  source text not null default 'upload' check (source in ('upload', 'api')),
  created_at timestamptz not null default now()
);

create index if not exists dealerships_dataset_id_idx on public.dealerships (dataset_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- RLS
alter table public.projects enable row level security;
alter table public.uploads enable row level security;
alter table public.audience_datasets enable row level security;
alter table public.audience_zip_counts enable row level security;
alter table public.dealership_datasets enable row level security;
alter table public.dealerships enable row level security;

-- Projects: owner only
create policy "projects_select_own" on public.projects for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id);

-- Child tables: via project ownership
create policy "uploads_all_own" on public.uploads for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

create policy "audience_datasets_all_own" on public.audience_datasets for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

create policy "audience_zip_counts_all_own" on public.audience_zip_counts for all using (
  exists (
    select 1 from public.audience_datasets d
    join public.projects p on p.id = d.project_id
    where d.id = dataset_id and p.user_id = auth.uid()
  )
);

create policy "dealership_datasets_all_own" on public.dealership_datasets for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
);

create policy "dealerships_all_own" on public.dealerships for all using (
  exists (
    select 1 from public.dealership_datasets d
    join public.projects p on p.id = d.project_id
    where d.id = dataset_id and p.user_id = auth.uid()
  )
);

-- Storage bucket (run separately if bucket exists — adjust in dashboard)
-- insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false);
