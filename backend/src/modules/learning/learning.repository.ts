import type { Queryable } from '../../db/pool.js';

export interface Learner {
  userId: string;
  companyId: string;
  jobRoleId: string | null;
}

export interface Progress {
  totalSteps: number;
  completedSteps: number;
  percent: number;
  completed: boolean;
  nextStepId: string | null;
  lastActivityAt: Date | null;
}

export interface MyTrail extends Omit<Progress, 'nextStepId'> {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
}

interface MyTrailRow {
  id: string;
  title: string;
  description: string;
  published_at: Date;
  total_steps: number;
  completed_steps: number;
  last_activity_at: Date | null;
}

interface ProgressRow {
  total_steps: number;
  completed_steps: number;
  next_step_id: string | null;
  last_activity_at: Date | null;
}

export const percent = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100));

const visibleTo = `
  t.status = 'published'
  and t.company_id = $1
  and exists (select 1 from trail_job_roles tj where tj.trail_id = t.id and tj.job_role_id = $2)`;

export class LearningRepository {
  constructor(private readonly db: Queryable) {}

  async listTrails(learner: Learner): Promise<MyTrail[]> {
    const { rows } = await this.db.query<MyTrailRow>(
      `select t.id, t.title, t.description, t.published_at,
              (select count(*)::int from trail_steps s where s.trail_id = t.id) as total_steps,
              (select count(*)::int from step_progress p where p.trail_id = t.id and p.user_id = $3) as completed_steps,
              (select max(p.completed_at) from step_progress p where p.trail_id = t.id and p.user_id = $3) as last_activity_at
       from trails t
       where ${visibleTo}
       order by t.published_at desc`,
      [learner.companyId, learner.jobRoleId, learner.userId],
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      publishedAt: row.published_at,
      totalSteps: row.total_steps,
      completedSteps: row.completed_steps,
      percent: percent(row.completed_steps, row.total_steps),
      completed: row.total_steps > 0 && row.completed_steps >= row.total_steps,
      lastActivityAt: row.last_activity_at,
    }));
  }

  async canSeeTrail(learner: Learner, trailId: string): Promise<boolean> {
    const { rowCount } = await this.db.query(`select 1 from trails t where ${visibleTo} and t.id = $3`, [
      learner.companyId,
      learner.jobRoleId,
      trailId,
    ]);
    return rowCount === 1;
  }

  async findVisibleStepTrail(learner: Learner, stepId: string): Promise<string | null> {
    const { rows } = await this.db.query<{ trail_id: string }>(
      `select s.trail_id from trail_steps s join trails t on t.id = s.trail_id
       where ${visibleTo} and s.id = $3`,
      [learner.companyId, learner.jobRoleId, stepId],
    );
    return rows[0]?.trail_id ?? null;
  }

  async completedAt(userId: string, trailId: string): Promise<Map<string, Date>> {
    const { rows } = await this.db.query<{ step_id: string; completed_at: Date }>(
      'select step_id, completed_at from step_progress where user_id = $1 and trail_id = $2',
      [userId, trailId],
    );
    return new Map(rows.map((row) => [row.step_id, row.completed_at]));
  }

  async complete(learner: Learner, trailId: string, stepId: string): Promise<void> {
    await this.db.query(
      `insert into step_progress (company_id, user_id, trail_id, step_id) values ($1, $2, $3, $4)
       on conflict (user_id, step_id) do nothing`,
      [learner.companyId, learner.userId, trailId, stepId],
    );
  }

  async uncomplete(userId: string, stepId: string): Promise<void> {
    await this.db.query('delete from step_progress where user_id = $1 and step_id = $2', [userId, stepId]);
  }

  async progress(userId: string, trailId: string): Promise<Progress> {
    const { rows } = await this.db.query<ProgressRow>(
      `with ordered as (
         select s.id, row_number() over (order by m.position, s.position) as ord
         from trail_steps s join trail_modules m on m.id = s.module_id
         where s.trail_id = $2
       )
       select
         (select count(*)::int from ordered) as total_steps,
         (select count(*)::int from step_progress p where p.trail_id = $2 and p.user_id = $1) as completed_steps,
         (select o.id from ordered o
            where not exists (select 1 from step_progress p where p.step_id = o.id and p.user_id = $1)
            order by o.ord limit 1) as next_step_id,
         (select max(completed_at) from step_progress p where p.trail_id = $2 and p.user_id = $1) as last_activity_at`,
      [userId, trailId],
    );
    const row = rows[0]!;
    return {
      totalSteps: row.total_steps,
      completedSteps: row.completed_steps,
      percent: percent(row.completed_steps, row.total_steps),
      completed: row.total_steps > 0 && row.completed_steps >= row.total_steps,
      nextStepId: row.next_step_id,
      lastActivityAt: row.last_activity_at,
    };
  }
}
