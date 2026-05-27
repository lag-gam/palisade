// Palisade OpenClaw Plugin — Runtime guardrails for AI agents
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { PalisadeClient } from './client';
import { pollForApproval } from './approval';

// Re-export for programmatic use
export { PalisadeClient } from './client';
export { pollForApproval } from './approval';

// Plugin state — lazy-initialized on first tool call
let client: PalisadeClient | null = null;
let sessionId: string | null = null;
let stepCounter = 0;

export default definePluginEntry({
  id: 'palisade',
  name: 'Palisade',
  description: 'Runtime guardrails — risk-scored policy evaluation, exfiltration detection, real-time dashboard.',

  register(api) {
    const config = (api.pluginConfig || {}) as {
      url?: string;
      source?: string;
      apiKey?: string;
      timeoutMs?: number;
    };
    const baseUrl = config.url || process.env.PALISADE_URL || 'http://localhost:8787';
    const apiKey = config.apiKey || process.env.PALISADE_API_KEY;
    const source = config.source || process.env.PALISADE_SOURCE || 'openclaw';
    const timeoutMs = config.timeoutMs || parseInt(process.env.PALISADE_TIMEOUT || '300000', 10);

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

    // before_tool_call — evaluate every tool call against policy engine
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
