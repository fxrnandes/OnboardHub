import { useId, type TextareaHTMLAttributes } from 'react';
import { describedByOf, FieldMessage } from './FieldMessage';

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextAreaField({ label, error, hint, ...textarea }: Readonly<TextAreaFieldProps>) {
  const id = useId();
  const describedBy = describedByOf(id, error, hint);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...textarea} />
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}
