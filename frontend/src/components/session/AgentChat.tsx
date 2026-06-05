import { useState, useRef, useEffect } from 'react';
import { StatusDot } from '../shared/StatusDot';
import type { ChatMessage, SessionStatus } from '../../types';

interface AgentChatProps {
  messages: ChatMessage[];
  sessionStatus: SessionStatus | null;
  stepping: boolean;
  autoPlay: boolean;
  scenarioComplete: boolean;
  isAgentMode: boolean;
  isExternalMode: boolean;
  externalSource: string | null;
  agentRunning: boolean;
  onStep: () => void;
  onSendMessage: (message: string) => void;
  onToggleAutoPlay: () => void;
}

export function AgentChat({
  messages,
  sessionStatus,
  stepping,
  autoPlay,
  scenarioComplete,
  isAgentMode,
  isExternalMode,
  externalSource,
  agentRunning,
  onStep,
  onSendMessage,
  onToggleAutoPlay,
}: AgentChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const roleStyles: Record<string, { color: string; label: string; bg: string }> = {
    agent: { color: '#93c5fd', label: 'Agent', bg: 'rgba(59, 130, 246, 0.1)' },
    user: { color: '#a5b4fc', label: 'You', bg: 'rgba(139, 92, 246, 0.1)' },
    system: { color: '#fbbf24', label: 'System', bg: 'rgba(245, 158, 11, 0.08)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Agent Activity</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {agentRunning && (
            <StatusDot color="var(--accent-blue)" pulse />
          )}
          {sessionStatus && (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: sessionStatus === 'paused' ? 'rgba(245, 158, 11, 0.2)' :
                sessionStatus === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              color: sessionStatus === 'paused' ? '#fbbf24' :
                sessionStatus === 'completed' ? 'var(--decision-allow)' : '#93c5fd',
            }}>
              {isExternalMode && agentRunning ? 'EXTERNAL AGENT' : isAgentMode && agentRunning ? 'AGENT RUNNING' : sessionStatus.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* External agent banner */}
      {isExternalMode && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(34, 197, 94, 0.08)',
          borderBottom: '1px solid rgba(34, 197, 94, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#86efac',
        }}>
          <span style={{
            padding: '2px 6px',
            borderRadius: '3px',
            background: 'rgba(34, 197, 94, 0.2)',
            color: 'var(--decision-allow)',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}>
            {externalSource || 'external'}
          </span>
          Connected to external agent -- tool calls stream here in real-time
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {messages.length === 0 && !sessionStatus && (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '40px', fontSize: '13px' }}>
            Session loading...
          </div>
        )}
        {messages.length === 0 && sessionStatus && isExternalMode && (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '40px', fontSize: '13px' }}>
            Waiting for tool calls from external agent...
          </div>
        )}
        {messages.length === 0 && sessionStatus && !isAgentMode && !isExternalMode && (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '40px', fontSize: '13px' }}>
            Click "Next Step" to begin the scenario.
          </div>
        )}
        {messages.map((msg, i) => {
          const style = roleStyles[msg.role] || roleStyles.system;
          return (
            <div
              key={i}
              className="fade-slide-in"
              style={{
                background: style.bg,
                borderRadius: '8px',
                padding: '8px 12px',
                borderLeft: `3px solid ${style.color}`,
              }}
            >
              <div style={{ fontSize: '10px', color: style.color, fontWeight: 600, marginBottom: '4px' }}>
                {style.label}
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-primary)',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {/* External mode: stop/resume controls */}
        {isExternalMode && sessionStatus && !scenarioComplete && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder='Type "stop" to pause, "resume" to continue...'
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--border-hover)',
                color: 'white',
                cursor: !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                opacity: input.trim() ? 1 : 0.5,
              }}
            >
              Send
            </button>
          </div>
        )}

        {/* Agent mode running: stop button + message input */}
        {isAgentMode && sessionStatus && !scenarioComplete && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder='Type "stop" to pause agent...'
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--border-hover)',
                color: 'white',
                cursor: !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                opacity: input.trim() ? 1 : 0.5,
              }}
            >
              Send
            </button>
          </div>
        )}

        {/* Scripted mode: step controls */}
        {!isAgentMode && !isExternalMode && sessionStatus && (
          <>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onStep}
                disabled={stepping || scenarioComplete}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: stepping ? 'var(--border-primary)' : 'var(--accent-blue)',
                  color: 'white',
                  cursor: stepping || scenarioComplete ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: (stepping || scenarioComplete) ? 0.5 : 1,
                }}
              >
                {stepping ? 'Processing...' : scenarioComplete ? 'Complete' : 'Next Step'}
              </button>
              <button
                onClick={onToggleAutoPlay}
                disabled={scenarioComplete}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: autoPlay ? '1px solid var(--decision-review)' : '1px solid var(--border-primary)',
                  background: autoPlay ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
                  color: autoPlay ? '#fbbf24' : 'var(--text-secondary)',
                  cursor: scenarioComplete ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: scenarioComplete ? 0.5 : 1,
                }}
              >
                {autoPlay ? 'Stop Auto' : 'Auto Play'}
              </button>
            </div>

            {/* User message input for scripted mode */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder='Type "stop" to pause agent...'
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--border-hover)',
                  color: 'white',
                  cursor: !input.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  opacity: input.trim() ? 1 : 0.5,
                }}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
