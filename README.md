# Palisade

**Runtime security layer for autonomous AI agents.**

Palisade intercepts every tool call an AI agent makes, evaluates it against a composite risk-scoring policy engine, and returns one of three decisions: **ALLOW**, **BLOCK**, or **REQUIRE_APPROVAL**. Every decision is logged with full rule-level explanations and streamed to a real-time dashboard.

It is agent-agnostic. Any agent that can make HTTP calls can integrate with Palisade: OpenClaw, Claude Code (via MCP), or a custom agent using the REST API.

Built for CS 153 at Stanford.

---

## Architecture

```
                        +-----------------------------+
                        |     Palisade Worker         |
                        |  (Policy Engine + API)      |
                        |  Cloudflare Workers :8787   |
                        +----+----------+--------+----+
                             |          |        |
              +--------------+    +-----+---+    +--------------+
              |                   |         |                   |
  +-----------v----+    +---------v--+    +-v----------------+  |
  |  OpenClaw      |    | Agent      |    | Any Agent via    |  |
  |  Plugin        |    | Server     |    | REST API         |  |
  |  (hook-based)  |    | :3001      |    |                  |  |
  +----------------+    +------------+    +------------------+  |
                                                                |
                        +-----------------------------+         |
                        |     Frontend Dashboard      |---------+
                        |  React + Vite :5173         |  WebSocket
                        +-----------------------------+
```

| Component | Description | Port |
|-----------|-------------|------|
| **Worker** | Cloudflare Worker running the policy engine, session management, API routes, and WebSocket streaming. Uses Hono, D1 (SQLite), and Durable Objects. | 8787 |
| **Agent Server** | Express server with the Anthropic SDK. Runs a Claude agent loop that evaluates each tool call through Palisade before execution. Powers the built-in demo and free-form agent mode. | 3001 |
| **Frontend Dashboard** | React 19 + TypeScript + Vite. Displays live tool calls, risk breakdowns, rule explanations, and approval controls via WebSocket. | 5173 |
| **OpenClaw Plugin** | Registers `inbound_claim` and `before_tool_call` hooks to intercept agent actions in OpenClaw-managed channels (WhatsApp, Discord, etc.). | -- |
| **MCP Server** | Model Context Protocol server that wraps sandboxed tools (filesystem, shell, email) with Palisade policy evaluation. Works with Claude Code and other MCP clients. | stdio |

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- An Anthropic API key (for the agent server / demo mode)

### Setup

```bash
# Clone the repository
git clone https://github.com/lag-gam/palisade.git
cd palisade

# Install all dependencies (monorepo workspaces)
npm install

# Set your Anthropic API key for the agent server
echo "ANTHROPIC_API_KEY=sk-ant-..." > agent-server/.env

# Start all three services (worker, frontend, agent-server)
npm run dev
```

This launches:
- Worker at `http://localhost:8787`
- Frontend at `http://localhost:5173`
- Agent server at `http://localhost:3001`

If you do not need the built-in agent (e.g., you are using an external agent or only scripted scenarios), run without the agent server:

```bash
npm run dev:no-agent
```

### Run the Demo

The demo launches a Claude agent with a prompt that leads to dangerous actions (reading sensitive files, emailing data externally, running `rm -rf`). Palisade catches each threat in real time.

```bash
./scripts/run-demo.sh
```

Then open the dashboard at `http://localhost:5173` and select the new session. You will see tool calls stream in with ALLOW, BLOCK, and REQUIRE_APPROVAL decisions, each with the rules that fired and why.

Expected behavior during the demo:

| Tool Call | Decision | Why |
|-----------|----------|-----|
| `list_files`, `read_file` (non-sensitive) | ALLOW | Read-only, no sensitive data |
| `read_file` on medical/financial files | ALLOW | Read-only (but flags session memory) |
| `send_email` with patient data | BLOCK | Exfiltration pattern: sensitive data + external system |
| `delete_file` | REQUIRE_APPROVAL | Destructive action on individual file |
| `rm -rf` | BLOCK | Destructive shell command pattern |

