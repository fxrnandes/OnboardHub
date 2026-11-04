import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { mockFetch, session } from './support/fetch';
import { renderApp } from './support/render';

const member = { ...session, user: { ...session.user, role: 'colaborador' as const } };

async function openDialog() {
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir minha conta' }));
  return screen.findByRole('dialog');
}

describe('excluir a própria conta', () => {
  it('colaborador confirma com a senha e volta para a tela de entrar', async () => {
    tokenStorage.set('tok');
    const { calls } = mockFetch({
      'GET /auth/me': { body: member },
      'GET /auth/account-deletion': { body: { deletesCompany: false, otherMembers: 4 } },
      'DELETE /auth/me': { status: 204 },
    });
    renderApp('/perfil');

    const dialog = await openDialog();
    expect(within(dialog).getByRole('heading', { name: 'Excluir sua conta?' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('As trilhas e o restante da empresa continuam como estão.');
    const confirm = within(dialog).getByRole('button', { name: 'Excluir conta' });

    await userEvent.click(within(dialog).getByRole('checkbox', { name: /não pode ser desfeita/ }));
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Confirme com a sua senha'), 'senha-forte-123');
    await userEvent.click(confirm);

    expect(await screen.findByText('Sua conta foi excluída.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
    expect(calls.find((call) => call.method === 'DELETE')!.body).toEqual({ password: 'senha-forte-123', deleteCompany: false });
  });

  it('único administrador vê que a empresa também será excluída', async () => {
    tokenStorage.set('tok');
    const { calls } = mockFetch({
      'GET /auth/me': { body: session },
      'GET /auth/account-deletion': { body: { deletesCompany: true, otherMembers: 2 } },
      'DELETE /auth/me': { status: 204 },
    });
    renderApp('/perfil');

    const dialog = await openDialog();
    expect(within(dialog).getByRole('heading', { name: 'Excluir sua conta e a empresa?' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('2 outras pessoas');
    expect(within(dialog).getByRole('link', { name: 'Equipe' })).toHaveAttribute('href', '/equipe/membros');

    await userEvent.type(within(dialog).getByLabelText('Confirme com a sua senha'), 'senha-forte-123');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /não pode ser desfeita/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir conta e empresa' }));

    expect(await screen.findByText('Sua conta e a empresa foram excluídas.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'DELETE')!.body).toEqual({ password: 'senha-forte-123', deleteCompany: true });
  });

  it('senha errada mantém o popup aberto e mostra o erro no campo', async () => {
    tokenStorage.set('tok');
    mockFetch({
      'GET /auth/me': { body: member },
      'GET /auth/account-deletion': { body: { deletesCompany: false, otherMembers: 1 } },
      'DELETE /auth/me': { status: 400, body: { error: { code: 'wrong_password', message: 'A senha está incorreta.' } } },
    });
    renderApp('/perfil');

    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText('Confirme com a sua senha'), 'errada');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /não pode ser desfeita/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir conta' }));

    expect(await within(dialog).findByText('A senha está incorreta.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Confirme com a sua senha')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(tokenStorage.get()).toBe('tok');
  });

  it('cancelar fecha sem excluir', async () => {
    tokenStorage.set('tok');
    const { calls } = mockFetch({
      'GET /auth/me': { body: member },
      'GET /auth/account-deletion': { body: { deletesCompany: false, otherMembers: 1 } },
    });
    renderApp('/perfil');

    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false);
  });
});
