-- Tabelas de persistência para o Studio online (Vercel + Supabase)
-- Execute no SQL Editor do Supabase.

create table if not exists public.studio_projects (
  project_id text primary key,
  name text not null,
  slug text not null,
  description text null,
  status text not null check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.studio_project_contents (
  project_id text primary key references public.studio_projects(project_id) on delete cascade,
  schema_version text null,
  content jsonb not null,
  updated_at timestamptz not null
);

create table if not exists public.studio_project_seo_configs (
  project_id text primary key references public.studio_projects(project_id) on delete cascade,
  title text not null,
  description text not null,
  canonical text not null,
  og_image text not null,
  json_ld jsonb null,
  updated_at timestamptz not null
);

create table if not exists public.studio_project_versions (
  project_id text not null references public.studio_projects(project_id) on delete cascade,
  version_id text not null,
  content jsonb not null,
  created_at timestamptz not null,
  primary key (project_id, version_id)
);

-- Opcional no momento: histórico de publicação no banco.
create table if not exists public.studio_project_publications (
  publication_id text primary key,
  project_id text not null references public.studio_projects(project_id) on delete cascade,
  deploy_target_id text null,
  artifact_path text not null,
  status text not null check (status in ('queued', 'running', 'success', 'failed')),
  created_at timestamptz not null,
  finished_at timestamptz null,
  message text null
);

create table if not exists public.studio_export_jobs (
  job_id text primary key,
  project_id text not null references public.studio_projects(project_id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'success', 'failed')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  started_at timestamptz null,
  finished_at timestamptz null,
  artifact_file_name text null,
  artifact_storage_path text null,
  artifact_size_bytes bigint null,
  error_message text null
);

create index if not exists idx_studio_versions_project_created_at
  on public.studio_project_versions (project_id, created_at desc);

create index if not exists idx_studio_publications_project_created_at
  on public.studio_project_publications (project_id, created_at desc);

create index if not exists idx_studio_export_jobs_project_created_at
  on public.studio_export_jobs (project_id, created_at desc);

create index if not exists idx_studio_export_jobs_status_created_at
  on public.studio_export_jobs (status, created_at asc);
