/**
 * Palisade API client — evaluates tool calls against the policy engine
 * and manages sessions, approvals, and result reporting.
 */

export type Decision = 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';

export interface RuleResult {
  ruleName: string;
  fired: boolean;
  riskContribution: number;
  reason: string;
}

export interface PolicyResult {
  decision: Decision;
  riskScore: number;
  triggeredRules: RuleResult[];
  explanation: string;
  toolCallId: string;
}

export interface Session {
  id: string;
  scenarioId: string;
  status: 'active' | 'paused' | 'completed';
  currentStep: number;
  createdAt: string;
}

export class PalisadeClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  async createSession(source: string): Promise<Session> {
    const res = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ source }),
    });
    if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
    return res.json() as Promise<Session>;
  }

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
    if (!res.ok) throw new Error(`Policy evaluation failed: ${res.status}`);
    return res.json() as Promise<PolicyResult>;
  }

  async checkApprovalStatus(sessionId: string, toolCallId: string): Promise<string> {
    const res = await fetch(
      `${this.baseUrl}/api/sessions/${sessionId}/approval-status/${toolCallId}`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error(`Approval check failed: ${res.status}`);
    const data = await res.json() as { status: string };
    return data.status;
  }

  async reportToolResult(sessionId: string, toolCallId: string, result: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/tool-result`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ toolCallId, result }),
    });
    if (!res.ok) throw new Error(`Result reporting failed: ${res.status}`);
  }

  async sendAgentMessage(sessionId: string, role: 'agent' | 'system', content: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/agent-message`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ role, content }),
    });
    if (!res.ok) throw new Error(`Agent message failed: ${res.status}`);
  }

  async markDone(sessionId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/agent-done`, {
      method: 'POST',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Mark done failed: ${res.status}`);
  }
}

/**
 * Poll for human approval on the Palisade dashboard.
 * Returns true if approved, false if denied or timed out.
 */
export async function pollForApproval(
  client: PalisadeClient,
  sessionId: string,
  toolCallId: string,
  timeoutMs: number = 120_000,
  pollIntervalMs: number = 1_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await client.checkApprovalStatus(sessionId, toolCallId);
    if (status === 'approved') return true;
    if (status === 'denied') return false;
    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  return false; // timed out
}
