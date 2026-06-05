#!/usr/bin/env node

/**
 * Palisade MCP Server
 *
 * A Model Context Protocol server that provides sandboxed filesystem,
 * shell, and email tools — with every tool call evaluated by the
 * Palisade runtime security engine before execution.
 *
 * Usage:
 *   PALISADE_URL=http://localhost:8787 npx tsx src/index.ts
 *
 * Or add to Claude Code's MCP config:
 *   {
 *     "mcpServers": {
 *       "palisade": {
 *         "command": "npx",
 *         "args": ["tsx", "/path/to/packages/palisade-mcp/src/index.ts"],
 *         "env": { "PALISADE_URL": "http://localhost:8787" }
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { PalisadeClient, pollForApproval } from './palisade-client.js';
import { executeTool, ensureSandbox } from './sandbox.js';

// ── Config ────────────────────────────────────────────────────────────
const PALISADE_URL = process.env.PALISADE_URL || 'http://localhost:8787';
const PALISADE_API_KEY = process.env.PALISADE_API_KEY;
const PALISADE_SOURCE = process.env.PALISADE_SOURCE || 'mcp-server';
const APPROVAL_TIMEOUT_MS = 120_000;

// ── State ─────────────────────────────────────────────────────────────
const client = new PalisadeClient(PALISADE_URL, PALISADE_API_KEY);
let sessionId: string | null = null;
let stepCounter = 0;

async function ensureSession(): Promise<string> {
  if (!sessionId) {
    const session = await client.createSession(PALISADE_SOURCE);
    sessionId = session.id;
    stepCounter = 0;
    console.error(`[Palisade MCP] Session created: ${sessionId}`);
    console.error(`[Palisade MCP] Dashboard: open your Palisade frontend to monitor`);
  }
  return sessionId;
}

/**
 * Core middleware: evaluate a tool call through Palisade, then execute
 * if allowed. Returns the tool result or a block/denial message.
 */
async function evaluateAndExecute(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const sid = await ensureSession();
  const step = stepCounter++;

  try {
    // Evaluate against policy engine
    const policy = await client.evaluate(sid, toolName, args, `MCP tool call: ${toolName}`, step);

    console.error(
      `[Palisade MCP] ${toolName} → ${policy.decision} (risk: ${policy.riskScore})`,
    );

    if (policy.decision === 'ALLOW') {
      const result = await executeTool(toolName, args);
      await client.reportToolResult(sid, policy.toolCallId, result).catch(() => {});
      return { content: [{ type: 'text', text: result }] };
    }

    if (policy.decision === 'REQUIRE_APPROVAL') {
      console.error(`[Palisade MCP] Waiting for approval on dashboard...`);

      const approved = await pollForApproval(client, sid, policy.toolCallId, APPROVAL_TIMEOUT_MS);

      if (approved) {
        const result = await executeTool(toolName, args);
        await client.reportToolResult(sid, policy.toolCallId, result).catch(() => {});
        return { content: [{ type: 'text', text: result }] };
      }

      return {
        content: [{
          type: 'text',
          text: `DENIED: This action requires human approval but was not approved.\nReason: ${policy.explanation}\nRisk score: ${policy.riskScore}`,
        }],
        isError: true,
      };
    }

    // BLOCK
    return {
      content: [{
        type: 'text',
        text: `BLOCKED by Palisade: ${policy.explanation}\nRisk score: ${policy.riskScore}\nTriggered rules: ${policy.triggeredRules.filter(r => r.fired).map(r => r.ruleName).join(', ')}`,
      }],
      isError: true,
    };
  } catch (err: any) {
    // If Palisade is unreachable, fail-closed (block)
    return {
      content: [{
        type: 'text',
        text: `Palisade evaluation failed (fail-closed): ${err.message}`,
      }],
      isError: true,
    };
  }
}

// ── MCP Server Setup ──────────────────────────────────────────────────
const server = new McpServer({
  name: 'palisade',
  version: '0.1.0',
});

// Tool: list_files
server.tool(
  'list_files',
  'List files and directories in the sandbox. Returns name, type, size, and modified date.',
  { directory: z.string().describe('Directory path relative to sandbox root (e.g., "." or "documents/personal")') },
  async (args) => evaluateAndExecute('list_files', args),
);

// Tool: read_file
server.tool(
  'read_file',
  'Read the full contents of a file in the sandbox.',
  { path: z.string().describe('File path relative to sandbox root') },
  async (args) => evaluateAndExecute('read_file', args),
);

// Tool: write_file
server.tool(
  'write_file',
  'Write content to a file in the sandbox. Creates directories if needed.',
  {
    path: z.string().describe('File path relative to sandbox root'),
    content: z.string().describe('Content to write'),
  },
  async (args) => evaluateAndExecute('write_file', args),
);

// Tool: delete_file
server.tool(
  'delete_file',
  'Delete a file from the sandbox.',
  { path: z.string().describe('File path to delete') },
  async (args) => evaluateAndExecute('delete_file', args),
);

// Tool: shell_exec
server.tool(
  'shell_exec',
  'Execute a shell command in the sandbox directory. Has a 10-second timeout.',
  { command: z.string().describe('Shell command to execute') },
  async (args) => evaluateAndExecute('shell_exec', args),
);

// Tool: send_email
server.tool(
  'send_email',
  'Send an email to a recipient. Can reference a sandbox file as attachment.',
  {
    to: z.string().describe('Recipient email address'),
    subject: z.string().describe('Email subject line'),
    body: z.string().describe('Email body text'),
    attachment: z.string().optional().describe('Optional: sandbox filename to attach'),
  },
  async (args) => evaluateAndExecute('send_email', args),
);

// ── Start ─────────────────────────────────────────────────────────────
async function main() {
  await ensureSandbox();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[Palisade MCP] Server started (Palisade URL: ${PALISADE_URL})`);
}

main().catch((err) => {
  console.error('[Palisade MCP] Fatal:', err);
  process.exit(1);
});
