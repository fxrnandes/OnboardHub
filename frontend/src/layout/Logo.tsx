function SymbolPaths() {
  return (
    <>
      <circle className="logo-line" cx="8.6" cy="23.4" r="3" />
      <path className="logo-line" d="M11.6 23.4C14.6 23.4 16 21.9 16 18.9V13.6C16 10.6 17.4 9.1 19.6 9" />
      <circle className="logo-goal" cx="23.4" cy="8.9" r="4.9" />
      <path className="logo-check" d="M21.2 9.1l1.6 1.5 2.8-3" />
    </>
  );
}

export function LogoSymbol() {
  return (
    <svg className="logo-symbol" viewBox="0 0 32 32" aria-hidden="true">
      <SymbolPaths />
    </svg>
  );
}

export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" />
      <g transform="translate(16 16) scale(0.74) translate(-16 -16)">
        <SymbolPaths />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoSymbol />
      OnboardHub
    </span>
  );
}
