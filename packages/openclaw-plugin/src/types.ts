// Palisade types — mirrors worker/src/types.ts for the subset we need

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

export interface ChatMessage {
  role: 'agent' | 'user' | 'system';
  content: string;
  timestamp: string;
  toolCallId?: string;
}

export interface Session {
  id: string;
  scenarioId: string;
  status: 'active' | 'paused' | 'completed';
  currentStep: number;
  chatMessages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'denied';

// OpenClaw plugin SDK type stubs — minimal subset of what we use

export interface OpenClawPluginContext {
  toolName: string;
  toolArgs: Record<string, unknown>;
  sessionId?: string;
}

export interface OpenClawBlockResult {
  block: true;
  blockReason: string;
}

export interface OpenClawApprovalResult {
  requireApproval: {
    description: string;
    approvalUrl?: string;
  };
}

export type OpenClawHookResult =
  | undefined              // pass-through (ALLOW)
  | OpenClawBlockResult    // block the tool call
  | OpenClawApprovalResult; // require approval

export interface OpenClawPlugin {
  name: string;
  version: string;
  hooks?: {
    before_tool_call?: (ctx: OpenClawPluginContext) => Promise<OpenClawHookResult>;
    after_tool_call?: (ctx: OpenClawPluginContext & { result: unknown }) => Promise<void>;
  };
}
