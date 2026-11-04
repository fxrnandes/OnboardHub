import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tokenStorage } from '../src/api/client';
import { checkFile, formatBytes } from '../src/api/media';
import type { TrailTree } from '../src/api/trails';
import { mockFetch, session } from './support/fetch';
import { renderApp } from './support/render';

const media = {
  id: 'md1',
  kind: 'video',
  contentType: 'video/mp4',
  name: 'boas-vindas.mp4',
  size: 5 * 1024 * 1024,
  url: '/api/media/files/companies/c1/md1.mp4?expires=1&signature=x',
};

type Reply = { status: number; body: unknown };

class FakeXhr {
  static next: Reply = { status: 201, body: { media } };
  static last: FakeXhr | null = null;
  headers: Record<string, string> = {};
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  status = 0;
  response: unknown = null;
  responseType = '';
  sent: FormData | null = null;
  url = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: FormData) {
    this.sent = body;
    FakeXhr.last = this;
    setTimeout(() => {
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
      this.status = FakeXhr.next.status;
      this.response = FakeXhr.next.body;
      this.onload?.();
    }, 10);
  }
  abort() {
    this.onabort?.();
  }
}

const trail: TrailTree = {
  id: 't1',
  title: 'Boas-vindas',
  description: '',
  status: 'draft',
  publishedAt: null,
  moduleCount: 1,
  stepCount: 0,
  jobRoleIds: [],
  createdAt: '',
  updatedAt: '',
  modules: [{ id: 'm1', title: 'Primeiro dia', position: 0, steps: [] }],
};

function setup() {
  let current = structuredClone(trail);
  tokenStorage.set('tok');
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  FakeXhr.next = { status: 201, body: { media } };
  return mockFetch({
    'GET /auth/me': { body: session },
    'GET /job-roles': { body: { jobRoles: [] } },
    'GET /trails/t1': () => ({ body: { trail: current } }),
    'POST /modules/m1/steps': (body) => {
      const step = { id: 's1', moduleId: 'm1', position: 0, ...(body as object), url: null, media } as never;
      current = { ...current, modules: [{ ...current.modules[0]!, steps: [step] }] };
      return { status: 201, body: { step } };
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

async function openVideoStep() {
  renderApp('/trilhas/t1');
  await userEvent.click(await screen.findByRole('button', { name: 'Novo passo' }));
  await userEvent.type(screen.getByLabelText('Título do passo'), 'Vídeo de boas-vindas');
  await userEvent.click(screen.getByRole('radio', { name: 'Vídeo' }));
}

describe('upload de mídia no passo', () => {
  it('envia o vídeo, mostra o arquivo e salva o passo com ele', async () => {
    const { calls } = setup();
    await openVideoStep();

    const file = new File([new Uint8Array(10)], 'boas-vindas.mp4', { type: 'video/mp4' });
    await userEvent.upload(screen.getByLabelText('Arquivo'), file);

    expect(await screen.findByText('5,0 MB · enviado')).toBeInTheDocument();
    expect(FakeXhr.last!.url).toBe('/api/media');
    expect(FakeXhr.last!.headers.Authorization).toBe('Bearer tok');
    expect((FakeXhr.last!.sent!.get('file') as File).name).toBe('boas-vindas.mp4');

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar passo' }));
    await waitFor(() => expect(calls.some((call) => call.path === '/modules/m1/steps')).toBe(true));
    expect(calls.find((call) => call.path === '/modules/m1/steps')!.body).toEqual({
      title: 'Vídeo de boas-vindas',
      kind: 'video',
      body: null,
      url: null,
      mediaId: 'md1',
    });
    const row = (await screen.findByText('Vídeo de boas-vindas')).closest('li')!;
    expect(within(row).getByText('Arquivo enviado: boas-vindas.mp4')).toBeInTheDocument();
  });

  it('pede o arquivo antes de salvar e recusa formato errado sem enviar', async () => {
    setup();
    await openVideoStep();

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar passo' }));
    expect(await screen.findByText('Envie um vídeo.')).toBeInTheDocument();

    FakeXhr.last = null;
    const pdf = new File(['%PDF'], 'manual.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText('Arquivo'), pdf, { applyAccept: false });
    expect(await screen.findByText('Escolha um vídeo MP4, WEBM ou MOV.')).toBeInTheDocument();
    expect(FakeXhr.last).toBeNull();
  });

  it('mostra a mensagem do servidor quando o envio falha', async () => {
    setup();
    FakeXhr.next = { status: 413, body: { error: { code: 'media_quota', message: 'A empresa atingiu o limite.' } } };
    await openVideoStep();

    await userEvent.upload(screen.getByLabelText('Arquivo'), new File([new Uint8Array(4)], 'a.mp4', { type: 'video/mp4' }));

    expect(await screen.findByText('A empresa atingiu o limite.')).toBeInTheDocument();
  });
});

describe('regras de arquivo', () => {
  it('valida tipo e tamanho e formata o tamanho', () => {
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'foto.png', { type: 'image/png' });
    expect(checkFile(big, 'image')).toBe('O arquivo tem 11 MB. O limite é 10 MB.');
    expect(checkFile(new File(['x'], 'foto.png', { type: 'image/png' }), 'image')).toBeNull();
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
  });
});
