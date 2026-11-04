alter table trail_job_roles add column created_at timestamptz not null default now();

update trail_job_roles tj set created_at = t.created_at from trails t where t.id = tj.trail_id;

alter table users add column job_role_assigned_at timestamptz;

update users set job_role_assigned_at = created_at where job_role_id is not null;

create function users_track_job_role() returns trigger language plpgsql as $$
begin
  if new.job_role_id is null then
    new.job_role_assigned_at := null;
  elsif tg_op = 'INSERT' or new.job_role_id is distinct from old.job_role_id then
    new.job_role_assigned_at := now();
  end if;
  return new;
end;
$$;

create trigger users_track_job_role
  before insert or update of job_role_id on users
  for each row execute function users_track_job_role();
