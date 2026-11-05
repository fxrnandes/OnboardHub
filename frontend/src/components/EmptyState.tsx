import type { ReactNode } from 'react';

export function EmptyState({ title, children }: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
