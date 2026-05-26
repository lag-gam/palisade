"use client";

import { motion } from "framer-motion";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "Metrics", href: "#metrics" },
  { label: "Docs", href: "#docs" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 inset-x-0 z-50 border-b border-[#e5e5e5] bg-white/80 backdrop-blur-xl"
    >
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2.5">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[15px] font-semibold tracking-tight text-[#0a0a0a]">
            Palisade
          </span>
        </a>

        <div className="hidden sm:flex items-center gap-1">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-1.5 text-[13px] text-[#737373] transition-colors hover:text-[#0a0a0a] hover:bg-[#f5f5f5]"
            >
              {n.label}
            </a>
          ))}
        </div>

        <a
          href="#waitlist"
          className="rounded-full bg-[#0a0a0a] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-80"
        >
          Join Waitlist
        </a>
      </nav>
    </motion.header>
  );
}
