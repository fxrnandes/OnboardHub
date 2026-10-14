import { api } from './client';
import type { Step } from './trails';

export interface Progress {
  totalSteps: number;
  completedSteps: number;
  percent: number;
  completed: boolean;
  nextStepId: string | null;
  lastActivityAt: string | null;
}

export interface MyTrail extends Omit<Progress, 'nextStepId'> {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
}

export interface LearnerStep extends Step {
  completedAt: string | null;
}

export interface LearnerModule {
  id: string;
  title: string;
  position: number;
  steps: LearnerStep[];
}

export interface LearnerTrail {
  trail: {
    id: string;
    title: string;
    description: string;
    modules: LearnerModule[];
  };
  progress: Progress;
  resumeStepId: string | null;
}

export const learningApi = {
  list: () => api.get<{ trails: MyTrail[] }>('/my/trails').then((data) => data.trails),
  open: (id: string) => api.get<LearnerTrail>(`/my/trails/${id}`),
  complete: (stepId: string) =>
    api.post<{ progress: Progress }>(`/my/steps/${stepId}/complete`).then((data) => data.progress),
  uncomplete: (stepId: string) =>
    api.delete<{ progress: Progress }>(`/my/steps/${stepId}/complete`).then((data) => data.progress),
};

export function videoEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const fromQuery = parsed.searchParams.get('v');
    const fromPath = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
    const id = fromQuery ?? fromPath;
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname.match(/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

export const isVideoFile = (url: string) => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
