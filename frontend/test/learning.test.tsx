import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isVideoFile, videoEmbedUrl, type LearnerTrail, type Progress } from '../src/api/learning';
import { tokenStorage } from '../src/api/client';
import { mockFetch, session, type Routes } from './support/fetch';
import { renderApp } from './support/render';

const colaborador = { ...session, user: { ...session.user, name: 'Bruno Lima', role: 'colaborador' as const, jobRoleId: 'j1' } };

function asColaborador(routes: Routes, me: unknown = colaborador) {
  tokenStorage.set('tok');
  return mockFetch({ 'GET /auth/me': { body: me }, ...routes });
}

describe('videoEmbedUrl', () => {
  it('reconhece YouTube e Vimeo', () => {
    expect(videoEmbedUrl('https://www.youtube.com/watch?v=abc123')).toBe('https://www.youtube-nocookie.com/embed/abc123');
    expect(videoEmbedUrl('https://youtu.be/abc123?t=10')).toBe('https://www.youtube-nocookie.com/embed/abc123');
    expect(videoEmbedUrl('https://youtube.com/shorts/xyz')).toBe('https://www.youtube-nocookie.com/embed/xyz');
    expect(videoEmbedUrl('https://vimeo.com/76979871')).toBe('https://player.vimeo.com/video/76979871');
  });

  it('retorna null para outros endereços', () => {
    expect(videoEmbedUrl('https://exemplo.com/video.mp4')).toBeNull();
    expect(videoEmbedUrl('não é url')).toBeNull();
    expect(videoEmbedUrl('https://youtube.com/channel/x')).toBeNull();
    expect(isVideoFile('https://exemplo.com/video.mp4')).toBe(true);
    expect(isVideoFile('https://exemplo.com/pagina')).toBe(false);
  });
});

