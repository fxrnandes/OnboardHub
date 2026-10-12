import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { User } from '../users/user.repository.js';
import type { AuthService } from './auth.service.js';

const email = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido.'));

const signupSchema = z.object({
  companyName: z.string().trim().min(2, 'O nome da empresa precisa ter pelo menos 2 caracteres.').max(120),
  name: z.string().trim().min(2, 'O nome precisa ter pelo menos 2 caracteres.').max(120),
  email,
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(72),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha.'),
});

const publicUser = ({ id, name, email, role, jobRoleId }: User) => ({ id, name, email, role, jobRoleId });

export function authRoutes(auth: AuthService, requireAuth: RequestHandler): Router {
  const router = Router();

  router.post('/signup', async (req, res) => {
    const { token, user, company } = await auth.signup(signupSchema.parse(req.body));
    res.status(201).json({ token, user: publicUser(user), company: { id: company.id, name: company.name } });
  });

  router.post('/login', async (req, res) => {
    const { token, user } = await auth.login(loginSchema.parse(req.body));
    res.json({ token, user: publicUser(user) });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const { user, company } = await auth.me(req.auth!.userId);
    res.json({ user: publicUser(user), company: { id: company.id, name: company.name } });
  });

  return router;
}
