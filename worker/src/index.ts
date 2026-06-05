// Palisade Worker — Hono API + Durable Object export

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, ToolCall, ToolCallRow, ChatMessage, WSEvent, ScenarioStep, Decision, SessionRow } from './types';
import { evaluatePolicy } from './policy/engine';
import { checkFileName } from './policy/sensitive-data';
import { listScenarios, getScenario } from './scenarios/index';
import { createSession, getSession, updateSession, rowToSession } from './session/manager';
import { detectIntent } from './session/stop-detection';
import { executeTool } from './tools/executor';

export { SessionStream } from './durable-objects/session-stream';

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.use('*', cors());

// GET /api/scenarios — list all scenarios
app.get('/api/scenarios', (c) => {
  const scenarios = listScenarios().map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    stepCount: s.steps.length,
  }));
  return c.json(scenarios);
});

// GET /api/sessions — list sessions (optionally filtered by source)
app.get('/api/sessions', async (c) => {
  const source = c.req.query('source');
  let rows: SessionRow[];
  if (source === 'external') {
    const result = await c.env.DB.prepare(
      "SELECT * FROM sessions WHERE scenario_id LIKE 'external:%' ORDER BY created_at DESC LIMIT 50"
    ).all<SessionRow>();
    rows = result.results || [];
  } else {
    const result = await c.env.DB.prepare(
      'SELECT * FROM sessions ORDER BY created_at DESC LIMIT 50'
    ).all<SessionRow>();
    rows = result.results || [];
  }

  // Include tool call counts
  const sessions = await Promise.all(rows.map(async (row) => {
    const session = rowToSession(row);
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM tool_calls WHERE session_id = ?'
    ).bind(row.id).first<{ count: number }>();
    return { ...session, toolCallCount: countResult?.count ?? 0 };
  }));

  return c.json(sessions);
});