describe('minhas trilhas', () => {
  it('lista as trilhas com progresso e ação certa', async () => {
    asColaborador({
      'GET /my/trails': {
        body: {
          trails: [
            { id: 't1', title: 'Boas-vindas', description: 'Primeira semana', publishedAt: '', totalSteps: 4, completedSteps: 0, percent: 0, completed: false, lastActivityAt: null },
            { id: 't2', title: 'Ferramentas', description: '', publishedAt: '', totalSteps: 4, completedSteps: 2, percent: 50, completed: false, lastActivityAt: null },
            { id: 't3', title: 'Cultura', description: '', publishedAt: '', totalSteps: 2, completedSteps: 2, percent: 100, completed: true, lastActivityAt: null },
          ],
        },
      },
    });
    renderApp('/minhas-trilhas');

    expect(await screen.findByRole('link', { name: 'Começar' })).toHaveAttribute('href', '/minhas-trilhas/t1');
    expect(screen.getByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '/minhas-trilhas/t2');
    expect(screen.getByRole('link', { name: 'Rever trilha' })).toBeInTheDocument();
    expect(screen.getByText('2 de 4 passos · 50%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso em Ferramentas' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Concluída')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument();
  });

  it('explica quando não há trilhas, com e sem cargo', async () => {
    asColaborador({ 'GET /my/trails': { body: { trails: [] } } });
    renderApp('/minhas-trilhas');
    expect(await screen.findByText(/Quando uma trilha for publicada para o seu cargo/)).toBeInTheDocument();
  });

  it('avisa quem ainda não tem cargo', async () => {
    asColaborador({ 'GET /my/trails': { body: { trails: [] } } }, { ...colaborador, user: { ...colaborador.user, jobRoleId: null } });
    renderApp('/minhas-trilhas');
    expect(await screen.findByText(/Você ainda não tem um cargo definido/)).toBeInTheDocument();
  });
});

describe('percorrer a trilha', () => {
  const progress = (completedSteps: number, total = 3): Progress => ({
    totalSteps: total,
    completedSteps,
    percent: Math.round((completedSteps / total) * 100),
    completed: completedSteps === total,
    nextStepId: null,
    lastActivityAt: null,
  });

  function fakeTrail(): LearnerTrail {
    return {
      trail: {
        id: 't1',
        title: 'Boas-vindas',
        description: '',
        modules: [
          {
            id: 'm1',
            title: 'Primeiros passos',
            position: 0,
            steps: [
              { id: 's1', moduleId: 'm1', title: 'Conheça a empresa', kind: 'text', body: 'Somos uma empresa.\n\nNossos valores.', url: null, position: 0, completedAt: '2026-10-13' },
              { id: 's2', moduleId: 'm1', title: 'Vídeo do CEO', kind: 'video', body: 'Assista com atenção.', url: 'https://youtu.be/abc', position: 1, completedAt: null },
            ],
          },
          {
            id: 'm2',
            title: 'Ferramentas',
            position: 1,
            steps: [{ id: 's3', moduleId: 'm2', title: 'Sistema de chamados', kind: 'link', body: null, url: 'https://help.exemplo.com', position: 0, completedAt: null }],
          },
        ],
      },
      progress: progress(1),
      resumeStepId: 's2',
    };
  }

  it('retoma do primeiro passo pendente, conclui, avança e termina a trilha', async () => {
    const { calls } = asColaborador({
      'GET /my/trails/t1': { body: fakeTrail() },
      'POST /my/steps/s2/complete': { body: { progress: progress(2) } },
      'POST /my/steps/s3/complete': { body: { progress: progress(3) } },
    });
    renderApp('/minhas-trilhas/t1');

    expect(await screen.findByRole('heading', { name: 'Vídeo do CEO' })).toBeInTheDocument();
    expect(screen.getByTitle('Vídeo do CEO')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/abc');
    expect(screen.getByText('Passo 2 de 3')).toBeInTheDocument();
    expect(screen.getAllByText(/\(concluído\)/)).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Concluir e avançar →' }));
    expect(await screen.findByRole('heading', { name: 'Sistema de chamados' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir link' })).toHaveAttribute('href', 'https://help.exemplo.com');
    expect(screen.getByText('2 de 3 passos · 67%')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Concluir trilha' }));
    expect(await screen.findByText('Trilha concluída!')).toBeInTheDocument();
    expect(screen.getByText('✓ Concluído')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'POST').map((call) => call.path)).toEqual([
      '/my/steps/s2/complete',
      '/my/steps/s3/complete',
    ]);
  });

  it('navega pelo índice e pelos botões e permite desmarcar', async () => {
    asColaborador({
      'GET /my/trails/t1': { body: fakeTrail() },
      'DELETE /my/steps/s1/complete': { body: { progress: progress(0) } },
    });
    renderApp('/minhas-trilhas/t1');

    const outline = await screen.findByRole('complementary', { name: 'Conteúdo da trilha' });
    await userEvent.click(within(outline).getByRole('button', { name: /Conheça a empresa/ }));
    expect(screen.getByRole('heading', { name: 'Conheça a empresa' })).toBeInTheDocument();
    expect(screen.getByText('Nossos valores.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Anterior' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Desmarcar' }));
    expect(await screen.findByText('0 de 3 passos · 0%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Concluir e avançar →' })).toBeInTheDocument();

    await userEvent.click(within(outline).getByRole('button', { name: /Sistema de chamados/ }));
    await userEvent.click(screen.getByRole('button', { name: '← Anterior' }));
    expect(screen.getByRole('heading', { name: 'Vídeo do CEO' })).toBeInTheDocument();
  });

  it('mostra o botão de próximo em passo já concluído', async () => {
    asColaborador({ 'GET /my/trails/t1': { body: { ...fakeTrail(), resumeStepId: 's1' } } });
    renderApp('/minhas-trilhas/t1');

    await userEvent.click(await screen.findByRole('button', { name: 'Próximo →' }));
    expect(screen.getByRole('heading', { name: 'Vídeo do CEO' })).toBeInTheDocument();
  });

  it('mostra imagem e vídeo de arquivo', async () => {
    const trail = fakeTrail();
    trail.trail.modules[0]!.steps = [
      { id: 's1', moduleId: 'm1', title: 'Organograma', kind: 'image', body: null, url: 'https://exemplo.com/org.png', position: 0, completedAt: null },
      { id: 's2', moduleId: 'm1', title: 'Tour', kind: 'video', body: null, url: 'https://exemplo.com/tour.mp4', position: 1, completedAt: null },
      { id: 's4', moduleId: 'm1', title: 'Palestra', kind: 'video', body: null, url: 'https://exemplo.com/palestra', position: 2, completedAt: null },
    ];
    asColaborador({ 'GET /my/trails/t1': { body: { ...trail, resumeStepId: 's1' } } });
    renderApp('/minhas-trilhas/t1');

    expect(await screen.findByRole('img', { name: 'Organograma' })).toHaveAttribute('src', 'https://exemplo.com/org.png');
    const outline = screen.getByRole('complementary', { name: 'Conteúdo da trilha' });
    await userEvent.click(within(outline).getByRole('button', { name: /Tour/ }));
    expect(screen.getByLabelText('Tour')).toHaveAttribute('src', 'https://exemplo.com/tour.mp4');
    await userEvent.click(within(outline).getByRole('button', { name: /Palestra/ }));
    expect(screen.getByRole('link', { name: 'Assistir o vídeo' })).toHaveAttribute('href', 'https://exemplo.com/palestra');
  });

  it('mostra erro de trilha não encontrada', async () => {
    asColaborador({ 'GET /my/trails/x': { status: 404, body: { error: { code: 'not_found', message: 'Trilha não encontrada.' } } } });
    renderApp('/minhas-trilhas/x');
    expect(await screen.findByRole('alert')).toHaveTextContent('Trilha não encontrada.');
  });
});

describe('início', () => {
  it('mostra atalhos conforme o papel', async () => {
    asColaborador({});
    renderApp('/');
    expect(await screen.findByRole('link', { name: /Continue o seu onboarding/ })).toHaveAttribute('href', '/minhas-trilhas');
    expect(screen.queryByRole('link', { name: /Convide pessoas/ })).not.toBeInTheDocument();
  });
});
