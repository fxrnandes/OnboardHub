import { api } from './client';

export type TrailStatus = 'draft' | 'published';
export type StepKind = 'text' | 'link' | 'video' | 'image';

export interface TrailSummary {
  id: string;
  title: string;
  description: string;
  status: TrailStatus;
  publishedAt: string | null;
  moduleCount: number;
  stepCount: number;
  jobRoleIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Step {
  id: string;
  moduleId: string;
  title: string;
  kind: StepKind;
  body: string | null;
  url: string | null;
  position: number;
}

export interface TrailModule {
  id: string;
  title: string;
  position: number;
  steps: Step[];
}

export interface TrailTree extends TrailSummary {
  modules: TrailModule[];
}

export interface StepInput {
  title: string;
  kind: StepKind;
  body?: string | null;
  url?: string | null;
}

export const trailsApi = {
  list: () => api.get<{ trails: TrailSummary[] }>('/trails').then((data) => data.trails),
  get: (id: string) => api.get<{ trail: TrailTree }>(`/trails/${id}`).then((data) => data.trail),
  create: (title: string, description = '') =>
    api.post<{ trail: TrailTree }>('/trails', { title, description }).then((data) => data.trail),
  update: (id: string, changes: { title?: string; description?: string }) =>
    api.patch<{ trail: TrailTree }>(`/trails/${id}`, changes).then((data) => data.trail),
  remove: (id: string) => api.delete(`/trails/${id}`),
  duplicate: (id: string) => api.post<{ trail: TrailTree }>(`/trails/${id}/duplicate`).then((data) => data.trail),
  publish: (id: string) => api.post<{ trail: TrailSummary; warnings: string[] }>(`/trails/${id}/publish`),
  unpublish: (id: string) => api.post<{ trail: TrailSummary }>(`/trails/${id}/unpublish`).then((data) => data.trail),
  setJobRoles: (id: string, jobRoleIds: string[]) =>
    api.put<{ jobRoleIds: string[] }>(`/trails/${id}/job-roles`, { jobRoleIds }).then((data) => data.jobRoleIds),
  addModule: (trailId: string, title: string) =>
    api.post<{ module: TrailModule }>(`/trails/${trailId}/modules`, { title }).then((data) => data.module),
  reorderModules: (trailId: string, moduleIds: string[]) => api.put(`/trails/${trailId}/modules/order`, { moduleIds }),
  renameModule: (id: string, title: string) => api.patch(`/modules/${id}`, { title }),
  removeModule: (id: string) => api.delete(`/modules/${id}`),
  addStep: (moduleId: string, input: StepInput) =>
    api.post<{ step: Step }>(`/modules/${moduleId}/steps`, input).then((data) => data.step),
  reorderSteps: (moduleId: string, stepIds: string[]) => api.put(`/modules/${moduleId}/steps/order`, { stepIds }),
  updateStep: (id: string, changes: Partial<StepInput>) =>
    api.patch<{ step: Step }>(`/steps/${id}`, changes).then((data) => data.step),
  removeStep: (id: string) => api.delete(`/steps/${id}`),
};

export const stepKindLabels: Record<StepKind, string> = {
  text: 'Texto',
  link: 'Link',
  video: 'Vídeo',
  image: 'Imagem',
};

export const trailStatusLabels: Record<TrailStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicada',
};

export function moveItem<T>(list: T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  return copy;
}
