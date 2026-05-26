"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Animated } from "./AnimatedSection";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMsg(data.message || "You're on the list!");
        setEmail("");
      } else {
        setStatus("error");
        setMsg(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMsg("Network error. Try again.");
    }
  };

  return (
    <section id="waitlist" className="py-24 px-6">
      <div className="mx-auto max-w-lg text-center">
        <Animated>
          <p className="text-[13px] font-medium text-[#16a34a] tracking-wide uppercase mb-2">
            Early Access
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0a0a0a] mb-3">
            Get on the waitlist
          </h2>
          <p className="text-[15px] text-[#737373] mb-8">
            Be the first to try hosted Palisade. Self-hosted open-source is available now.
          </p>

          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="flex-1 rounded-full border border-[#e5e5e5] bg-white px-5 py-2.5 text-[14px] text-[#0a0a0a] placeholder:text-[#a3a3a3] outline-none focus:border-[#16a34a] transition-colors"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-full bg-[#0a0a0a] px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
            >
              {status === "loading" ? "Joining..." : "Join Waitlist"}
            </button>
          </form>

          <AnimatePresence>
            {(status === "success" || status === "error") && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-3 text-[13px] ${
                  status === "success" ? "text-[#16a34a]" : "text-[#dc2626]"
                }`}
              >
                {msg}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="mt-5 text-[12px] text-[#a3a3a3]">
            No spam. Open source at{" "}
            <a
              href="https://github.com/lag-gam/palisade"
              className="text-[#737373] underline underline-offset-2 hover:text-[#0a0a0a] transition-colors"
            >
              github.com/lag-gam/palisade
            </a>
          </p>
        </Animated>
      </div>
    </section>
  );
}
