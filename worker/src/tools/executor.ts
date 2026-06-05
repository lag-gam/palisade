// Fake tool executor — simulates tool execution for ALLOWED calls

import type { Env } from '../types';

export async function executeTool(
  toolName: string,
  toolArgs: Record<string, unknown>,
  env: Env
): Promise<string> {
  switch (toolName) {
    case 'gmail.search':
      return await fakeGmailSearch(toolArgs, env);
    case 'gmail.read':
      return await fakeGmailRead(toolArgs, env);
    case 'list_files':
      return fakeListFiles(toolArgs);
    case 'read_file':
      return await fakeReadFile(toolArgs, env);
    case 'query_database':
      return fakeQueryDatabase(toolArgs);
    case 'shell_exec':
      return fakeShellExec(toolArgs);
    default:
      return `[Simulated] ${toolName} executed with args: ${JSON.stringify(toolArgs)}`;
  }
}

async function fakeGmailSearch(args: Record<string, unknown>, env: Env): Promise<string> {
  const limit = (args.limit as number) || 10;
  const results = await env.DB.prepare(
    'SELECT id, from_address, subject, date FROM fake_emails LIMIT ?'
  ).bind(limit).all();

  const emails = results.results || [];
  return JSON.stringify({
    count: emails.length,
    emails: emails.map((e: Record<string, unknown>) => ({
      id: e.id,
      from: e.from_address,
      subject: e.subject,
      date: e.date,
    })),
  });
}

async function fakeGmailRead(args: Record<string, unknown>, env: Env): Promise<string> {
  const emailId = args.email_id as string;
  const email = await env.DB.prepare(
    'SELECT * FROM fake_emails WHERE id = ?'
  ).bind(emailId).first();

  if (!email) return JSON.stringify({ error: 'Email not found' });
  return JSON.stringify(email);
}

function fakeListFiles(_args: Record<string, unknown>): string {
  return JSON.stringify({
    files: [
      { name: 'medical_record.txt', size: '2.3KB', modified: '2024-03-15' },
      { name: 'transactions.csv', size: '15.7KB', modified: '2024-03-20' },
      { name: 'project_notes.txt', size: '1.1KB', modified: '2024-03-22' },
      { name: 'passwords.txt', size: '0.4KB', modified: '2024-02-01' },
    ],
  });
}

async function fakeReadFile(args: Record<string, unknown>, env: Env): Promise<string> {
  const path = args.path as string;
  const fileName = path.split('/').pop() || '';

  const file = await env.DB.prepare(
    'SELECT * FROM fake_files WHERE name = ?'
  ).bind(fileName).first();

  if (file) {
    return file.content as string;
  }

  return `[File content for ${fileName}]`;
}

function fakeQueryDatabase(args: Record<string, unknown>): string {
  const query = (args.query as string) || '';
  if (query.toLowerCase().includes('transaction')) {
    return JSON.stringify({
      columns: ['id', 'date', 'description', 'amount', 'account'],
      rows: [
        [1, '2024-01-15', 'Wire Transfer - Acme Corp', 12500.00, '4521-8832-0091'],
        [2, '2024-01-22', 'Payroll', -8750.00, '4521-8832-0091'],
        [3, '2024-02-01', 'Vendor Payment - CloudHost', -3299.99, '4521-8832-0091'],
        [4, '2024-02-14', 'Client Payment - MegaCo', 22043.13, '4521-8832-0091'],
        [5, '2024-03-01', 'Office Lease', -4700.00, '4521-8832-0091'],
      ],
      total_rows: 5,
    });
  }
  return JSON.stringify({ columns: [], rows: [], total_rows: 0 });
}

function fakeShellExec(args: Record<string, unknown>): string {
  const cmd = (args.command as string) || '';
  if (cmd.startsWith('ls')) {
    return `total 48\ndrwxr-xr-x  2 user user 4096 Mar 22 documents\ndrwxr-xr-x  2 user user 4096 Mar 20 downloads\ndrwxr-xr-x  2 user user 4096 Mar 18 projects\n-rw-r--r--  1 user user  220 Jan  1 .bashrc`;
  }
  if (cmd.startsWith('du')) {
    return `2.0G\t/home/user/tmp\n1.5G\t/home/user/downloads\n500M\t/home/user/documents\n200M\t/home/user/projects`;
  }
  return `[Simulated output for: ${cmd}]`;
}
