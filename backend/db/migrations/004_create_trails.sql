create table trails (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 160),
  description  text not null default '' check (char_length(description) <= 2000),
  status       text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, created_by) references users (company_id, id) on delete set null (created_by),
  check ((status = 'published') = (published_at is not null))
);

create index trails_company_id_idx on trails (company_id);

create table trail_modules (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  trail_id   uuid not null,
  title      text not null check (char_length(btrim(title)) between 1 and 160),
  position   integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (company_id, trail_id, id),
  foreign key (company_id, trail_id) references trails (company_id, id) on delete cascade,
  constraint trail_modules_position_unique unique (trail_id, position) deferrable initially deferred
);

create table trail_steps (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  trail_id   uuid not null,
  module_id  uuid not null,
  title      text not null check (char_length(btrim(title)) between 1 and 160),
  kind       text not null check (kind in ('text', 'link', 'video', 'image')),
  body       text check (char_length(body) <= 50000),
  url        text check (url ~* '^https?://'),
  position   integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, trail_id, id),
  foreign key (company_id, trail_id, module_id) references trail_modules (company_id, trail_id, id) on delete cascade,
  constraint trail_steps_position_unique unique (module_id, position) deferrable initially deferred,
  constraint trail_steps_content_check check (
    case kind
      when 'text' then body is not null and char_length(btrim(body)) > 0
      else url is not null
    end
  )
);

create index trail_steps_trail_id_idx on trail_steps (trail_id);

create table trail_job_roles (
  company_id  uuid not null,
  trail_id    uuid not null,
  job_role_id uuid not null,
  primary key (trail_id, job_role_id),
  foreign key (company_id, trail_id) references trails (company_id, id) on delete cascade,
  foreign key (company_id, job_role_id) references job_roles (company_id, id) on delete cascade
);

create index trail_job_roles_job_role_id_idx on trail_job_roles (job_role_id);