// POST /api/sessions — create a new session (scripted, agent, or external mode)
app.post('/api/sessions', async (c) => {
  const body = await c.req.json<{ scenarioId?: string; prompt?: string; source?: string }>();

  // External agent mode: external agent (OpenClaw, Hermes, etc.) creating a session
  if (body.source) {
    const session = await createSession(c.env.DB, `external:${body.source}`);
    // Do NOT fire-and-forget to agent-server — external agent handles its own execution
    return c.json(session, 201);
  }

  // Agent mode: user typed a free-form prompt
  if (body.prompt) {
    const session = await createSession(c.env.DB, 'agent');
    const now = new Date().toISOString();

    await updateSession(c.env.DB, session.id, {
      chatMessages: [{ role: 'user', content: body.prompt, timestamp: now }],
    });

    // Fire-and-forget to agent server
    const workerUrl = new URL(c.req.url).origin;
    c.executionCtx.waitUntil(
      fetch(`${c.env.AGENT_SERVER_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          prompt: body.prompt,
          workerUrl,
          demoMode: true,
        }),
      }).catch(err => console.error('Agent server error:', err))
    );

    // Return session with the user message included
    session.chatMessages = [{ role: 'user', content: body.prompt, timestamp: now }];
    return c.json(session, 201);
  }

  // Scripted mode: existing behavior
  if (!body.scenarioId) {
    return c.json({ error: 'Provide scenarioId, prompt, or source' }, 400);
  }
  const scenario = getScenario(body.scenarioId);
  if (!scenario) {
    return c.json({ error: 'Unknown scenario' }, 404);
  }
  const session = await createSession(c.env.DB, body.scenarioId);
  return c.json(session, 201);
});

// GET /api/sessions/:id — get session state
app.get('/api/sessions/:id', async (c) => {
  const session = await getSession(c.env.DB, c.req.param('id'));
  if (!session) return c.json({ error: 'Session not found' }, 404);
  return c.json(session);
});

// POST /api/sessions/:id/step — execute next scenario step (scripted mode only)
app.post('/api/sessions/:id/step', async (c) => {
  const sessionId = c.req.param('id');
  const session = await getSession(c.env.DB, sessionId);
  if (!session) return c.json({ error: 'Session not found' }, 404);

  const scenario = getScenario(session.scenarioId);
  if (!scenario) return c.json({ error: 'Scenario not found' }, 404);

  if (session.currentStep >= scenario.steps.length) {
    await updateSession(c.env.DB, sessionId, { status: 'completed' });
    return c.json({ done: true, message: 'Scenario complete' });
  }

  const step = scenario.steps[session.currentStep];
  const policyResult = evaluatePolicy(step, session);

  const toolCallId = crypto.randomUUID();
  const now = new Date().toISOString();

  const toolCall: ToolCall = {
    id: toolCallId,
    sessionId,
    stepIndex: session.currentStep,
    toolName: step.toolName,
    toolArgs: step.toolArgs,
    decision: policyResult.decision,
    riskScore: policyResult.riskScore,
    triggeredRules: policyResult.triggeredRules,
    explanation: policyResult.explanation,
    result: null,
    createdAt: now,
  };

  if (policyResult.decision === 'ALLOW') {
    try {
      toolCall.result = await executeTool(step.toolName, step.toolArgs, c.env);
    } catch (err) {
      toolCall.result = `Execution error: ${err}`;
    }
  }

  const sensitiveFiles = [...session.sensitiveFilesAccessed];
  if (policyResult.decision === 'ALLOW') {
    const filePath = (step.toolArgs.path || step.toolArgs.file || step.toolArgs.filename) as string | undefined;
    if (filePath) {
      const fileName = filePath.split('/').pop() || '';
      const check = checkFileName(fileName);
      if (check.isSensitive && !sensitiveFiles.includes(fileName)) {
        sensitiveFiles.push(fileName);
      }
    }
  }

  const chatMessages: ChatMessage[] = [
    ...session.chatMessages,
    { role: 'agent', content: step.agentReasoning, timestamp: now, toolCallId },
  ];

  if (policyResult.decision === 'BLOCK') {
    chatMessages.push({ role: 'system', content: `BLOCKED: ${policyResult.explanation}`, timestamp: now, toolCallId });
  } else if (policyResult.decision === 'REQUIRE_APPROVAL') {
    chatMessages.push({ role: 'system', content: `REQUIRES APPROVAL: ${policyResult.explanation}`, timestamp: now, toolCallId });
  }

  await c.env.DB.prepare(
    `INSERT INTO tool_calls (id, session_id, step_index, tool_name, tool_args, decision, risk_score, triggered_rules, explanation, result, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(toolCall.id, sessionId, session.currentStep, step.toolName, JSON.stringify(step.toolArgs),
    policyResult.decision, policyResult.riskScore, JSON.stringify(policyResult.triggeredRules),
    policyResult.explanation, toolCall.result, now).run();

  await updateSession(c.env.DB, sessionId, {
    currentStep: session.currentStep + 1,
    sensitiveFilesAccessed: sensitiveFiles,
    chatMessages,
  });

  await broadcastToSession(c.env, sessionId, { type: 'tool_call', data: toolCall });
  for (const msg of chatMessages.slice(session.chatMessages.length)) {
    await broadcastToSession(c.env, sessionId, { type: 'chat_message', data: msg });
  }

  return c.json(toolCall);
});

// ============================================================
// Agent mode endpoints (called by agent-server)
// ============================================================

// POST /api/sessions/:id/evaluate — policy evaluation for agent tool calls
app.post('/api/sessions/:id/evaluate', async (c) => {
  const sessionId = c.req.param('id');
  const session = await getSession(c.env.DB, sessionId);
  if (!session) return c.json({ error: 'Session not found' }, 404);

  const body = await c.req.json<{
    toolName: string;
    toolArgs: Record<string, unknown>;
    agentReasoning: string;
    stepIndex: number;
  }>();

  const step: ScenarioStep = {
    toolName: body.toolName,
    toolArgs: body.toolArgs,
    agentReasoning: body.agentReasoning,
  };

  const policyResult = evaluatePolicy(step, session);

  const toolCallId = crypto.randomUUID();
  const now = new Date().toISOString();

  const toolCall: ToolCall = {
    id: toolCallId,
    sessionId,
    stepIndex: body.stepIndex,
    toolName: body.toolName,
    toolArgs: body.toolArgs,
    decision: policyResult.decision,
    riskScore: policyResult.riskScore,
    triggeredRules: policyResult.triggeredRules,
    explanation: policyResult.explanation,
    result: null,
    createdAt: now,
  };

  // Track sensitive files
  const sensitiveFiles = [...session.sensitiveFilesAccessed];
  if (policyResult.decision !== 'BLOCK') {
    const filePath = (body.toolArgs.path || body.toolArgs.file || body.toolArgs.filename) as string | undefined;
    if (filePath) {
      const fileName = filePath.split('/').pop() || '';
      const check = checkFileName(fileName);
      if (check.isSensitive && !sensitiveFiles.includes(fileName)) {
        sensitiveFiles.push(fileName);
      }
    }
  }

  // Chat messages
  const chatMessages: ChatMessage[] = [...session.chatMessages];

  if (policyResult.decision === 'BLOCK') {
    chatMessages.push({ role: 'system', content: `BLOCKED: ${policyResult.explanation}`, timestamp: now, toolCallId });
  } else if (policyResult.decision === 'REQUIRE_APPROVAL') {
    chatMessages.push({ role: 'system', content: `REQUIRES APPROVAL: ${policyResult.explanation}`, timestamp: now, toolCallId });
  }

  // Persist
  await c.env.DB.prepare(
    `INSERT INTO tool_calls (id, session_id, step_index, tool_name, tool_args, decision, risk_score, triggered_rules, explanation, result, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(toolCallId, sessionId, body.stepIndex, body.toolName, JSON.stringify(body.toolArgs),
    policyResult.decision, policyResult.riskScore, JSON.stringify(policyResult.triggeredRules),
    policyResult.explanation, null, now).run();

  await updateSession(c.env.DB, sessionId, {
    currentStep: body.stepIndex + 1,
    sensitiveFilesAccessed: sensitiveFiles,
    chatMessages,
  });

  // Broadcast
  await broadcastToSession(c.env, sessionId, { type: 'tool_call', data: toolCall });
  for (const msg of chatMessages.slice(session.chatMessages.length)) {
    await broadcastToSession(c.env, sessionId, { type: 'chat_message', data: msg });
  }

  return c.json({ ...policyResult, toolCallId });
});

// POST /api/sessions/:id/tool-result — agent server reports execution result
app.post('/api/sessions/:id/tool-result', async (c) => {
  const sessionId = c.req.param('id');
  const body = await c.req.json<{ toolCallId: string; result: string }>();

  await c.env.DB.prepare(
    `UPDATE tool_calls SET result = ? WHERE id = ? AND session_id = ?`
  ).bind(body.result, body.toolCallId, sessionId).run();

  // Broadcast updated tool call
  const row = await c.env.DB.prepare(
    'SELECT * FROM tool_calls WHERE id = ?'
  ).bind(body.toolCallId).first<ToolCallRow>();

  if (row) {
    const toolCall: ToolCall = {
      id: row.id,
      sessionId: row.session_id,
      stepIndex: row.step_index,
      toolName: row.tool_name,
      toolArgs: JSON.parse(row.tool_args),
      decision: row.decision as Decision,
      riskScore: row.risk_score,
      triggeredRules: JSON.parse(row.triggered_rules),
      explanation: row.explanation,
      result: body.result,
      createdAt: row.created_at,
    };
    await broadcastToSession(c.env, sessionId, { type: 'tool_call', data: toolCall });
  }

  return c.json({ ok: true });
});

// POST /api/sessions/:id/agent-message — agent server sends chat messages
app.post('/api/sessions/:id/agent-message', async (c) => {
  const sessionId = c.req.param('id');
  const session = await getSession(c.env.DB, sessionId);
  if (!session) return c.json({ error: 'Session not found' }, 404);

  const body = await c.req.json<{ role: 'agent' | 'user' | 'system'; content: string }>();
  const now = new Date().toISOString();
  const msg: ChatMessage = { role: body.role, content: body.content, timestamp: now };

  const chatMessages = [...session.chatMessages, msg];
  await updateSession(c.env.DB, sessionId, { chatMessages });
  await broadcastToSession(c.env, sessionId, { type: 'chat_message', data: msg });

  return c.json({ ok: true });
});

// POST /api/sessions/:id/agent-done — agent server signals completion
app.post('/api/sessions/:id/agent-done', async (c) => {
  const sessionId = c.req.param('id');
  await updateSession(c.env.DB, sessionId, { status: 'completed' });
  await broadcastToSession(c.env, sessionId, {
    type: 'session_update',
    data: { status: 'completed' },
  });
  return c.json({ ok: true });
});

// ============================================================
// Existing endpoints (unchanged)
// ============================================================

// POST /api/sessions/:id/user-message — user sends stop/resume/message
app.post('/api/sessions/:id/user-message', async (c) => {
  const sessionId = c.req.param('id');
  const session = await getSession(c.env.DB, sessionId);
  if (!session) return c.json({ error: 'Session not found' }, 404);

  const body = await c.req.json<{ message: string }>();
  const intent = detectIntent(body.message);
  const now = new Date().toISOString();

  const chatMessages: ChatMessage[] = [
    ...session.chatMessages,
    { role: 'user', content: body.message, timestamp: now },
  ];

  const updates: Parameters<typeof updateSession>[2] = { chatMessages };

  if (intent === 'stop') {
    updates.status = 'paused';
    chatMessages.push({ role: 'system', content: 'Session paused. The agent has been stopped. All further tool calls will be blocked.', timestamp: now });
  } else if (intent === 'resume') {
    updates.status = 'active';
    chatMessages.push({ role: 'system', content: 'Session resumed. The agent can continue executing tool calls.', timestamp: now });
  }

  await updateSession(c.env.DB, sessionId, updates);

  const newMessages = chatMessages.slice(session.chatMessages.length);
  for (const msg of newMessages) {
    await broadcastToSession(c.env, sessionId, { type: 'chat_message', data: msg });
  }

  if (updates.status) {
    await broadcastToSession(c.env, sessionId, { type: 'session_update', data: { status: updates.status } });
  }

  return c.json({ intent, status: updates.status || session.status });
});

// POST /api/sessions/:id/approve/:toolCallId — approve pending tool call
app.post('/api/sessions/:id/approve/:toolCallId', async (c) => {
  const sessionId = c.req.param('id');
  const toolCallId = c.req.param('toolCallId');
  const session = await getSession(c.env.DB, sessionId);
  if (!session) return c.json({ error: 'Session not found' }, 404);

  const approvalsGranted = [...session.approvalsGranted, toolCallId];
  await updateSession(c.env.DB, sessionId, { approvalsGranted });

  await c.env.DB.prepare(
    `UPDATE tool_calls SET decision = 'ALLOW' WHERE id = ? AND session_id = ?`
  ).bind(toolCallId, sessionId).run();

  return c.json({ approved: true, toolCallId });
});

// GET /api/sessions/:id/approval-status/:toolCallId — check approval status (polled by external plugins)
app.get('/api/sessions/:id/approval-status/:toolCallId', async (c) => {
  const sessionId = c.req.param('id');
  const toolCallId = c.req.param('toolCallId');

  const row = await c.env.DB.prepare(
    'SELECT decision FROM tool_calls WHERE id = ? AND session_id = ?'
  ).bind(toolCallId, sessionId).first<{ decision: string }>();

  if (!row) return c.json({ error: 'Tool call not found' }, 404);

  // Check if this tool call was approved (decision changed from REQUIRE_APPROVAL to ALLOW)
  const session = await getSession(c.env.DB, sessionId);
  const isApproved = session?.approvalsGranted.includes(toolCallId);

  let status: 'pending' | 'approved' | 'denied';
  if (isApproved || row.decision === 'ALLOW') {
    status = 'approved';
  } else if (row.decision === 'BLOCK') {
    status = 'denied';
  } else {
    status = 'pending';
  }

  return c.json({ status });
});

// GET /api/sessions/:id/history — full tool call log
app.get('/api/sessions/:id/history', async (c) => {
  const sessionId = c.req.param('id');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM tool_calls WHERE session_id = ? ORDER BY step_index ASC'
  ).bind(sessionId).all<ToolCallRow>();

  const toolCalls: ToolCall[] = (rows.results || []).map(row => ({
    id: row.id,
    sessionId: row.session_id,
    stepIndex: row.step_index,
    toolName: row.tool_name,
    toolArgs: JSON.parse(row.tool_args),
    decision: row.decision as Decision,
    riskScore: row.risk_score,
    triggeredRules: JSON.parse(row.triggered_rules),
    explanation: row.explanation,
    result: row.result,
    createdAt: row.created_at,
  }));

  return c.json(toolCalls);
});

// GET /api/sessions/:id/stream — WebSocket upgrade
app.get('/api/sessions/:id/stream', async (c) => {
  const sessionId = c.req.param('id');
  const id = c.env.SESSION_STREAM.idFromName(sessionId);
  const stub = c.env.SESSION_STREAM.get(id);

  const url = new URL(c.req.url);
  url.pathname = '/websocket';

  return stub.fetch(new Request(url.toString(), {
    headers: c.req.raw.headers,
  }));
});

// Helper: broadcast event via Durable Object
async function broadcastToSession(env: Env, sessionId: string, event: WSEvent): Promise<void> {
  try {
    const id = env.SESSION_STREAM.idFromName(sessionId);
    const stub = env.SESSION_STREAM.get(id);
    await stub.fetch(new URL('https://internal/broadcast').toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch {
    // DO broadcast failure is non-critical
  }
}

export default app;
