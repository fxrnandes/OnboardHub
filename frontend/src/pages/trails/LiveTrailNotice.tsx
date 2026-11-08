import { useCallback } from 'react';
import { trailsApi, type TrailAudience } from '../../api/trails';
import { useResource } from '../../components/useResource';
import { UsersIcon } from '../../layout/icons';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function audienceMessage({ people, started }: TrailAudience) {
  if (people === 0) return 'Publicada, mas ninguém tem os cargos marcados ainda.';
  const reach = `Publicada para ${plural(people, 'pessoa', 'pessoas')}`;
  const progress = started ? ` (${plural(started, 'já começou', 'já começaram')})` : '';
  return `${reach}${progress}. As mudanças aparecem na hora para quem está fazendo.`;
}

export function LiveTrailNotice({ trailId }: Readonly<{ trailId: string }>) {
  const load = useCallback(() => trailsApi.audience(trailId), [trailId]);
  const audience = useResource(load);
  if (!audience.data) return null;
  return (
    <output className="live-notice">
      <UsersIcon />
      {audienceMessage(audience.data)}
    </output>
  );
}
