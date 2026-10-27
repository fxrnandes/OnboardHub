import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { mockFetch, session } from './support/fetch';
import { renderApp } from './support/render';

describe('esqueci a senha', () => {
  it('leva do login para o pedido de link já com o e-mail digitado', async () => {
    const { calls } = mockFetch({ 'POST /auth/password-resets': { status: 202, body: { ok: true } } });
    renderApp('/entrar');

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@empresa.com');
    await userEvent.click(screen.getByRole('link', { name: 'Esqueci a senha' }));

    expect(await screen.findByRole('heading', { name: 'Esqueci a senha' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@empresa.com');

    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByRole('heading', { name: 'Confira seu e-mail' })).toBeInTheDocument();
    expect(screen.getByText(/ana@empresa.com/)).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/auth/password-resets', body: { email: 'ana@empresa.com' } });
    expect(screen.getByRole('link', { name: 'Voltar para o login' })).toHaveAttribute('href', '/entrar');
  });

  it('mostra o erro de e-mail inválido no campo', async () => {
    mockFetch({
      'POST /auth/password-resets': {
        status: 400,
        body: {
          error: {
            code: 'validation_error',
            message: 'Dados inválidos.',
            details: [{ field: 'email', message: 'E-mail inválido.' }],
          },
        },
      },
    });
    renderApp('/esqueci-senha');

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  it('cria a nova senha pelo link e entra no sistema', async () => {
    const { calls } = mockFetch({
      'GET /auth/password-resets/abc': { body: { email: 'ana@empresa.com' } },
      'POST /auth/password-resets/abc': { body: { token: 'novo', user: session.user } },
      'GET /auth/me': { body: session },
    });
    renderApp('/redefinir-senha/abc');

    expect(await screen.findByText(/ana@empresa.com/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nova senha'), 'senha-nova-456');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'senha-nova-456');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar e entrar' }));

    expect(await screen.findByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({ password: 'senha-nova-456' });
    expect(tokenStorage.get()).toBe('novo');
  });

  it('avisa quando as senhas não conferem', async () => {
    const { calls } = mockFetch({ 'GET /auth/password-resets/abc': { body: { email: 'ana@empresa.com' } } });
    renderApp('/redefinir-senha/abc');

    await userEvent.type(await screen.findByLabelText('Nova senha'), 'senha-nova-456');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'outra-coisa');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar e entrar' }));

    expect(await screen.findByText('As senhas não conferem.')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0);
  });

  it('oferece um novo link quando o atual expirou', async () => {
    mockFetch({
      'GET /auth/password-resets/velho': {
        status: 410,
        body: { error: { code: 'reset_expired', message: 'Este link expirou. Peça um novo.' } },
      },
    });
    renderApp('/redefinir-senha/velho');

    expect(await screen.findByRole('heading', { name: 'Link indisponível' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Este link expirou. Peça um novo.');
    expect(screen.getByRole('link', { name: 'Pedir um novo link' })).toHaveAttribute('href', '/esqueci-senha');
  });
});
