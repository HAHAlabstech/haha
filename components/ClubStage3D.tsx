"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Activity, Cpu, Zap, Volume2 } from "lucide-react";

type FinishTheme = "gold" | "indigo" | "obsidian";

const AI_THOUGHTS = [
  "Literal confidence: 98.4%. Processing semantic ambiguity...",
  "Input parsed literally. No punchline detected.",
  "Warning: Audience laughter threshold approaching 60%.",
  "Semantic entropy: 4.82 bits. Recalibrating deadpan baseline...",
  "Straight Man weights unaffected. Try a sharper expectation flip.",
  "Audience quorum laughing. Straight Man maintains zero emotion.",
];

export default function ClubStage3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [theme, setTheme] = useState<FinishTheme>("gold");
  const [pokeCount, setPokeCount] = useState(0);
  const [currentThought, setCurrentThought] = useState(AI_THOUGHTS[0]);
  const [audioFreq, setAudioFreq] = useState("124.8 HZ");

  const themeRef = useRef<FinishTheme>("gold");
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Handle poke / tap interaction
  const handlePoke = (e: React.MouseEvent) => {
    const nextCount = pokeCount + 1;
    setPokeCount(nextCount);
    setCurrentThought(AI_THOUGHTS[nextCount % AI_THOUGHTS.length]);
    setAudioFreq(`${(110 + Math.random() * 40).toFixed(1)} HZ`);

    // Trigger ripple pulse in canvas
    if (triggerPulseRef.current) {
      triggerPulseRef.current();
    }
  };

  const triggerPulseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let animId = 0;
    let time = 0;

    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    // Shockwave ripples
    const ripples: { x: number; y: number; r: number; alpha: number }[] = [];

    triggerPulseRef.current = () => {
      ripples.push({
        x: W * 0.5,
        y: H * 0.46,
        r: 10,
        alpha: 1.0,
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetMouseX = x * 2;
      targetMouseY = y * 2;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth || window.innerWidth;
      H = cv.clientHeight || window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Particle nodes for neural ring
    const particles: { angle: number; radius: number; speed: number; size: number; phase: number }[] = [];
    for (let i = 0; i < 72; i++) {
      particles.push({
        angle: (i / 72) * Math.PI * 2,
        radius: 140 + (i % 3) * 35,
        speed: (0.003 + (i % 5) * 0.001) * (i % 2 === 0 ? 1 : -1),
        size: 1.5 + (i % 4) * 0.8,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      time += 0.016;
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Deep obsidian void background with smooth vignette
      ctx.clearRect(0, 0, W, H);

      const isMobile = W < 860;
      const cx = isMobile ? W * 0.5 : W * 0.68;
      const cy = isMobile ? H * 0.40 : H * 0.46;
      const baseRadius = Math.min(W, H) * (isMobile ? 0.22 : 0.25);

      const activeTheme = themeRef.current;
      const primaryColor =
        activeTheme === "gold"
          ? "#ffc53d"
          : activeTheme === "indigo"
          ? "#6366f1"
          : "#e4e4e7";

      const glowColor =
        activeTheme === "gold"
          ? "rgba(255, 197, 61, 0.22)"
          : activeTheme === "indigo"
          ? "rgba(99, 102, 241, 0.28)"
          : "rgba(255, 255, 255, 0.12)";

      // 1. Ambient Stage Spotlight Glow
      const spotGlow = ctx.createRadialGradient(
        cx,
        cy - baseRadius * 0.4,
        20,
        cx,
        cy,
        baseRadius * 2.8,
      );
      spotGlow.addColorStop(0, glowColor);
      spotGlow.addColorStop(0.5, "rgba(7, 7, 9, 0.4)");
      spotGlow.addColorStop(1, "rgba(7, 7, 9, 0)");
      ctx.fillStyle = spotGlow;
      ctx.fillRect(0, 0, W, H);

      // 2. Concentric Acoustic Harmonic Rings (Pulsing soundwave)
      for (let r = 1; r <= 4; r++) {
        const ringProgress = (time * 0.4 + r * 0.25) % 1;
        const currentR = baseRadius * (0.8 + ringProgress * 1.4);
        const ringAlpha = (1 - ringProgress) * 0.35;

        ctx.beginPath();
        ctx.ellipse(
          cx + mouseX * 12,
          cy + mouseY * 12,
          currentR,
          currentR * 0.42,
          mouseX * 0.1,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle =
          activeTheme === "gold"
            ? `rgba(255, 197, 61, ${ringAlpha})`
            : activeTheme === "indigo"
            ? `rgba(99, 102, 241, ${ringAlpha})`
            : `rgba(255, 255, 255, ${ringAlpha * 0.8})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 3. Draw Shockwave Ripples from Poking
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        if (!rp) continue;
        rp.r += 6;
        rp.alpha -= 0.02;

        if (rp.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.ellipse(cx, cy, rp.r, rp.r * 0.42, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 197, 61, ${rp.alpha * 0.7})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 4. Rotating Neural Constellation Nodes
      particles.forEach((p) => {
        p.angle += p.speed;
        const wave = Math.sin(time * 2 + p.phase) * 12;
        const rad = p.radius + wave;
        const px = cx + Math.cos(p.angle) * rad + mouseX * 20;
        const py = cy + Math.sin(p.angle) * rad * 0.45 + mouseY * 15;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle =
          activeTheme === "gold"
            ? `rgba(255, 216, 117, ${0.4 + Math.sin(time * 3 + p.phase) * 0.3})`
            : `rgba(165, 180, 252, ${0.4 + Math.sin(time * 3 + p.phase) * 0.3})`;
        ctx.fill();
      });

      // 5. Central Holographic Core (Straight Man AI Core)
      const coreX = cx + mouseX * 18;
      const coreY = cy + mouseY * 15;
      const coreR = baseRadius * 0.52;

      // Outer core rim glow
      const coreGlow = ctx.createRadialGradient(
        coreX,
        coreY,
        coreR * 0.7,
        coreX,
        coreY,
        coreR * 1.5,
      );
      coreGlow.addColorStop(0, "rgba(255, 197, 61, 0.4)");
      coreGlow.addColorStop(0.5, glowColor);
      coreGlow.addColorStop(1, "transparent");
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(coreX, coreY, coreR * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Deep metallic sphere
      const sphereGrad = ctx.createRadialGradient(
        coreX - coreR * 0.35,
        coreY - coreR * 0.35,
        coreR * 0.1,
        coreX,
        coreY,
        coreR,
      );
      sphereGrad.addColorStop(0, "#22222e");
      sphereGrad.addColorStop(0.5, "#101017");
      sphereGrad.addColorStop(0.9, "#070709");
      sphereGrad.addColorStop(1, "#030305");

      ctx.beginPath();
      ctx.arc(coreX, coreY, coreR, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // Luminous Equatorial Ring
      ctx.beginPath();
      ctx.ellipse(
        coreX,
        coreY,
        coreR * 1.15,
        coreR * 0.28,
        mouseX * 0.15,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner Deadpan Optical Aperture (The "Straight Eye")
      const eyeR = coreR * 0.32;
      const eyeX = coreX + mouseX * 8;
      const eyeY = coreY + mouseY * 6;

      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fillStyle = "#070709";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Horizontal Deadpan Slit Pupil (Unflinching, robotic, deadpan)
      const slitW = eyeR * 1.2;
      const slitH = 3;
      ctx.fillStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 12;
      ctx.fillRect(eyeX - slitW * 0.5, eyeY - slitH * 0.5, slitW, slitH);
      ctx.shadowBlur = 0;

      // 6. Stage Pedestal Base (Subtle metallic disc below)
      const baseDiscY = cy + baseRadius * 0.95;
      const baseDiscR = baseRadius * 1.35;
      const baseGrad = ctx.createRadialGradient(
        cx,
        baseDiscY,
        baseDiscR * 0.2,
        cx,
        baseDiscY,
        baseDiscR,
      );
      baseGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
      baseGrad.addColorStop(0.6, "rgba(255, 255, 255, 0.02)");
      baseGrad.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.ellipse(cx, baseDiscY, baseDiscR, baseDiscR * 0.32, 0, 0, Math.PI * 2);
      ctx.fillStyle = baseGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      aria-label="Interactive AI Straight Man Neural Core"
    >
      {/* Interactive WebGL / Canvas Stage */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Discrete Sleek Floating Telemetry HUD (Bottom Right / Left) */}
      <div className="pointer-events-auto absolute bottom-6 right-6 md:right-12 z-20 flex flex-col items-end gap-3 max-w-sm">
        {/* Live Thought Bubble */}
        <div className="bg-[#0c0c12]/80 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-xl shadow-2xl text-right">
          <div className="flex items-center justify-end gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            <Activity className="w-3 h-3 text-[#ffc53d] animate-pulse" />
            <span>Straight Man · Acoustic Telemetry</span>
          </div>
          <p className="font-mono text-xs text-[#f4f4f7] leading-relaxed">
            {currentThought}
          </p>
        </div>

        {/* Interactive Controls Pill */}
        <div className="inline-flex items-center gap-2 bg-[#0c0c12]/90 border border-white/10 rounded-full p-1.5 backdrop-blur-xl shadow-lg">
          <button
            type="button"
            onClick={handlePoke}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffc53d]/10 hover:bg-[#ffc53d]/20 border border-[#ffc53d]/30 font-mono text-[10px] uppercase tracking-wider text-[#ffc53d] transition-all"
          >
            <Zap className="w-3 h-3" />
            <span>Poke AI Core ({pokeCount})</span>
          </button>

          <div className="h-3 w-px bg-white/10" />

          {/* Theme Selector */}
          <div className="flex items-center gap-1 px-1">
            <button
              type="button"
              onClick={() => setTheme("gold")}
              className={`h-4 w-4 rounded-full transition-all ${
                theme === "gold"
                  ? "bg-[#ffc53d] ring-2 ring-[#ffc53d]/40 scale-110"
                  : "bg-amber-800 opacity-60 hover:opacity-100"
              }`}
              title="Champagne Gold"
            />
            <button
              type="button"
              onClick={() => setTheme("indigo")}
              className={`h-4 w-4 rounded-full transition-all ${
                theme === "indigo"
                  ? "bg-[#6366f1] ring-2 ring-[#6366f1]/40 scale-110"
                  : "bg-indigo-900 opacity-60 hover:opacity-100"
              }`}
              title="Royal Indigo"
            />
            <button
              type="button"
              onClick={() => setTheme("obsidian")}
              className={`h-4 w-4 rounded-full transition-all ${
                theme === "obsidian"
                  ? "bg-white ring-2 ring-white/40 scale-110"
                  : "bg-zinc-700 opacity-60 hover:opacity-100"
              }`}
              title="Obsidian Void"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
