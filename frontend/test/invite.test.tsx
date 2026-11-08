import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { mockFetch, session } from './support/fetch';
import { renderApp } from './support/render';

const colaborador = {
  user: { ...session.user, name: 'Bruno Lima', role: 'colaborador' as const },
  company: session.company,
};

describe('aceitar convite', () => {
  it('cria a conta com o e-mail definido no convite', async () => {
    const { calls } = mockFetch({
      'GET /invites/token/abc': {
        body: {
          invite: {
            companyName: 'Empresa Teste',
            email: 'bruno@empresa.com',
            role: 'colaborador',
            jobRoleName: 'Suporte',
            expiresAt: '2030-01-01T00:00:00.000Z',
          },
        },
      },
      'POST /invites/token/abc/accept': { status: 201, body: { token: 'tok', user: colaborador.user } },
      'GET /auth/me': { body: colaborador },
    });
    renderApp('/convite/abc');

    expect(await screen.findByText('Empresa Teste convidou você como colaborador (Suporte).')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('bruno@empresa.com');

    await userEvent.type(screen.getByLabelText('Seu nome'), 'Bruno Lima');
    await userEvent.type(screen.getByLabelText('Crie uma senha'), 'segredo123');
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar e entrar' }));

    expect(await screen.findByRole('heading', { name: 'Olá, Bruno' })).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({ name: 'Bruno Lima', password: 'segredo123' });
  });

  it('pede o e-mail quando o convite é aberto', async () => {
    const { calls } = mockFetch({
      'GET /invites/token/livre': {
        body: {
          invite: {
            companyName: 'Empresa Teste',
            email: null,
            role: 'gestor',
            jobRoleName: null,
            expiresAt: '2030-01-01T00:00:00.000Z',
          },
        },
      },
      'POST /invites/token/livre/accept': { status: 201, body: { token: 'tok', user: colaborador.user } },
      'GET /auth/me': { body: colaborador },
    });
    renderApp('/convite/livre');

    expect(await screen.findByText('Empresa Teste convidou você como gestor.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Seu nome'), 'Bruno Lima');
    await userEvent.type(screen.getByLabelText('E-mail'), 'bruno@empresa.com');
    await userEvent.type(screen.getByLabelText('Crie uma senha'), 'segredo123');
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar e entrar' }));

    await screen.findByRole('heading', { name: 'Olá, Bruno' });
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({
      name: 'Bruno Lima',
      email: 'bruno@empresa.com',
      password: 'segredo123',
    });
  });

  it('avisa quando o convite expirou', async () => {
    mockFetch({
      'GET /invites/token/velho': {
        status: 410,
        body: { error: { code: 'invite_expired', message: 'Este convite expirou.' } },
      },
    });
    renderApp('/convite/velho');

    expect(await screen.findByRole('heading', { name: 'Convite indisponível' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Este convite expirou.');
  });

  it('quem já está logado vê com qual conta está e pode sair para aceitar', async () => {
    tokenStorage.set('tok');
    mockFetch({
      'GET /auth/me': { body: session },
      'GET /invites/token/abc': {
        body: { invite: { companyName: 'Outra Empresa', email: null, role: 'colaborador', jobRoleName: null, expiresAt: '2030-01-01T00:00:00.000Z' } },
      },
    });
    renderApp('/convite/abc');

    expect(await screen.findByRole('heading', { name: 'Você já está conectado' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(session.user.email))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/');

    await userEvent.click(screen.getByRole('button', { name: 'Sair e continuar' }));

    expect(await screen.findByText('Outra Empresa convidou você como colaborador.')).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });

  it('o link de nova senha também avisa quem está logado', async () => {
    tokenStorage.set('tok');
    mockFetch({ 'GET /auth/me': { body: session } });
    renderApp('/redefinir-senha/xyz');

    expect(await screen.findByRole('heading', { name: 'Você já está conectado' })).toBeInTheDocument();
    expect(screen.getByText(/definir uma nova senha/)).toBeInTheDocument();
  });
});
