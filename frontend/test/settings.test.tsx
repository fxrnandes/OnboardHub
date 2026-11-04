import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { applyPreferences, readPreferences } from '../src/preferences/preferences';
import { mockFetch, session } from './support/fetch';
import { renderApp } from './support/render';

const root = document.documentElement;

function signedIn() {
  tokenStorage.set('tok');
  mockFetch({ 'GET /auth/me': { body: session }, 'GET /my/trails': { body: { trails: [] } } });
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
