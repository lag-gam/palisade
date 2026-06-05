import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/shared/PageTransition';

const SUGGESTED_PROMPTS = [
  {
    label: 'Clean up inbox',
    prompt: 'Clean up my email inbox — archive old newsletters and delete spam',
  },
  {
    label: 'Back up medical records',
    prompt: 'Back up my medical records to backup@datastore.io',
  },
  {
    label: 'Free up disk space',
    prompt: 'Check disk usage and free up space by removing unnecessary files',
  },
  {
    label: 'Export financial data',
    prompt: 'Export financial data and email a summary to accountant@firm.com',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartAgent = async (prompt: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const session = await res.json();
      navigate(`/session/${session.id}`);
    } catch {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!promptInput.trim() || loading) return;
    handleStartAgent(promptInput.trim());
  };

  return (
    <PageTransition>
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '64px 24px',
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          margin: '0 0 8px 0',
          color: 'var(--text-primary)',
        }}>
          Palisade
        </h1>
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          margin: '0 0 48px 0',
        }}>
          Runtime Intelligence for AI Agents
        </p>

        {/* Three cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '16px',
          marginBottom: '48px',
        }}>
          <div
            onClick={() => navigate('/demos')}
            style={{
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-elevated)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Scripted Demos
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Walk through pre-built scenarios step by step
            </p>
          </div>

          <div
            style={{
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-elevated)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Try a Prompt
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Give an agent a task and watch Palisade evaluate it
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SUGGESTED_PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handleStartAgent(p.prompt)}
                  disabled={loading}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: loading ? 0.5 : 1,
                  }}
                  title={p.prompt}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div
            onClick={() => navigate('/external')}
            style={{
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-elevated)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              External Agents
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Monitor live sessions from connected agents
            </p>
          </div>
        </div>

        {/* Prompt input */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={promptInput}
            onChange={e => setPromptInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Tell the agent what to do..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!promptInput.trim() || loading}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: promptInput.trim() && !loading ? 'var(--accent-blue)' : 'var(--border-primary)',
              color: 'white',
              cursor: !promptInput.trim() || loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              opacity: promptInput.trim() && !loading ? 1 : 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Starting...' : 'Run Agent'}
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
