import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
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

export function MediaPicker({ kind, value, onChange, onBusyChange, error }: MediaPickerProps) {
  const inputId = useId();
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);
  const cancelUpload = useRef<(() => void) | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
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
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.code === 'upload_canceled')) {
        setProblem(caught instanceof ApiError ? caught.message : 'Não foi possível enviar o arquivo.');
      }
    } finally {
      cancelUpload.current = null;
      setUploading(null);
      setProgress(null);
      onBusyChange?.(false);
      if (input.current) input.current.value = '';
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !uploading) void send(file);
  }

  const message = problem ?? error;

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

      {uploading ? (
        <div className="media-uploading" role="status">
          <span className="media-thumb is-icon" aria-hidden="true">
            <UploadIcon />
          </span>
          <div className="media-info">
            <strong>{uploading}</strong>
            <div className="progress" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progress ?? 0}%` }} />
            </div>
            <span>Enviando… {progress ?? 0}%</span>
          </div>
          <button type="button" className="button button-secondary button-sm" onClick={() => cancelUpload.current?.()}>
            Cancelar envio
          </button>
        </div>
      ) : value ? (
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
            <span>
              {formatBytes(value.size)} · enviado
            </span>
          </div>
          <label htmlFor={inputId} className="button button-secondary button-sm media-replace">
            Trocar arquivo
          </label>
          <button type="button" className="icon-action danger" aria-label="Remover arquivo" onClick={() => onChange(null)}>
            <TrashIcon />
          </button>
        </div>
      ) : (
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
          <span>{rule.label}</span>
        </label>
      )}

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
