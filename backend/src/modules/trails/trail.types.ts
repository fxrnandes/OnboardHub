export type TrailStatus = 'draft' | 'published';
export type StepKind = 'text' | 'link' | 'video' | 'image';

export interface TrailSummary {
  id: string;
  title: string;
  description: string;
  status: TrailStatus;
  publishedAt: Date | null;
  moduleCount: number;
  stepCount: number;
  jobRoleIds: string[];
  createdAt: Date;
  updatedAt: Date;
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

export interface StepContent {
  kind: StepKind;
  body: string | null;
  url: string | null;
}
