import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TrashIcon } from '../layout/icons';

interface ConfirmButtonProps {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  title?: string;
  description?: ReactNode;
  icon?: boolean;
  triggerLabel?: string;
  className?: string;
}

const focusable = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const checkbox = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    checkbox.current?.focus();
    return () => previous?.focus?.();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialog.current) return;
    const items = Array.from(dialog.current.querySelectorAll<HTMLElement>(focusable));
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return createPortal(
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialog}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={handleKeyDown}
      >
        <span className="dialog-icon" aria-hidden="true">
          <TrashIcon />
        </span>
        <h2 id={titleId}>{title}</h2>
        {description ? (
          <p id={descriptionId} className="dialog-text">
            {description}
          </p>
        ) : null}
        <label className="dialog-check">
          <input ref={checkbox} type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          <span>Entendo que esta ação não pode ser desfeita.</span>
        </label>
        <footer className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button-danger"
            disabled={!checked}
            onClick={() => {
              onClose();
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  title,
  description,
  icon,
  triggerLabel,
  className,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className ?? (icon ? 'icon-action danger' : 'button-ghost danger')}
        aria-label={triggerLabel ?? (icon ? label : undefined)}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {icon ? <TrashIcon /> : label}
      </button>
      {open ? (
        <ConfirmDialog
          title={title ?? `${label}?`}
          description={description}
          confirmLabel={confirmLabel}
          onConfirm={onConfirm}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
