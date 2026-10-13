import { Navigate, Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth } from './auth/guards';
import { AppLayout } from './layout/AppLayout';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SignupPage } from './pages/SignupPage';
import { InvitesTab } from './pages/team/InvitesTab';
import { JobRolesTab } from './pages/team/JobRolesTab';
import { MembersTab } from './pages/team/MembersTab';
import { TeamLayout } from './pages/team/TeamLayout';

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/cadastro" element={<GuestOnly><SignupPage /></GuestOnly>} />
      <Route path="/convite/:token" element={<GuestOnly><AcceptInvitePage /></GuestOnly>} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<HomePage />} />
        <Route path="equipe" element={<RequireAuth roles={['master', 'gestor']}><TeamLayout /></RequireAuth>}>
          <Route index element={<Navigate to="membros" replace />} />
          <Route path="membros" element={<MembersTab />} />
          <Route path="cargos" element={<RequireAuth roles={['master']}><JobRolesTab /></RequireAuth>} />
          <Route path="convites" element={<RequireAuth roles={['master']}><InvitesTab /></RequireAuth>} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
