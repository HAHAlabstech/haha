"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import type { FinishTheme } from "@/components/CyberStraightMan3D";

// Dynamically import CyberStraightMan3D to avoid SSR issues with Three.js
const CyberStraightMan3D = dynamic(
  () => import("@/components/CyberStraightMan3D"),
  { ssr: false },
);

export default function PreviewBotPage() {
  const [finish, setFinish] = useState<FinishTheme>("obsidian");
  const [zoomLevel, setZoomLevel] = useState<"full" | "bust" | "head">("full");

  return (
    <main className="relative min-h-screen w-full bg-[#070709] text-white overflow-hidden flex flex-col">
      {/* Top Header Bar */}
      <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-[#0a0a0e]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
          >
            ← KEMBALI KE HOMEPAGE
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#ffc53d] font-bold">
            PREVIEW ROBOT 3D BARU (THE STRAIGHT MAN v2)
          </span>
        </div>

        {/* Finish Selector */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
          <span className="text-[11px] font-mono text-zinc-400 px-2">FINISH:</span>
          {(["obsidian", "bronze", "sapphire"] as FinishTheme[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFinish(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all capitalize ${
                finish === mode
                  ? "bg-[#ffc53d] text-black font-semibold shadow-[0_0_10px_rgba(255,197,61,0.3)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </header>

      {/* Main 3D Canvas Area */}
      <div className="relative flex-1 w-full flex items-center justify-center">
        <div className="w-full h-full absolute inset-0">
          <CyberStraightMan3D finishMode={finish} showControls />
        </div>

        {/* Feature Inspector Badge (Floating Side Card) */}
        <div className="absolute top-6 right-6 z-10 max-w-sm p-4 rounded-2xl bg-[#0a0a0e]/85 border border-white/10 backdrop-blur-lg flex flex-col gap-3 shadow-2xl pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffc53d] animate-ping" />
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#ffc53d] font-bold">
              High-Tech Architecture Specs
            </h4>
          </div>
          <ul className="text-xs text-zinc-300 font-mono space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-[#ffc53d]">▸</span>
              <span>
                <strong>Stealth Cyber-Chassis:</strong> Polyhedral faceted head
                armor dengan tinted curved visor.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ffc53d]">▸</span>
              <span>
                <strong>Animated Audio Spectrogram:</strong> Bar equalizer emas
                di dalam visor berdenyut real-time.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ffc53d]">▸</span>
              <span>
                <strong>Dual Hydraulic Neck:</strong> Piston chrome kiri-kanan
                yang memanjang & memendek mengikuti tilt kepala.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ffc53d]">▸</span>
              <span>
                <strong>Golden Logic Reactor Core:</strong> Inti reaktor komedi
                di dada berputar dengan dual gyroscopic rings.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ffc53d]">▸</span>
              <span>
                <strong>Articulated Cyber Hands:</strong> Tangan mekanik 4 jari
                beruas memegang mic stand vintage secara natural.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ffc53d]">▸</span>
              <span>
                <strong>Floating Sensor Halo:</strong> Cincin emitor emas melayang
                di atas kepala menggantikan antena stik lama.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
