import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { BlobSASPermissions, BlobServiceClient, type ContainerClient } from '@azure/storage-blob';

export interface MediaStorage {
  put(key: string, content: Readable, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  signedUrl(key: string, ttlSeconds: number): Promise<string>;
}

export class AzureBlobStorage implements MediaStorage {
  private readonly container: ContainerClient;

  constructor(connectionString: string, containerName: string) {
    this.container = BlobServiceClient.fromConnectionString(connectionString).getContainerClient(containerName);
  }

  async put(key: string, content: Readable, contentType: string): Promise<void> {
    await this.container.getBlockBlobClient(key).uploadStream(content, 4 * 1024 * 1024, 4, {
      blobHTTPHeaders: { blobContentType: contentType, blobCacheControl: 'private, max-age=3600' },
    });
  }

  async delete(key: string): Promise<void> {
    await this.container.getBlockBlobClient(key).deleteIfExists();
  }

  signedUrl(key: string, ttlSeconds: number): Promise<string> {
    return this.container.getBlockBlobClient(key).generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(Date.now() - 5 * 60 * 1000),
      expiresOn: new Date(Date.now() + ttlSeconds * 1000),
    });
  }
}

export class LocalDiskStorage implements MediaStorage {
  constructor(
    private readonly root: string,
    private readonly secret: string,
    private readonly publicPath: string,
  ) {}

  private pathFor(key: string): string {
    const full = normalize(join(this.root, key));
    if (!full.startsWith(normalize(this.root) + sep)) throw new Error('Chave de mídia inválida.');
    return full;
  }

  private signature(key: string, expires: number): string {
    return createHmac('sha256', this.secret).update(`${key}:${expires}`).digest('base64url');
  }

  async put(key: string, content: Readable): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await pipeline(content, createWriteStream(path));
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  signedUrl(key: string, ttlSeconds: number): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    return Promise.resolve(`${this.publicPath}/media/files/${key}?expires=${expires}&signature=${this.signature(key, expires)}`);
  }

  async open(key: string, expires: number, signature: string): Promise<{ stream: Readable; size: number } | null> {
    if (!Number.isFinite(expires) || expires < Date.now() / 1000) return null;
    const expected = Buffer.from(this.signature(key, expires));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
      const path = this.pathFor(key);
      const info = await stat(path);
      return { stream: createReadStream(path), size: info.size };
    } catch {
      return null;
    }
  }
}

export function createStorage(env: NodeJS.ProcessEnv, secret: string): MediaStorage {
  const local = () => new LocalDiskStorage(env.MEDIA_DIR ?? join(process.cwd(), 'uploads'), secret, env.MEDIA_PUBLIC_PATH ?? '/api');
  const connectionString = env.AZURE_STORAGE_CONNECTION_STRING?.trim().replace(/^["']|["']$/g, '');
  if (!connectionString) return local();
  try {
    return new AzureBlobStorage(connectionString, env.AZURE_STORAGE_CONTAINER || 'media');
  } catch (error) {
    const reason = (error as Error).message.replaceAll(connectionString, '***');
    console.error(`AZURE_STORAGE_CONNECTION_STRING inválida (${reason}). Os arquivos serão gravados em disco.`);
    return local();
  }
}
