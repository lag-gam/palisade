import type { ToolCall, Session } from '../../types';
import { RiskBadge } from '../shared/RiskBadge';

interface DecisionDetailProps {
  toolCall: ToolCall | null;
  session: Session | null;
  onApprove?: (toolCallId: string) => void;
}

export function DecisionDetail({ toolCall, session, onApprove }: DecisionDetailProps) {
  if (!toolCall) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-primary)',
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Decision Detail</h3>
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
          fontSize: '13px',
        }}>
          Click a tool call to see details.
        </div>
      </div>
    );
  }

  const decisionBanner = {
    ALLOW: { bg: 'rgba(34, 197, 94, 0.1)', border: 'var(--decision-allow)', label: 'ALLOWED', icon: '\u2713' },
    BLOCK: { bg: 'rgba(239, 68, 68, 0.1)', border: 'var(--decision-block)', label: 'BLOCKED', icon: '\u2717' },
    REQUIRE_APPROVAL: { bg: 'rgba(245, 158, 11, 0.1)', border: 'var(--decision-review)', label: 'NEEDS APPROVAL', icon: '!' },
  };

  const banner = decisionBanner[toolCall.decision];
  const firedRules = toolCall.triggeredRules.filter(r => r.fired);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-primary)',
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Decision Detail</h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Decision Banner */}
        <div style={{
          padding: '12px',
          borderRadius: '10px',
          background: banner.bg,
          borderLeft: `4px solid ${banner.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: banner.border }}>
              {banner.icon} {banner.label}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {toolCall.toolName} (Step {toolCall.stepIndex + 1})
            </div>
          </div>
          <RiskBadge riskScore={toolCall.riskScore} decision={toolCall.decision} size="lg" />
        </div>

        {/* Explanation */}
        <Section title="Explanation">
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
            {toolCall.explanation}
          </p>
        </Section>

        {/* Triggered Rules */}
        <Section title={`Triggered Rules (${firedRules.length})`}>
          {firedRules.length === 0 ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>No rules fired</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {firedRules.map(rule => (
                <div
                  key={rule.ruleName}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {rule.ruleName}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: rule.riskContribution > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: rule.riskContribution > 0 ? '#fca5a5' : 'var(--text-tertiary)',
                    }}>
                      +{rule.riskContribution}
                    </span>
                  </div>
                  {rule.reason && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {rule.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Tool Arguments */}
        <Section title="Tool Arguments">
          <pre style={{
            margin: 0,
            padding: '10px',
            borderRadius: '10px',
            background: 'var(--bg-primary)',
            color: '#c9d1d9',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            border: '1px solid var(--border-primary)',
          }}>
            {JSON.stringify(toolCall.toolArgs, null, 2)}
          </pre>
        </Section>

        {/* Result (if ALLOW) */}
        {toolCall.result && (
          <Section title="Execution Result">
            <pre style={{
              margin: 0,
              padding: '10px',
              borderRadius: '10px',
              background: 'var(--bg-primary)',
              color: '#7ee787',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '200px',
              border: '1px solid var(--border-primary)',
            }}>
              {toolCall.result}
            </pre>
          </Section>
        )}

        {/* Session Context */}
        {session && (
          <Section title="Session Context">
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>Session status: <span style={{ color: 'var(--text-primary)' }}>{session.status}</span></div>
              <div>Steps completed: <span style={{ color: 'var(--text-primary)' }}>{session.currentStep}</span></div>
              <div>Sensitive files accessed: <span style={{ color: 'var(--text-primary)' }}>
                {session.sensitiveFilesAccessed.length > 0
                  ? session.sensitiveFilesAccessed.join(', ')
                  : 'None'}
              </span></div>
              <div>Approvals granted: <span style={{ color: 'var(--text-primary)' }}>{session.approvalsGranted.length}</span></div>
            </div>
          </Section>
        )}

        {/* Approve button for REQUIRE_APPROVAL */}
        {toolCall.decision === 'REQUIRE_APPROVAL' && onApprove && (
          <button
            onClick={() => onApprove(toolCall.id)}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid var(--decision-review)',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Approve This Action
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}
