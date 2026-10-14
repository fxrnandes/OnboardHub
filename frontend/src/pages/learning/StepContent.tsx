import { isVideoFile, videoEmbedUrl, type LearnerStep } from '../../api/learning';

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

export function StepContent({ step }: { step: LearnerStep }) {
  const url = step.url ?? '';

  return (
    <div className="step-content">
      {step.kind === 'video' ? (
        videoEmbedUrl(url) ? (
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
          <a className="button" href={url} target="_blank" rel="noopener noreferrer">
            Assistir o vídeo
          </a>
        )
      ) : null}

      {step.kind === 'image' ? <img className="step-image" src={url} alt={step.title} /> : null}

      {step.body ? <Paragraphs text={step.body} /> : null}

      {step.kind === 'link' ? (
        <a className="button" href={url} target="_blank" rel="noopener noreferrer">
          Abrir link
        </a>
      ) : null}
    </div>
  );
}
