// Session completion polling — waits for the agent-server to finish processing

import type { PalisadeClient } from './client';
import type { Session } from './types';

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Polls the Palisade worker for session completion.
 * Returns the full Session when status is 'completed' or 'paused', or null on timeout.
 */
export async function pollSessionCompletion(
  client: PalisadeClient,
  sessionId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): Promise<Session | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const session = await client.getSession(sessionId);

      if (session.status === 'completed' || session.status === 'paused') {
        return session;
      }

      // Still active — wait before next poll
    } catch (err) {
      // Network error — log and continue polling
      console.warn(`[palisade] Session poll error: ${err}`);
    }

    await sleep(pollIntervalMs);
  }

  // Timed out waiting for completion
  console.warn(`[palisade] Session poll timed out after ${timeoutMs}ms for session ${sessionId}`);
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
