import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { User } from '../users/user.repository.js';
import type { AuthService } from './auth.service.js';
import type { PasswordResetService } from './password-reset.service.js';

const email = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido.'));

const newPassword = z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(72);

const signupSchema = z.object({
  companyName: z.string().trim().min(2, 'O nome da empresa precisa ter pelo menos 2 caracteres.').max(120),
  name: z.string().trim().min(2, 'O nome precisa ter pelo menos 2 caracteres.').max(120),
  email,
  password: newPassword,
});

const resetRequestSchema = z.object({ email });

const resetSchema = z.object({ password: newPassword });

const name = z.string().trim().min(2, 'O nome precisa ter pelo menos 2 caracteres.').max(120);

const profileSchema = z.object({ name });

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: z.string().min(8, 'A nova senha precisa ter pelo menos 8 caracteres.').max(72),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha.'),
});

const publicUser = ({ id, name, email, role, jobRoleId }: User) => ({ id, name, email, role, jobRoleId });

export function authRoutes(auth: AuthService, resets: PasswordResetService, requireAuth: RequestHandler): Router {
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

  router.patch('/me', requireAuth, async (req, res) => {
    const { name: newName } = profileSchema.parse(req.body);
    res.json({ user: publicUser(await auth.rename(req.auth!.userId, newName)) });
  });

  router.put('/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);
    res.json({ token: await auth.changePassword(req.auth!.userId, currentPassword, newPassword) });
  });

  router.post('/password-resets', async (req, res) => {
    await resets.request(resetRequestSchema.parse(req.body).email);
    res.status(202).json({ ok: true });
  });

  router.get('/password-resets/:token', async (req, res) => {
    res.json(await resets.preview(String(req.params.token)));
  });

  router.post('/password-resets/:token', async (req, res) => {
    const { token, user } = await resets.reset(String(req.params.token), resetSchema.parse(req.body).password);
    res.json({ token, user: publicUser(user) });
  });

  return router;
}
