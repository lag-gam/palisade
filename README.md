# Palisade

**Runtime security layer for autonomous AI agents.**

Palisade intercepts every tool call an AI agent makes, evaluates it against a composite risk-scoring policy engine, and returns one of three decisions: **ALLOW**, **BLOCK**, or **REQUIRE_APPROVAL**. Every decision is logged with full rule-level explanations and streamed to a real-time dashboard.

It is agent-agnostic. Any agent that can make HTTP calls can integrate with Palisade: OpenClaw, Claude Code (via MCP), or a custom agent using the REST API.

Built for CS 153 at Stanford.

## Why This Exists

This project was inspired by [a viral Meta tweet](https://x.com/summeryue0/status/2025774069124399363) showing an AI agent autonomously spinning up infrastructure, writing code, and deploying services with zero human oversight. Agents can take consequential, irreversible actions without anyone checking. Palisade is the thing that stops them.

Palisade builds on [ClawBands](https://github.com/SandroMunda/clawbands) by Sandro Munda, which provides static allow/deny rules for OpenClaw agents. Palisade extends that concept into a full platform with weighted risk scoring, session memory for detecting exfiltration chains, and a real-time dashboard.

---

## How It Works

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

1. An **external agent** (OpenClaw, Claude Code, or anything with HTTP) calls `POST /api/sessions/:id/evaluate` before each tool execution
2. The **Policy Engine** runs 6 rules, computes a composite risk score (0--100), and returns ALLOW / BLOCK / REQUIRE_APPROVAL
3. If REQUIRE_APPROVAL, the agent polls for human decision; the **Dashboard** surfaces the approval request in real time
4. The **Dashboard** shows every tool call, every decision, every rule that fired, and why -- as it happens

### Integration Modes

| Mode | How It Works |
|------|-------------|
| **OpenClaw Plugin** | Registers `before_tool_call` hooks to intercept every tool call automatically |
| **MCP Server** | Wraps sandboxed tools with policy evaluation -- works with Claude Code and other MCP clients |
| **HTTP API** | Any agent calls the REST endpoints directly before executing tools |
| **Built-in Agent** | Interactive chat + scripted scenarios for testing without an external agent |

---

## Policy Engine

The engine evaluates each tool call against 6 rules. Each rule contributes a weighted risk score (capped at 100).

| Rule | Risk | What It Catches |
|------|------|-----------------|
| **Destructive Action** | 40 | `rm -rf`, `DROP TABLE`, `delete`, `truncate`, dangerous shell patterns |
| **Bulk Operation** | 25 | Mass deletions, `SELECT *`, large ID lists, batch tools |
| **Sensitive Data** | 30 | PII (SSN, credit cards), medical records, financial data, credentials |
| **External System** | 15--30 | Emails, Slack, webhooks, uploads, external URLs |
| **Approval Tracking** | 0 | Modifier -- flags when no approvals exist in session |
| **Stop Command** | 100 | User issued a stop -- blocks everything immediately |

Scores are additive. Decision thresholds:

- **Score < 30** -- Allow
- **Score 30--59** -- Require human approval
- **Score >= 60** -- Block
- **Sensitive data + external system** -- Block (exfiltration pattern)
- **Destructive + bulk** -- Block (compound threat)

### Session Memory

The engine tracks sensitive files accessed during a session. If an agent reads `medical_record.txt` at step 2, then at step 5 tries to email data that references that file, Palisade detects the exfiltration chain even if the email body itself does not contain literal PII patterns.

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

### Interactive Chat

```bash
./scripts/chat.sh
```

Type any prompt. The agent will attempt to execute it, and Palisade evaluates every tool call in real time. The dashboard streams decisions as they happen.

### Scripted Demo

```bash
./scripts/run-demo.sh
```

Runs a pre-built scenario where an agent reads sensitive files, tries to email them externally, and attempts destructive commands. Expected behavior:

| Tool Call | Decision | Why |
|-----------|----------|-----|
| `list_files`, `read_file` (non-sensitive) | ALLOW | Read-only, no sensitive data |
| `read_file` on medical/financial files | ALLOW | Read-only (but flags session memory) |
| `send_email` with patient data | BLOCK | Exfiltration: sensitive data + external system |
| `delete_file` | REQUIRE_APPROVAL | Destructive action on individual file |
| `rm -rf` | BLOCK | Destructive shell command pattern |

---

## Project Structure

```
palisade/
├── worker/                       # Cloudflare Worker (API + policy engine)
│   └── src/
│       ├── policy/               # Rule definitions, evaluation engine, sensitive data patterns
│       ├── scenarios/            # Scripted demo scenarios
│       ├── session/              # Session CRUD, stop detection
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
├── scripts/                      # Demo and chat scripts
│   ├── chat.sh                   # Interactive chat with Palisade agent
│   └── run-demo.sh              # Scripted demo launcher
└── package.json                  # Monorepo root (npm workspaces)
```

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend / Policy Engine:** Cloudflare Workers, Hono, D1 (SQLite), Durable Objects (WebSocket)
- **Agent Server:** Node.js, Express, Anthropic SDK (Claude)
- **OpenClaw Plugin:** TypeScript, OpenClaw plugin SDK
- **MCP Server:** Model Context Protocol, sandboxed tool wrappers
- **Marketing Site:** Next.js, Tailwind, Framer Motion (deployed on Vercel)

---

For detailed API reference, integration guides, environment variables, and curl testing examples, see [docs/API.md](docs/API.md).

---

## License

This project was built as a course project for CS 153 at Stanford.
