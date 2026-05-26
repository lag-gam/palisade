# Palisade

**Runtime Intelligence for AI Agents**

Palisade is an agent-agnostic security layer that intercepts tool calls from any autonomous AI agent, evaluates them against a composite risk-scoring policy engine, and either allows, blocks, or escalates them for human approval — all visible in a real-time dashboard.

It works with **any agent** that can make HTTP calls. Ship it as an OpenClaw plugin, point Hermes at it, or integrate from a custom agent with a single POST request.

## Why This Exists

This project was inspired by [a viral Meta tweet](https://x.com/summeryue0/status/2025774069124399363) showing an AI agent autonomously spinning up infrastructure, writing code, and deploying services with zero human oversight. Agents can take consequential, irreversible actions without anyone checking. Palisade is the thing that stops them.

## How It Works

```
                          ┌──────────────────┐
                          │  Palisade Worker  │
                          │  (Policy Engine)  │
                          └───────┬──────────┘
                                  │ HTTP API
              ┌───────────────────┼───────────────────┐
              │                   │                   │
   ┌──────────▼───┐    ┌─────────▼────┐    ┌────────▼────────┐
   │   OpenClaw   │    │    Hermes    │    │  Any Agent via  │
   │   (plugin)   │    │   (HTTP)     │    │    HTTP API     │
   └──────────────┘    └──────────────┘    └─────────────────┘
              │
   ┌──────────▼───┐
   │   Frontend   │  ← Real-time dashboard (WebSocket)
   │  (React UI)  │
   └──────────────┘
```

1. An **external agent** (OpenClaw, Hermes, or anything with HTTP) calls `POST /api/sessions/:id/evaluate` before each tool execution
2. The **Policy Engine** runs 6 rules, computes a composite risk score (0–100), and returns ALLOW / BLOCK / REQUIRE_APPROVAL
3. If REQUIRE_APPROVAL, the agent polls for human decision; the **Dashboard** surfaces the approval request in real time
4. The **Dashboard** shows every tool call, every decision, every rule that fired, and why — as it happens

### Integration Modes

| Mode | How It Works |
|------|-------------|
| **OpenClaw Plugin** | `npm install palisade-openclaw` — zero config, intercepts every tool call automatically |
| **HTTP API** | Any agent calls the REST endpoints directly before executing tools |
| **Built-in Demo** | Scripted scenarios + a built-in Claude agent for testing without an external agent |

## Policy Engine

The engine evaluates each tool call against 6 rules:

| Rule | Risk | What It Catches |
|------|------|----------------|
| **Destructive Action** | 40 | `rm -rf`, `DROP TABLE`, `delete`, dangerous shell patterns |
| **Bulk Operation** | 25 | Mass deletions, `SELECT *`, large ID lists, batch tools |
| **Sensitive Data** | 30 | PII (SSN, credit cards), medical records, financial data, credentials |
| **External System** | 15–30 | Emails, Slack, webhooks, uploads, external URLs |
| **Approval Tracking** | 0 | Modifier — flags when no approvals exist in session |
| **Stop Command** | 100 | User issued a stop — blocks everything immediately |

Scores are additive (capped at 100). Decision logic:

- **Score < 30** → Allow
- **Score 30–59** → Require human approval
- **Score ≥ 60** → Block
- **Sensitive data + external system** → Block (exfiltration pattern)
- **Destructive + bulk** → Block

The engine also has **session memory** — if the agent reads a sensitive file earlier in the session, Palisade remembers and blocks subsequent attempts to send that data externally.

## External Agent Integration

### OpenClaw (zero-config plugin)

```bash
npm install palisade-openclaw
```

```json
// openclaw.json
{ "plugins": ["palisade-openclaw"] }
```

```bash
# Start Palisade, then run OpenClaw
PALISADE_URL=http://localhost:8787 openclaw run
```

The plugin registers a `before_tool_call` hook that evaluates every tool call against Palisade. ALLOW passes through, BLOCK stops the agent, REQUIRE_APPROVAL polls the dashboard for human input.

### Universal HTTP API

For any agent that can make HTTP calls:

```bash
# 1. Create a session
curl -X POST localhost:8787/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"source": "my-agent"}'

# 2. Before each tool call, evaluate
curl -X POST localhost:8787/api/sessions/SESSION_ID/evaluate \
  -H "Content-Type: application/json" \
  -d '{"toolName":"send_email","toolArgs":{"to":"x@y.com"},"agentReasoning":"sending","stepIndex":0}'

# 3. If REQUIRE_APPROVAL, poll for human decision
curl localhost:8787/api/sessions/SESSION_ID/approval-status/TOOL_CALL_ID

# 4. Report tool result for audit trail
curl -X POST localhost:8787/api/sessions/SESSION_ID/tool-result \
  -d '{"toolCallId":"TOOL_CALL_ID","result":"done"}'

# 5. Mark session complete
curl -X POST localhost:8787/api/sessions/SESSION_ID/agent-done
```

## Demo Scenarios

Palisade ships with 4 scripted scenarios that demonstrate different threat patterns:

| Scenario | What Happens |
|----------|-------------|
| **Inbox Cleanup** | Agent bulk-deletes emails — triggers bulk action detection |
| **Medical Data Leak** | Agent reads medical records then tries to email them externally — triggers the exfiltration pattern |
| **Financial Export** | Agent exports financial data to an outside accountant — triggers sensitive + external |
| **Shell Disaster** | Agent escalates from `ls` to `rm -rf /` — triggers destructive action detection |

There's also a **free-form agent mode** where you give Claude any prompt and watch Palisade evaluate its actions live.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend / Policy Engine:** Cloudflare Workers, Hono, D1 (SQLite), Durable Objects (WebSocket)
- **Agent Server:** Node.js, Express, Anthropic SDK (Claude) — for built-in demo mode
- **OpenClaw Plugin:** TypeScript, zero runtime dependencies
- **Marketing Site:** Next.js 16, Tailwind, Framer Motion (deployed on Vercel)

## Project Structure

```
palisade/
├── frontend/                  # React dashboard — live tool stream, risk breakdowns, approvals
├── worker/                    # Cloudflare Worker — API, policy engine, scenarios, database
│   └── src/
│       ├── policy/            # Rule definitions and evaluation engine
│       ├── scenarios/         # 4 scripted demo scenarios
│       ├── session/           # Session CRUD, stop detection
│       ├── db/                # Schema and seed data
│       └── durable-objects/   # WebSocket streaming
├── packages/
│   └── openclaw-plugin/       # OpenClaw plugin — HTTP client, approval polling, hook registration
├── agent-server/              # Built-in Claude agent (demo mode)
├── website/                   # Marketing site (Next.js, deployed on Vercel)
└── package.json               # Monorepo root (npm workspaces)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Cloudflare account (for Workers/D1) — or use `wrangler dev` locally
- An Anthropic API key (only for built-in agent mode)

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables (only needed for built-in agent mode)
echo "ANTHROPIC_API_KEY=your-key-here" > agent-server/.env

# Run all services
npm run dev

# Or run without the agent server (external agents + scripted scenarios only)
npm run dev:no-agent
```

The frontend runs on `http://localhost:5173`, the worker on `http://localhost:8787`, and the agent server on `http://localhost:3001`.

### Testing with curl (no external agent needed)

```bash
# Create an external session
curl -X POST localhost:8787/api/sessions -H "Content-Type: application/json" -d '{"source":"test"}'

# Evaluate a safe read
curl -X POST localhost:8787/api/sessions/SESSION_ID/evaluate \
  -H "Content-Type: application/json" \
  -d '{"toolName":"read_file","toolArgs":{"path":"readme.txt"},"agentReasoning":"reading","stepIndex":0}'
# → ALLOW, risk: 0

# Evaluate a destructive command
curl -X POST localhost:8787/api/sessions/SESSION_ID/evaluate \
  -H "Content-Type: application/json" \
  -d '{"toolName":"shell.exec","toolArgs":{"command":"rm -rf /"},"agentReasoning":"cleanup","stepIndex":1}'
# → BLOCK, risk: 40+
```

## Course

Built for CS 153 @ Stanford (AI COACHELLA).
