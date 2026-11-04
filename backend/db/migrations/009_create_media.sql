create table media (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  kind          text not null check (kind in ('image', 'video')),
  storage_key   text not null unique,
  content_type  text not null,
  size_bytes    bigint not null check (size_bytes > 0),
  original_name text not null check (char_length(original_name) between 1 and 255),
  created_by    uuid,
  created_at    timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, created_by) references users (company_id, id) on delete set null (created_by)
);

create index media_company_id_idx on media (company_id);

alter table trail_steps add column media_id uuid;

alter table trail_steps
  add constraint trail_steps_media_fk foreign key (company_id, media_id) references media (company_id, id);

create index trail_steps_media_id_idx on trail_steps (media_id) where media_id is not null;

alter table trail_steps drop constraint trail_steps_content_check;

alter table trail_steps add constraint trail_steps_content_check check (
  case kind
    when 'text' then body is not null and char_length(btrim(body)) > 0 and media_id is null
    when 'link' then url is not null and media_id is null
    else (url is not null) <> (media_id is not null)
  end
);
