create table users (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 2 and 120),
  email         text not null,
  password_hash text not null,
  role          text not null check (role in ('master', 'gestor', 'colaborador')),
  created_at    timestamptz not null default now()
);

create unique index users_email_unique on users (lower(email));
create index users_company_id_idx on users (company_id);
