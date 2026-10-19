import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { overview, relativeDate, statusOf, type ProgressRow } from '../src/api/reports';
import { mockFetch, session, type Routes } from './support/fetch';
import { renderApp } from './support/render';

const NOW = Date.now();
const daysAgo = (days: number) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();

function row(overrides: Partial<ProgressRow>): ProgressRow {
  return {
    trailId: 't1',
    trailTitle: 'Boas-vindas',
    userId: 'u1',
    name: 'Bruno Lima',
    email: 'bruno@empresa.com',
    jobRoleName: 'Suporte',
    totalSteps: 4,
    completedSteps: 0,
    percent: 0,
    completed: false,
    lastActivityAt: null,
    ...overrides,
  };
}

const rows = [
  row({ completedSteps: 4, percent: 100, completed: true, lastActivityAt: daysAgo(1) }),
  row({ userId: 'u2', name: 'Carla Dias', email: 'carla@empresa.com', completedSteps: 2, percent: 50, lastActivityAt: daysAgo(0) }),
  row({ userId: 'u3', name: 'Dani Rocha', email: 'dani@empresa.com', jobRoleName: null }),
  row({ trailId: 't2', trailTitle: 'Ferramentas', totalSteps: 2, completedSteps: 1, percent: 50, lastActivityAt: daysAgo(10) }),
];
const trails = [
  { trailId: 't1', title: 'Boas-vindas', assigned: 3, completed: 1, averagePercent: 50 },
  { trailId: 't2', title: 'Ferramentas', assigned: 1, completed: 0, averagePercent: 50 },
];

function asMaster(routes: Routes) {
  tokenStorage.set('tok');
  return mockFetch({ 'GET /auth/me': { body: session }, ...routes });
}

describe('cálculos do painel', () => {
  it('resume o progresso e conta quem está parado', () => {
    expect(overview(trails, rows, NOW)).toEqual({
      trails: 2,
      people: 3,
      assignments: 4,
      completedAssignments: 1,
      averagePercent: 50,
      stalled: 2,
    });
    expect(overview([], [], NOW).averagePercent).toBe(0);
  });

  it('classifica a situação e formata datas relativas', () => {
    expect(rows.map(statusOf)).toEqual(['completed', 'in_progress', 'not_started', 'in_progress']);
    expect(relativeDate(null, NOW)).toBe('Nunca');
    expect(relativeDate(daysAgo(0), NOW)).toBe('Hoje');
    expect(relativeDate(daysAgo(1), NOW)).toBe('Ontem');
    expect(relativeDate(daysAgo(5), NOW)).toBe('Há 5 dias');
    expect(relativeDate('2026-08-01T12:00:00Z', NOW)).toBe('01/08/2026');
  });
});

describe('painel do gestor', () => {
  it('mostra indicadores, cards por trilha e tabela por pessoa', async () => {
    asMaster({ 'GET /reports/progress': { body: { trails, rows } } });
    renderApp('/painel');

    expect(await screen.findByRole('heading', { name: 'Painel' })).toBeInTheDocument();
    expect(screen.getByText('Pessoas em onboarding').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Trilhas concluídas').nextSibling).toHaveTextContent('1/4');
    expect(screen.getByText('1 de 3 pessoas concluíram')).toBeInTheDocument();
    expect(screen.getByText('0 de 1 pessoa concluiu')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(screen.getByText('dani@empresa.com')).toBeInTheDocument();
    expect(screen.getByText('Há 10 dias')).toBeInTheDocument();
  });

  it('filtra por trilha, situação e busca', async () => {
    asMaster({ 'GET /reports/progress': { body: { trails, rows } } });
    renderApp('/painel');

    await userEvent.click(await screen.findByRole('button', { name: /Ferramentas/ }));
    expect(screen.getByRole('button', { name: /Ferramentas/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('row')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: /Ferramentas/ }));
    expect(screen.getByLabelText('Filtrar por trilha')).toHaveValue('');

    await userEvent.selectOptions(screen.getByLabelText('Filtrar por situação'), 'not_started');
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(within(screen.getAllByRole('row')[1]!).getByText('Dani Rocha')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Filtrar por situação'), 'all');
    await userEvent.type(screen.getByLabelText('Buscar pessoa'), 'carla');
    expect(screen.getAllByRole('row')).toHaveLength(2);

    await userEvent.clear(screen.getByLabelText('Buscar pessoa'));
    await userEvent.type(screen.getByLabelText('Buscar pessoa'), 'ninguém');
    expect(screen.getByText('Ninguém encontrado')).toBeInTheDocument();
  });

  it('exporta o CSV da trilha selecionada com o token', async () => {
    const createObjectURL = vi.fn(() => 'blob:csv');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const { calls } = asMaster({
      'GET /reports/progress': { body: { trails, rows } },
      'GET /reports/progress.csv?trailId=t2': { body: 'Trilha;Nome' },
    });
    renderApp('/painel');

    await userEvent.selectOptions(await screen.findByLabelText('Filtrar por trilha'), 't2');
    await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    await vi.waitFor(() => expect(click).toHaveBeenCalled());
    expect(calls.at(-1)).toMatchObject({ path: '/reports/progress.csv?trailId=t2', headers: { Authorization: 'Bearer tok' } });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
  });

  it('mostra erro quando o download falha', async () => {
    asMaster({
      'GET /reports/progress': { body: { trails, rows } },
      'GET /reports/progress.csv': { status: 403, body: { error: { code: 'forbidden', message: 'Sem permissão.' } } },
    });
    renderApp('/painel');

    await userEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem permissão.');
  });

  it('orienta quando não há dados', async () => {
    asMaster({ 'GET /reports/progress': { body: { trails: [], rows: [] } } });
    renderApp('/painel');

    expect(await screen.findByText('Ainda não há o que acompanhar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  });

  it('colaborador não vê o painel', async () => {
    tokenStorage.set('tok');
    mockFetch({ 'GET /auth/me': { body: { ...session, user: { ...session.user, role: 'colaborador' } } } });
    renderApp('/painel');
    expect(await screen.findByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Painel' })).not.toBeInTheDocument();
  });
});
