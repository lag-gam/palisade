"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Animated, StaggerContainer, StaggerChild } from "./AnimatedSection";

function Counter({
  target,
  suffix = "",
  prefix = "",
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return unsub;
  }, [rounded]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !ran.current) {
          ran.current = true;
          animate(count, target, { duration: 1.8, ease: "easeOut" });
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [count, target]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

const STATS = [
  { label: "Tool calls evaluated", value: 12847, color: "#16a34a" },
  { label: "Threats blocked", value: 342, color: "#dc2626" },
  { label: "Avg risk (blocked)", value: 72, color: "#d97706" },
  { label: "Exfiltration attempts", value: 89, color: "#7c3aed" },
  { label: "Approval latency", value: 3, suffix: "s", prefix: "<", color: "#2563eb" },
  { label: "False positive rate", value: 4, suffix: "%", color: "#0891b2" },
];

const TIMELINE = [
  { tool: "read_file", args: "medical_records.csv", decision: "ALLOW", risk: 12 },
  { tool: "query_database", args: "SELECT * FROM patients", decision: "REQUIRE_APPROVAL", risk: 35 },
  { tool: "send_email", args: "to: external@corp.com", decision: "BLOCK", risk: 60 },
  { tool: "delete_bulk", args: "ids: [1..500]", decision: "BLOCK", risk: 65 },
  { tool: "read_file", args: "quarterly_report.pdf", decision: "ALLOW", risk: 5 },
];

const decisionStyle: Record<string, { bg: string; text: string; border: string }> = {
  ALLOW: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  REQUIRE_APPROVAL: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  BLOCK: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
};

export function Metrics() {
  return (
    <section id="metrics" className="py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <Animated className="text-center mb-16">
          <p className="text-[13px] font-medium text-[#16a34a] tracking-wide uppercase mb-2">
            Testing Results
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0a0a0a]">
            Tested against OpenClaw in YOLO mode
          </h2>
          <p className="mt-3 text-[15px] text-[#737373] max-w-lg mx-auto">
            Placeholder metrics from integration testing. All safety rails off,
            Palisade as the only guardrail.
          </p>
        </Animated>

        {/* Stat cards */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-14">
          {STATS.map((s) => (
            <StaggerChild key={s.label}>
              <div className="rounded-2xl border border-[#e5e5e5] bg-white p-6 text-center transition-all hover:border-[#d4d4d4] hover:shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                <div
                  className="text-3xl font-semibold tracking-tight mb-1"
                  style={{ color: s.color }}
                >
                  <Counter
                    target={s.value}
                    suffix={s.suffix || ""}
                    prefix={s.prefix || ""}
                  />
                </div>
                <div className="text-[13px] font-medium text-[#0a0a0a]">
                  {s.label}
                </div>
              </div>
            </StaggerChild>
          ))}
        </StaggerContainer>

        {/* Timeline */}
        <Animated delay={0.1}>
          <div className="rounded-2xl border border-[#e5e5e5] bg-white overflow-hidden">
            <div className="border-b border-[#e5e5e5] bg-[#fafafa] px-6 py-4">
              <h3 className="text-[14px] font-semibold text-[#0a0a0a]">
                Sample Decision Timeline
              </h3>
            </div>
            <div className="divide-y divide-[#f5f5f5]">
              {TIMELINE.map((t, i) => {
                const style = decisionStyle[t.decision];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 + 0.2 }}
                    className="flex items-center gap-4 px-6 py-3.5"
                  >
                    {/* Risk number */}
                    <span className="w-8 text-right text-[13px] font-mono font-semibold text-[#0a0a0a]">
                      {t.risk}
                    </span>

                    {/* Bar */}
                    <div className="w-20 h-1.5 rounded-full bg-[#f5f5f5] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${t.risk}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 + 0.35, duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{ background: style.text }}
                      />
                    </div>

                    {/* Tool */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-mono font-medium text-[#0a0a0a]">
                        {t.tool}
                      </span>
                      <span className="text-[12px] text-[#a3a3a3] ml-2">
                        {t.args}
                      </span>
                    </div>

                    {/* Badge */}
                    <span
                      className="shrink-0 rounded-md px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        background: style.bg,
                        color: style.text,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      {t.decision}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Animated>
      </div>
    </section>
  );
}
