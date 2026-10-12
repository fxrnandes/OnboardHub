import type pg from 'pg';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../http/errors.js';
import { TrailRepository } from './trail.repository.js';
import type { Step, StepContent, StepKind, TrailModule, TrailSummary, TrailTree } from './trail.types.js';

export interface StepInput {
  title: string;
  kind: StepKind;
  body?: string | null;
  url?: string | null;
}

export interface StepChanges {
  title?: string;
  kind?: StepKind;
  body?: string | null;
  url?: string | null;
}

const trailNotFound = () => new AppError(404, 'not_found', 'Trilha não encontrada.');
const moduleNotFound = () => new AppError(404, 'not_found', 'Módulo não encontrado.');
const stepNotFound = () => new AppError(404, 'not_found', 'Passo não encontrado.');

export function normalizeContent(kind: StepKind, body?: string | null, url?: string | null): StepContent {
  const cleanBody = body?.trim() ? body : null;
  const cleanUrl = url?.trim() || null;

  if (kind === 'text') {
    if (!cleanBody) throw new AppError(400, 'step_content', 'Passo de texto precisa de conteúdo.');
    return { kind, body: cleanBody, url: null };
  }

  if (!cleanUrl) {
    const messages = {
      link: 'Passo de link precisa de uma URL.',
      video: 'Passo de vídeo precisa da URL do vídeo.',
      image: 'Passo de imagem precisa da URL da imagem.',
    };
    throw new AppError(400, 'step_content', messages[kind]);
  }
  return { kind, body: cleanBody, url: cleanUrl };
}

function ensureSameSet(current: string[], requested: string[], what: string) {
  const unique = new Set(requested);
  const sameSize = unique.size === requested.length && unique.size === current.length;
  if (!sameSize || current.some((id) => !unique.has(id))) {
    throw new AppError(400, 'invalid_order', `Envie todos os ${what} atuais, cada um uma vez, na nova ordem.`);
  }
}

export class TrailService {
  private readonly trails: TrailRepository;

  constructor(private readonly pool: pg.Pool) {
    this.trails = new TrailRepository(pool);
  }

  list(companyId: string): Promise<TrailSummary[]> {
    return this.trails.list(companyId);
  }

  async get(companyId: string, id: string): Promise<TrailTree> {
    const trail = await this.trails.findTree(companyId, id);
    if (!trail) throw trailNotFound();
    return trail;
  }

  async create(companyId: string, userId: string, title: string, description: string): Promise<TrailTree> {
    const id = await this.trails.create(companyId, userId, title, description);
    return this.get(companyId, id);
  }

  async update(companyId: string, id: string, changes: { title?: string; description?: string }): Promise<TrailTree> {
    if (!(await this.trails.update(companyId, id, changes))) throw trailNotFound();
    return this.get(companyId, id);
  }

  async delete(companyId: string, id: string): Promise<void> {
    if (!(await this.trails.delete(companyId, id))) throw trailNotFound();
  }

  async duplicate(companyId: string, id: string, userId: string): Promise<TrailTree> {
    const copyId = await this.inTrail(companyId, id, (trails) => trails.duplicate(companyId, id, userId));
    return this.get(companyId, copyId);
  }

  async publish(companyId: string, id: string): Promise<{ trail: TrailSummary; warnings: string[] }> {
    const trail = await this.inTrail(companyId, id, async (trails) => {
      const current = (await trails.find(companyId, id))!;
      if (current.stepCount === 0) {
        throw new AppError(400, 'trail_empty', 'Adicione pelo menos um passo antes de publicar.');
      }
      await trails.setStatus(companyId, id, 'published');
      return (await trails.find(companyId, id))!;
    });
    const warnings = trail.jobRoleIds.length
      ? []
      : ['A trilha não está atribuída a nenhum cargo, então nenhum colaborador vai vê-la.'];
    return { trail, warnings };
  }

  async unpublish(companyId: string, id: string): Promise<TrailSummary> {
    return this.inTrail(companyId, id, async (trails) => {
      await trails.setStatus(companyId, id, 'draft');
      return (await trails.find(companyId, id))!;
    });
  }

