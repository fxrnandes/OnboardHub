export function describedByOf(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function FieldMessage({ id, error, hint }: Readonly<{ id: string; error?: string; hint?: string }>) {
  if (error) {
    return (
      <span id={`${id}-error`} className="field-error">
        {error}
      </span>
    );
  }
  if (hint) {
    return (
      <span id={`${id}-hint`} className="field-hint">
        {hint}
      </span>
    );
  }
  return null;
}
