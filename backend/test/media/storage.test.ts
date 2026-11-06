import { afterEach, describe, expect, it, vi } from 'vitest';
import { AzureBlobStorage, LocalDiskStorage, createStorage } from '../../src/modules/media/storage.js';

const VALID =
  'DefaultEndpointsProtocol=https;AccountName=conta;AccountKey=dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdGtleXRlc3Q=;EndpointSuffix=core.windows.net';

afterEach(() => vi.restoreAllMocks());

describe('createStorage', () => {
  it('usa o Azure quando a connection string é válida', () => {
    expect(createStorage({ AZURE_STORAGE_CONNECTION_STRING: VALID }, 'segredo')).toBeInstanceOf(AzureBlobStorage);
  });

  it('usa o disco quando não há connection string', () => {
    expect(createStorage({ MEDIA_DIR: '/tmp/x' }, 'segredo')).toBeInstanceOf(LocalDiskStorage);
  });

  it('não derruba a API com connection string inválida: avisa no log e usa o disco', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const storage = createStorage({ AZURE_STORAGE_CONNECTION_STRING: 'chave-solta-sem-formato', MEDIA_DIR: '/tmp/x' }, 'segredo');

    expect(storage).toBeInstanceOf(LocalDiskStorage);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('AZURE_STORAGE_CONNECTION_STRING'));
    expect(log.mock.calls.flat().join(' ')).not.toContain('chave-solta-sem-formato');
  });
});
