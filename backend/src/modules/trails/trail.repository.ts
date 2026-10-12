import type { Queryable } from '../../db/pool.js';
import type { Step, StepContent, TrailModule, TrailStatus, TrailSummary, TrailTree } from './trail.types.js';

interface TrailRow {
  id: string;
  title: string;
  description: string;
  status: TrailStatus;
  published_at: Date | null;
  module_count: number;
  step_count: number;
  job_role_ids: string[];
  created_at: Date;
  updated_at: Date;
}

interface ModuleRow {
  id: string;
  trail_id: string;
  title: string;
  position: number;
}

interface StepRow {
  id: string;
  trail_id: string;
  module_id: string;
  title: string;
  kind: Step['kind'];
  body: string | null;
  url: string | null;
  position: number;
}

const toTrail = (row: TrailRow): TrailSummary => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  publishedAt: row.published_at,
  moduleCount: row.module_count,
  stepCount: row.step_count,
  jobRoleIds: row.job_role_ids,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toStep = (row: StepRow): Step => ({
  id: row.id,
  moduleId: row.module_id,
  title: row.title,
  kind: row.kind,
  body: row.body,
  url: row.url,
  position: row.position,
});

const selectTrail = `
  select t.id, t.title, t.description, t.status, t.published_at, t.created_at, t.updated_at,
         (select count(*)::int from trail_modules m where m.trail_id = t.id) as module_count,
         (select count(*)::int from trail_steps s where s.trail_id = t.id) as step_count,
         coalesce((select array_agg(tj.job_role_id order by tj.job_role_id)
                   from trail_job_roles tj where tj.trail_id = t.id), '{}') as job_role_ids
  from trails t`;

export class TrailRepository {
  constructor(private readonly db: Queryable) {}

  async list(companyId: string): Promise<TrailSummary[]> {
    const { rows } = await this.db.query<TrailRow>(
      `${selectTrail} where t.company_id = $1 order by t.updated_at desc`,
      [companyId],
    );
    return rows.map(toTrail);
  }

  async find(companyId: string, id: string): Promise<TrailSummary | null> {
    const { rows } = await this.db.query<TrailRow>(`${selectTrail} where t.company_id = $1 and t.id = $2`, [
      companyId,
      id,
    ]);
    return rows[0] ? toTrail(rows[0]) : null;
  }

  async findTree(companyId: string, id: string): Promise<TrailTree | null> {
    const trail = await this.find(companyId, id);
    if (!trail) return null;

    const modules = await this.db.query<ModuleRow>(
      'select id, trail_id, title, position from trail_modules where trail_id = $1 order by position',
      [id],
    );
    const steps = await this.db.query<StepRow>(
      `select id, trail_id, module_id, title, kind, body, url, position
       from trail_steps where trail_id = $1 order by position`,
      [id],
    );

    const tree: TrailModule[] = modules.rows.map((module) => ({
      id: module.id,
      title: module.title,
      position: module.position,
      steps: steps.rows.filter((step) => step.module_id === module.id).map(toStep),
    }));

    return { ...trail, modules: tree };
  }

  async lock(companyId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query('select 1 from trails where company_id = $1 and id = $2 for update', [
      companyId,
      id,
    ]);
    return rowCount === 1;
  }

  async create(companyId: string, createdBy: string, title: string, description: string): Promise<string> {
    const { rows } = await this.db.query<{ id: string }>(
      'insert into trails (company_id, created_by, title, description) values ($1, $2, $3, $4) returning id',
      [companyId, createdBy, title, description],
    );
    return rows[0]!.id;
  }

