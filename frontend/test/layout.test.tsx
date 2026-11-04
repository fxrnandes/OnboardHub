import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { mockFetch, session } from './support/fetch';
import { renderApp } from './support/render';

const colaborador = { ...session, user: { ...session.user, name: 'Bruno Lima', role: 'colaborador' as const, jobRoleId: 'j1' } };

function signedIn(me: unknown = session) {
  tokenStorage.set('tok');
  mockFetch({ 'GET /auth/me': { body: me }, 'GET /my/trails': { body: { trails: [] } } });
}

describe('menu lateral', () => {

  it('mostra a empresa e separa as áreas de gestão para o administrador', async () => {
    signedIn();
    renderApp('/');

    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    expect(within(screen.getByRole('complementary')).getByText('Empresa Teste')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByText('Gestão')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute('href', '/configuracoes');
    for (const name of ['Painel', 'Trilhas', 'Equipe']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument();
    }
    const profile = screen.getByRole('link', { name: /^Ana/ });
    expect(profile).toHaveTextContent('AnaAdministrador');
    expect(profile).not.toHaveTextContent('Souza');
  });

  it('esconde a gestão de quem é colaborador', async () => {
    signedIn(colaborador);
    renderApp('/minhas-trilhas');

    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Minhas trilhas' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByText('Gestão')).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Painel' })).not.toBeInTheDocument();
  });

  it('expande ao parar o mouse em cima e recolhe ao sair', async () => {
    signedIn();
    const { container } = renderApp('/');

    const sidebar = await screen.findByRole('complementary');
    const shell = container.querySelector('.app-shell')!;
    expect(shell).not.toHaveClass('is-sidebar-open');
    expect(screen.queryByRole('button', { name: /Recolher menu|Expandir menu/ })).not.toBeInTheDocument();

    await userEvent.hover(sidebar);
    await waitFor(() => expect(shell).toHaveClass('is-sidebar-open'));

    await userEvent.unhover(sidebar);
    await waitFor(() => expect(shell).not.toHaveClass('is-sidebar-open'));
  });

  it('não abre quando o mouse só passa rápido pelo menu', async () => {
    signedIn();
    const { container } = renderApp('/');

    const sidebar = await screen.findByRole('complementary');
    await userEvent.hover(sidebar);
    await userEvent.unhover(sidebar);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(container.querySelector('.app-shell')).not.toHaveClass('is-sidebar-open');
  });

  it('expande quando um item recebe foco pelo teclado', async () => {
    signedIn();
    const { container } = renderApp('/');

    await screen.findByRole('complementary');
    screen.getByRole('link', { name: 'Minhas trilhas' }).focus();
    await waitFor(() => expect(container.querySelector('.app-shell')).toHaveClass('is-sidebar-open'));

    (document.activeElement as HTMLElement).blur();
    await waitFor(() => expect(container.querySelector('.app-shell')).not.toHaveClass('is-sidebar-open'));
  });

  it('abre como gaveta no celular e fecha ao navegar', async () => {
    signedIn();
    renderApp('/');

    const open = await screen.findByRole('button', { name: 'Abrir menu' });
    expect(open).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(open);
    expect(open).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByRole('link', { name: 'Minhas trilhas' }));
    expect(open).toHaveAttribute('aria-expanded', 'false');
  });

  it('fecha a gaveta com Esc', async () => {
    signedIn();
    renderApp('/');

    const open = await screen.findByRole('button', { name: 'Abrir menu' });
    await userEvent.click(open);
    await userEvent.keyboard('{Escape}');
    expect(open).toHaveAttribute('aria-expanded', 'false');
  });

  it('sai da conta pelo botão do rodapé', async () => {
    signedIn();
    renderApp('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));
    expect(document.querySelector('.app-shell')).toHaveClass('is-leaving');
    expect(document.querySelector('.app-shell')).not.toHaveClass('is-entering');
    expect(await screen.findByRole('heading', { name: /Do primeiro dia à autonomia/ })).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });
});
