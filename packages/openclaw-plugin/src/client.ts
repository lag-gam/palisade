// PalisadeClient — HTTP client wrapping Palisade's worker API

import type { PolicyResult, Session, ApprovalStatus } from './types';

export class PalisadeClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      h['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  /**
   * Create a new Palisade session for an external agent.
   */
  async createSession(source: string): Promise<Session> {
    const res = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ source }),
    });

    if (!res.ok) {
      throw new Error(`Palisade: failed to create session (${res.status}): ${await res.text()}`);
    }

    return res.json() as Promise<Session>;
  }

  /**
   * Evaluate a tool call against Palisade's policy engine.
   * Returns the policy decision with risk score and triggered rules.
   */
  async evaluate(
    sessionId: string,
    toolName: string,
    toolArgs: Record<string, unknown>,
    agentReasoning: string,
    stepIndex: number,
  ): Promise<PolicyResult> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/evaluate`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ toolName, toolArgs, agentReasoning, stepIndex }),
    });

    if (!res.ok) {
      throw new Error(`Palisade: policy evaluation failed (${res.status}): ${await res.text()}`);
    }

    return res.json() as Promise<PolicyResult>;
  }

  /**
   * Poll the approval status of a tool call that requires human approval.
   */
  async checkApprovalStatus(sessionId: string, toolCallId: string): Promise<ApprovalStatus> {
    const res = await fetch(
      `${this.baseUrl}/api/sessions/${sessionId}/approval-status/${toolCallId}`,
      { headers: this.headers() },
    );

    if (!res.ok) {
      throw new Error(`Palisade: approval status check failed (${res.status})`);
    }

    const data = await res.json() as { status: ApprovalStatus };
    return data.status;
  }

  /**
   * Report the result of a tool execution back to Palisade.
   */
  async reportToolResult(sessionId: string, toolCallId: string, result: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/tool-result`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ toolCallId, result }),
    });

    if (!res.ok) {
      throw new Error(`Palisade: failed to report tool result (${res.status})`);
    }
  }

  /**
   * Send an agent message (reasoning, status update) to the Palisade dashboard.
   */
  async sendAgentMessage(
    sessionId: string,
    role: 'agent' | 'user' | 'system',
    content: string,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/agent-message`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ role, content }),
    });

    if (!res.ok) {
      throw new Error(`Palisade: failed to send agent message (${res.status})`);
    }
  }

  /**
   * Fetch the full session state (needed for polling completion and extracting replies).
   */
  async getSession(sessionId: string): Promise<Session> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new Error(`Palisade: failed to get session (${res.status}): ${await res.text()}`);
    }

    return res.json() as Promise<Session>;
  }

  /**
   * Fire-and-forget trigger for the agent-server's /run endpoint.
   * The agent-server will run its own Claude loop with policy enforcement.
   */
  async triggerAgentRun(
    agentServerUrl: string,
    sessionId: string,
    prompt: string,
    demoMode?: boolean,
  ): Promise<void> {
    const url = agentServerUrl.replace(/\/+$/, '');
    const res = await fetch(`${url}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        prompt,
        workerUrl: this.baseUrl,
        demoMode: demoMode ?? false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Palisade: failed to trigger agent run (${res.status}): ${await res.text()}`);
    }
  }

  /**
   * Mark the session as complete.
   */
  async markDone(sessionId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/agent-done`, {
      method: 'POST',
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new Error(`Palisade: failed to mark session done (${res.status})`);
    }
  }
}