  async update(companyId: string, id: string, changes: { title?: string; description?: string }): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `update trails set title = coalesce($3, title), description = coalesce($4, description), updated_at = now()
       where company_id = $1 and id = $2`,
      [companyId, id, changes.title ?? null, changes.description ?? null],
    );
    return rowCount === 1;
  }

  async delete(companyId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query('delete from trails where company_id = $1 and id = $2', [companyId, id]);
    return rowCount === 1;
  }

  async setStatus(companyId: string, id: string, status: TrailStatus): Promise<void> {
    await this.db.query(
      `update trails set status = $3,
         published_at = case when $3 = 'published' then coalesce(published_at, now()) end,
         updated_at = now()
       where company_id = $1 and id = $2`,
      [companyId, id, status],
    );
  }

  async touch(id: string): Promise<void> {
    await this.db.query('update trails set updated_at = now() where id = $1', [id]);
  }

  async setJobRoles(companyId: string, id: string, jobRoleIds: string[]): Promise<void> {
    await this.db.query('delete from trail_job_roles where trail_id = $1', [id]);
    await this.db.query(
      `insert into trail_job_roles (company_id, trail_id, job_role_id)
       select $1, $2, unnest($3::uuid[])`,
      [companyId, id, jobRoleIds],
    );
  }

  async countExistingJobRoles(companyId: string, jobRoleIds: string[]): Promise<number> {
    const { rows } = await this.db.query<{ total: number }>(
      'select count(*)::int as total from job_roles where company_id = $1 and id = any($2::uuid[])',
      [companyId, jobRoleIds],
    );
    return rows[0]!.total;
  }

  async duplicate(companyId: string, id: string, createdBy: string): Promise<string> {
    const { rows } = await this.db.query<{ id: string }>(
      `insert into trails (company_id, created_by, title, description)
       select company_id, $3, left(title || ' (cópia)', 160), description from trails
       where company_id = $1 and id = $2
       returning id`,
      [companyId, id, createdBy],
    );
    const copyId = rows[0]!.id;

    await this.db.query(
      `with modules as (
         select id as old_id, gen_random_uuid() as new_id, title, position
         from trail_modules where trail_id = $2
       ), inserted as (
         insert into trail_modules (id, company_id, trail_id, title, position)
         select new_id, $1, $3, title, position from modules
       )
       insert into trail_steps (company_id, trail_id, module_id, title, kind, body, url, position)
       select $1, $3, modules.new_id, s.title, s.kind, s.body, s.url, s.position
       from trail_steps s join modules on modules.old_id = s.module_id`,
      [companyId, id, copyId],
    );
    await this.db.query(
      `insert into trail_job_roles (company_id, trail_id, job_role_id)
       select company_id, $2, job_role_id from trail_job_roles where trail_id = $1`,
      [id, copyId],
    );
    return copyId;
  }

  async findModule(companyId: string, id: string): Promise<ModuleRow | null> {
    const { rows } = await this.db.query<ModuleRow>(
      'select id, trail_id, title, position from trail_modules where company_id = $1 and id = $2',
      [companyId, id],
    );
    return rows[0] ?? null;
  }

  async moduleIds(trailId: string): Promise<string[]> {
    const { rows } = await this.db.query<{ id: string }>('select id from trail_modules where trail_id = $1', [trailId]);
    return rows.map((row) => row.id);
  }

  async createModule(companyId: string, trailId: string, title: string): Promise<ModuleRow> {
    const { rows } = await this.db.query<ModuleRow>(
      `insert into trail_modules (company_id, trail_id, title, position)
       values ($1, $2, $3, (select coalesce(max(position) + 1, 0) from trail_modules where trail_id = $2))
       returning id, trail_id, title, position`,
      [companyId, trailId, title],
    );
    return rows[0]!;
  }

  async renameModule(id: string, title: string): Promise<ModuleRow> {
    const { rows } = await this.db.query<ModuleRow>(
      'update trail_modules set title = $2 where id = $1 returning id, trail_id, title, position',
      [id, title],
    );
    return rows[0]!;
  }

  async deleteModule(id: string): Promise<void> {
    await this.db.query('delete from trail_modules where id = $1', [id]);
  }

  async reorderModules(ids: string[]): Promise<void> {
    await this.db.query(
      `update trail_modules m set position = (o.ord - 1)::int
       from unnest($1::uuid[]) with ordinality as o(id, ord) where m.id = o.id`,
      [ids],
    );
  }

  async compactModules(trailId: string): Promise<void> {
    await this.db.query(
      `update trail_modules m set position = r.pos
       from (select id, (row_number() over (order by position) - 1)::int as pos
             from trail_modules where trail_id = $1) r
       where m.id = r.id and m.position <> r.pos`,
      [trailId],
    );
  }

  async findStep(companyId: string, id: string): Promise<StepRow | null> {
    const { rows } = await this.db.query<StepRow>(
      `select id, trail_id, module_id, title, kind, body, url, position
       from trail_steps where company_id = $1 and id = $2`,
      [companyId, id],
    );
    return rows[0] ?? null;
  }

  async stepIds(moduleId: string): Promise<string[]> {
    const { rows } = await this.db.query<{ id: string }>('select id from trail_steps where module_id = $1', [moduleId]);
    return rows.map((row) => row.id);
  }

  async createStep(companyId: string, trailId: string, moduleId: string, title: string, content: StepContent): Promise<Step> {
    const { rows } = await this.db.query<StepRow>(
      `insert into trail_steps (company_id, trail_id, module_id, title, kind, body, url, position)
       values ($1, $2, $3, $4, $5, $6, $7,
               (select coalesce(max(position) + 1, 0) from trail_steps where module_id = $3))
       returning id, trail_id, module_id, title, kind, body, url, position`,
      [companyId, trailId, moduleId, title, content.kind, content.body, content.url],
    );
    return toStep(rows[0]!);
  }

  async updateStep(id: string, title: string, content: StepContent): Promise<Step> {
    const { rows } = await this.db.query<StepRow>(
      `update trail_steps set title = $2, kind = $3, body = $4, url = $5, updated_at = now()
       where id = $1
       returning id, trail_id, module_id, title, kind, body, url, position`,
      [id, title, content.kind, content.body, content.url],
    );
    return toStep(rows[0]!);
  }

  async deleteStep(id: string): Promise<void> {
    await this.db.query('delete from trail_steps where id = $1', [id]);
  }

  async reorderSteps(ids: string[]): Promise<void> {
    await this.db.query(
      `update trail_steps s set position = (o.ord - 1)::int
       from unnest($1::uuid[]) with ordinality as o(id, ord) where s.id = o.id`,
      [ids],
    );
  }

  async compactSteps(moduleId: string): Promise<void> {
    await this.db.query(
      `update trail_steps s set position = r.pos
       from (select id, (row_number() over (order by position) - 1)::int as pos
             from trail_steps where module_id = $1) r
       where s.id = r.id and s.position <> r.pos`,
      [moduleId],
    );
  }
}
