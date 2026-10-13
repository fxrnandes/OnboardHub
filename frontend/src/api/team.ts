import type { Role } from './auth';
import { api } from './client';

export interface JobRole {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobRoleId: string | null;
  createdAt: string;
}

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface Invite {
  id: string;
  email: string | null;
  role: Exclude<Role, 'master'>;
  jobRoleId: string | null;
  jobRoleName: string | null;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

export interface NewInvite {
  email?: string | null;
  role: Exclude<Role, 'master'>;
  jobRoleId?: string | null;
}

export const jobRolesApi = {
  list: () => api.get<{ jobRoles: JobRole[] }>('/job-roles').then((data) => data.jobRoles),
  create: (name: string) => api.post<{ jobRole: JobRole }>('/job-roles', { name }).then((data) => data.jobRole),
  rename: (id: string, name: string) =>
    api.patch<{ jobRole: JobRole }>(`/job-roles/${id}`, { name }).then((data) => data.jobRole),
  remove: (id: string) => api.delete(`/job-roles/${id}`),
};

export const membersApi = {
  list: () => api.get<{ members: Member[] }>('/members').then((data) => data.members),
  update: (id: string, changes: { role?: Role; jobRoleId?: string | null }) =>
    api.patch<{ member: Member }>(`/members/${id}`, changes).then((data) => data.member),
  remove: (id: string) => api.delete(`/members/${id}`),
};

export const invitesApi = {
  list: () => api.get<{ invites: Invite[] }>('/invites').then((data) => data.invites),
  create: (input: NewInvite) => api.post<{ invite: Invite; link: string }>('/invites', input),
  revoke: (id: string) => api.delete(`/invites/${id}`),
};

export const inviteStatusLabels: Record<InviteStatus, string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  revoked: 'Revogado',
  expired: 'Expirado',
};
