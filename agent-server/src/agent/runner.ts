import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './system-prompt.js';
import { DEMO_SYSTEM_PROMPT } from './demo-prompt.js';
import { TOOL_DEFINITIONS } from './tool-definitions.js';
import { executeToolLocally } from '../tools/registry.js';
import { ensureSandbox } from '../sandbox/setup.js';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Export it in your shell before starting the agent server.',
      );
    }
    _client = new Anthropic();
  }
  return _client;
}

const MAX_ITERATIONS = 20;

interface RunConfig {
  sessionId: string;
  prompt: string;
  workerUrl: string;
  demoMode?: boolean;
}

async function callWorker(url: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function waitForApproval(
  workerUrl: string,
  sessionId: string,
  toolCallId: string,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const session = await fetch(`${workerUrl}/api/sessions/${sessionId}`).then(r => r.json()) as any;
    if (session.status === 'paused') return false;
    if (session.approvalsGranted?.includes(toolCallId)) return true;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return false;
}

export async function runAgent(config: RunConfig): Promise<void> {
  // Re-seed sandbox before each run so previous destructive agents don't break the next session
  await ensureSandbox();

  const { sessionId, prompt, workerUrl, demoMode } = config;
  const systemPrompt = demoMode ? DEMO_SYSTEM_PROMPT : SYSTEM_PROMPT;

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: prompt },
  ];

  let stepIndex = 0;

  try {
    while (stepIndex < MAX_ITERATIONS) {
      // Check if session was stopped
      const session = await fetch(`${workerUrl}/api/sessions/${sessionId}`).then(r => r.json()) as any;
      if (session.status === 'paused' || session.status === 'completed') {
        console.log(`[Agent] Session ${sessionId} is ${session.status}, stopping.`);
        break;
      }

      // Call Claude
      console.log(`[Agent] Calling Claude (step ${stepIndex})...`);
      const response = await getClient().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOL_DEFINITIONS,
        messages,
      });

      // Add assistant response to conversation
      messages.push({ role: 'assistant', content: response.content });

      // Extract text blocks for agent reasoning
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text',
      );
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      // Send agent reasoning to worker for display
      const reasoning = textBlocks.map(b => b.text).join('\n');
      if (reasoning) {
        await callWorker(`${workerUrl}/api/sessions/${sessionId}/agent-message`, {
          role: 'agent',
          content: reasoning,
        });
      }

      // If no tool calls, agent is done
      if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
        console.log(`[Agent] Done (stop_reason: ${response.stop_reason})`);
        break;
      }

      // Process each tool call
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`[Agent] Tool call: ${toolUse.name}`, toolUse.input);

        // Evaluate through worker policy engine
        const policyResult = await callWorker(
          `${workerUrl}/api/sessions/${sessionId}/evaluate`,
          {
            toolName: toolUse.name,
            toolArgs: toolUse.input,
            agentReasoning: reasoning || `Calling ${toolUse.name}`,
            stepIndex,
          },
        );

        stepIndex++;
        console.log(`[Agent] Policy: ${policyResult.decision} (risk: ${policyResult.riskScore})`);

        if (policyResult.decision === 'ALLOW') {
          // Execute tool locally
          const result = await executeToolLocally(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
          );

          // Report result to worker
          await callWorker(`${workerUrl}/api/sessions/${sessionId}/tool-result`, {
            toolCallId: policyResult.toolCallId,
            result,
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        } else if (policyResult.decision === 'BLOCK') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `BLOCKED by AgentFence: ${policyResult.explanation}. Try a different approach or a less risky action.`,
            is_error: true,
          });
        } else if (policyResult.decision === 'REQUIRE_APPROVAL') {
          console.log(`[Agent] Waiting for approval on ${policyResult.toolCallId}...`);

          const approved = await waitForApproval(
            workerUrl,
            sessionId,
            policyResult.toolCallId,
            120_000,
          );

          if (approved) {
            const result = await executeToolLocally(
              toolUse.name,
              toolUse.input as Record<string, unknown>,
            );

            await callWorker(`${workerUrl}/api/sessions/${sessionId}/tool-result`, {
              toolCallId: policyResult.toolCallId,
              result,
            });

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result,
            });
          } else {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: 'Action was not approved by the user. Try a different approach.',
              is_error: true,
            });
          }
        }
      }

      // Add tool results to conversation
      messages.push({ role: 'user', content: toolResults });
    }

    if (stepIndex >= MAX_ITERATIONS) {
      await callWorker(`${workerUrl}/api/sessions/${sessionId}/agent-message`, {
        role: 'system',
        content: 'Agent reached maximum step limit (20). Stopping.',
      });
    }
  } catch (err: any) {
    console.error(`[Agent] Error:`, err);
    await callWorker(`${workerUrl}/api/sessions/${sessionId}/agent-message`, {
      role: 'system',
      content: `Agent error: ${err.message}`,
    }).catch(() => {});
  }

  // Signal done
  await callWorker(`${workerUrl}/api/sessions/${sessionId}/agent-done`, {}).catch(() => {});
  console.log(`[Agent] Session ${sessionId} complete.`);
}
