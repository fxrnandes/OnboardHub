import { useState } from 'react';
import { stepKindLabels, type Step, type StepInput, type StepKind } from '../../api/trails';
import { Field } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { SelectField } from '../../components/SelectField';
import { TextAreaField } from '../../components/TextAreaField';
import { useSubmit } from '../../components/useSubmit';

const urlHints: Record<Exclude<StepKind, 'text'>, string> = {
  link: 'Página, documento ou sistema que a pessoa deve acessar.',
  video: 'Link do YouTube, Vimeo ou do arquivo de vídeo.',
  image: 'Endereço da imagem (PNG, JPG ou GIF).',
};

interface StepFormProps {
  step?: Step;
  onSave: (input: StepInput) => Promise<void>;
  onCancel: () => void;
}

export function StepForm({ step, onSave, onCancel }: StepFormProps) {
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
    <form className="step-form" onSubmit={submit.onSubmit} noValidate>
      <FormAlert message={submit.formError} />
      <div className="step-form-row">
        <Field
          label="Título do passo"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          error={submit.fieldError('title')}
          autoFocus
        />
        <SelectField
          label="Tipo"
          value={form.kind}
          onChange={(event) => setForm({ ...form, kind: event.target.value as StepKind })}
          options={(Object.keys(stepKindLabels) as StepKind[]).map((kind) => ({ value: kind, label: stepKindLabels[kind] }))}
        />
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
        rows={form.kind === 'text' ? 6 : 3}
        value={form.body}
        onChange={(event) => setForm({ ...form, body: event.target.value })}
        error={submit.fieldError('body')}
      />
      <div className="form-actions">
        <button type="submit" className="button" disabled={submit.pending}>
          {step ? 'Salvar passo' : 'Adicionar passo'}
        </button>
        <button type="button" className="button button-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
