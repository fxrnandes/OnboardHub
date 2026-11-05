import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { ApiError } from '../../api/client';
import { checkFile, formatBytes, mediaRules, uploadMedia, type MediaKind, type StepMedia } from '../../api/media';
import { ImageIcon, PlayIcon, TrashIcon, UploadIcon } from '../../layout/icons';

interface MediaPickerProps {
  kind: MediaKind;
  value: StepMedia | null;
  onChange: (media: StepMedia | null) => void;
  onBusyChange?: (busy: boolean) => void;
  error?: string;
}

function UploadingCard({ name, progress, onCancel }: Readonly<{ name: string; progress: number; onCancel: () => void }>) {
  return (
    <output className="media-uploading">
      <span className="media-thumb is-icon" aria-hidden="true">
        <UploadIcon />
      </span>
      <div className="media-info">
        <strong>{name}</strong>
        <div className="progress" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span>Enviando… {progress}%</span>
      </div>
      <button type="button" className="button button-secondary button-sm" onClick={onCancel}>
        Cancelar envio
      </button>
    </output>
  );
}

function SelectedMedia({ value, inputId, onRemove }: Readonly<{ value: StepMedia; inputId: string; onRemove: () => void }>) {
  return (
    <div className="media-selected">
      {value.kind === 'image' ? (
        <img className="media-thumb" src={value.url} alt="" />
      ) : (
        <span className="media-thumb is-icon" aria-hidden="true">
          <PlayIcon />
        </span>
      )}
      <div className="media-info">
        <strong>{value.name}</strong>
        <span>{formatBytes(value.size)} · enviado</span>
      </div>
      <label htmlFor={inputId} className="button button-secondary button-sm media-replace">
        Trocar arquivo
      </label>
      <button type="button" className="icon-action danger" aria-label="Remover arquivo" onClick={onRemove}>
        <TrashIcon />
      </button>
    </div>
  );
}

function DropZone({ kind, inputId, label, onFile }: Readonly<{ kind: MediaKind; inputId: string; label: string; onFile: (file: File) => void }>) {
  const [dragging, setDragging] = useState(false);

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <label
      htmlFor={inputId}
      className={dragging ? 'media-drop is-dragging' : 'media-drop'}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <span className="media-drop-icon" aria-hidden="true">
        {kind === 'image' ? <ImageIcon /> : <PlayIcon />}
      </span>
      <strong>Arraste {kind === 'image' ? 'a imagem' : 'o vídeo'} aqui ou clique para escolher</strong>
      <span>{label}</span>
    </label>
  );
}

export function MediaPicker({ kind, value, onChange, onBusyChange, error }: Readonly<MediaPickerProps>) {
  const inputId = useId();
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);
  const cancelUpload = useRef<(() => void) | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const rule = mediaRules[kind];

  useEffect(() => () => cancelUpload.current?.(), []);

  async function send(file: File) {
    const invalid = checkFile(file, kind);
    if (invalid) {
      setProblem(invalid);
      return;
    }
    setProblem(null);
    setUploading(file.name);
    setProgress(0);
    onBusyChange?.(true);
    const { promise, cancel } = uploadMedia(file, setProgress);
    cancelUpload.current = cancel;
    try {
      onChange(await promise);
    } catch (requestError) {
      if (!(requestError instanceof ApiError && requestError.code === 'upload_canceled')) {
        setProblem(requestError instanceof ApiError ? requestError.message : 'Não foi possível enviar o arquivo.');
      }
    } finally {
      cancelUpload.current = null;
      setUploading(null);
      setProgress(null);
      onBusyChange?.(false);
      if (input.current) input.current.value = '';
    }
  }

  const message = problem ?? error;

  let body: ReactNode;
  if (uploading) {
    body = <UploadingCard name={uploading} progress={progress ?? 0} onCancel={() => cancelUpload.current?.()} />;
  } else if (value) {
    body = <SelectedMedia value={value} inputId={inputId} onRemove={() => onChange(null)} />;
  } else {
    body = <DropZone kind={kind} inputId={inputId} label={rule.label} onFile={(file) => void send(file)} />;
  }

  return (
    <div className="field media-picker">
      <span className="field-label">{kind === 'image' ? 'Imagem' : 'Vídeo'}</span>
      <input
        ref={input}
        id={inputId}
        className="visually-hidden"
        type="file"
        accept={rule.accept}
        aria-label="Arquivo"
        aria-describedby={hintId}
        aria-invalid={message ? true : undefined}
        disabled={Boolean(uploading)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void send(file);
        }}
      />

      {body}

      <span id={hintId} className="visually-hidden">
        {rule.label}
      </span>
      {message ? (
        <span className="field-error media-error" role="alert">
          {message}
        </span>
      ) : null}
    </div>
  );
}
