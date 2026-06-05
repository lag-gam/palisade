// Extract and format agent replies from completed Palisade sessions

import type { Session } from './types';

const WHATSAPP_MAX_LENGTH = 4000;
const DEFAULT_REPLY = 'The agent completed but did not produce a response.';

/**
 * Extract the last agent message from a completed session's chatMessages.
 * Falls back to the last system message, then a default string.
 */
export function extractAgentReply(session: Session): string {
  const messages = session.chatMessages || [];

  // Look for the last agent message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'agent' && messages[i].content) {
      return messages[i].content;
    }
  }

  // Fall back to the last system message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'system' && messages[i].content) {
      return messages[i].content;
    }
  }

  return DEFAULT_REPLY;
}

/**
 * Format a reply for a specific channel, applying length limits.
 */
export function formatReplyForChannel(text: string, channel?: string): string {
  if (channel === 'whatsapp' && text.length > WHATSAPP_MAX_LENGTH) {
    return text.slice(0, WHATSAPP_MAX_LENGTH - 3) + '...';
  }
  return text;
}
