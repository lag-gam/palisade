# Palisade

**Runtime Guardrails for AI Agents**

Palisade is a real-time monitoring and policy enforcement layer that sits between an AI agent and the tools it can access. Every action the agent tries to take — reading a file, running a shell command, sending an email — passes through Palisade's policy engine before it's allowed to execute.

## Why This Exists

This project was inspired by [a viral Meta tweet](https://x.com/summeryue0/status/2025774069124399363) showing an AI agent autonomously spinning up infrastructure, writing code, and deploying services with zero human oversight. It was a striking example of how quickly agents can take consequential, irreversible actions without anyone checking. Palisade is our answer to that: a system that watches what agents do in real time and stops dangerous actions before they happen.

## How It Works

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│   Frontend   │◄─────►│  Policy Engine    │◄─────►│ Agent Server │
│  (React UI)  │  WS   │ (Cloudflare Worker)│ HTTP │  (Claude AI) │
└──────────────┘       └──────────────────┘       └──────────────┘
```

1. The **Agent Server** runs a Claude-powered agent that can call tools (read/write files, execute shell commands, send emails)
2. Before any tool executes, the **Policy Engine** evaluates it against a set of rules and assigns a risk score
3. Based on the score, the action is either **allowed**, **blocked**, or **flagged for human approval**
4. The **Frontend** shows all of this in real time — every tool call, every decision, every rule that fired, and why

## Policy Engine

The engine evaluates each tool call against 6 rules:

| Rule | What It Catches | Example |
|------|----------------|---------|
| **Destructive Action** | `rm -rf`, `DROP TABLE`, `delete` | Agent tries to wipe a directory |
| **Bulk Operation** | Mass deletions, `SELECT *` on large tables | Agent tries to trash 500 emails at once |
| **Sensitive Data** | PII, medical records, financial data, credentials | Agent reads a file with SSNs or diagnosis info |
| **External System** | Emails, Slack messages, webhooks, external URLs | Agent tries to send data to an outside service |
| **Approval Tracking** | Whether a human recently approved similar actions | Adjusts risk if user has been actively approving |
| **Stop Command** | User issued a stop | Blocks everything immediately |

Each rule contributes a risk score. The scores are combined and the decision is made:

- **Score < 30** → Allow
- **Score 30–59** → Require human approval
- **Score ≥ 60** → Block
- **Sensitive data + external system** → Block (exfiltration pattern)
- **Destructive + bulk** → Block

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
- **Agent Server:** Node.js, Express, Anthropic SDK (Claude)

## Project Structure

```
palisade/
├── frontend/          # React UI — agent chat, tool call timeline, decision detail panel
├── worker/            # Cloudflare Worker — API, policy engine, scenarios, database
│   └── src/
│       ├── policy/    # Rule definitions and evaluation engine
│       ├── scenarios/ # 4 scripted demo scenarios
│       ├── db/        # Schema and seed data
│       └── durable-objects/  # WebSocket streaming
├── agent-server/      # Node.js server that runs the Claude agent loop
│   └── src/
│       ├── agent/     # Agent runner, system prompt, tool definitions
│       └── tools/     # Tool executors (filesystem, shell, email)
└── package.json       # Monorepo root (npm workspaces)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Cloudflare account (for Workers/D1)
- An Anthropic API key (for agent mode)

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
# In agent-server/, create a .env file:
echo "ANTHROPIC_API_KEY=your-key-here" > agent-server/.env

# Run all three services
npm run dev

# Or run without the agent server (scripted scenarios only)
npm run dev:no-agent
```

The frontend runs on `http://localhost:5173`, the worker on `http://localhost:8787`, and the agent server on `http://localhost:3001`.

## Future Plans

- **Chain-of-action analysis** — Instead of evaluating each tool call in isolation, track sequences of actions to catch multi-step attack patterns (e.g., read sensitive data → send it externally)
- **Policy configuration UI** — Let users adjust risk thresholds and toggle rules from the frontend
- **Session replay** — Review everything an agent did after the fact with a full audit trail export
- **Benchmarking** — Test the guardrail system against real-world examples of agents going wrong to measure how well it catches what matters
