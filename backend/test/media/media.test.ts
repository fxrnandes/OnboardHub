import { existsSync } from 'node:fs';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { LocalDiskStorage } from '../../src/modules/media/storage.js';
import { TEST_JWT_SECRET, addMember, createTestApp, newCompany } from '../support/app.js';

const root = await mkdtemp(join(tmpdir(), 'onboardhub-media-test-'));
const storage = new LocalDiskStorage(root, TEST_JWT_SECRET, '/api');
const { app, pool } = createTestApp({
  storage,
  mediaLimits: { imageBytes: 2048, videoBytes: 4096, companyBytes: 6000, urlTtlSeconds: 60 },
});
afterAll(() => pool.end());

const png = (size = 200) =>
  Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(size - 8, 7)]);
const mp4 = (size = 300) =>
  Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom', 'latin1'), Buffer.alloc(size - 12, 3)]);

type Company = Awaited<ReturnType<typeof newCompany>>;

function upload(token: string, file: Buffer, name = 'foto.png') {
  return request(app).post('/media').set('Authorization', `Bearer ${token}`).attach('file', file, name);
}

async function tokenOf(company: Company) {
  const res = await company.master.get('/auth/me');
  return res.request.getHeader('Authorization').replace('Bearer ', '') as string;
}

const fetchFile = (url: string) => request(app).get(url.replace(/^\/api/, ''));

async function mediaRows(companyId: string) {
  const { rows } = await pool.query('select id, storage_key from media where company_id = $1', [companyId]);
  return rows as { id: string; storage_key: string }[];
}

async function stepIn(company: Company) {
  const trail = (await company.master.post('/trails', { title: 'Mídia' })).body.trail;
  const module = (await company.master.post(`/trails/${trail.id}/modules`, { title: 'Módulo' })).body.module;
  return { trail, module };
}

describe('upload de mídia (RF09)', () => {
  it('guarda a imagem na pasta da empresa e devolve um link assinado', async () => {
    const company = await newCompany(app);
    const res = await upload(await tokenOf(company), png(), 'Organograma.png');

    expect(res.status).toBe(201);
    expect(res.body.media).toMatchObject({ kind: 'image', contentType: 'image/png', name: 'Organograma.png', size: 200 });
    expect(res.body.media.url).toMatch(/^\/api\/media\/files\/companies\/.+\.png\?expires=\d+&signature=/);
    expect(res.body.media.url).toContain(`companies/${company.companyId}/`);

    const file = await fetchFile(res.body.media.url);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect(file.body).toHaveLength(200);
  });

  it('confere o formato pelo conteúdo, não pelo nome', async () => {
    const company = await newCompany(app);
    const res = await upload(await tokenOf(company), Buffer.from('não sou uma imagem, sou texto'), 'foto.png');

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('media_type');
    expect(await mediaRows(company.companyId)).toHaveLength(0);
  });

  it('recusa arquivo acima do limite do tipo e não deixa nada salvo', async () => {
    const company = await newCompany(app);
    const res = await upload(await tokenOf(company), png(3000));

    expect(res.status).toBe(413);
    expect(res.body.error.message).toBe('O arquivo de imagem pode ter no máximo 0 MB.');
    expect(await mediaRows(company.companyId)).toHaveLength(0);
    const folder = join(root, 'companies', company.companyId);
    expect(existsSync(folder) ? await readdir(folder) : []).toHaveLength(0);
  });

  it('aceita vídeo maior que o limite de imagem', async () => {
    const company = await newCompany(app);
    const res = await upload(await tokenOf(company), mp4(3500), 'treinamento.mp4');

    expect(res.status).toBe(201);
    expect(res.body.media).toMatchObject({ kind: 'video', contentType: 'video/mp4', size: 3500 });
  });

  it('respeita o limite de espaço da empresa', async () => {
    const company = await newCompany(app);
    const token = await tokenOf(company);
    expect((await upload(token, mp4(4000), 'a.mp4')).status).toBe(201);

    const res = await upload(token, png(2048));

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('media_quota');
  });

  it('exige arquivo, login e papel de gestão', async () => {
    const company = await newCompany(app);
    const { member } = await addMember(app, company.master, 'colaborador');
    const memberToken = (await member.get('/auth/me')).request.getHeader('Authorization').replace('Bearer ', '');

    expect((await request(app).post('/media').attach('file', png(), 'x.png')).status).toBe(401);
    expect((await upload(memberToken, png())).status).toBe(403);
    const empty = await request(app).post('/media').set('Authorization', `Bearer ${await tokenOf(company)}`).send({});
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('media_missing');
  });

  it('não entrega o arquivo com assinatura errada ou vencida', async () => {
    const company = await newCompany(app);
    const { url } = (await upload(await tokenOf(company), png())).body.media;

    expect((await fetchFile(url.replace(/signature=[^&]+/, 'signature=abc'))).status).toBe(404);
    expect((await fetchFile(url.replace(/expires=\d+/, 'expires=1'))).status).toBe(404);
    expect((await fetchFile('/api/media/files/companies/../../segredo?expires=9999999999&signature=x')).status).toBe(404);
  });
});

