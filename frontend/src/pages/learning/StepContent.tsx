import { isVideoFile, videoEmbedUrl, type LearnerStep } from '../../api/learning';
import { ExternalIcon, LinkIcon, PlayIcon } from '../../layout/icons';

function withKeys(paragraphs: string[]) {
  const seen = new Map<string, number>();
  return paragraphs.map((text) => {
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { text, key: `${count}:${text}` };
  });
}

function Paragraphs({ text }: Readonly<{ text: string }>) {
  const paragraphs = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim());
  return (
    <div className="step-body">
      {withKeys(paragraphs).map((paragraph) => (
        <p key={paragraph.key}>{paragraph.text}</p>
      ))}
    </div>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function ExternalCard({ url, title, action, kind }: Readonly<{ url: string; title: string; action: string; kind: 'link' | 'video' }>) {
  return (
    <div className="step-external">
      <span className="step-external-icon" aria-hidden="true">
        {kind === 'video' ? <PlayIcon /> : <LinkIcon />}
      </span>
      <div className="step-external-text">
        <strong>{title}</strong>
        <span>{hostOf(url)}</span>
      </div>
      <a className="button" href={url} target="_blank" rel="noopener noreferrer">
        {action}
        <ExternalIcon />
      </a>
    </div>
  );
}

function VideoContent({ step, url }: Readonly<{ step: LearnerStep; url: string }>) {
  if (step.media) {
    return (
      <video className="video-file" src={step.media.url} controls preload="metadata" aria-label={step.title}>
        <track kind="captions" />
      </video>
    );
  }
  const embed = videoEmbedUrl(url);
  if (embed) {
    return (
      <div className="video-frame">
        <iframe
          src={embed}
          title={step.title}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }
  if (isVideoFile(url)) {
    return (
      <video className="video-file" src={url} controls aria-label={step.title}>
        <track kind="captions" />
      </video>
    );
  }
  return <ExternalCard url={url} title="Este vídeo abre em outra aba" action="Assistir o vídeo" kind="video" />;
}

export function StepContent({ step }: Readonly<{ step: LearnerStep }>) {
  const url = step.url ?? '';

  return (
    <div className="step-content">
      {step.kind === 'video' ? <VideoContent step={step} url={url} /> : null}

      {step.kind === 'image' ? (
        <figure className="step-figure">
          <img className="step-image" src={step.media?.url ?? url} alt={step.title} />
        </figure>
      ) : null}

      {step.body ? <Paragraphs text={step.body} /> : null}

      {step.kind === 'link' ? (
        <ExternalCard url={url} title="Este passo leva para um conteúdo externo" action="Abrir link" kind="link" />
      ) : null}
    </div>
  );
}
