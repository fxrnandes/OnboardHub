import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { Queryable } from '../../db/pool.js';
import { AppError } from '../../http/errors.js';
import { requireRole } from '../../http/auth.middleware.js';
import { CompanyRepository, type Company } from './company.repository.js';

const renameSchema = z.object({
  name: z.string().trim().min(2, 'O nome da empresa precisa ter pelo menos 2 caracteres.').max(120),
});

const toResponse = ({ id, name, cnpj }: Company) => ({ id, name, cnpj });

export function companyRoutes(db: Queryable, requireAuth: RequestHandler): Router {
  const router = Router();
  const companies = new CompanyRepository(db);

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    const company = await companies.findById(req.auth!.companyId);
    if (!company) throw new AppError(404, 'not_found', 'Empresa não encontrada.');
    res.json({ company: toResponse(company) });
  });

  router.patch('/', requireRole('master'), async (req, res) => {
    const { name } = renameSchema.parse(req.body);
    res.json({ company: toResponse(await companies.rename(req.auth!.companyId, name)) });
  });

  return router;
}
