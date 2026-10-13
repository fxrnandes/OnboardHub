import { api } from './client';

export type Role = 'master' | 'gestor' | 'colaborador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobRoleId: string | null;
}

export interface Company {
  id: string;
  name: string;
}

export interface Session {
  user: User;
  company: Company;
}

export interface SignupInput {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface InvitePreview {
  companyName: string;
  email: string | null;
  role: Exclude<Role, 'master'>;
  jobRoleName: string | null;
  expiresAt: string;
}

export interface AcceptInviteInput {
  name: string;
  email?: string;
  password: string;
}

export const authApi = {
  signup: (input: SignupInput) => api.post<{ token: string } & Session>('/auth/signup', input),
  login: (input: LoginInput) => api.post<{ token: string; user: User }>('/auth/login', input),
  me: () => api.get<Session>('/auth/me'),
  previewInvite: (token: string) =>
    api.get<{ invite: InvitePreview }>(`/invites/token/${encodeURIComponent(token)}`),
  acceptInvite: (token: string, input: AcceptInviteInput) =>
    api.post<{ token: string; user: User }>(`/invites/token/${encodeURIComponent(token)}/accept`, input),
};

export const roleLabels: Record<Role, string> = {
  master: 'Administrador',
  gestor: 'Gestor',
  colaborador: 'Colaborador',
};