  async setJobRoles(companyId: string, id: string, jobRoleIds: string[]): Promise<string[]> {
    const unique = [...new Set(jobRoleIds)];
    return this.inTrail(companyId, id, async (trails) => {
      if ((await trails.countExistingJobRoles(companyId, unique)) !== unique.length) {
        throw new AppError(400, 'job_role_not_found', 'Algum dos cargos informados não existe.');
      }
      await trails.setJobRoles(companyId, id, unique);
      await trails.touch(id);
      return unique.sort();
    });
  }

  async addModule(companyId: string, trailId: string, title: string): Promise<TrailModule> {
    return this.inTrail(companyId, trailId, async (trails) => {
      const module = await trails.createModule(companyId, trailId, title);
      await trails.touch(trailId);
      return { id: module.id, title: module.title, position: module.position, steps: [] };
    });
  }

  async renameModule(companyId: string, id: string, title: string): Promise<Omit<TrailModule, 'steps'>> {
    const module = await this.trails.findModule(companyId, id);
    if (!module) throw moduleNotFound();
    const renamed = await this.trails.renameModule(id, title);
    return { id: renamed.id, title: renamed.title, position: renamed.position };
  }

  async deleteModule(companyId: string, id: string): Promise<void> {
    const module = await this.trails.findModule(companyId, id);
    if (!module) throw moduleNotFound();
    await this.inTrail(companyId, module.trail_id, async (trails) => {
      await trails.deleteModule(id);
      await trails.compactModules(module.trail_id);
      await trails.touch(module.trail_id);
    });
  }

  async reorderModules(companyId: string, trailId: string, moduleIds: string[]): Promise<void> {
    await this.inTrail(companyId, trailId, async (trails) => {
      ensureSameSet(await trails.moduleIds(trailId), moduleIds, 'módulos');
      await trails.reorderModules(moduleIds);
      await trails.touch(trailId);
    });
  }

  async addStep(companyId: string, moduleId: string, input: StepInput): Promise<Step> {
    const module = await this.trails.findModule(companyId, moduleId);
    if (!module) throw moduleNotFound();
    const content = normalizeContent(input.kind, input.body, input.url);
    return this.inTrail(companyId, module.trail_id, async (trails) => {
      const step = await trails.createStep(companyId, module.trail_id, moduleId, input.title, content);
      await trails.touch(module.trail_id);
      return step;
    });
  }

  async updateStep(companyId: string, id: string, changes: StepChanges): Promise<Step> {
    const current = await this.trails.findStep(companyId, id);
    if (!current) throw stepNotFound();
    const content = normalizeContent(
      changes.kind ?? current.kind,
      changes.body === undefined ? current.body : changes.body,
      changes.url === undefined ? current.url : changes.url,
    );
    const step = await this.trails.updateStep(id, changes.title ?? current.title, content);
    await this.trails.touch(current.trail_id);
    return step;
  }

  async deleteStep(companyId: string, id: string): Promise<void> {
    const step = await this.trails.findStep(companyId, id);
    if (!step) throw stepNotFound();
    await this.inTrail(companyId, step.trail_id, async (trails) => {
      await trails.deleteStep(id);
      await trails.compactSteps(step.module_id);
      await trails.touch(step.trail_id);
    });
  }

  async reorderSteps(companyId: string, moduleId: string, stepIds: string[]): Promise<void> {
    const module = await this.trails.findModule(companyId, moduleId);
    if (!module) throw moduleNotFound();
    await this.inTrail(companyId, module.trail_id, async (trails) => {
      ensureSameSet(await trails.stepIds(moduleId), stepIds, 'passos');
      await trails.reorderSteps(stepIds);
      await trails.touch(module.trail_id);
    });
  }

  private inTrail<T>(companyId: string, trailId: string, work: (trails: TrailRepository) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, async (client) => {
      const trails = new TrailRepository(client);
      if (!(await trails.lock(companyId, trailId))) throw trailNotFound();
      return work(trails);
    });
  }
}
