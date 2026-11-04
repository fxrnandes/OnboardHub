import { useId, useState } from 'react';
import { stepKindLabels, type Step, type StepInput, type StepKind } from '../../api/trails';
import { Field } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { TextAreaField } from '../../components/TextAreaField';
import { useSubmit } from '../../components/useSubmit';
import { KindIcon } from './stepKinds';

const urlHints: Record<Exclude<StepKind, 'text'>, string> = {
  link: 'Página, documento ou sistema que a pessoa deve acessar.',
  video: 'Link do YouTube, Vimeo ou do arquivo de vídeo.',
  image: 'Endereço da imagem (PNG, JPG ou GIF).',
};

const kindHints: Record<StepKind, string> = {
  text: 'Explicação escrita',
  video: 'YouTube, Vimeo ou arquivo',
  link: 'Página ou sistema',
  image: 'Foto ou diagrama',
};

const kinds: StepKind[] = ['text', 'video', 'link', 'image'];

interface StepFormProps {
  step?: Step;
  onSave: (input: StepInput) => Promise<void>;
  onCancel: () => void;
  compact?: boolean;
}

export function StepForm({ step, onSave, onCancel, compact }: StepFormProps) {
  const kindGroup = useId();
  const [form, setForm] = useState({
    title: step?.title ?? '',
    kind: step?.kind ?? ('text' as StepKind),
    body: step?.body ?? '',
    url: step?.url ?? '',
  });

  const submit = useSubmit(async () => {
    const isText = form.kind === 'text';
    await onSave({
      title: form.title,
      kind: form.kind,
      body: form.body.trim() ? form.body : null,
      url: isText ? null : form.url.trim() || null,
    });
  });

  return (
    <form className={compact ? 'step-form is-compact' : 'step-form'} onSubmit={submit.onSubmit} noValidate>
      <FormAlert message={submit.formError} />
      <Field
        label="Título do passo"
        placeholder="Ex.: Conheça a equipe"
        value={form.title}
        onChange={(event) => setForm({ ...form, title: event.target.value })}
        error={submit.fieldError('title')}
        autoFocus
      />
      <div className="field">
        <span id={kindGroup} className="field-label">
          Tipo
        </span>
        <div role="radiogroup" aria-labelledby={kindGroup} className="kind-picker">
          {kinds.map((kind) => (
            <label key={kind} className={form.kind === kind ? 'kind-option is-selected' : 'kind-option'}>
              <input
                type="radio"
                name={`${kindGroup}-kind`}
                value={kind}
                checked={form.kind === kind}
                onChange={() => setForm({ ...form, kind })}
              />
              <span className="kind-option-icon" aria-hidden="true">
                <KindIcon kind={kind} />
              </span>
              <span className="kind-option-text">
                <strong>{stepKindLabels[kind]}</strong>
                <span aria-hidden="true">{kindHints[kind]}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      {form.kind !== 'text' ? (
        <Field
          label="URL"
          type="url"
          placeholder="https://"
          hint={urlHints[form.kind]}
          value={form.url}
          onChange={(event) => setForm({ ...form, url: event.target.value })}
          error={submit.fieldError('url')}
        />
      ) : null}
      <TextAreaField
        label={form.kind === 'text' ? 'Conteúdo' : 'Explicação (opcional)'}
        rows={form.kind === 'text' ? 7 : 3}
        placeholder={form.kind === 'text' ? 'Escreva o conteúdo do passo. Deixe uma linha em branco entre parágrafos.' : 'Contexto para quem vai abrir este passo.'}
        value={form.body}
        onChange={(event) => setForm({ ...form, body: event.target.value })}
        error={submit.fieldError('body')}
      />
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="button" disabled={submit.pending}>
          {step ? 'Salvar passo' : 'Adicionar passo'}
        </button>
      </div>
    </form>
  );
}
