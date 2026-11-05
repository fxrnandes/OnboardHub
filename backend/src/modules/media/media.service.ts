import { randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import type pg from 'pg';
import { AppError } from '../../http/errors.js';
import { MediaRepository, type MediaRow } from './media.repository.js';
import type { MediaKind, StepMedia } from './media.types.js';
import { SNIFF_BYTES, sniffFormat } from './sniff.js';
import type { MediaStorage } from './storage.js';

export interface MediaLimits {
  imageBytes: number;
  videoBytes: number;
  companyBytes: number;
  urlTtlSeconds: number;
}

export const MB = 1024 * 1024;

export const defaultLimits: MediaLimits = {
  imageBytes: 10 * MB,
  videoBytes: 200 * MB,
  companyBytes: 2048 * MB,
  urlTtlSeconds: 3 * 60 * 60,
};

export interface IncomingFile {
  stream: Readable;
  name: string;
}

class TooLarge extends Error {}

const formatSize = (bytes: number) => `${Math.round(bytes / MB)} MB`;

const kindLabel: Record<MediaKind, string> = { image: 'imagem', video: 'vídeo' };

async function splitHead(stream: Readable, size: number): Promise<{ head: Buffer; content: Readable }> {
  const iterator = stream[Symbol.asyncIterator]() as AsyncIterator<Buffer>;
  let head = Buffer.alloc(0);
  while (head.length < size) {
    const { value, done } = await iterator.next();
    if (done) break;
    head = Buffer.concat([head, Buffer.from(value)]);
  }
  const first = head;
  const content = Readable.from(
    (async function* () {
      if (first.length) yield first;
      for (;;) {
        const { value, done } = await iterator.next();
        if (done) return;
        yield value;
      }
    })(),
  );
  return { head, content };
}

function limited(max: number, onSize: (size: number) => void): Transform {
  let size = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      onSize(size);
      if (size > max) callback(new TooLarge());
      else callback(null, chunk);
    },
  });
}

export class MediaService {
  private readonly media: MediaRepository;

  constructor(
    pool: pg.Pool,
    private readonly storage: MediaStorage,
    private readonly limits: MediaLimits = defaultLimits,
  ) {
    this.media = new MediaRepository(pool);
  }

  get maxUploadBytes(): number {
    return Math.max(this.limits.imageBytes, this.limits.videoBytes);
  }

  async upload(companyId: string, userId: string, file: IncomingFile): Promise<StepMedia> {
    const { head, content } = await splitHead(file.stream, SNIFF_BYTES);
    const format = sniffFormat(head);
    if (!format) {
      file.stream.resume();
      throw new AppError(
        415,
        'media_type',
        'Formato não suportado. Envie imagem JPG, PNG, WEBP ou GIF, ou vídeo MP4, WEBM ou MOV.',
      );
    }

    const max = format.kind === 'image' ? this.limits.imageBytes : this.limits.videoBytes;
    const used = await this.media.usedBytes(companyId);
    if (used >= this.limits.companyBytes) {
      file.stream.resume();
      throw this.quotaError();
    }

    const id = randomUUID();
    const key = `companies/${companyId}/${id}.${format.extension}`;
    let size = 0;

    const guarded = limited(max, (current) => (size = current));
    guarded.on('error', () => undefined);
    content.on('error', (error) => guarded.destroy(error));
    try {
      await this.storage.put(key, content.pipe(guarded), format.contentType);
    } catch (error) {
      file.stream.resume();
      await this.storage.delete(key).catch(() => undefined);
      if (error instanceof TooLarge || (error as { cause?: unknown })?.cause instanceof TooLarge) {
        throw new AppError(413, 'media_too_large', `O arquivo de ${kindLabel[format.kind]} pode ter no máximo ${formatSize(max)}.`);
      }
      throw error;
    }

    if (size > max) {
      await this.storage.delete(key);
      throw new AppError(413, 'media_too_large', `O arquivo de ${kindLabel[format.kind]} pode ter no máximo ${formatSize(max)}.`);
    }
    if (used + size > this.limits.companyBytes) {
      await this.storage.delete(key);
      throw this.quotaError();
    }

    const row = await this.media.insert({
      id,
      companyId,
      createdBy: userId,
      kind: format.kind,
      storageKey: key,
      contentType: format.contentType,
      size,
      name: file.name.trim().slice(0, 255) || `arquivo.${format.extension}`,
    });

    void this.collectStale(companyId);
    return this.present(row);
  }

  async ensureUsable(companyId: string, mediaId: string, kind: 'image' | 'video'): Promise<void> {
    const media = await this.media.find(companyId, mediaId);
    if (!media) throw new AppError(400, 'step_content', 'Arquivo de mídia não encontrado. Envie o arquivo de novo.');
    if (media.kind !== kind) {
      throw new AppError(400, 'step_content', `O arquivo enviado não é ${kind === 'image' ? 'uma imagem' : 'um vídeo'}.`);
    }
  }

  async describe(companyId: string, ids: (string | null)[]): Promise<Map<string, StepMedia>> {
    const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    const rows = await this.media.findMany(companyId, unique);
    const entries = await Promise.all(rows.map(async (row) => [row.id, await this.present(row)] as const));
    return new Map(entries);
  }

  async release(companyId: string, ids: (string | null)[]): Promise<void> {
    const unique = [...new Set(ids)].filter((id): id is string => Boolean(id));
    await Promise.all(
      unique.map(async (id) => {
        const key = await this.media.deleteIfUnused(companyId, id);
        if (key) await this.storage.delete(key).catch(() => undefined);
      }),
    );
  }

  async keysOf(companyId: string): Promise<string[]> {
    return this.media.storageKeys(companyId);
  }

  async discard(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.storage.delete(key).catch(() => undefined)));
  }

  private async collectStale(companyId: string): Promise<void> {
    try {
      const keys = await this.media.deleteStale(companyId, 24);
      await Promise.all(keys.map((key) => this.storage.delete(key).catch(() => undefined)));
    } catch {
      return;
    }
  }

  private quotaError() {
    return new AppError(
      413,
      'media_quota',
      `A empresa atingiu o limite de ${formatSize(this.limits.companyBytes)} de arquivos. Remova passos com mídia que não usa mais.`,
    );
  }

  private async present(row: MediaRow): Promise<StepMedia> {
    return {
      id: row.id,
      kind: row.kind,
      contentType: row.content_type,
      name: row.original_name,
      size: Number(row.size_bytes),
      url: await this.storage.signedUrl(row.storage_key, this.limits.urlTtlSeconds),
    };
  }
}
