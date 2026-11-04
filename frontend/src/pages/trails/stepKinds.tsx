import type { Step, StepKind } from '../../api/trails';
import { ImageIcon, LinkIcon, PlayIcon, TextIcon } from '../../layout/icons';

const kindIcons = { text: TextIcon, link: LinkIcon, video: PlayIcon, image: ImageIcon };

export function KindIcon({ kind }: { kind: StepKind }) {
  const Icon = kindIcons[kind];
  return <Icon />;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function stepDetail(step: Step) {
  if (step.kind !== 'text' && step.url) return hostOf(step.url);
  const text = (step.body ?? '').replace(/\s+/g, ' ').trim();
  return text.length > 110 ? `${text.slice(0, 110)}…` : text;
}
