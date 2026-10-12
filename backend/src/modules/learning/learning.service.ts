import type pg from 'pg';
import { AppError } from '../../http/errors.js';
import { TrailRepository } from '../trails/trail.repository.js';
import type { TrailModule, TrailTree } from '../trails/trail.types.js';
import { LearningRepository, type Learner, type MyTrail, type Progress } from './learning.repository.js';

export interface LearnerTrail {
  trail: Omit<TrailTree, 'modules' | 'jobRoleIds' | 'status'> & {
    modules: (Omit<TrailModule, 'steps'> & { steps: (TrailModule['steps'][number] & { completedAt: Date | null })[] })[];
  };
  progress: Progress;
  resumeStepId: string | null;
}

export class LearningService {
  private readonly learning: LearningRepository;
  private readonly trails: TrailRepository;

  constructor(pool: pg.Pool) {
    this.learning = new LearningRepository(pool);
    this.trails = new TrailRepository(pool);
  }

  listTrails(learner: Learner): Promise<MyTrail[]> {
    return this.learning.listTrails(learner);
  }

  async openTrail(learner: Learner, trailId: string): Promise<LearnerTrail> {
    if (!(await this.learning.canSeeTrail(learner, trailId))) {
      throw new AppError(404, 'not_found', 'Trilha não encontrada.');
    }
    const { modules, jobRoleIds: _roles, status: _status, ...trail } = (await this.trails.findTree(
      learner.companyId,
      trailId,
    ))!;
    const done = await this.learning.completedAt(learner.userId, trailId);
    const progress = await this.learning.progress(learner.userId, trailId);

    return {
      trail: {
        ...trail,
        modules: modules.map((module) => ({
          ...module,
          steps: module.steps.map((step) => ({ ...step, completedAt: done.get(step.id) ?? null })),
        })),
      },
      progress,
      resumeStepId: progress.nextStepId ?? modules[0]?.steps[0]?.id ?? null,
    };
  }

  async complete(learner: Learner, stepId: string): Promise<Progress> {
    const trailId = await this.visibleStepTrail(learner, stepId);
    await this.learning.complete(learner, trailId, stepId);
    return this.learning.progress(learner.userId, trailId);
  }

  async uncomplete(learner: Learner, stepId: string): Promise<Progress> {
    const trailId = await this.visibleStepTrail(learner, stepId);
    await this.learning.uncomplete(learner.userId, stepId);
    return this.learning.progress(learner.userId, trailId);
  }

  private async visibleStepTrail(learner: Learner, stepId: string): Promise<string> {
    const trailId = await this.learning.findVisibleStepTrail(learner, stepId);
    if (!trailId) throw new AppError(404, 'not_found', 'Passo não encontrado.');
    return trailId;
  }
}