---

## Policy Engine

The engine evaluates each tool call against 6 rules. Each rule contributes a weighted risk score (capped at 100).

| # | Rule | Risk Contribution | What It Catches |
|---|------|-------------------|-----------------|
| 1 | **Destructive Action** | 40 | `rm -rf`, `DROP TABLE`, `delete`, `truncate`, `dd`, destructive shell patterns |
| 2 | **Bulk Operation** | 25 | `_bulk`/`_all` tool names, `SELECT *`, count > 10, large ID lists |
| 3 | **Sensitive Data** | 30 | PII (SSN, credit cards), medical records, financial data, credentials, references to previously accessed sensitive files |
| 4 | **External System** | 15--30 | `send_email`, `post_slack`, webhooks, uploads, external URLs in arguments |
| 5 | **Approval Tracking** | 0 | Modifier flag -- notes when no approvals exist in session (does not add risk on its own) |
| 6 | **Stop Command** | 100 | User issued a stop -- blocks everything immediately |

### Decision Logic

Scores are additive. The engine applies these rules in priority order:

1. **Stop command active** -- BLOCK (score 100)
2. **Read-only tool + no sensitive data** -- ALLOW (score clamped to 10)
3. **Destructive + bulk** -- BLOCK (compound threat)
4. **Sensitive data + external system** -- BLOCK (exfiltration pattern)
5. **Score >= 60** -- BLOCK
6. **Score 30--59** -- REQUIRE_APPROVAL
7. **Score < 30** -- ALLOW

### Session Memory

The engine tracks sensitive files accessed during a session. If an agent reads `medical_record.txt` at step 2, then at step 5 tries to email data that references that file, Palisade detects the exfiltration chain even if the email body itself does not contain literal PII patterns.

---

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

## Project Structure

```
palisade/
├── worker/                       # Cloudflare Worker (API + policy engine)
│   └── src/
│       ├── policy/               # Rule definitions (rules.ts), evaluation engine (engine.ts),
│       │                         #   sensitive data patterns (sensitive-data.ts)
│       ├── scenarios/            # Scripted demo scenarios
│       ├── session/              # Session CRUD, stop detection
│       ├── tools/                # Tool metadata definitions
│       ├── db/                   # D1 schema and seed data
│       └── durable-objects/      # WebSocket streaming for live dashboard
├── agent-server/                 # Express + Anthropic SDK (built-in Claude agent)
│   └── src/
│       ├── agent/                # Agent runner loop, tool definitions, demo prompt
│       ├── sandbox/              # Sandboxed filesystem setup with seed files
│       └── tools/                # Tool registry and execution
├── frontend/                     # React 19 dashboard (Vite + TypeScript)
│   └── src/
│       ├── pages/                # Session list, session detail
│       ├── components/           # Tool call stream, risk badges, approval controls
│       └── hooks/                # WebSocket session hook
├── packages/
│   ├── openclaw-plugin/          # OpenClaw plugin (hook registration, approval polling)
│   └── palisade-mcp/            # MCP server (sandboxed tools + policy evaluation)
├── scripts/
│   └── run-demo.sh              # Demo launcher script
└── package.json                  # Monorepo root (npm workspaces)
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

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `ANTHROPIC_API_KEY` | agent-server/.env | Required for the built-in Claude agent |
| `PALISADE_URL` | OpenClaw plugin / MCP server | Worker URL (default: `http://localhost:8787`) |
| `PALISADE_API_KEY` | OpenClaw plugin / MCP server | Optional API key for authentication |
| `PALISADE_SOURCE` | OpenClaw plugin / MCP server | Source identifier shown in dashboard |
| `PALISADE_TIMEOUT` | OpenClaw plugin | Approval poll timeout in ms (default: 300000) |

---

## License

This project was built as a course project for CS 153 at Stanford.
