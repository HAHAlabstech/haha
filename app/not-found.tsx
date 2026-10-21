import Link from "next/link";
import { Mic, ArrowRight, Database } from "lucide-react";
import { RobinhoodLogoMark } from "@/components/RobinhoodLogo";

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center px-6 overflow-hidden selection:bg-[#ffc53d]/30 selection:text-[#ffc53d]">
      {/* Ambient Glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-radial from-[#ffc53d]/08 via-transparent to-transparent blur-[140px] rounded-full"
      />

      <div className="relative z-10 max-w-xl text-center space-y-6">
        {/* Monospace Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#ffc53d]/30 bg-[#ffc53d]/10 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-[#ffc53d]">
          <RobinhoodLogoMark size={14} color="#ffc53d" />
          <span>404 · Zero Entropy Detected</span>
        </div>

        {/* Display Title */}
        <h1 className="display-serif text-5xl sm:text-7xl font-bold tracking-tight text-white">
          404: The Straight Man <em className="italic text-[#ffc53d]">Bombed.</em>
        </h1>

        {/* Deadpan Narrative */}
        <p className="text-zinc-400 font-light text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
          The Straight Man evaluated this URL with 99.8% literal confidence and concluded: this page does not exist in the Joke Vault.
        </p>

        {/* Action CTAs */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#ffc53d] to-[#f59e0b] font-mono text-xs font-bold uppercase tracking-wider text-[#070709] shadow-[0_0_24px_rgba(255,197,61,0.35)] hover:scale-[1.02] transition-all"
          >
            <span>Back to Main Stage</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/app?tab=stage"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/10 bg-[#12121a]/80 hover:bg-white/10 font-mono text-xs uppercase tracking-wider text-zinc-300 hover:text-white transition-all backdrop-blur-md"
          >
            <Mic className="w-3.5 h-3.5 text-[#ffc53d]" />
            <span>Launch App Console</span>
          </Link>
          <Link
            href="/app?tab=vault"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/10 bg-[#12121a]/80 hover:bg-white/10 font-mono text-xs uppercase tracking-wider text-zinc-300 hover:text-white transition-all backdrop-blur-md"
          >
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span>Search Joke Vault</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
