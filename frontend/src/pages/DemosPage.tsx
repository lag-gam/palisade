import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/shared/PageTransition';
import type { ScenarioSummary } from '../types';

const SCENARIO_LABELS: Record<string, string> = {
  'inbox-cleanup': 'Mail',
  'medical-records': 'Health',
  'disk-cleanup': 'Storage',
  'financial-export': 'Finance',
  'code-review': 'Code',
  'data-migration': 'Data',
};

function getScenarioLabel(id: string): string {
  return SCENARIO_LABELS[id] || id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function DemosPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/scenarios');
        const data = await res.json() as ScenarioSummary[];
        setScenarios(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSelect = async (scenarioId: string) => {
    setCreating(scenarioId);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });
      const session = await res.json();
      navigate(`/session/${session.id}`);
    } catch {
      setCreating(null);
    }
  };

  return (
    <PageTransition>
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '64px 24px',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          margin: '0 0 8px 0',
          color: 'var(--text-primary)',
        }}>
          Scripted Demos
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          margin: '0 0 32px 0',
        }}>
          Pre-built scenarios that demonstrate Palisade's decision engine
        </p>

        {loading && (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
            Loading scenarios...
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}>
          {scenarios.map(s => (
            <div
              key={s.id}
              onClick={() => !creating && handleSelect(s.id)}
              style={{
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-elevated)',
                cursor: creating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: creating && creating !== s.id ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!creating) e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {getScenarioLabel(s.id)}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {s.stepCount} steps
                </span>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {s.name}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {s.description}
              </p>
              {creating === s.id && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent-blue)' }}>
                  Creating session...
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
