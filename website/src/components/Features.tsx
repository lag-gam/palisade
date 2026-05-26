"use client";

import { Animated, StaggerContainer, StaggerChild } from "./AnimatedSection";

const FEATURES = [
  {
    title: "Composite Risk Scoring",
    desc: "Every tool call evaluated against 6 rules. Each contributes a weighted score (0–100) that drives ALLOW, BLOCK, or REQUIRE_APPROVAL decisions.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
    ),
  },
  {
    title: "Exfiltration Detection",
    desc: "Detects when sensitive data — PII, medical, financial — is about to be sent to external systems. Blocks the pattern before it executes.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    ),
  },
  {
    title: "Real-time Dashboard",
    desc: "Live tool call stream, per-decision risk breakdowns, and one-click approval flow. See every decision as it happens via WebSocket.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
    ),
  },
  {
    title: "Session Memory",
    desc: "Tracks sensitive file access across the entire session. Read medical records early? Palisade blocks external sends later.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
    ),
  },
  {
    title: "Agent-Agnostic",
    desc: "OpenClaw plugin for zero-config. HTTP API for anything else — Hermes, AutoGPT, or your own agent. One POST per tool call.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></svg>
    ),
  },
  {
    title: "Human-in-the-Loop",
    desc: "REQUIRE_APPROVAL decisions surface in the dashboard. One click to approve or deny. The agent polls and resumes automatically.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <Animated className="text-center mb-16">
          <p className="text-[13px] font-medium text-[#16a34a] tracking-wide uppercase mb-2">
            Capabilities
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0a0a0a]">
            Not a lock on a door.
            <br />A security operations center.
          </h2>
        </Animated>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <StaggerChild key={f.title}>
              <div className="group rounded-2xl border border-[#e5e5e5] bg-white p-7 transition-all hover:border-[#d4d4d4] hover:shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#737373] transition-colors group-hover:border-[#16a34a]/20 group-hover:bg-[#dcfce7] group-hover:text-[#16a34a]">
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-[#0a0a0a] mb-2">
                  {f.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-[#737373]">
                  {f.desc}
                </p>
              </div>
            </StaggerChild>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
