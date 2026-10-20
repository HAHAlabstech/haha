"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Move, Info, Layers } from "lucide-react";
import { StageEngine, SCENES } from "@/lib/stage3d/engine";
import type { Hotspot } from "@/lib/stage3d/types";

export default function VaultStage3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StageEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [hoveredPart, setHoveredPart] = useState<Hotspot | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new StageEngine(canvas, {
      onHoverChange: (part) => setHoveredPart(part),
      onSceneChange: (idx) => setActiveTab(idx),
    });
    engineRef.current = engine;

    // Scroll-driven scrubbing
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      // Calculate progress while container is in view
      const travel = rect.height + vh;
      const progress = (vh - rect.top) / travel;
      engine.setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Resize observer
    const ro = new ResizeObserver(() => {
      engine.resize();
    });
    ro.observe(canvas);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      ro.disconnect();
      engine.destroy();
    };
  }, []);

  const handleTabChange = (idx: number) => {
    setActiveTab(idx);
    engineRef.current?.setScene(idx);
  };

  const handleReset = () => {
    engineRef.current?.resetView();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#121218]/90 via-[#0c0c12]/90 to-[#070709]/95 p-4 sm:p-6 shadow-2xl backdrop-blur-xl overflow-hidden"
    >
      {/* Top Bar with Scene Switcher Tabs & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 mb-3">
        {/* Scene Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {SCENES.map((scene, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleTabChange(idx)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[11px] sm:text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#ffc53d]/15 text-[#ffc53d] border border-[#ffc53d]/40 shadow-[0_0_15px_rgba(255,197,61,0.2)]"
                    : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                {scene.tag}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            title="Reset 3D camera angle"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-mono text-[11px] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas Stage */}
      <div className="relative w-full h-[320px] sm:h-[400px] lg:h-[440px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-grab active:cursor-grabbing"
        />

        {/* Floating Hint: Drag to rotate */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md font-mono text-[10px] text-zinc-400">
          <Move className="w-3 h-3 text-[#ffc53d]" />
          <span>Drag to rotate 360°</span>
        </div>

        {/* Active Part Callout / Inspection Popup */}
        {hoveredPart && (
          <div className="pointer-events-none absolute top-3 right-3 max-w-[240px] sm:max-w-[280px] rounded-xl border border-[#ffc53d]/30 bg-[#070709]/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#ffc53d] uppercase tracking-wider font-bold mb-1">
              <Info className="w-3 h-3" />
              <span>{hoveredPart.label}</span>
            </div>
            <p className="text-xs text-zinc-300 font-light leading-relaxed">
              {hoveredPart.detail}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Scene Legend */}
      <div className="border-t border-white/10 pt-3 mt-2 flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffc53d] animate-pulse" />
          <span className="text-zinc-300">{SCENES[activeTab]?.title ?? "The Joke Vault"}</span>
        </div>
        <span className="text-zinc-500">Orthographic Canvas 2D Engine // 60 FPS</span>
      </div>
    </div>
  );
}
