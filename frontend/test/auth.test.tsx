import { screen, within } from '@testing-library/react';
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

  it('volta para a landing pelo logo da tela de login', async () => {
    mockFetch({});
    renderApp('/entrar');

    await userEvent.click(await screen.findByRole('link', { name: 'OnboardHub, voltar ao início' }));
    expect(await screen.findByRole('heading', { name: /Do primeiro dia à autonomia/ })).toBeInTheDocument();
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
    expect(within(screen.getByRole('main')).getByText(/Empresa Teste/)).toBeInTheDocument();
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

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Senha')).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });

  it('confere e-mail e senha antes de tentar entrar', async () => {
    const { calls } = mockFetch({});
    renderApp('/entrar');

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveFocus();

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@empresa.com');
    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
    expect(calls).toHaveLength(0);
  });

  it('mostra e esconde a senha pelo ícone de olho', async () => {
    mockFetch({});
    renderApp('/entrar');

    const password = screen.getByLabelText('Senha');
    await userEvent.type(password, 'segredo123');
    expect(password).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('segredo123');

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it.each(['/entrar', '/cadastro'])('mostra o botão do Google em %s avisando que ainda não está disponível', async (path) => {
    const { calls } = mockFetch({});
    renderApp(path);

    await userEvent.click(await screen.findByRole('button', { name: 'Continuar com Google' }));

    expect(await screen.findByRole('status')).toHaveTextContent('O acesso com Google estará disponível em breve.');
    expect(calls).toHaveLength(0);
  });

  async function fillSignupStepOne() {
    await userEvent.type(screen.getByLabelText('Nome completo'), 'Ana Souza');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@empresa.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  }

  it('cadastra em duas etapas, primeiro a pessoa e depois a empresa', async () => {
    const { calls } = mockFetch({
      'POST /auth/signup': { status: 201, body: { token: 'novo', ...session } },
      'GET /auth/me': { body: session },
    });
    renderApp('/cadastro');

    expect(screen.getByText('Etapa 1 de 2')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome da empresa')).not.toBeInTheDocument();
    await fillSignupStepOne();

    expect(await screen.findByText('Etapa 2 de 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuar com Google' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nome da empresa'), 'Empresa Teste');
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000181');
    expect(screen.getByLabelText('CNPJ')).toHaveValue('11.222.333/0001-81');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(calls[0]!.body).toEqual({
      name: 'Ana Souza',
      email: 'ana@empresa.com',
      password: 'segredo123',
      companyName: 'Empresa Teste',
      cnpj: '11.222.333/0001-81',
    });
  });

  it('aceita CNPJ alfanumérico com letras maiúsculas na máscara', async () => {
    mockFetch({});
    renderApp('/cadastro');
    await fillSignupStepOne();

    await userEvent.type(await screen.findByLabelText('CNPJ'), '12abc34501de35');
    expect(screen.getByLabelText('CNPJ')).toHaveValue('12.ABC.345/01DE-35');
  });

  it('confere os dados da primeira etapa antes de avançar', async () => {
    const { calls } = mockFetch({});
    renderApp('/cadastro');

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana');
    await userEvent.type(screen.getByLabelText('Senha'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Informe seu nome completo.')).toBeInTheDocument();
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Nome completo')).toHaveFocus();
    expect(screen.queryByLabelText('Nome da empresa')).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('confere a empresa e o CNPJ antes de enviar', async () => {
    const { calls } = mockFetch({});
    renderApp('/cadastro');
    await fillSignupStepOne();

    await userEvent.click(await screen.findByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Informe o nome da empresa.')).toBeInTheDocument();
    expect(screen.getByText('Informe o CNPJ da empresa.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome da empresa')).toHaveFocus();

    await userEvent.type(screen.getByLabelText('Nome da empresa'), 'Empresa Teste');
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000182');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('CNPJ inválido.')).toBeInTheDocument();
    expect(screen.getByLabelText('CNPJ')).toHaveFocus();
    expect(calls).toHaveLength(0);
  });

  it('volta para a primeira etapa mantendo o que foi digitado', async () => {
    mockFetch({});
    renderApp('/cadastro');
    await fillSignupStepOne();

    await userEvent.type(await screen.findByLabelText('Nome da empresa'), 'Empresa Teste');
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Souza');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByLabelText('Nome da empresa')).toHaveValue('Empresa Teste');
  });

  it('mostra o erro do CNPJ na segunda etapa', async () => {
    mockFetch({
      'POST /auth/signup': {
        status: 400,
        body: {
          error: {
            code: 'validation_error',
            message: 'Dados inválidos.',
            details: [{ field: 'cnpj', message: 'CNPJ inválido.' }],
          },
        },
      },
    });
    renderApp('/cadastro');
    await fillSignupStepOne();

    await userEvent.type(await screen.findByLabelText('Nome da empresa'), 'Empresa Teste');
    await userEvent.type(screen.getByLabelText('CNPJ'), '12ABC34501DE35');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('CNPJ inválido.')).toBeInTheDocument();
    expect(screen.getByLabelText('CNPJ')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra no campo quando o CNPJ já tem empresa cadastrada', async () => {
    mockFetch({
      'POST /auth/signup': {
        status: 409,
        body: { error: { code: 'cnpj_already_registered', message: 'Já existe uma empresa cadastrada com este CNPJ.' } },
      },
    });
    renderApp('/cadastro');
    await fillSignupStepOne();

    await userEvent.type(await screen.findByLabelText('Nome da empresa'), 'Empresa Teste');
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000181');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Já existe uma empresa cadastrada com este CNPJ.')).toBeInTheDocument();
    expect(screen.getByLabelText('CNPJ')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('volta para a primeira etapa quando o e-mail já tem conta', async () => {
    mockFetch({
      'POST /auth/signup': {
        status: 409,
        body: { error: { code: 'email_already_registered', message: 'Já existe uma conta com este e-mail.' } },
      },
    });
    renderApp('/cadastro');
    await fillSignupStepOne();

    await userEvent.type(await screen.findByLabelText('Nome da empresa'), 'Empresa Teste');
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000181');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Etapa 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Já existe uma conta com este e-mail.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
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
