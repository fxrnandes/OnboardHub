import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { mockFetch, session } from './support/fetch';
import { renderApp } from './support/render';

describe('autenticação', () => {
  it('mostra a landing em / e manda para o login nas páginas internas', async () => {
    mockFetch({});
    renderApp('/');
    expect(await screen.findByRole('heading', { name: /Do primeiro dia à autonomia/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Criar conta/ })[0]).toHaveAttribute('href', '/cadastro');

    await userEvent.click(screen.getByRole('link', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('manda para o login quem tenta abrir uma página interna sem estar logado', async () => {
    mockFetch({});
    renderApp('/minhas-trilhas');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('faz login, guarda o token e mostra o início', async () => {
    const { calls } = mockFetch({
      'POST /auth/login': { body: { token: 'tok', user: session.user } },
      'GET /auth/me': { body: session },
    });
    renderApp('/entrar');

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@empresa.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument();
    expect(screen.getByText('Empresa Teste', { selector: 'strong' })).toBeInTheDocument();
    expect(calls[0]!.body).toEqual({ email: 'ana@empresa.com', password: 'segredo123' });
    expect(tokenStorage.get()).toBe('tok');
  });

  it('mostra o erro de credenciais', async () => {
    mockFetch({
      'POST /auth/login': {
        status: 401,
        body: { error: { code: 'invalid_credentials', message: 'E-mail ou senha incorretos.' } },
      },
    });
    renderApp('/entrar');

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@empresa.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(tokenStorage.get()).toBeNull();
  });

  it('cadastra a empresa e entra como administrador', async () => {
    const { calls } = mockFetch({
      'POST /auth/signup': { status: 201, body: { token: 'novo', ...session } },
      'GET /auth/me': { body: session },
    });
    renderApp('/cadastro');

    await userEvent.type(screen.getByLabelText('Nome da empresa'), 'Empresa Teste');
    await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana Souza');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@empresa.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(calls[0]!.body).toEqual({
      companyName: 'Empresa Teste',
      name: 'Ana Souza',
      email: 'ana@empresa.com',
      password: 'segredo123',
    });
  });

  it('mostra erros de validação embaixo de cada campo', async () => {
    mockFetch({
      'POST /auth/signup': {
        status: 400,
        body: {
          error: {
            code: 'validation_error',
            message: 'Dados inválidos.',
            details: [{ field: 'password', message: 'A senha precisa ter pelo menos 8 caracteres.' }],
          },
        },
      },
    });
    renderApp('/cadastro');

    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('restaura a sessão a partir do token salvo e permite sair', async () => {
    tokenStorage.set('tok');
    mockFetch({ 'GET /auth/me': { body: session } });
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('heading', { name: /Do primeiro dia à autonomia/ })).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });

  it('descarta token inválido', async () => {
    tokenStorage.set('expirado');
    mockFetch({ 'GET /auth/me': { status: 401, body: { error: { code: 'unauthorized', message: 'Sessão inválida.' } } } });
    renderApp('/painel');

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });

  it('redireciona quem já está logado para fora do login', async () => {
    tokenStorage.set('tok');
    mockFetch({ 'GET /auth/me': { body: session } });
    renderApp('/entrar');
    expect(await screen.findByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument();
  });

  it('mostra página não encontrada', async () => {
    mockFetch({});
    renderApp('/nao-existe');
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });
});
