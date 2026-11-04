import type { Queryable } from '../../db/pool.js';
import type { MediaKind } from './media.types.js';

export interface MediaRow {
  id: string;
  kind: MediaKind;
  storage_key: string;
  content_type: string;
  size_bytes: string;
  original_name: string;
}

export interface NewMedia {
  id: string;
  companyId: string;
  createdBy: string;
  kind: MediaKind;
  storageKey: string;
  contentType: string;
  size: number;
  name: string;
}

const columns = 'id, kind, storage_key, content_type, size_bytes, original_name';

export class MediaRepository {
  constructor(private readonly db: Queryable) {}

  async insert(media: NewMedia): Promise<MediaRow> {
    const { rows } = await this.db.query<MediaRow>(
      `insert into media (id, company_id, created_by, kind, storage_key, content_type, size_bytes, original_name)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning ${columns}`,
      [media.id, media.companyId, media.createdBy, media.kind, media.storageKey, media.contentType, media.size, media.name],
    );
    return rows[0]!;
  }

  async find(companyId: string, id: string): Promise<MediaRow | null> {
    const { rows } = await this.db.query<MediaRow>(`select ${columns} from media where company_id = $1 and id = $2`, [
      companyId,
      id,
    ]);
    return rows[0] ?? null;
  }

  async findMany(companyId: string, ids: string[]): Promise<MediaRow[]> {
    if (!ids.length) return [];
    const { rows } = await this.db.query<MediaRow>(
      `select ${columns} from media where company_id = $1 and id = any($2::uuid[])`,
      [companyId, ids],
    );
    return rows;
  }

  async usedBytes(companyId: string): Promise<number> {
    const { rows } = await this.db.query<{ total: string }>(
      'select coalesce(sum(size_bytes), 0)::text as total from media where company_id = $1',
      [companyId],
    );
    return Number(rows[0]!.total);
  }

  async deleteIfUnused(companyId: string, id: string): Promise<string | null> {
    const { rows } = await this.db.query<{ storage_key: string }>(
      `delete from media m where m.company_id = $1 and m.id = $2
         and not exists (select 1 from trail_steps s where s.media_id = m.id)
       returning m.storage_key`,
      [companyId, id],
    );
    return rows[0]?.storage_key ?? null;
  }

  async deleteStale(companyId: string, olderThanHours: number): Promise<string[]> {
    const { rows } = await this.db.query<{ storage_key: string }>(
      `delete from media m where m.company_id = $1
         and m.created_at < now() - make_interval(hours => $2)
         and not exists (select 1 from trail_steps s where s.media_id = m.id)
       returning m.storage_key`,
      [companyId, olderThanHours],
    );
    return rows.map((row) => row.storage_key);
  }
}