describe('passos com arquivo enviado', () => {
  it('cria passo de imagem com o arquivo e o colaborador recebe o link', async () => {
    const company = await newCompany(app);
    const media = (await upload(await tokenOf(company), png())).body.media;
    const { trail, module } = await stepIn(company);

    const created = await company.master.post(`/modules/${module.id}/steps`, {
      title: 'Organograma',
      kind: 'image',
      mediaId: media.id,
    });

    expect(created.status).toBe(201);
    expect(created.body.step).toMatchObject({ kind: 'image', url: null, mediaId: media.id });
    expect(created.body.step.media).toMatchObject({ id: media.id, name: 'foto.png' });

    const jobRole = (await company.master.post('/job-roles', { name: 'Vendas' })).body.jobRole;
    await company.master.put(`/trails/${trail.id}/job-roles`, { jobRoleIds: [jobRole.id] });
    await company.master.post(`/trails/${trail.id}/publish`);
    const { member } = await addMember(app, company.master, 'colaborador', jobRole.id);

    const opened = await member.get(`/my/trails/${trail.id}`);
    const step = opened.body.trail.modules[0].steps[0];
    expect(step.media.id).toBe(media.id);
    expect((await fetchFile(step.media.url)).status).toBe(200);
  });

  it('recusa arquivo de outra empresa ou de tipo diferente', async () => {
    const company = await newCompany(app);
    const other = await newCompany(app, 'Outra');
    const foreign = (await upload(await tokenOf(other), png())).body.media;
    const image = (await upload(await tokenOf(company), png())).body.media;
    const { module } = await stepIn(company);

    const fromOther = await company.master.post(`/modules/${module.id}/steps`, { title: 'X', kind: 'image', mediaId: foreign.id });
    const wrongKind = await company.master.post(`/modules/${module.id}/steps`, { title: 'X', kind: 'video', mediaId: image.id });

    expect(fromOther.status).toBe(400);
    expect(fromOther.body.error.message).toBe('Arquivo de mídia não encontrado. Envie o arquivo de novo.');
    expect(wrongKind.status).toBe(400);
    expect(wrongKind.body.error.message).toBe('O arquivo enviado não é um vídeo.');
  });

  it('apaga o arquivo antigo ao trocar por outro, por link ou ao excluir o passo', async () => {
    const company = await newCompany(app);
    const token = await tokenOf(company);
    const first = (await upload(token, png())).body.media;
    const second = (await upload(token, png())).body.media;
    const { module } = await stepIn(company);
    const step = (await company.master.post(`/modules/${module.id}/steps`, { title: 'Foto', kind: 'image', mediaId: first.id }))
      .body.step;

    await company.master.patch(`/steps/${step.id}`, { mediaId: second.id });
    expect((await fetchFile(first.url)).status).toBe(404);
    expect((await mediaRows(company.companyId)).map((row) => row.id)).toEqual([second.id]);

    const byUrl = await company.master.patch(`/steps/${step.id}`, { url: 'https://exemplo.com/foto.png' });
    expect(byUrl.body.step).toMatchObject({ url: 'https://exemplo.com/foto.png', mediaId: null, media: null });
    expect(await mediaRows(company.companyId)).toHaveLength(0);

    const third = (await upload(token, png())).body.media;
    await company.master.patch(`/steps/${step.id}`, { mediaId: third.id, url: null });
    await company.master.delete(`/steps/${step.id}`);
    expect(await mediaRows(company.companyId)).toHaveLength(0);
    expect((await fetchFile(third.url)).status).toBe(404);
  });

  it('mantém o arquivo enquanto uma cópia da trilha ainda usa', async () => {
    const company = await newCompany(app);
    const media = (await upload(await tokenOf(company), png())).body.media;
    const { trail, module } = await stepIn(company);
    await company.master.post(`/modules/${module.id}/steps`, { title: 'Foto', kind: 'image', mediaId: media.id });
    const copy = (await company.master.post(`/trails/${trail.id}/duplicate`)).body.trail;

    await company.master.delete(`/trails/${trail.id}`);
    expect(await mediaRows(company.companyId)).toHaveLength(1);
    expect((await company.master.get(`/trails/${copy.id}`)).body.trail.modules[0].steps[0].media.id).toBe(media.id);

    await company.master.delete(`/modules/${copy.modules[0].id}`);
    expect(await mediaRows(company.companyId)).toHaveLength(0);
  });

  it('limpa uploads esquecidos há mais de um dia', async () => {
    const company = await newCompany(app);
    const token = await tokenOf(company);
    const forgotten = (await upload(token, png())).body.media;
    await pool.query("update media set created_at = now() - interval '2 days' where id = $1", [forgotten.id]);

    await upload(token, png());
    await new Promise((resolve) => setTimeout(resolve, 100));

    const ids = (await mediaRows(company.companyId)).map((row) => row.id);
    expect(ids).not.toContain(forgotten.id);
    expect(ids).toHaveLength(1);
  });
});
