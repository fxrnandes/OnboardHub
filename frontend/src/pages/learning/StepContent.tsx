import { isVideoFile, videoEmbedUrl, type LearnerStep } from '../../api/learning';
import { ExternalIcon, LinkIcon, PlayIcon } from '../../layout/icons';

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="step-body">
      {text
        .split(/\n{2,}/)
        .filter((paragraph) => paragraph.trim())
        .map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
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

function ExternalCard({ url, title, action, kind }: { url: string; title: string; action: string; kind: 'link' | 'video' }) {
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

export function StepContent({ step }: { step: LearnerStep }) {
  const url = step.url ?? '';

  return (
    <div className="step-content">
      {step.kind === 'video' ? (
        step.media ? (
          <video className="video-file" src={step.media.url} controls preload="metadata" aria-label={step.title} />
        ) : videoEmbedUrl(url) ? (
          <div className="video-frame">
            <iframe
              src={videoEmbedUrl(url)!}
              title={step.title}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : isVideoFile(url) ? (
          <video className="video-file" src={url} controls aria-label={step.title} />
        ) : (
          <ExternalCard url={url} title="Este vídeo abre em outra aba" action="Assistir o vídeo" kind="video" />
        )
      ) : null}

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
