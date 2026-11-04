import { screen, within } from '@testing-library/react';
import { tokenStorage } from '../src/api/client';
import { mockFetch, session, type Routes } from './support/fetch';
import { renderApp } from './support/render';

const colaborador = { ...session, user: { ...session.user, name: 'Bruno Lima', role: 'colaborador' as const, jobRoleId: 'j1' } };
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const trail = (id: string, title: string, completedSteps: number, totalSteps = 4) => ({
  id,
  title,
  description: '',
  publishedAt: '',
  totalSteps,
  completedSteps,
  percent: Math.round((completedSteps / totalSteps) * 100),
  completed: completedSteps === totalSteps,
  lastActivityAt: null,
});

function signedIn(me: unknown, routes: Routes) {
  tokenStorage.set('tok');
  return mockFetch({ 'GET /auth/me': { body: me }, ...routes });
}

describe('início', () => {
  it('convida a continuar a trilha que já começou', async () => {
    signedIn(colaborador, {
      'GET /my/trails': { body: { trails: [trail('t1', 'Boas-vindas', 0), trail('t2', 'Ferramentas', 3), trail('t3', 'Cultura', 4)] } },
    });
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Olá, Bruno' })).toBeInTheDocument();
    const hero = await screen.findByRole('region', { name: 'Continue de onde parou' });
    expect(within(hero).getByText('Ferramentas')).toBeInTheDocument();
    expect(within(hero).getByText('3 de 4 passos')).toBeInTheDocument();
    expect(within(hero).getByRole('progressbar', { name: 'Progresso em Ferramentas' })).toHaveAttribute('aria-valuenow', '75');
    expect(within(hero).getByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '/minhas-trilhas/t2');
    expect(screen.getByText('1 de 3 trilhas concluídas')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Visão da equipe' })).not.toBeInTheDocument();
  });

  it('sugere começar quando nenhuma trilha foi iniciada', async () => {
    signedIn(colaborador, { 'GET /my/trails': { body: { trails: [trail('t1', 'Boas-vindas', 0)] } } });
    renderApp('/');

    const hero = await screen.findByRole('region', { name: 'Comece seu onboarding' });
    expect(within(hero).getByRole('link', { name: 'Começar' })).toHaveAttribute('href', '/minhas-trilhas/t1');
  });

  it('comemora quando todas as trilhas foram concluídas', async () => {
    signedIn(colaborador, { 'GET /my/trails': { body: { trails: [trail('t1', 'Boas-vindas', 4)] } } });
    renderApp('/');

    expect(await screen.findByRole('region', { name: 'Tudo concluído' })).toHaveTextContent('Você concluiu todas as suas trilhas.');
  });

  it('avisa quando ainda não há trilhas para a pessoa', async () => {
    signedIn(colaborador, { 'GET /my/trails': { body: { trails: [] } } });
    renderApp('/');

    expect(await screen.findByRole('region', { name: 'Nenhuma trilha por aqui ainda' })).toBeInTheDocument();
  });

  it('mostra para quem gerencia um resumo da equipe e os atalhos', async () => {
    signedIn(session, {
      'GET /my/trails': { body: { trails: [] } },
      'GET /reports/progress': {
        body: {
          trails: [{ trailId: 't1', title: 'Boas-vindas', assigned: 3, completed: 1, averagePercent: 50 }],
          rows: [
            { trailId: 't1', trailTitle: 'Boas-vindas', userId: 'u1', name: 'A', email: 'a@x.com', jobRoleName: null, totalSteps: 4, completedSteps: 4, percent: 100, completed: true, assignedAt: ago(20), lastActivityAt: ago(1) },
            { trailId: 't1', trailTitle: 'Boas-vindas', userId: 'u2', name: 'B', email: 'b@x.com', jobRoleName: null, totalSteps: 4, completedSteps: 2, percent: 50, completed: false, assignedAt: ago(20), lastActivityAt: ago(0) },
            { trailId: 't1', trailTitle: 'Boas-vindas', userId: 'u3', name: 'C', email: 'c@x.com', jobRoleName: null, totalSteps: 4, completedSteps: 0, percent: 0, completed: false, assignedAt: ago(10), lastActivityAt: null },
          ],
        },
      },
    });
    renderApp('/');

    const team = await screen.findByRole('region', { name: 'Visão da equipe' });
    expect(within(team).getByText('Pessoas em onboarding').nextSibling).toHaveTextContent('3');
    expect(within(team).getByText('Conclusão média').nextSibling).toHaveTextContent('50%');
    expect(within(team).getByText('Paradas há mais de 7 dias').nextSibling).toHaveTextContent('1');
    expect(within(team).getByRole('link', { name: 'Ver painel' })).toHaveAttribute('href', '/painel');

    const shortcuts = screen.getByRole('region', { name: 'Atalhos' });
    expect(within(shortcuts).getByRole('link', { name: /Trilhas/ })).toHaveAttribute('href', '/trilhas');
    expect(within(shortcuts).getByRole('link', { name: /Equipe/ })).toHaveAttribute('href', '/equipe');
  });
});
