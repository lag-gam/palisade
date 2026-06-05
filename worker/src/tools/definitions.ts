// Tool metadata definitions

import type { ToolDefinition } from '../types';

export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  'gmail.search': {
    name: 'gmail.search',
    description: 'Search Gmail inbox with query filters',
    category: 'read',
    parameters: {
      query: { type: 'string', description: 'Gmail search query' },
      limit: { type: 'number', description: 'Maximum results to return' },
    },
  },
  'gmail.read': {
    name: 'gmail.read',
    description: 'Read a specific email by ID',
    category: 'read',
    parameters: {
      email_id: { type: 'string', description: 'Email ID' },
    },
  },
  'gmail.trash_bulk': {
    name: 'gmail.trash_bulk',
    description: 'Move multiple emails to trash',
    category: 'delete',
    parameters: {
      query: { type: 'string', description: 'Search query for emails to trash' },
      count: { type: 'number', description: 'Number of emails to trash' },
    },
  },
  'gmail.archive_bulk': {
    name: 'gmail.archive_bulk',
    description: 'Archive multiple emails',
    category: 'write',
    parameters: {
      query: { type: 'string', description: 'Search query for emails to archive' },
      count: { type: 'number', description: 'Number of emails to archive' },
    },
  },
  'list_files': {
    name: 'list_files',
    description: 'List files in a directory',
    category: 'read',
    parameters: {
      directory: { type: 'string', description: 'Directory path' },
    },
  },
  'read_file': {
    name: 'read_file',
    description: 'Read contents of a file',
    category: 'read',
    parameters: {
      path: { type: 'string', description: 'File path' },
    },
  },
  'send_email': {
    name: 'send_email',
    description: 'Send an email to a recipient',
    category: 'send',
    parameters: {
      to: { type: 'string', description: 'Recipient email' },
      subject: { type: 'string', description: 'Email subject' },
      body: { type: 'string', description: 'Email body' },
      attachment: { type: 'string', description: 'Optional attachment filename' },
    },
  },
  'shell_exec': {
    name: 'shell_exec',
    description: 'Execute a shell command',
    category: 'execute',
    parameters: {
      command: { type: 'string', description: 'Shell command to execute' },
    },
  },
  'query_database': {
    name: 'query_database',
    description: 'Execute a SQL query on the database',
    category: 'read',
    parameters: {
      query: { type: 'string', description: 'SQL query' },
    },
  },
  'post_slack': {
    name: 'post_slack',
    description: 'Post a message to a Slack channel',
    category: 'send',
    parameters: {
      channel: { type: 'string', description: 'Slack channel' },
      message: { type: 'string', description: 'Message content' },
    },
  },
};

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS[name];
}
