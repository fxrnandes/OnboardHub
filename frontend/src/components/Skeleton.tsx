import type { CSSProperties, ReactNode } from 'react';
import { LogoMark } from '../layout/Logo';

export function Bone({ w, h = 12, r, className }: Readonly<{ w?: number | string; h?: number; r?: number; className?: string }>) {
  const style: CSSProperties = { width: w ?? '100%', height: h, borderRadius: r ?? Math.min(8, h / 2) };
  return <span className={className ? `bone ${className}` : 'bone'} style={style} />;
}

export function Loading({ label, children, className }: Readonly<{ label: string; children: ReactNode; className?: string }>) {
  return (
    <div className={className ? `skeleton ${className}` : 'skeleton'} role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function HeaderBones({ action }: Readonly<{ action?: boolean }>) {
  return (
    <div className="sk-head">
      <div>
        <Bone w={220} h={30} r={8} />
        <Bone w={380} h={13} className="sk-gap-sm" />
      </div>
      {action ? <Bone w={150} h={44} r={12} /> : null}
    </div>
  );
}

export function RowBones({ rows = 4, icon = 48 }: Readonly<{ rows?: number; icon?: number }>) {
  return (
    <div className="sk-card sk-rows">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="sk-row">
          <Bone w={icon} h={icon} r={14} />
          <div className="sk-row-text">
            <Bone w={`${52 - (index % 3) * 8}%`} h={14} />
            <Bone w={`${78 - (index % 2) * 12}%`} h={11} />
          </div>
          <div className="sk-row-side">
            <Bone h={8} r={4} />
            <Bone w={90} h={10} />
          </div>
          <Bone w={130} h={40} r={11} />
        </div>
      ))}
    </div>
  );
}

export function TableBones({ rows = 6 }: Readonly<{ rows?: number }>) {
  return (
    <div className="sk-card sk-table">
      <div className="sk-table-head">
        <Bone w={90} h={10} />
        <Bone w={60} h={10} />
        <Bone w={60} h={10} />
        <Bone w={80} h={10} />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="sk-table-row">
          <div className="sk-person">
            <Bone w={36} h={36} r={10} />
            <div className="sk-row-text">
              <Bone w={`${60 - (index % 3) * 10}%`} h={13} />
              <Bone w="80%" h={10} />
            </div>
          </div>
          <Bone w={150} h={32} r={9} />
          <Bone w={150} h={32} r={9} />
          <Bone w={100} h={12} />
        </div>
      ))}
    </div>
  );
}

export function AppSplash() {
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <span className="app-splash-mark" aria-hidden="true">
        <LogoMark />
      </span>
      <span className="visually-hidden">Carregando…</span>
    </div>
  );
}
