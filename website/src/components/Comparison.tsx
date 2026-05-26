"use client";

import { Animated } from "./AnimatedSection";

const ROWS = [
  {
    label: "Policy Model",
    them: "Static rules: ALLOW / ASK / DENY per category",
    us: "Composite risk scoring (0–100), 6 rules, exfiltration detection, session memory",
  },
  {
    label: "Interface",
    them: "Terminal prompts, JSONL audit logs",
    us: "Real-time 3-panel dashboard with WebSocket streaming",
  },
  {
    label: "Scope",
    them: "OpenClaw only",
    us: "Agent-agnostic: OpenClaw plugin, HTTP API, SDK adapters",
  },
  {
    label: "Memory",
    them: "Each tool call evaluated in isolation",
    us: "Cross-action session memory tracks sensitive file access",
  },
  {
    label: "Decisions",
    them: "Binary: allow or deny",
    us: "Three-tier: ALLOW, REQUIRE_APPROVAL, BLOCK — with risk scores",
  },
];

export function Comparison() {
  return (
    <section className="py-24 px-6 bg-[#fafafa]">
      <div className="mx-auto max-w-4xl">
        <Animated className="text-center mb-14">
          <p className="text-[13px] font-medium text-[#16a34a] tracking-wide uppercase mb-2">
            Comparison
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0a0a0a]">
            ClawBands vs Palisade
          </h2>
          <p className="mt-3 text-[15px] text-[#737373]">
            Different product category: CLI tool vs. platform.
          </p>
        </Animated>

        <Animated delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white">
            {/* Header */}
            <div className="grid grid-cols-[140px_1fr_1fr] sm:grid-cols-[180px_1fr_1fr] border-b border-[#e5e5e5] bg-[#fafafa]">
              <div className="p-4" />
              <div className="p-4 text-[13px] font-semibold text-[#a3a3a3] border-l border-[#e5e5e5]">
                ClawBands
              </div>
              <div className="p-4 text-[13px] font-semibold text-[#16a34a] border-l border-[#e5e5e5]">
                Palisade
              </div>
            </div>

            {ROWS.map((r, i) => (
              <div
                key={r.label}
                className={`grid grid-cols-[140px_1fr_1fr] sm:grid-cols-[180px_1fr_1fr] ${
                  i < ROWS.length - 1 ? "border-b border-[#e5e5e5]" : ""
                }`}
              >
                <div className="p-4 text-[13px] font-medium text-[#0a0a0a]">
                  {r.label}
                </div>
                <div className="p-4 text-[13px] text-[#a3a3a3] border-l border-[#e5e5e5] leading-relaxed">
                  {r.them}
                </div>
                <div className="p-4 text-[13px] text-[#525252] border-l border-[#e5e5e5] leading-relaxed">
                  {r.us}
                </div>
              </div>
            ))}
          </div>
        </Animated>
      </div>
    </section>
  );
}
