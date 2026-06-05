import type { Decision } from '../../types';

interface RiskBadgeProps {
  riskScore: number;
  decision: Decision;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskBadge({ riskScore, decision, size = 'md' }: RiskBadgeProps) {
  const colorMap: Record<Decision, string> = {
    ALLOW: 'var(--decision-allow)',
    BLOCK: 'var(--decision-block)',
    REQUIRE_APPROVAL: 'var(--decision-review)',
  };

  const bgMap: Record<Decision, string> = {
    ALLOW: 'rgba(34, 197, 94, 0.15)',
    BLOCK: 'rgba(239, 68, 68, 0.15)',
    REQUIRE_APPROVAL: 'rgba(245, 158, 11, 0.15)',
  };

  const sizeMap = {
    sm: { fontSize: '11px', padding: '2px 6px' },
    md: { fontSize: '13px', padding: '3px 10px' },
    lg: { fontSize: '16px', padding: '5px 14px' },
  };

  const color = colorMap[decision];
  const bg = bgMap[decision];
  const sizing = sizeMap[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: bg,
        color,
        border: `1px solid ${color}`,
        borderRadius: '9999px',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        ...sizing,
      }}
    >
      <span>{riskScore}</span>
      <span style={{ fontSize: '0.85em', opacity: 0.8 }}>
        {decision === 'ALLOW' ? 'PASS' : decision === 'BLOCK' ? 'BLOCK' : 'REVIEW'}
      </span>
    </span>
  );
}
