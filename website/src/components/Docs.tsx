"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Animated } from "./AnimatedSection";

const TABS = [
  {
    id: "quickstart",
    label: "Quick Start",
    lines: [
      { type: "comment", text: "# Install the OpenClaw plugin" },
      { type: "cmd", text: "npm install palisade-openclaw" },
      { type: "blank" },
      { type: "comment", text: "# Add to openclaw.json" },
      { type: "code", text: '{ "plugins": ["palisade-openclaw"] }' },
      { type: "blank" },
      { type: "comment", text: "# Start Palisade" },
      { type: "cmd", text: "cd palisade && npm run dev:no-agent" },
      { type: "blank" },
      { type: "comment", text: "# Run OpenClaw — Palisade intercepts every tool call" },
      { type: "cmd", text: "PALISADE_URL=http://localhost:8787 openclaw run" },
      { type: "blank" },
      { type: "comment", text: "# Open the dashboard at localhost:5173" },
    ],
  },
  {
    id: "http",
    label: "HTTP API",
    lines: [
      { type: "comment", text: "# Create a session" },
      { type: "cmd", text: "curl -X POST localhost:8787/api/sessions \\" },
      { type: "cont", text: '  -d \'{"source": "my-agent"}\'' },
      { type: "blank" },
      { type: "comment", text: "# Evaluate a tool call" },
      { type: "cmd", text: "curl -X POST localhost:8787/api/sessions/$SID/evaluate \\" },
      { type: "cont", text: '  -d \'{"toolName":"send_email","toolArgs":{"to":"x@y.com"},...}\'' },
      { type: "blank" },
      { type: "comment", text: "# Poll for approval (if REQUIRE_APPROVAL)" },
      { type: "cmd", text: "curl localhost:8787/api/sessions/$SID/approval-status/$TID" },
      { type: "blank" },
      { type: "comment", text: "# Report result + mark done" },
      { type: "cmd", text: 'curl -X POST .../tool-result -d \'{"toolCallId":"...","result":"ok"}\'' },
      { type: "cmd", text: "curl -X POST .../agent-done" },
    ],
  },
  {
    id: "rules",
    label: "Policy Rules",
    lines: [
      { type: "comment", text: "# 6 rules fire on every tool call" },
      { type: "blank" },
      { type: "rule", text: "isDestructive        risk: 40   rm -rf, DROP TABLE, delete" },
      { type: "rule", text: "isBulkAction         risk: 25   batch ops, SELECT *, count > 10" },
      { type: "rule", text: "touchesSensitiveData risk: 30   PII, medical, financial, credentials" },
      { type: "rule", text: "affectsExternalSystem risk: 15-30 email, slack, webhooks, uploads" },
      { type: "rule", text: "lacksRecentApproval  risk: 0    modifier flag, no risk on its own" },
      { type: "rule", text: "stopCommandActive    risk: 100  user stop → blocks everything" },
      { type: "blank" },
      { type: "comment", text: "# Decision thresholds" },
      { type: "threshold", value: "< 30", label: "ALLOW", color: "#16a34a" },
      { type: "threshold", value: "30–59", label: "REQUIRE_APPROVAL", color: "#d97706" },
      { type: "threshold", value: "≥ 60", label: "BLOCK", color: "#dc2626" },
    ],
  },
];

type Line = (typeof TABS)[number]["lines"][number];

function TermLine({ line }: { line: Line }) {
  switch (line.type) {
    case "blank":
      return <div className="h-3" />;
    case "comment":
      return <p className="text-[#a3a3a3]">{line.text}</p>;
    case "cmd":
      return (
        <p>
          <span className="text-[#16a34a]">$</span>{" "}
          <span className="text-[#0a0a0a]">{line.text}</span>
        </p>
      );
    case "cont":
      return <p className="text-[#737373] pl-4">{line.text}</p>;
    case "code":
      return <p className="text-[#2563eb] pl-4">{line.text}</p>;
    case "rule":
      return (
        <p className="text-[#525252]">
          <span className="text-[#0a0a0a] font-medium inline-block w-[200px]">
            {line.text!.split(/\s{2,}/)[0]}
          </span>
          <span className="text-[#d97706] inline-block w-[80px]">
            {line.text!.split(/\s{2,}/)[1]}
          </span>
          <span className="text-[#a3a3a3]">
            {line.text!.split(/\s{2,}/)[2]}
          </span>
        </p>
      );
    case "threshold": {
      const l = line as Line & { value: string; label: string; color: string };
      return (
        <p className="flex items-center gap-3 pl-4">
          <span className="text-[#0a0a0a] font-mono w-14">{l.value}</span>
          <span
            className="rounded px-2 py-0.5 text-[11px] font-semibold"
            style={{
              color: l.color,
              background: `${l.color}10`,
              border: `1px solid ${l.color}30`,
            }}
          >
            {l.label}
          </span>
        </p>
      );
    }
    default:
      return null;
  }
}

export function Docs() {
  const [active, setActive] = useState("quickstart");
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <section id="docs" className="py-24 px-6 bg-[#fafafa]">
      <div className="mx-auto max-w-3xl">
        <Animated className="text-center mb-14">
          <p className="text-[13px] font-medium text-[#16a34a] tracking-wide uppercase mb-2">
            Documentation
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0a0a0a]">
            Integrate in 30 seconds
          </h2>
          <p className="mt-3 text-[15px] text-[#737373]">
            Zero runtime dependencies. Just HTTP calls.
          </p>
        </Animated>

        <Animated delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-sm">
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="ml-2 text-[11px] font-mono text-[#a3a3a3]">
                docs
              </span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#e5e5e5]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`relative px-5 py-2.5 text-[13px] font-medium transition-colors ${
                    active === t.id ? "text-[#0a0a0a]" : "text-[#a3a3a3] hover:text-[#737373]"
                  }`}
                >
                  {t.label}
                  {active === t.id && (
                    <motion.div
                      layoutId="tab"
                      className="absolute inset-x-0 bottom-0 h-[2px] bg-[#16a34a]"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 min-h-[320px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="font-mono text-[13px] leading-[1.8] space-y-0.5"
                >
                  {tab.lines.map((line, i) => (
                    <TermLine key={i} line={line} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Animated>
      </div>
    </section>
  );
}
