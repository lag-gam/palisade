import express from 'express';
import { runAgent } from './agent/runner.js';
import { ensureSandbox } from './sandbox/setup.js';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3001', 10);

// POST /run — start agent loop for a session
app.post('/run', (req, res) => {
  const { sessionId, prompt, workerUrl, demoMode } = req.body;

  if (!sessionId || !prompt || !workerUrl) {
    res.status(400).json({ error: 'Missing sessionId, prompt, or workerUrl' });
    return;
  }

  console.log(`[Server] Starting agent for session ${sessionId}${demoMode ? ' (DEMO MODE)' : ''}`);
  console.log(`[Server] Prompt: "${prompt}"`);
  console.log(`[Server] Worker URL: ${workerUrl}`);

  // Fire-and-forget — the agent runs async, streams updates via worker WS
  runAgent({ sessionId, prompt, workerUrl, demoMode: !!demoMode }).catch(err => {
    console.error(`[Server] Agent error for session ${sessionId}:`, err);
  });

  res.json({ status: 'started', sessionId });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function main() {
  // Ensure sandbox exists on startup
  await ensureSandbox();

  app.listen(PORT, () => {
    console.log(`[Server] Agent server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
