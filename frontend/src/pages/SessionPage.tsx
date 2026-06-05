import { useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { SessionLayout } from '../components/session/SessionLayout';
import { AgentChat } from '../components/session/AgentChat';
import { ToolCallStream } from '../components/session/ToolCallStream';
import { DecisionDetail } from '../components/session/DecisionDetail';

export function SessionPage() {
  const { id } = useParams<{ id: string }>();

  const {
    session,
    toolCalls,
    selectedToolCall,
    stepping,
    autoPlay,
    error,
    isAgentMode,
    isExternalMode,
    externalSource,
    agentRunning,
    step,
    sendMessage,
    approve,
    selectToolCall,
    toggleAutoPlay,
  } = useSession(id!);

  const scenarioComplete = session?.status === 'completed';

  return (
    <div>
      {error && (
        <div style={{
          padding: '8px 24px',
          fontSize: '12px',
          color: 'var(--decision-block)',
          background: 'rgba(239, 68, 68, 0.08)',
          borderBottom: '1px solid var(--border-primary)',
        }}>
          {error}
        </div>
      )}
      <SessionLayout
        left={
          <AgentChat
            messages={session?.chatMessages ?? []}
            sessionStatus={session?.status ?? null}
            stepping={stepping}
            autoPlay={autoPlay}
            scenarioComplete={scenarioComplete ?? false}
            isAgentMode={isAgentMode}
            isExternalMode={isExternalMode}
            externalSource={externalSource}
            agentRunning={agentRunning}
            onStep={step}
            onSendMessage={sendMessage}
            onToggleAutoPlay={toggleAutoPlay}
          />
        }
        middle={
          <ToolCallStream
            toolCalls={toolCalls}
            selectedId={selectedToolCall?.id ?? null}
            onSelect={selectToolCall}
          />
        }
        right={
          <DecisionDetail
            toolCall={selectedToolCall}
            session={session}
            onApprove={approve}
          />
        }
      />
    </div>
  );
}
