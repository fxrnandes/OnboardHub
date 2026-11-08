import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { applyPreferences, readPreferences } from '../src/preferences/preferences';
import { mockFetch, session } from './support/fetch';
import { renderApp } from './support/render';

const root = document.documentElement;

function signedIn() {
  tokenStorage.set('tok');
  mockFetch({
    'GET /auth/me': { body: session },
    'GET /my/trails': { body: { trails: [] } },
    'GET /company': { body: { company: { id: 'c1', name: 'Empresa Teste', cnpj: '11222333000181' } } },
  });
}

describe('configurações', () => {
  afterEach(() => {
    localStorage.removeItem('onboardhub.preferences');
    applyPreferences(readPreferences());
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('abre pelo menu e troca para o tema escuro, lembrando da escolha', async () => {
    signedIn();
    renderApp('/');

    await userEvent.click(await screen.findByRole('link', { name: 'Configurações' }));
    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument();
    expect(root.dataset.theme).toBe('light');

    const theme = screen.getByRole('radiogroup', { name: 'Tema' });
    await userEvent.click(within(theme).getByRole('radio', { name: /Escuro/ }));

    expect(root.dataset.theme).toBe('dark');
    expect(readPreferences().theme).toBe('dark');
  });

  it('segue o tema do sistema quando escolhido', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    signedIn();
    renderApp('/configuracoes');

    await userEvent.click(within(await screen.findByRole('radiogroup', { name: 'Tema' })).getByRole('radio', { name: /Sistema/ }));
    expect(root.dataset.theme).toBe('dark');
  });

  it('não mostra mais opções de acessibilidade', async () => {
    signedIn();
    renderApp('/configuracoes');

    expect(await screen.findByRole('heading', { name: 'Aparência' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Acessibilidade' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('ignora preferências salvas inválidas', () => {
    localStorage.setItem('onboardhub.preferences', '{"theme":"neon","reduceMotion":"sim"}');
    expect(readPreferences()).toEqual({ theme: 'light' });
    localStorage.setItem('onboardhub.preferences', 'quebrado');
    expect(readPreferences().theme).toBe('light');
  });
});

describe('configurações: empresa', () => {
  const company = { id: 'c1', name: 'Empresa Teste', cnpj: '11222333000181' };

  it('o master renomeia a empresa e o novo nome aparece na sessão', async () => {
    tokenStorage.set('tok');
    let current = session;
    const { calls } = mockFetch({
      'GET /auth/me': () => ({ body: current }),
      'GET /my/trails': { body: { trails: [] } },
      'GET /company': { body: { company } },
      'PATCH /company': (body) => {
        const name = (body as { name: string }).name;
        current = { ...session, company: { ...session.company, name } };
        return { body: { company: { ...company, name } } };
      },
    });
    renderApp('/configuracoes');

    const name = await screen.findByLabelText('Nome da empresa');
    expect(name).toHaveValue('Empresa Teste');
    expect(screen.getByLabelText('CNPJ')).toHaveValue('11.222.333/0001-81');
    expect(screen.getByRole('button', { name: 'Salvar nome' })).toBeDisabled();

    await userEvent.clear(name);
    await userEvent.type(name, '  Nova Empresa ');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));

    expect(await screen.findByText('Salvo')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PATCH')!.body).toEqual({ name: 'Nova Empresa' });
    expect(calls.filter((call) => call.path === '/auth/me').length).toBeGreaterThan(1);
  });

  it('mostra o erro de validação do nome', async () => {
    tokenStorage.set('tok');
    mockFetch({
      'GET /auth/me': { body: session },
      'GET /company': { body: { company } },
      'PATCH /company': {
        status: 400,
        body: { error: { code: 'validation_error', message: 'Dados inválidos.', details: [{ field: 'name', message: 'Informe o nome da empresa.' }] } },
      },
    });
    renderApp('/configuracoes');

    await userEvent.clear(await screen.findByLabelText('Nome da empresa'));
    await userEvent.type(screen.getByLabelText('Nome da empresa'), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(await screen.findByText('Informe o nome da empresa.')).toBeInTheDocument();
  });

  it('mostra o erro quando não consegue carregar a empresa', async () => {
    tokenStorage.set('tok');
    mockFetch({
      'GET /auth/me': { body: session },
      'GET /company': { status: 500, body: { error: { code: 'internal_error', message: 'Erro interno.' } } },
    });
    renderApp('/configuracoes');
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno.');
  });

  it('quem não é master não vê a seção da empresa', async () => {
    tokenStorage.set('tok');
    const { calls } = mockFetch({ 'GET /auth/me': { body: { ...session, user: { ...session.user, role: 'gestor' } } } });
    renderApp('/configuracoes');

    expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument();
    expect(screen.queryByText('Empresa')).not.toBeInTheDocument();
    expect(calls.some((call) => call.path === '/company')).toBe(false);
  });
});
