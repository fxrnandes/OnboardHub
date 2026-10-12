create table job_roles (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);

create unique index job_roles_company_name_unique on job_roles (company_id, lower(btrim(name)));

alter table users add constraint users_company_id_id_unique unique (company_id, id);

alter table users add column job_role_id uuid;
alter table users add constraint users_job_role_fk
  foreign key (company_id, job_role_id) references job_roles (company_id, id) on delete set null (job_role_id);

create table invites (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  token_hash  text not null unique,
  email       text,
  role        text not null check (role in ('gestor', 'colaborador')),
  job_role_id uuid,
  created_by  uuid,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  foreign key (company_id, job_role_id) references job_roles (company_id, id) on delete set null (job_role_id),
  foreign key (company_id, created_by) references users (company_id, id) on delete set null (created_by),
  foreign key (company_id, accepted_by) references users (company_id, id) on delete set null (accepted_by)
);

create index invites_company_id_idx on invites (company_id);
