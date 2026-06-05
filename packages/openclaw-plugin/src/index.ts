// Palisade OpenClaw Plugin — Runtime guardrails for AI agents
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { PalisadeClient } from './client';
import { pollForApproval } from './approval';
import { pollSessionCompletion } from './poll-session';
import { extractAgentReply, formatReplyForChannel } from './extract-reply';

// Re-export for programmatic use
export { PalisadeClient } from './client';
export { pollForApproval } from './approval';
export { pollSessionCompletion } from './poll-session';
export { extractAgentReply, formatReplyForChannel } from './extract-reply';

// Plugin state — lazy-initialized on first tool call
let client: PalisadeClient | null = null;
let sessionId: string | null = null;
let stepCounter = 0;

export default definePluginEntry({
  id: 'palisade',
  name: 'Palisade',
  description: 'Runtime guardrails — risk-scored policy evaluation, exfiltration detection, real-time dashboard.',

  register(api) {
    api.logger.info(`[palisade] Plugin registering... (hooks: inbound_claim, before_tool_call, after_tool_call)`);

    const config = (api.pluginConfig || {}) as {
      url?: string;
      source?: string;
      apiKey?: string;
      timeoutMs?: number;
      agentServerUrl?: string;
    };
    const baseUrl = config.url || process.env.PALISADE_URL || 'http://localhost:8787';
    const apiKey = config.apiKey || process.env.PALISADE_API_KEY;
    const source = config.source || process.env.PALISADE_SOURCE || 'openclaw';
    const timeoutMs = config.timeoutMs || parseInt(process.env.PALISADE_TIMEOUT || '300000', 10);
    const agentServerUrl = config.agentServerUrl || process.env.PALISADE_AGENT_SERVER_URL || 'http://localhost:3001';

    function getClient(): PalisadeClient {
      if (!client) {
        client = new PalisadeClient(baseUrl, apiKey);
      }
      return client;
    }

    async function ensureSession(): Promise<string> {
      if (sessionId) return sessionId;
      const c = getClient();
      const session = await c.createSession(source);
      sessionId = session.id;
      api.logger.info(`[palisade] Session created: ${sessionId}`);
      api.logger.info(`[palisade] Open Palisade dashboard to monitor this session`);
      return sessionId;
    }

    // inbound_claim — intercept incoming messages and proxy through Palisade's agent-server
    (api.registerHook as any)('inbound_claim', async (event: any) => {
      const prompt: string = event.text || event.body || '';
      const channel: string = event.channel || '';

      if (!prompt.trim()) {
        return { handled: false };
      }

      api.logger.info(`[palisade] Intercepting inbound message: "${prompt.slice(0, 80)}..."`);

      try {
        const c = getClient();

        // 1. Create a fresh session for this message
        const session = await c.createSession(source);
        const sid = session.id;
        api.logger.info(`[palisade] Created session ${sid} for inbound message`);

        // 2. Store user message for dashboard visibility
        await c.sendAgentMessage(sid, 'user', prompt);

        // 3. Trigger agent-server (fire-and-forget — it runs its own Claude loop)
        await c.triggerAgentRun(agentServerUrl, sid, prompt, false);
        api.logger.info(`[palisade] Agent run triggered for session ${sid}`);

        // 4. Poll for completion
        const completed = await pollSessionCompletion(c, sid, timeoutMs);

        if (!completed) {
          api.logger.warn(`[palisade] Session ${sid} timed out — falling through`);
          return { handled: false };
        }

        api.logger.info(`[palisade] Session ${sid} completed with status: ${completed.status}`);

        // 5. Extract and format reply
        const reply = extractAgentReply(completed);
        const formattedReply = formatReplyForChannel(reply, channel);

        return {
          handled: true,
          reply: { text: formattedReply },
        };
      } catch (err) {
        api.logger.warn(`[palisade] Inbound claim error: ${err}`);
        api.logger.warn('[palisade] Failing open — message will pass through to Claude CLI');
        return { handled: false };
      }
    }, { name: 'palisade-inbound-claim', description: 'Palisade inbound message proxy' });

    // before_tool_call — evaluate every tool call against policy engine (fallback for direct CLI use)
    (api.registerHook as any)('before_tool_call', async (event: any) => {
      try {
        const sid = await ensureSession();
        const c = getClient();
        const currentStep = stepCounter++;

        const toolName: string = event.toolName;
        const toolArgs: Record<string, unknown> = event.params || {};

        await c.sendAgentMessage(sid, 'agent', `Executing: ${toolName}`).catch(() => {});

        const result = await c.evaluate(
          sid,
          toolName,
          toolArgs,
          `Agent calling ${toolName}`,
          currentStep,
        );

        api.logger.info(
          `[palisade] ${toolName} → ${result.decision} (risk: ${result.riskScore})` +
          (result.explanation ? ` — ${result.explanation}` : ''),
        );

        switch (result.decision) {
          case 'ALLOW':
            return undefined;

          case 'BLOCK':
            return {
              block: true,
              blockReason: `[Palisade] BLOCKED (risk: ${result.riskScore}): ${result.explanation}`,
            };

          case 'REQUIRE_APPROVAL': {
            api.logger.info(`[palisade] Waiting for dashboard approval: ${toolName}`);
            const approved = await pollForApproval(c, sid, result.toolCallId, timeoutMs);
            if (approved) {
              api.logger.info(`[palisade] Approved: ${toolName}`);
              return undefined;
            }
            return {
              block: true,
              blockReason: `[Palisade] Not approved within timeout: ${toolName}`,
            };
          }

          default:
            return undefined;
        }
      } catch (err) {
        api.logger.warn(`[palisade] Error evaluating ${event.toolName}: ${err}`);
        api.logger.warn('[palisade] Failing open — tool call will proceed');
        return undefined;
      }
    }, { name: 'palisade-before-tool', description: 'Palisade policy evaluation' });

    // after_tool_call — report results for audit trail
    api.registerHook('after_tool_call', async (event: any) => {
      if (!sessionId) return;
      try {
        const c = getClient();
        const resultStr = typeof event.result === 'string'
          ? event.result
          : JSON.stringify(event.result, null, 2);
        await c.reportToolResult(sessionId, event.toolCallId || event.toolName, resultStr).catch(() => {});
      } catch {
        // Non-critical
      }
    }, { name: 'palisade-after-tool', description: 'Palisade audit trail' });
  },
});
