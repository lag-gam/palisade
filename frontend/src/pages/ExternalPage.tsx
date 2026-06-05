import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/shared/PageTransition';
import { StatusDot } from '../components/shared/StatusDot';
import type { ExternalSession } from '../types';

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function ExternalPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ExternalSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/sessions?source=external');
        const data = await res.json() as ExternalSession[];
        setSessions(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeSessions = sessions.filter(s => s.status === 'active');
  const completedSessions = sessions.filter(s => s.status !== 'active');

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
          External Agents
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          margin: '0 0 32px 0',
        }}>
          Sessions from agents connected via the Palisade MCP plugin
        </p>

        {loading && (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
            Loading sessions...
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div style={{
            padding: '32px',
            borderRadius: '16px',
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-elevated)',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              No external sessions found
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Connect an agent using the Palisade MCP plugin to see sessions here
            </p>
          </div>
        )}

        {/* Active sessions */}
        {activeSessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <StatusDot color="var(--decision-allow)" pulse />
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Active ({activeSessions.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeSessions.map(s => {
                const source = s.scenarioId.replace('external:', '');
                return (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/session/${s.id}`)}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-primary)',
                      background: 'var(--bg-elevated)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <StatusDot color="var(--decision-allow)" pulse />
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: 'var(--decision-allow)',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {source}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {s.toolCallCount} tool call{s.toolCallCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatTimeAgo(s.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed sessions */}
        {completedSessions.length > 0 && (
          <div>
            <div style={{
              marginBottom: '12px',
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Completed ({completedSessions.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {completedSessions.map(s => {
                const source = s.scenarioId.replace('external:', '');
                return (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/session/${s.id}`)}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-primary)',
                      background: 'var(--bg-elevated)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: 0.7,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <StatusDot color="var(--text-muted)" />
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {source}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {s.toolCallCount} tool call{s.toolCallCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatTimeAgo(s.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
