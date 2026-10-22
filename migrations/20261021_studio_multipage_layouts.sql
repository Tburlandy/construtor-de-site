-- Multi-page / layouts infrastructure. Additive and idempotent; legacy tables remain authoritative fallbacks.
alter table public.studio_base_templates
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists renderer_key text,
  add column if not exists default_content jsonb,
  add column if not exists manifest jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now();

update public.studio_base_templates
set name = coalesce(nullif(name, ''), case when template_key = 'style-1' then 'Style 1' else template_key end),
    description = coalesce(description, ''),
    renderer_key = coalesce(nullif(renderer_key, ''), template_key),
    default_content = coalesce(default_content, content),
    status = coalesce(nullif(status, ''), 'active');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'studio_base_templates_status_check'
  ) then
    alter table public.studio_base_templates
      add constraint studio_base_templates_status_check check (status in ('active','archived'));
  end if;
end $$;

create table if not exists public.studio_pages (
  page_id text primary key,
  client_id text not null references public.studio_projects(project_id) on update cascade on delete restrict,
  name text not null,
  slug text not null,
  public_path text not null,
  layout_id text not null references public.studio_base_templates(template_key) on update cascade on delete restrict,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_pages_public_path_check check (left(public_path, 1) = '/'),
  constraint studio_pages_client_public_path_key unique (client_id, public_path)
);

create unique index if not exists studio_pages_one_default_per_client_idx
  on public.studio_pages(client_id) where is_default;
create index if not exists studio_pages_client_id_idx on public.studio_pages(client_id);
create index if not exists studio_pages_client_status_idx on public.studio_pages(client_id,status);
create index if not exists studio_pages_client_public_path_idx on public.studio_pages(client_id,public_path);
create index if not exists studio_pages_layout_id_idx on public.studio_pages(layout_id);

create table if not exists public.studio_page_contents (
  page_id text primary key references public.studio_pages(page_id) on update cascade on delete restrict,
  schema_version text,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_page_seo_configs (
  page_id text primary key references public.studio_pages(page_id) on update cascade on delete restrict,
  title text not null default '',
  description text not null default '',
  canonical text not null default '',
  og_image text not null default '',
  json_ld jsonb,
  robots_directive text not null default 'index,follow'
    check (robots_directive in ('index,follow','noindex,follow')),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_page_versions (
  page_id text not null references public.studio_pages(page_id) on update cascade on delete restrict,
  version_id text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (page_id,version_id)
);
create index if not exists studio_page_versions_page_created_idx
  on public.studio_page_versions(page_id,created_at desc);

create table if not exists public.studio_page_layout_states (
  page_id text not null references public.studio_pages(page_id) on update cascade on delete restrict,
  layout_id text not null references public.studio_base_templates(template_key) on update cascade on delete restrict,
  variables jsonb not null default '{}'::jsonb,
  overrides jsonb not null default '{}'::jsonb,
  override_paths text[] not null default '{}'::text[],
  schema_version text,
  updated_at timestamptz not null default now(),
  primary key (page_id,layout_id)
);
create index if not exists studio_page_layout_states_layout_idx
  on public.studio_page_layout_states(layout_id);

alter table public.studio_pages enable row level security;
alter table public.studio_page_contents enable row level security;
alter table public.studio_page_seo_configs enable row level security;
alter table public.studio_page_versions enable row level security;
alter table public.studio_page_layout_states enable row level security;

-- Backfill: deterministic stable page id makes reruns idempotent.
insert into public.studio_pages (
  page_id, client_id, name, slug, public_path, layout_id, status, is_default, created_at, updated_at
)
select
  'page-default-' || md5(p.project_id),
  p.project_id,
  'Fale Conosco',
  'fale-conosco',
  '/',
  'style-1',
  case when p.status = 'archived' then 'archived' else 'active' end,
  true,
  p.created_at,
  p.updated_at
from public.studio_projects p
where exists (select 1 from public.studio_base_templates t where t.template_key='style-1')
on conflict (page_id) do nothing;

insert into public.studio_page_contents(page_id,schema_version,content,updated_at)
select pg.page_id,c.schema_version,c.content,c.updated_at
from public.studio_pages pg
join public.studio_project_contents c on c.project_id=pg.client_id
where pg.is_default
on conflict (page_id) do nothing;

insert into public.studio_page_seo_configs(
  page_id,title,description,canonical,og_image,json_ld,robots_directive,updated_at
)
select pg.page_id,s.title,s.description,s.canonical,s.og_image,s.json_ld,'index,follow',s.updated_at
from public.studio_pages pg
join public.studio_project_seo_configs s on s.project_id=pg.client_id
where pg.is_default
on conflict (page_id) do nothing;

insert into public.studio_page_versions(page_id,version_id,content,created_at)
select pg.page_id,v.version_id,v.content,v.created_at
from public.studio_pages pg
join public.studio_project_versions v on v.project_id=pg.client_id
where pg.is_default
on conflict (page_id,version_id) do nothing;

insert into public.studio_page_layout_states(
  page_id,layout_id,variables,overrides,override_paths,schema_version,updated_at
)
select pg.page_id,s.template_key,s.variables,s.overrides,s.override_paths,t.schema_version,s.updated_at
from public.studio_pages pg
join public.studio_client_template_states s on s.project_id=pg.client_id
left join public.studio_base_templates t on t.template_key=s.template_key
where pg.is_default and s.template_key=pg.layout_id
on conflict (page_id,layout_id) do nothing;

-- Post-migration audit examples (read-only):
-- select count(*) clients from studio_projects;
-- select count(*) pages, count(*) filter (where is_default) defaults from studio_pages;
-- select client_id,count(*) from studio_pages where is_default group by client_id having count(*)<>1;
-- select count(*) from studio_page_contents;
-- select count(*) from studio_page_seo_configs;
-- select count(*) from studio_page_versions;
-- Orphan legacy template state is intentionally preserved and not copied:
-- select s.project_id from studio_client_template_states s left join studio_projects p on p.project_id=s.project_id where p.project_id is null;
