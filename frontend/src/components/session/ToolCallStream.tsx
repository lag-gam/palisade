import type { ToolCall } from '../../types';
import { RiskBadge } from '../shared/RiskBadge';

interface ToolCallStreamProps {
  toolCalls: ToolCall[];
  selectedId: string | null;
  onSelect: (tc: ToolCall) => void;
}

export function ToolCallStream({ toolCalls, selectedId, onSelect }: ToolCallStreamProps) {
  const decisionColor: Record<string, string> = {
    ALLOW: 'var(--decision-allow)',
    BLOCK: 'var(--decision-block)',
    REQUIRE_APPROVAL: 'var(--decision-review)',
  };

  const decisionIcon: Record<string, string> = {
    ALLOW: '\u2713',
    BLOCK: '\u2717',
    REQUIRE_APPROVAL: '?',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-primary)',
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Tool Call Stream</h3>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {toolCalls.length} tool call{toolCalls.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        {toolCalls.length === 0 && (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '40px', fontSize: '13px' }}>
            Tool calls will appear here as the agent executes.
          </div>
        )}
        {toolCalls.map((tc) => {
          const color = decisionColor[tc.decision];
          const icon = decisionIcon[tc.decision];
          const isSelected = tc.id === selectedId;

          return (
            <div
              key={tc.id}
              className="fade-slide-in"
              onClick={() => onSelect(tc)}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: isSelected ? `2px solid ${color}` : '1px solid var(--border-primary)',
                background: isSelected ? 'rgba(255,255,255,0.03)' : 'var(--bg-elevated)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: `${color}22`,
                    color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {icon}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {tc.toolName}
                  </span>
                </div>
                <RiskBadge riskScore={tc.riskScore} decision={tc.decision} size="sm" />
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '30px' }}>
                {truncateArgs(tc.toolArgs)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function truncateArgs(args: Record<string, unknown>): string {
  const str = Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ');
  return str.length > 80 ? str.slice(0, 77) + '...' : str;
}
