import { useState, useCallback, useRef, useEffect } from 'react';
import type { Session, ToolCall, WSEvent } from '../types';
import { useWebSocket } from './useWebSocket';

const API = '/api';

interface SessionState {
  session: Session | null;
  toolCalls: ToolCall[];
  selectedToolCall: ToolCall | null;
  stepping: boolean;
  autoPlay: boolean;
  error: string | null;
}

export function useSession(sessionId: string) {
  const [state, setState] = useState<SessionState>({
    session: null,
    toolCalls: [],
    selectedToolCall: null,
    stepping: false,
    autoPlay: false,
    error: null,
  });

  const autoPlayRef = useRef(false);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init: fetch session + history on mount
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function init() {
      try {
        const [sessionRes, historyRes] = await Promise.all([
          fetch(`${API}/sessions/${sessionId}`),
          fetch(`${API}/sessions/${sessionId}/history`),
        ]);

        if (cancelled) return;

        if (!sessionRes.ok) {
          setState(prev => ({ ...prev, error: 'Session not found' }));
          return;
        }

        const session = await sessionRes.json() as Session;
        const toolCalls = historyRes.ok
          ? await historyRes.json() as ToolCall[]
          : [];

        setState({
          session,
          toolCalls,
          selectedToolCall: toolCalls.length > 0 ? toolCalls[toolCalls.length - 1] : null,
          stepping: false,
          autoPlay: false,
          error: null,
        });
      } catch {
        if (!cancelled) {
          setState(prev => ({ ...prev, error: 'Failed to load session' }));
        }
      }
    }

    init();

    return () => { cancelled = true; };
  }, [sessionId]);

  const handleWSEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'tool_call':
        setState(prev => {
          const existing = prev.toolCalls.findIndex(tc => tc.id === event.data.id);
          const toolCalls = existing >= 0
            ? prev.toolCalls.map((tc, i) => i === existing ? event.data : tc)
            : [...prev.toolCalls, event.data];
          return { ...prev, toolCalls };
        });
        break;
      case 'chat_message':
        setState(prev => {
          if (!prev.session) return prev;
          return {
            ...prev,
            session: {
              ...prev.session,
              chatMessages: [...prev.session.chatMessages, event.data],
            },
          };
        });
        break;
      case 'session_update':
        setState(prev => {
          if (!prev.session) return prev;
          return {
            ...prev,
            session: { ...prev.session, ...event.data },
          };
        });
        break;
    }
  }, []);

  useWebSocket(sessionId, handleWSEvent);

  const step = useCallback(async () => {
    if (!state.session) return;

    setState(prev => ({ ...prev, stepping: true }));

    try {
      const res = await fetch(`${API}/sessions/${state.session.id}/step`, {
        method: 'POST',
      });
      const data = await res.json();

      if ('done' in data) {
        setState(prev => ({
          ...prev,
          stepping: false,
          autoPlay: false,
          session: prev.session ? { ...prev.session, status: 'completed' } : null,
        }));
        autoPlayRef.current = false;
        return;
      }

      const toolCall = data as ToolCall;
      setState(prev => ({
        ...prev,
        toolCalls: [...prev.toolCalls, toolCall],
        selectedToolCall: toolCall,
        stepping: false,
        session: prev.session
          ? { ...prev.session, currentStep: prev.session.currentStep + 1 }
          : null,
      }));

      // Refresh session state from server
      const sessionRes = await fetch(`${API}/sessions/${state.session.id}`);
      const updatedSession = await sessionRes.json() as Session;
      setState(prev => ({ ...prev, session: updatedSession }));

      // Continue auto-play if active
      if (autoPlayRef.current) {
        autoPlayTimerRef.current = setTimeout(() => {
          if (autoPlayRef.current) {
            step();
          }
        }, 1500);
      }
    } catch {
      setState(prev => ({ ...prev, stepping: false, error: 'Step failed' }));
    }
  }, [state.session]);

  const sendMessage = useCallback(async (message: string) => {
    if (!state.session) return;

    try {
      await fetch(`${API}/sessions/${state.session.id}/user-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      // Refresh session
      const sessionRes = await fetch(`${API}/sessions/${state.session.id}`);
      const updatedSession = await sessionRes.json() as Session;
      setState(prev => ({ ...prev, session: updatedSession }));
    } catch {
      setState(prev => ({ ...prev, error: 'Failed to send message' }));
    }
  }, [state.session]);

  const approve = useCallback(async (toolCallId: string) => {
    if (!state.session) return;

    try {
      await fetch(`${API}/sessions/${state.session.id}/approve/${toolCallId}`, {
        method: 'POST',
      });

      setState(prev => ({
        ...prev,
        toolCalls: prev.toolCalls.map(tc =>
          tc.id === toolCallId ? { ...tc, decision: 'ALLOW' as const } : tc
        ),
      }));
    } catch {
      setState(prev => ({ ...prev, error: 'Failed to approve' }));
    }
  }, [state.session]);

  const selectToolCall = useCallback((tc: ToolCall | null) => {
    setState(prev => ({ ...prev, selectedToolCall: tc }));
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setState(prev => {
      const newAutoPlay = !prev.autoPlay;
      autoPlayRef.current = newAutoPlay;
      if (!newAutoPlay && autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      return { ...prev, autoPlay: newAutoPlay };
    });

    // Start stepping if turning on
    if (!autoPlayRef.current) {
      // Was just toggled on in setState
      setTimeout(() => {
        if (autoPlayRef.current) step();
      }, 0);
    }
  }, [step]);

  const isAgentMode = state.session?.scenarioId === 'agent';
  const isExternalMode = state.session?.scenarioId?.startsWith('external:') ?? false;
  const agentRunning = (isAgentMode || isExternalMode) && state.session?.status === 'active';

  const externalSource = isExternalMode
    ? state.session!.scenarioId.replace('external:', '')
    : null;

  return {
    ...state,
    isAgentMode,
    isExternalMode,
    externalSource,
    agentRunning,
    step,
    sendMessage,
    approve,
    selectToolCall,
    toggleAutoPlay,
  };
}
