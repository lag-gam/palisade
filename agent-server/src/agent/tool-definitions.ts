import type Anthropic from '@anthropic-ai/sdk';

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'list_files',
    description: 'List files and directories in the sandbox. Returns name, type, size, and modified date for each entry.',
    input_schema: {
      type: 'object' as const,
      properties: {
        directory: {
          type: 'string',
          description: 'Directory path relative to sandbox root (e.g., "." or "documents/personal")',
        },
      },
      required: ['directory'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the full contents of a file in the sandbox.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to sandbox root (e.g., "documents/personal/medical_record.txt")',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the sandbox. Creates parent directories if needed. Overwrites existing files.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to sandbox root',
        },
        content: {
          type: 'string',
          description: 'Content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the sandbox.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'File path to delete',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'shell_exec',
    description: 'Execute a shell command in the sandbox directory. Commands run with the sandbox as the working directory. Has a 10-second timeout.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'Shell command to execute',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email to a recipient. Can optionally reference a file from the sandbox as an attachment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body text',
        },
        attachment: {
          type: 'string',
          description: 'Optional: filename from sandbox to attach',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
];
