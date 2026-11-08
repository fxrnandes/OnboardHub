import { api } from './client';

export interface CompanyDetails {
  id: string;
  name: string;
  cnpj: string;
}

export const companyApi = {
  get: () => api.get<{ company: CompanyDetails }>('/company').then((data) => data.company),
  rename: (name: string) => api.patch<{ company: CompanyDetails }>('/company', { name }).then((data) => data.company),
};
