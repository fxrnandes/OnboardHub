import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { mockFetch, session, type Routes } from './support/fetch';
import { confirmInDialog } from './support/dialog';
import { renderApp } from './support/render';

const ana = { id: 'u1', name: 'Ana Souza', email: 'ana@empresa.com', role: 'master', jobRoleId: null, createdAt: '2026-10-01' };
const bruno = { id: 'u2', name: 'Bruno Lima', email: 'bruno@empresa.com', role: 'colaborador', jobRoleId: 'j1', createdAt: '2026-10-02' };
const suporte = { id: 'j1', name: 'Suporte', memberCount: 1, createdAt: '2026-10-01' };

function asMaster(routes: Routes) {
  tokenStorage.set('tok');
  return mockFetch({ 'GET /auth/me': { body: session }, ...routes });
}

describe('equipe: pessoas', () => {
  it('lista as pessoas e altera papel e cargo', async () => {
    const { calls } = asMaster({
      'GET /members': { body: { members: [ana, bruno] } },
      'GET /job-roles': { body: { jobRoles: [suporte] } },
      'PATCH /members/u2': (body) => ({ body: { member: { ...bruno, ...(body as object) } } }),
    });
    renderApp('/equipe');

    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('(você)')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Papel de Bruno Lima'), 'gestor');
    expect(calls.at(-1)).toMatchObject({ method: 'PATCH', path: '/members/u2', body: { role: 'gestor' } });
    expect(screen.getByLabelText('Papel de Bruno Lima')).toHaveValue('gestor');

    await userEvent.selectOptions(screen.getByLabelText('Cargo de Bruno Lima'), '');
    expect(calls.at(-1)).toMatchObject({ body: { jobRoleId: null } });
  });

  it('pede confirmação antes de tornar alguém administrador', async () => {
    const { calls } = asMaster({
      'GET /members': { body: { members: [ana, bruno] } },
      'GET /job-roles': { body: { jobRoles: [suporte] } },
      'PATCH /members/u2': (body) => ({ body: { member: { ...bruno, ...(body as object) } } }),
    });
    renderApp('/equipe');

    await userEvent.selectOptions(await screen.findByLabelText('Papel de Bruno Lima'), 'master');
    expect(await screen.findByText('Tornar Bruno Lima administrador?')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(calls.some((call) => call.method === 'PATCH')).toBe(false);
    expect(screen.getByLabelText('Papel de Bruno Lima')).toHaveValue('colaborador');

    await userEvent.selectOptions(screen.getByLabelText('Papel de Bruno Lima'), 'master');
    await confirmInDialog('Tornar administrador');
    expect(calls.at(-1)).toMatchObject({ method: 'PATCH', path: '/members/u2', body: { role: 'master' } });
  });

  it('mostra o erro quando a API recusa a mudança', async () => {
    asMaster({
      'GET /members': { body: { members: [ana, bruno] } },
      'GET /job-roles': { body: { jobRoles: [] } },
      'PATCH /members/u1': {
        status: 409,
        body: { error: { code: 'last_master', message: 'A empresa precisa ter pelo menos um master.' } },
      },
    });
    renderApp('/equipe/membros');

    await userEvent.selectOptions(await screen.findByLabelText('Papel de Ana Souza'), 'colaborador');
    await confirmInDialog('Mudar papel');
    expect(await screen.findByRole('alert')).toHaveTextContent('A empresa precisa ter pelo menos um master.');
  });

  it('remove uma pessoa depois de confirmar', async () => {
    const { calls } = asMaster({
      'GET /members': { body: { members: [ana, bruno] } },
      'GET /job-roles': { body: { jobRoles: [] } },
      'DELETE /members/u2': { status: 204 },
    });
    renderApp('/equipe/membros');

    const row = (await screen.findByText('Bruno Lima')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Remover' }));
    await confirmInDialog('Remover Bruno');

    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/members/u2' });
    expect(screen.queryByText('Bruno Lima')).not.toBeInTheDocument();
  });

  it('gestor vê a lista sem poder editar e sem as outras abas', async () => {
    tokenStorage.set('tok');
    mockFetch({
      'GET /auth/me': { body: { ...session, user: { ...session.user, role: 'gestor' } } },
      'GET /members': { body: { members: [ana, bruno] } },
      'GET /job-roles': { body: { jobRoles: [suporte] } },
    });
    renderApp('/equipe/membros');

    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument();
    expect(await screen.findByText('Suporte')).toBeInTheDocument();
    expect(screen.queryByLabelText('Papel de Bruno Lima')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cargos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument();
  });

  it('colaborador não acessa a equipe', async () => {
    tokenStorage.set('tok');
    mockFetch({ 'GET /auth/me': { body: { ...session, user: { ...session.user, role: 'colaborador' } } } });
    renderApp('/equipe');

    expect(await screen.findByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument();
  });
});

describe('equipe: cargos', () => {
  it('cria, renomeia e exclui cargos', async () => {
    const { calls } = asMaster({
      'GET /job-roles': { body: { jobRoles: [suporte] } },
      'POST /job-roles': (body) => ({
        status: 201,
        body: { jobRole: { id: 'j2', name: (body as { name: string }).name, memberCount: 0, createdAt: '' } },
      }),
      'PATCH /job-roles/j1': (body) => ({ body: { jobRole: { ...suporte, ...(body as object) } } }),
      'DELETE /job-roles/j2': { status: 204 },
    });
    renderApp('/equipe/cargos');

    expect(await screen.findByText('Suporte')).toBeInTheDocument();
    expect(screen.getByText('1 pessoa')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Novo cargo'), 'Financeiro');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('0 pessoas')).toBeInTheDocument();
    expect(screen.getByLabelText('Novo cargo')).toHaveValue('');

    const suporteItem = screen.getByText('Suporte').closest('li')!;
    await userEvent.click(within(suporteItem).getByRole('button', { name: 'Renomear' }));
    const input = screen.getByLabelText('Nome do cargo');
    await userEvent.clear(input);
    await userEvent.type(input, 'Suporte N1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Suporte N1')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'PATCH')!.body).toEqual({ name: 'Suporte N1' });

    const financeiroItem = screen.getByText('Financeiro').closest('li')!;
    await userEvent.click(within(financeiroItem).getByRole('button', { name: 'Excluir' }));
    await confirmInDialog('Excluir cargo');
    expect(screen.queryByText('Financeiro')).not.toBeInTheDocument();
  });

  it('mostra erro de nome repetido no campo', async () => {
    asMaster({
      'GET /job-roles': { body: { jobRoles: [suporte] } },
      'POST /job-roles': {
        status: 409,
        body: { error: { code: 'job_role_name_taken', message: 'Já existe um cargo com esse nome.' } },
      },
    });
    renderApp('/equipe/cargos');

    await userEvent.type(await screen.findByLabelText('Novo cargo'), 'Suporte');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('Já existe um cargo com esse nome.')).toBeInTheDocument();
  });

  it('mostra estado vazio', async () => {
    asMaster({ 'GET /job-roles': { body: { jobRoles: [] } } });
    renderApp('/equipe/cargos');
    expect(await screen.findByText('Nenhum cargo ainda')).toBeInTheDocument();
  });
});

describe('equipe: convites', () => {
  const pending = {
    id: 'i1',
    email: 'carla@empresa.com',
    role: 'colaborador',
    jobRoleId: 'j1',
    jobRoleName: 'Suporte',
    status: 'pending',
    expiresAt: '2026-10-20T12:00:00.000Z',
    createdAt: '2026-10-13T12:00:00.000Z',
  };

  it('gera um convite, mostra o link e permite copiar', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { calls } = asMaster({
      'GET /invites': { body: { invites: [] } },
      'GET /job-roles': { body: { jobRoles: [suporte] } },
      'POST /invites': {
        status: 201,
        body: {
          invite: { ...pending, id: 'i2', email: 'dani@empresa.com', role: 'gestor' },
          link: 'https://app/convite/xyz',
          emailSent: true,
        },
      },
    });
    renderApp('/equipe/convites');

    expect(await screen.findByText('Nenhum convite enviado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar link de convite' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('E-mail (opcional)'), 'dani@empresa.com');
    await userEvent.selectOptions(screen.getByLabelText('Papel'), 'gestor');
    await userEvent.selectOptions(screen.getByLabelText('Cargo'), 'j1');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar convite por e-mail' }));

    expect(await screen.findByText('Convite enviado para dani@empresa.com. Se quiser, copie o link também:')).toBeInTheDocument();
    expect(screen.getByLabelText('Link do convite')).toHaveValue('https://app/convite/xyz');
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({
      email: 'dani@empresa.com',
      role: 'gestor',
      jobRoleId: 'j1',
    });
    expect(screen.getByText('dani@empresa.com')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(writeText).toHaveBeenCalledWith('https://app/convite/xyz');
    expect(screen.getByRole('button', { name: 'Copiado!' })).toBeInTheDocument();
  });

  it('envia convite aberto sem e-mail para um gestor sem cargo', async () => {
    const { calls } = asMaster({
      'GET /invites': { body: { invites: [] } },
      'GET /job-roles': { body: { jobRoles: [suporte] } },
      'POST /invites': {
        status: 201,
        body: { invite: { ...pending, email: null, role: 'gestor', jobRoleName: null }, link: 'l', emailSent: false },
      },
    });
    renderApp('/equipe/convites');

    await userEvent.selectOptions(await screen.findByLabelText('Papel'), 'gestor');
    await userEvent.click(screen.getByRole('button', { name: 'Gerar link de convite' }));
    await screen.findByLabelText('Link do convite');
    expect(screen.getByText('Convite criado. Envie este link para a pessoa:')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({ email: null, role: 'gestor', jobRoleId: null });
    expect(screen.getByText('Link aberto')).toBeInTheDocument();
  });

  it('exige o cargo para convidar um colaborador', async () => {
    const { calls } = asMaster({
      'GET /invites': { body: { invites: [] } },
      'GET /job-roles': { body: { jobRoles: [suporte] } },
    });
    renderApp('/equipe/convites');

    await userEvent.click(await screen.findByRole('button', { name: 'Gerar link de convite' }));
    expect(await screen.findByText('Escolha o cargo: é por ele que a pessoa vê as trilhas.')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('avisa quando ainda não existe cargo', async () => {
    asMaster({
      'GET /invites': { body: { invites: [] } },
      'GET /job-roles': { body: { jobRoles: [] } },
    });
    renderApp('/equipe/convites');

    expect(await screen.findByRole('link', { name: 'Crie o primeiro cargo' })).toHaveAttribute('href', '/equipe/cargos');
  });

  it('se o e-mail não sair, avisa e mostra o link para enviar por fora', async () => {
    asMaster({
      'GET /invites': { body: { invites: [] } },
      'GET /job-roles': { body: { jobRoles: [suporte] } },
      'POST /invites': {
        status: 201,
        body: { invite: { ...pending, email: 'gil@empresa.com' }, link: 'https://app/convite/abc', emailSent: false },
      },
    });
    renderApp('/equipe/convites');

    await userEvent.type(await screen.findByLabelText('E-mail (opcional)'), 'gil@empresa.com');
    await userEvent.selectOptions(screen.getByLabelText('Cargo'), 'j1');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar convite por e-mail' }));

    expect(await screen.findByText('Não conseguimos enviar o e-mail. Envie este link para a pessoa:')).toBeInTheDocument();
    expect(screen.getByLabelText('Link do convite')).toHaveValue('https://app/convite/abc');
  });

  it('lista convites com status e revoga um pendente', async () => {
    const accepted = { ...pending, id: 'i3', email: 'edu@empresa.com', status: 'accepted', acceptedAt: '2026-10-14T12:00:00.000Z', acceptedByName: 'Edu Reis' };
    const { calls } = asMaster({
      'GET /invites': { body: { invites: [pending, accepted] } },
      'GET /job-roles': { body: { jobRoles: [] } },
      'DELETE /invites/i1': { status: 204 },
    });
    renderApp('/equipe/convites');

    const row = (await screen.findByText('carla@empresa.com')).closest('tr')!;
    expect(within(row).getByText('Pendente')).toBeInTheDocument();
    expect(within(row).getByText('Expira em 20/10/2026')).toBeInTheDocument();
    expect(screen.queryByText('edu@empresa.com')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Todos/ }));
    const acceptedRow = screen.getByText('edu@empresa.com').closest('tr')!;
    expect(within(acceptedRow).getByText('Aceito em 14/10/2026 por Edu Reis')).toBeInTheDocument();
    expect(within(acceptedRow).queryByRole('button')).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', { name: 'Revogar' }));
    await confirmInDialog('Revogar convite');

    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/invites/i1' });
    expect(within(row).getByText('Revogado')).toBeInTheDocument();
    expect(within(row).getByText('Cancelado')).toBeInTheDocument();
  });

  it('mostra mensagem quando não há pendentes', async () => {
    asMaster({
      'GET /invites': { body: { invites: [{ ...pending, status: 'expired' }] } },
      'GET /job-roles': { body: { jobRoles: [] } },
    });
    renderApp('/equipe/convites');

    expect(await screen.findByText('Nenhum convite pendente. Veja os aceitos e expirados em "Todos".')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Todos/ }));
    expect(screen.getByText('Expirou em 20/10/2026')).toBeInTheDocument();
  });

  it('reenvia um convite e mostra o link novo', async () => {
    const { calls } = asMaster({
      'GET /invites': { body: { invites: [pending, { ...pending, id: 'i2', email: null }] } },
      'GET /job-roles': { body: { jobRoles: [] } },
      'POST /invites/i1/resend': { body: { invite: { ...pending, expiresAt: '2026-10-27T12:00:00.000Z' }, link: 'https://app/convite/novo', emailSent: true } },
      'POST /invites/i2/resend': { body: { invite: { ...pending, id: 'i2', email: null }, link: 'https://app/convite/outro', emailSent: false } },
    });
    renderApp('/equipe/convites');

    const row = (await screen.findByText('carla@empresa.com')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Reenviar' }));
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/invites/i1/resend' });
    expect(await screen.findByText('Convite reenviado para carla@empresa.com. Se quiser, copie o link também:')).toBeInTheDocument();
    expect(screen.getByLabelText('Link do convite')).toHaveValue('https://app/convite/novo');
    expect(within(row).getByText('Expira em 27/10/2026')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Gerar link novo' }));
    expect(await screen.findByText('Link novo gerado. O anterior deixou de funcionar:')).toBeInTheDocument();
  });

  it('gestor convida só colaboradores e não mexe em convites de gestor', async () => {
    tokenStorage.set('tok');
    mockFetch({
      'GET /auth/me': { body: { ...session, user: { ...session.user, role: 'gestor' } } },
      'GET /invites': { body: { invites: [pending, { ...pending, id: 'i4', email: 'gestora@empresa.com', role: 'gestor' }] } },
      'GET /job-roles': { body: { jobRoles: [suporte] } },
    });
    renderApp('/equipe/convites');

    expect(await screen.findByText('Gestores convidam colaboradores. Para convidar outro gestor, fale com o administrador.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Papel')).not.toBeInTheDocument();
    expect(within(screen.getByText('carla@empresa.com').closest('tr')!).getByRole('button', { name: 'Revogar' })).toBeInTheDocument();
    expect(within(screen.getByText('gestora@empresa.com').closest('tr')!).queryByRole('button')).not.toBeInTheDocument();
  });

  it('mostra erro quando não consegue carregar', async () => {
    asMaster({
      'GET /invites': { status: 500, body: { error: { code: 'internal_error', message: 'Erro interno.' } } },
      'GET /job-roles': { body: { jobRoles: [] } },
    });
    renderApp('/equipe/convites');
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno.');
  });
});
