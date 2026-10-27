import { Navigate, Route, Routes } from 'react-router';
import { AppGate } from './auth/AppGate';
import { GuestOnly, RequireAuth } from './auth/guards';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { HomePage } from './pages/HomePage';
import { MyTrailsPage } from './pages/learning/MyTrailsPage';
import { TrailPlayerPage } from './pages/learning/TrailPlayerPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SignupPage } from './pages/SignupPage';
import { TrailEditorPage } from './pages/trails/TrailEditorPage';
import { TrailsPage } from './pages/trails/TrailsPage';
import { InvitesTab } from './pages/team/InvitesTab';
import { JobRolesTab } from './pages/team/JobRolesTab';
import { MembersTab } from './pages/team/MembersTab';
import { TeamLayout } from './pages/team/TeamLayout';

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/cadastro" element={<GuestOnly><SignupPage /></GuestOnly>} />
      <Route path="/esqueci-senha" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
      <Route path="/redefinir-senha/:token" element={<GuestOnly><ResetPasswordPage /></GuestOnly>} />
      <Route path="/convite/:token" element={<GuestOnly><AcceptInvitePage /></GuestOnly>} />
      <Route element={<AppGate />}>
        <Route index element={<HomePage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="minhas-trilhas" element={<MyTrailsPage />} />
        <Route path="minhas-trilhas/:id" element={<TrailPlayerPage />} />
        <Route path="painel" element={<RequireAuth roles={['master', 'gestor']}><DashboardPage /></RequireAuth>} />
        <Route path="trilhas" element={<RequireAuth roles={['master', 'gestor']}><TrailsPage /></RequireAuth>} />
        <Route path="trilhas/:id" element={<RequireAuth roles={['master', 'gestor']}><TrailEditorPage /></RequireAuth>} />
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
