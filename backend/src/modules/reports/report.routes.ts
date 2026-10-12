import { Router, type Request, type RequestHandler } from 'express';
import { z } from 'zod';
import type { Queryable } from '../../db/pool.js';
import { requireRole } from '../../http/auth.middleware.js';
import { toCsv } from './csv.js';
import { ReportRepository, summarize } from './report.repository.js';

const filterSchema = z.object({ trailId: z.uuid('Trilha inválida.').optional() });

const CSV_HEADER = [
  'Trilha',
  'Nome',
  'E-mail',
  'Cargo',
  'Passos concluídos',
  'Total de passos',
  'Percentual',
  'Concluída',
  'Última atividade',
];

export function reportRoutes(db: Queryable, requireAuth: RequestHandler): Router {
  const router = Router();
  const reports = new ReportRepository(db);
  const load = (req: Request) => reports.progress(req.auth!.companyId, filterSchema.parse(req.query).trailId);

  router.use(requireAuth, requireRole('master', 'gestor'));

  router.get('/progress', async (req, res) => {
    const rows = await load(req);
    res.json({ trails: summarize(rows), rows });
  });

  router.get('/progress.csv', async (req, res) => {
    const rows = await load(req);
    const csv = toCsv(
      CSV_HEADER,
      rows.map((row) => [
        row.trailTitle,
        row.name,
        row.email,
        row.jobRoleName,
        row.completedSteps,
        row.totalSteps,
        `${row.percent}%`,
        row.completed ? 'Sim' : 'Não',
        row.lastActivityAt,
      ]),
    );
    res
      .type('text/csv; charset=utf-8')
      .attachment('progresso-onboarding.csv')
      .send(csv);
  });

  return router;
}
