import { api, download } from './client';

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
  lastActivityAt: string | null;
}

export interface TrailReport {
  trailId: string;
  title: string;
  assigned: number;
  completed: number;
  averagePercent: number;
}

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export const reportsApi = {
  progress: () => api.get<{ trails: TrailReport[]; rows: ProgressRow[] }>('/reports/progress'),
  downloadCsv: (trailId?: string) =>
    download(
      `/reports/progress.csv${trailId ? `?trailId=${encodeURIComponent(trailId)}` : ''}`,
      'progresso-onboarding.csv',
    ),
};

export function statusOf(row: ProgressRow): ProgressStatus {
  if (row.completed) return 'completed';
  return row.completedSteps > 0 ? 'in_progress' : 'not_started';
}

export const progressStatusLabels: Record<ProgressStatus, string> = {
  not_started: 'Não iniciou',
  in_progress: 'Em andamento',
  completed: 'Concluída',
};

export interface Overview {
  trails: number;
  people: number;
  assignments: number;
  completedAssignments: number;
  averagePercent: number;
  stalled: number;
}

const DAY = 24 * 60 * 60 * 1000;

export function overview(trails: TrailReport[], rows: ProgressRow[], now = Date.now()): Overview {
  const assignments = rows.length;
  return {
    trails: trails.length,
    people: new Set(rows.map((row) => row.userId)).size,
    assignments,
    completedAssignments: rows.filter((row) => row.completed).length,
    averagePercent: assignments ? Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / assignments) : 0,
    stalled: rows.filter(
      (row) => !row.completed && (!row.lastActivityAt || now - new Date(row.lastActivityAt).getTime() > 7 * DAY),
    ).length,
  };
}

export function relativeDate(value: string | null, now = Date.now()): string {
  if (!value) return 'Nunca';
  const days = Math.floor((now - new Date(value).getTime()) / DAY);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `Há ${days} dias`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}
