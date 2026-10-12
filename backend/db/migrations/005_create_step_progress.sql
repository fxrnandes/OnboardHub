create table step_progress (
  company_id   uuid not null,
  user_id      uuid not null,
  trail_id     uuid not null,
  step_id      uuid not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, step_id),
  foreign key (company_id, user_id) references users (company_id, id) on delete cascade,
  foreign key (company_id, trail_id, step_id) references trail_steps (company_id, trail_id, id) on delete cascade
);

create index step_progress_trail_user_idx on step_progress (trail_id, user_id);
