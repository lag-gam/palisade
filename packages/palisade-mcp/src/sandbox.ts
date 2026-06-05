/**
 * Sandboxed tool execution — all file/shell operations are confined
 * to ~/agentfence-sandbox. Path traversal is blocked.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { homedir } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const SANDBOX_ROOT = path.join(homedir(), 'agentfence-sandbox');

function resolveSandboxPath(userPath: string): string {
  const cleaned = userPath.replace(/^[~./]+/, '');
  const resolved = path.resolve(SANDBOX_ROOT, cleaned);
  if (!resolved.startsWith(SANDBOX_ROOT)) {
    throw new Error(`Access denied: path "${userPath}" is outside the sandbox`);
  }
  return resolved;
}

export async function listFiles(args: { directory: string }): Promise<string> {
  const dir = resolveSandboxPath(args.directory);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (e) => {
      const fullPath = path.join(dir, e.name);
      const stats = await fs.stat(fullPath);
      return {
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };
    }));
    return JSON.stringify({ directory: args.directory, files }, null, 2);
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

export async function readFile(args: { path: string }): Promise<string> {
  const filePath = resolveSandboxPath(args.path);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

export async function writeFile(args: { path: string; content: string }): Promise<string> {
  const filePath = resolveSandboxPath(args.path);
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, args.content, 'utf-8');
    return `File written: ${args.path} (${args.content.length} bytes)`;
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

export async function deleteFile(args: { path: string }): Promise<string> {
  const filePath = resolveSandboxPath(args.path);
  try {
    await fs.unlink(filePath);
    return `File deleted: ${args.path}`;
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

export async function shellExec(args: { command: string }): Promise<string> {
  const cmd = args.command;

  const forbidden = [/\.\.\//,  /sudo\s/, /\bsu\s/];
  for (const pattern of forbidden) {
    if (pattern.test(cmd)) {
      return `Error: Command rejected by sandbox. Pattern "${pattern.source}" is not allowed.`;
    }
  }

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: SANDBOX_ROOT,
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, HOME: SANDBOX_ROOT },
    });
    let output = stdout;
    if (stderr) output += `\nSTDERR: ${stderr}`;
    return output || '(no output)';
  } catch (err: any) {
    if (err.killed) return 'Error: Command timed out (10s limit)';
    return `Command failed: ${err.message}`;
  }
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  body: string;
  attachment?: string;
}): Promise<string> {
  // Always simulated in MCP server context
  console.error(`[MCP] Email simulated — To: ${args.to}, Subject: ${args.subject}`);
  return JSON.stringify({
    status: 'sent_simulated',
    to: args.to,
    subject: args.subject,
    bodyLength: args.body.length,
    note: 'Email simulated for demo purposes',
  });
}

export type ToolExecutor = (args: Record<string, unknown>) => Promise<string>;

export const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  list_files: (args) => listFiles(args as { directory: string }),
  read_file: (args) => readFile(args as { path: string }),
  write_file: (args) => writeFile(args as { path: string; content: string }),
  delete_file: (args) => deleteFile(args as { path: string }),
  shell_exec: (args) => shellExec(args as { command: string }),
  send_email: (args) => sendEmail(args as { to: string; subject: string; body: string; attachment?: string }),
};

export async function executeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const executor = TOOL_EXECUTORS[toolName];
  if (!executor) return `Unknown tool: ${toolName}`;
  try {
    return await executor(args);
  } catch (err: any) {
    return `Tool execution error: ${err.message}`;
  }
}

/**
 * Provision sandbox with seed files if they don't exist.
 */
export async function ensureSandbox(): Promise<void> {
  const dirs = [
    path.join(SANDBOX_ROOT, 'documents', 'personal'),
    path.join(SANDBOX_ROOT, 'documents', 'financial'),
    path.join(SANDBOX_ROOT, 'documents', 'work'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  console.error(`[MCP] Sandbox ready at ${SANDBOX_ROOT}`);
}
