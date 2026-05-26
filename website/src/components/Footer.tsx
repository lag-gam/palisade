export function Footer() {
  return (
    <footer className="border-t border-[#e5e5e5] py-10 px-6">
      <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[13px] font-semibold text-[#737373]">Palisade</span>
        </div>

        <div className="flex items-center gap-5 text-[12px] text-[#a3a3a3]">
          <a href="#features" className="hover:text-[#0a0a0a] transition-colors">Features</a>
          <a href="#docs" className="hover:text-[#0a0a0a] transition-colors">Docs</a>
          <a href="#contact" className="hover:text-[#0a0a0a] transition-colors">Contact</a>
          <span className="text-[#e5e5e5]">|</span>
          <span>CS 153 @ Stanford (AI COACHELLA)</span>
        </div>

        <span className="text-[12px] text-[#d4d4d4]">
          &copy; {new Date().getFullYear()} Palisade
        </span>
      </div>
    </footer>
  );
}
