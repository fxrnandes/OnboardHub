import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { mockFetch, session } from './support/fetch';
import { renderApp } from './support/render';

describe('meu perfil', () => {
  it('abre pelo nome no menu e altera o nome', async () => {
    tokenStorage.set('tok');
    let current = session;
    const { calls } = mockFetch({
      'GET /auth/me': () => ({ body: current }),
      'PATCH /auth/me': (body) => {
        current = { ...current, user: { ...current.user, name: (body as { name: string }).name } };
        return { body: { user: current.user } };
      },
    });
    renderApp('/');

    await userEvent.click(await screen.findByRole('link', { name: 'Ana Souza' }));
    expect(screen.getByRole('heading', { name: 'Meu perfil' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@empresa.com');
    expect(screen.getByRole('button', { name: 'Salvar nome' })).toBeDisabled();

    const nameField = screen.getByLabelText('Nome');
    await userEvent.clear(nameField);
    await userEvent.type(nameField, 'Ana Paula Souza');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));

    expect(await screen.findByText('Salvo')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PATCH')!.body).toEqual({ name: 'Ana Paula Souza' });
    expect(screen.getByRole('link', { name: 'Ana Paula Souza' })).toBeInTheDocument();
  });

  it('troca a senha e passa a usar o token novo', async () => {
    tokenStorage.set('tok-antigo');
    const { calls } = mockFetch({
      'GET /auth/me': { body: session },
      'PUT /auth/password': { body: { token: 'tok-novo' } },
    });
    renderApp('/perfil');

    await userEvent.type(await screen.findByLabelText('Senha atual'), 'senha-antiga-1');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'senha-nova-123');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'senha-nova-123');
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));

    expect(await screen.findByText('Senha alterada. As outras sessões foram encerradas.')).toBeInTheDocument();
    expect(tokenStorage.get()).toBe('tok-novo');
    expect(calls.find((call) => call.method === 'PUT')!.body).toEqual({
      currentPassword: 'senha-antiga-1',
      newPassword: 'senha-nova-123',
    });
    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
  });

  it('não envia quando a confirmação não confere', async () => {
    tokenStorage.set('tok');
    const { calls } = mockFetch({ 'GET /auth/me': { body: session } });
    renderApp('/perfil');

    await userEvent.type(await screen.findByLabelText('Senha atual'), 'senha-antiga-1');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'senha-nova-123');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'outra-coisa-1');
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));

    expect(await screen.findByText('As senhas não conferem.')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'PUT')).toBe(false);
  });

  it('mostra senha atual errada embaixo do campo certo', async () => {
    tokenStorage.set('tok');
    mockFetch({
      'GET /auth/me': { body: session },
      'PUT /auth/password': {
        status: 400,
        body: { error: { code: 'wrong_password', message: 'A senha atual está incorreta.' } },
      },
    });
    renderApp('/perfil');

    await userEvent.type(await screen.findByLabelText('Senha atual'), 'errada');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'senha-nova-123');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'senha-nova-123');
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));

    expect(await screen.findByText('A senha atual está incorreta.')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha atual')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra erro geral quando a API falha', async () => {
    tokenStorage.set('tok');
    mockFetch({
      'GET /auth/me': { body: session },
      'PUT /auth/password': { status: 500, body: { error: { code: 'internal_error', message: 'Erro interno.' } } },
    });
    renderApp('/perfil');

    await userEvent.type(await screen.findByLabelText('Senha atual'), 'senha-antiga-1');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'senha-nova-123');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'senha-nova-123');
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno.');
  });
});
