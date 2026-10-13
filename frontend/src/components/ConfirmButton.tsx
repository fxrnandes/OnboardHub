import { useState } from 'react';

interface ConfirmButtonProps {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}

export function ConfirmButton({ label, confirmLabel, onConfirm, disabled }: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" className="button-ghost danger" onClick={() => setAsking(true)} disabled={disabled}>
        {label}
      </button>
    );
  }

  return (
    <span className="confirm-group">
      <button
        type="button"
        className="button-ghost danger strong"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="button-ghost" onClick={() => setAsking(false)}>
        Cancelar
      </button>
    </span>
  );
}
