export function Loader({
  label = 'Loading',
  screen = false,
  compact = false,
}: {
  label?: string;
  screen?: boolean;
  compact?: boolean;
}) {
  const className = ['afro-loader', screen ? 'afro-loader-screen' : '', compact ? 'compact' : ''].filter(Boolean).join(' ');
  return (
    <div className={className} role="status" aria-live="polite">
      {!compact && (
        <p className="afro-loader-word" aria-hidden="true">
          Afro<span>Furnishers</span>
        </p>
      )}
      <span className="afro-loader-track" aria-hidden="true"><i /></span>
      <p className="afro-loader-label">{label}</p>
    </div>
  );
}
