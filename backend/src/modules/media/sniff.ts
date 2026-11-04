import type { MediaFormat } from './media.types.js';

const ascii = (bytes: Buffer, start: number, end: number) => bytes.subarray(start, end).toString('latin1');

export const SNIFF_BYTES = 16;

export function sniffFormat(bytes: Buffer): MediaFormat | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { kind: 'image', contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: 'image', contentType: 'image/png', extension: 'png' };
  }
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') {
    return { kind: 'image', contentType: 'image/gif', extension: 'gif' };
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return { kind: 'image', contentType: 'image/webp', extension: 'webp' };
  }
  if (bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return { kind: 'video', contentType: 'video/webm', extension: 'webm' };
  }
  if (ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12);
    if (brand === 'qt  ') return { kind: 'video', contentType: 'video/quicktime', extension: 'mov' };
    if (/^(heic|heix|mif1|msf1|avif)$/.test(brand)) return null;
    return { kind: 'video', contentType: 'video/mp4', extension: 'mp4' };
  }
  return null;
}
