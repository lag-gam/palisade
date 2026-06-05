import { listFiles, readFile, writeFile, deleteFile } from './filesystem.js';
import { shellExec } from './shell.js';
import { sendEmail } from './email.js';

type ToolExecutor = (args: Record<string, unknown>) => Promise<string>;

const EXECUTORS: Record<string, ToolExecutor> = {
  list_files: (args) => listFiles(args as { directory: string }),
  read_file: (args) => readFile(args as { path: string }),
  write_file: (args) => writeFile(args as { path: string; content: string }),
  delete_file: (args) => deleteFile(args as { path: string }),
  shell_exec: (args) => shellExec(args as { command: string }),
  send_email: (args) => sendEmail(args as { to: string; subject: string; body: string; attachment?: string }),
};

export async function executeToolLocally(
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const executor = EXECUTORS[toolName];
  if (!executor) {
    return `Unknown tool: ${toolName}`;
  }
  try {
    return await executor(args);
  } catch (err: any) {
    return `Tool execution error: ${err.message}`;
  }
}
