import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  action?: ReactNode;
  trailing?: ReactNode;
}

export function Field({ label, error, hint, action, trailing, ...input }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const labelElement = <label htmlFor={id}>{label}</label>;
  const inputElement = <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />;

  return (
    <div className="field">
      {action ? (
        <div className="field-label-row">
          {labelElement}
          {action}
        </div>
      ) : (
        labelElement
      )}
      {trailing ? (
        <div className="field-control">
          {inputElement}
          {trailing}
        </div>
      ) : (
        inputElement
      )}
      {error ? (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
