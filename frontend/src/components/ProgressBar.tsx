export function ProgressBar({ percent, label }: Readonly<{ percent: number; label: string }>) {
  return (
    <>
      <progress className="visually-hidden" value={percent} max={100} aria-label={label} />
      <div className="progress" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </>
  );
}
