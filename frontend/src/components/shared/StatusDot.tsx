interface StatusDotProps {
  color?: string;
  pulse?: boolean;
  size?: number;
}

export function StatusDot({ color = 'var(--decision-allow)', pulse = false, size = 6 }: StatusDotProps) {
  return (
    <span style={{
      display: 'inline-block',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
      animation: pulse ? 'statusPulse 1.5s ease-in-out infinite' : undefined,
    }} />
  );
}
