import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { describedByOf, FieldMessage } from './FieldMessage';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  action?: ReactNode;
  trailing?: ReactNode;
}

export function Field({ label, error, hint, action, trailing, 'aria-invalid': invalid, ...input }: Readonly<FieldProps>) {
  const id = useId();
  const describedBy = describedByOf(id, error, hint);
  const labelElement = <label htmlFor={id}>{label}</label>;
  const inputElement = <input id={id} aria-invalid={error ? true : invalid} aria-describedby={describedBy} {...input} />;

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
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}
