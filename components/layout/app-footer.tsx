export default function AppFooter() {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant w-full py-2 ml-0 md:ml-64 relative z-40">
      <div className="flex justify-between items-center w-full px-8 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-primary">BSI Haji Savings</span>
          <span className="text-[12px] font-semibold text-on-surface-variant">
            © 2024 Bank Syariah Indonesia. v1.0.0
          </span>
        </div>
        <div className="flex gap-4 text-[12px] font-semibold text-on-surface-variant">
          <span className="opacity-90">API Status: Online</span>
          <span className="hidden sm:inline opacity-90">
            {new Date().toLocaleTimeString("id-ID")}
          </span>
        </div>
      </div>
    </footer>
  );
}
