import type { Queryable } from '../../db/pool.js';
import { percent } from '../learning/learning.repository.js';

export interface ProgressRow {
  trailId: string;
  trailTitle: string;
  userId: string;
  name: string;
  email: string;
  jobRoleName: string | null;
  totalSteps: number;
  completedSteps: number;
  percent: number;
  completed: boolean;
  lastActivityAt: Date | null;
}

export interface TrailSummary {
  trailId: string;
  title: string;
  assigned: number;
  completed: number;
  averagePercent: number;
}

interface Row {
  trail_id: string;
  trail_title: string;
  user_id: string;
  name: string;
  email: string;
  job_role_name: string | null;
  total_steps: number;
  completed_steps: number;
  last_activity_at: Date | null;
}

export class ReportRepository {
  constructor(private readonly db: Queryable) {}

  async progress(companyId: string, trailId?: string): Promise<ProgressRow[]> {
    const { rows } = await this.db.query<Row>(
      `select t.id as trail_id, t.title as trail_title,
              u.id as user_id, u.name, u.email, jr.name as job_role_name,
              (select count(*)::int from trail_steps s where s.trail_id = t.id) as total_steps,
              count(p.step_id)::int as completed_steps,
              max(p.completed_at) as last_activity_at
       from trails t
       join trail_job_roles tj on tj.trail_id = t.id
       join users u on u.job_role_id = tj.job_role_id and u.company_id = t.company_id
       join job_roles jr on jr.id = u.job_role_id
       left join step_progress p on p.trail_id = t.id and p.user_id = u.id
       where t.company_id = $1 and t.status = 'published' and ($2::uuid is null or t.id = $2)
       group by t.id, u.id, jr.name
       order by lower(t.title), lower(u.name)`,
      [companyId, trailId ?? null],
    );
    return rows.map((row) => ({
      trailId: row.trail_id,
      trailTitle: row.trail_title,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      jobRoleName: row.job_role_name,
      totalSteps: row.total_steps,
      completedSteps: row.completed_steps,
      percent: percent(row.completed_steps, row.total_steps),
      completed: row.total_steps > 0 && row.completed_steps >= row.total_steps,
      lastActivityAt: row.last_activity_at,
    }));
  }
}

export function summarize(rows: ProgressRow[]): TrailSummary[] {
  const byTrail = new Map<string, TrailSummary & { percentSum: number }>();
  for (const row of rows) {
    const trail = byTrail.get(row.trailId) ?? {
      trailId: row.trailId,
      title: row.trailTitle,
      assigned: 0,
      completed: 0,
      averagePercent: 0,
      percentSum: 0,
    };
    trail.assigned += 1;
    trail.completed += row.completed ? 1 : 0;
    trail.percentSum += row.percent;
    byTrail.set(row.trailId, trail);
  }
  return [...byTrail.values()].map(({ percentSum, ...trail }) => ({
    ...trail,
    averagePercent: Math.round(percentSum / trail.assigned),
  }));
}
