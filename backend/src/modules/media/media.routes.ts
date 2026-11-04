import busboy from 'busboy';
import { Router, type Request, type RequestHandler } from 'express';
import { requireRole } from '../../http/auth.middleware.js';
import { AppError } from '../../http/errors.js';
import type { IncomingFile, MediaService } from './media.service.js';
import { LocalDiskStorage, type MediaStorage } from './storage.js';

const contentTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

function readFile(req: Request, maxBytes: number): Promise<IncomingFile> {
  return new Promise((resolve, reject) => {
    if (!req.headers['content-type']?.startsWith('multipart/form-data')) {
      reject(new AppError(400, 'media_missing', 'Envie o arquivo no campo "file".'));
      return;
    }
    let found = false;
    const parser = busboy({ headers: req.headers, limits: { files: 1, fileSize: maxBytes + 1 } });
    parser.on('file', (field, stream, info) => {
      if (field !== 'file' || found) {
        stream.resume();
        return;
      }
      found = true;
      resolve({ stream, name: Buffer.from(info.filename ?? '', 'latin1').toString('utf8') });
    });
    parser.on('error', (error) => reject(error));
    parser.on('close', () => {
      if (!found) reject(new AppError(400, 'media_missing', 'Envie o arquivo no campo "file".'));
    });
    req.pipe(parser);
  });
}

export function mediaRoutes(service: MediaService, storage: MediaStorage, requireAuth: RequestHandler): Router {
  const router = Router();

  router.post('/', requireAuth, requireRole('master', 'gestor'), async (req, res) => {
    const file = await readFile(req, service.maxUploadBytes);
    const media = await service.upload(req.auth!.companyId, req.auth!.userId, file);
    res.status(201).json({ media });
  });

  if (storage instanceof LocalDiskStorage) {
    router.get(/^\/files\/(.+)$/, async (req, res) => {
      const key = (req.params as Record<string, string>)[0] ?? '';
      const opened = await storage.open(key, Number(req.query.expires), String(req.query.signature ?? ''));
      if (!opened) {
        res.status(404).json({ error: { code: 'not_found', message: 'Arquivo não encontrado.' } });
        return;
      }
      const extension = key.split('.').pop() ?? '';
      res.setHeader('Content-Type', contentTypes[extension] ?? 'application/octet-stream');
      res.setHeader('Content-Length', String(opened.size));
      res.setHeader('Cache-Control', 'private, max-age=3600');
      opened.stream.pipe(res);
    });
  }

  return router;
}
