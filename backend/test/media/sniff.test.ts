import { describe, expect, it } from 'vitest';
import { sniffFormat } from '../../src/modules/media/sniff.js';

const pad = (bytes: number[] | Buffer) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);
const box = (brand: string) => pad(Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from(`ftyp${brand}`, 'latin1')]));

describe('identificação do formato pelo conteúdo do arquivo', () => {
  it('reconhece as imagens aceitas', () => {
    expect(sniffFormat(pad([0xff, 0xd8, 0xff, 0xe0]))?.contentType).toBe('image/jpeg');
    expect(sniffFormat(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.contentType).toBe('image/png');
    expect(sniffFormat(pad(Buffer.from('GIF89a', 'latin1')))?.contentType).toBe('image/gif');
    expect(sniffFormat(pad(Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBP', 'latin1')))?.contentType).toBe('image/webp');
  });

  it('reconhece os vídeos aceitos', () => {
    expect(sniffFormat(pad([0x1a, 0x45, 0xdf, 0xa3]))).toMatchObject({ kind: 'video', contentType: 'video/webm' });
    expect(sniffFormat(box('isom'))).toMatchObject({ kind: 'video', contentType: 'video/mp4', extension: 'mp4' });
    expect(sniffFormat(box('qt  '))).toMatchObject({ kind: 'video', contentType: 'video/quicktime', extension: 'mov' });
  });

  it('recusa o resto, mesmo que o nome diga outra coisa', () => {
    expect(sniffFormat(box('heic'))).toBeNull();
    expect(sniffFormat(pad(Buffer.from('%PDF-1.7', 'latin1')))).toBeNull();
    expect(sniffFormat(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
