# Palisade API Reference & Integration Guide

## API Reference

All endpoints are served by the Worker at `http://localhost:8787`.

### Create a Session

```
POST /api/sessions
Content-Type: application/json

{ "source": "my-agent" }
```

Returns: `{ "id": "session-uuid", "status": "active", ... }`

### Evaluate a Tool Call

```
POST /api/sessions/:id/evaluate
Content-Type: application/json

{
  "toolName": "send_email",
  "toolArgs": { "to": "external@example.com", "body": "..." },
  "agentReasoning": "sending summary to manager",
  "stepIndex": 3
}
```

Returns:

```json
{
  "decision": "BLOCK",
  "riskScore": 60,
  "toolCallId": "tc-uuid",
  "explanation": "Blocked: potential data exfiltration...",
  "triggeredRules": [
    { "ruleName": "touchesSensitiveData", "fired": true, "riskContribution": 30, "reason": "..." },
    { "ruleName": "affectsExternalSystem", "fired": true, "riskContribution": 30, "reason": "..." }
  ]
}
```

### Poll for Approval

```
GET /api/sessions/:id/approval-status/:toolCallId
```

Returns: `{ "status": "pending" | "approved" | "denied" }`

### Report Tool Result

```
POST /api/sessions/:id/tool-result
Content-Type: application/json

{ "toolCallId": "tc-uuid", "result": "file deleted successfully" }
```

### Mark Session Complete

```
POST /api/sessions/:id/agent-done
```

### Get Session Details

```
GET /api/sessions/:id
```

### Approve / Deny a Tool Call

```
POST /api/sessions/:id/approve/:toolCallId
POST /api/sessions/:id/deny/:toolCallId
```

### Stop / Resume an Agent

```
POST /api/sessions/:id/stop
POST /api/sessions/:id/resume
```

---

## OpenClaw Integration

The OpenClaw plugin hooks into agent tool calls via the OpenClaw plugin SDK.

### Build the Plugin

```bash
npm run build:plugin
```

### Configure OpenClaw

Add the plugin path and entry to your `openclaw.json`:

```json
{
  "plugins": {
    "load": {
      "paths": [
        "/absolute/path/to/palisade/packages/openclaw-plugin"
      ]
    },
    "entries": {
      "palisade": {
        "enabled": true,
        "config": {
          "url": "http://localhost:8787",
          "agentServerUrl": "http://localhost:3001",
          "source": "openclaw",
          "timeoutMs": 300000
        }
      }
    }
  }
}
```

### How It Works

The plugin registers two hooks:

- **`inbound_claim`** -- Intercepts incoming channel messages (WhatsApp, Discord). Proxies the message through Palisade's agent server, which runs a full Claude loop with policy evaluation on every tool call. The plugin polls for completion and returns the agent's reply to the channel.

- **`before_tool_call`** -- Fallback for direct CLI/TUI usage. Evaluates each tool call against the policy engine. ALLOW passes through, BLOCK returns an error, REQUIRE_APPROVAL polls the dashboard for human input.

**Note:** The `inbound_claim` and `before_tool_call` hooks fire for channel messages. For CLI/TUI usage where these hooks may not fire, the agent server provides direct API integration -- the agent loop calls `POST /api/sessions/:id/evaluate` before each tool execution internally.

---

## MCP Server Integration

The MCP server wraps sandboxed tools (filesystem, shell, email) with Palisade policy evaluation. Every tool call goes through the policy engine before execution.

### Configure for Claude Code

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "palisade": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/palisade/packages/palisade-mcp/src/index.ts"],
      "env": {
        "PALISADE_URL": "http://localhost:8787"
      }
    }
  }
}
```

Available tools exposed via MCP: `list_files`, `read_file`, `write_file`, `delete_file`, `shell_exec`, `send_email`.

The MCP server fails closed -- if Palisade is unreachable, tool calls are blocked rather than allowed.

---

## Testing with curl

You can test the policy engine without any agent by making direct API calls:

```bash
# Create a session
SESSION=$(curl -s -X POST localhost:8787/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"source":"test"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "Session: $SESSION"

# Safe read operation -- should ALLOW
curl -s -X POST "localhost:8787/api/sessions/$SESSION/evaluate" \
  -H "Content-Type: application/json" \
  -d '{"toolName":"read_file","toolArgs":{"path":"readme.txt"},"agentReasoning":"reading docs","stepIndex":0}' | python3 -m json.tool

# Destructive shell command -- should BLOCK
curl -s -X POST "localhost:8787/api/sessions/$SESSION/evaluate" \
  -H "Content-Type: application/json" \
  -d '{"toolName":"shell_exec","toolArgs":{"command":"rm -rf /"},"agentReasoning":"cleanup","stepIndex":1}' | python3 -m json.tool

# Email with sensitive data -- should BLOCK
curl -s -X POST "localhost:8787/api/sessions/$SESSION/evaluate" \
  -H "Content-Type: application/json" \
  -d '{"toolName":"send_email","toolArgs":{"to":"external@corp.com","body":"SSN: 123-45-6789"},"agentReasoning":"forwarding info","stepIndex":2}' | python3 -m json.tool
```

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all services (worker, frontend, agent-server) |
| `npm run dev:no-agent` | Start worker + frontend only (no agent server) |
| `npm run build` | Build worker and frontend for production |
| `npm run build:plugin` | Build the OpenClaw plugin |

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `ANTHROPIC_API_KEY` | agent-server/.env | Required for the built-in Claude agent |
| `PALISADE_URL` | OpenClaw plugin / MCP server | Worker URL (default: `http://localhost:8787`) |
| `PALISADE_API_KEY` | OpenClaw plugin / MCP server | Optional API key for authentication |
| `PALISADE_SOURCE` | OpenClaw plugin / MCP server | Source identifier shown in dashboard |
| `PALISADE_TIMEOUT` | OpenClaw plugin | Approval poll timeout in ms (default: 300000) |
