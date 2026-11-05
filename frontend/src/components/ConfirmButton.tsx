import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
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
  children,
  ready = true,
  pending = false,
  closeOnConfirm = true,
}: Readonly<{
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
  ready?: boolean;
  pending?: boolean;
  closeOnConfirm?: boolean;
}>) {
  const [checked, setChecked] = useState(false);
  const backdrop = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const node = dialog.current;
    const overlay = backdrop.current;
    if (!node || !overlay) return;

    function trapFocus(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!pending) onClose();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(focusable));
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    function closeFromOutside(event: MouseEvent) {
      if (event.target === overlay && !pending) onClose();
    }

    node.addEventListener('keydown', trapFocus);
    overlay.addEventListener('mousedown', closeFromOutside);
    return () => {
      node.removeEventListener('keydown', trapFocus);
      overlay.removeEventListener('mousedown', closeFromOutside);
    };
  }, [pending, onClose]);

  return createPortal(
    <div ref={backdrop} className="dialog-backdrop">
      <dialog
        ref={dialog}
        open
        className="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
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
        {children}
        <label className="dialog-check">
          <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          <span>Entendo que esta ação não pode ser desfeita.</span>
        </label>
        <footer className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button-danger"
            disabled={!checked || !ready || pending}
            onClick={() => {
              if (closeOnConfirm) onClose();
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </footer>
      </dialog>
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
}: Readonly<ConfirmButtonProps>) {
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
