/*
 * Interactive 3D Stage Engine for Canvas 2D.
 * Manages rendering loop, camera projections, drag rotation, and scene transitions.
 */

import { clamp, lerp } from "./math";
import { makeCam, P, Queue } from "./gfx";
import type { Hotspot, SceneDef } from "./types";
import { VAULT_SCENE } from "./scenes/vault";
import { TUMBLER_SCENE } from "./scenes/tumbler";
import { LATTICE_SCENE } from "./scenes/lattice";

export const SCENES: readonly SceneDef[] = [VAULT_SCENE, TUMBLER_SCENE, LATTICE_SCENE];

export interface EngineListener {
  onHoverChange?: (hotspot: Hotspot | null) => void;
  onSceneChange?: (sceneIndex: number) => void;
}

export class StageEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number | null = null;
  private listener: EngineListener;

  // Scene states
  private activeIndex = 0;
  private targetScene = 0;
  private forms = [1, 0, 0]; // f0, f1, f2
  private u = 0.5;

  // Drag rotation
  private ry = 0;
  private rp = 0;
  private vy = 0;
  private vp = 0;
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Zoom / Hotspots
  private currentHotspots: Hotspot[] = [];
  private hoveredHotspot: Hotspot | null = null;
  private zoom = 0;
  private targetZoom = 0;

  private clock = 0;
  private lastTime = 0;
  private dpr = 1;
  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement, listener: EngineListener = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Could not obtain 2D context");
    this.ctx = ctx;
    this.listener = listener;

    this.bindEvents();
    this.resize();
    this.start();
  }

  public setScene(idx: number): void {
    if (idx < 0 || idx >= SCENES.length) return;
    this.targetScene = idx;
    this.listener.onSceneChange?.(idx);
  }

  public resetView(): void {
    this.ry = 0;
    this.rp = 0;
    this.vy = 0;
    this.vp = 0;
    this.targetZoom = 0;
  }

  public setScrollProgress(u: number): void {
    this.u = clamp(u, 0, 1);
  }

  private bindEvents(): void {
    const el = this.canvas;

    el.addEventListener("pointerdown", (e) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) * this.dpr;
      const py = (e.clientY - rect.top) * this.dpr;

      if (this.isDragging) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;

        this.vy = dx * 0.008;
        this.vp = dy * 0.006;
        this.ry += this.vy;
        this.rp = clamp(this.rp + this.vp, -0.4, 0.4);
      } else {
        // Hit-test hotspots
        let found: Hotspot | null = null;
        for (const h of this.currentHotspots) {
          const dist = Math.hypot(px - h.x, py - h.y);
          if (dist <= h.r * 1.5) {
            found = h;
            break;
          }
        }
        if (found?.id !== this.hoveredHotspot?.id) {
          this.hoveredHotspot = found;
          this.listener.onHoverChange?.(found);
          el.style.cursor = found ? "pointer" : "grab";
        }
      }
    });

    const stopDrag = () => {
      this.isDragging = false;
    };
    el.addEventListener("pointerup", stopDrag);
    el.addEventListener("pointercancel", stopDrag);

    el.addEventListener("click", () => {
      if (this.hoveredHotspot) {
        this.targetZoom = this.targetZoom > 0.5 ? 0 : this.hoveredHotspot.zoom;
      }
    });
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width * this.dpr;
    this.height = rect.height * this.dpr;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  private start(): void {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.clock += dt;

      this.update(dt);
      this.render();

      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    // Smooth scene transition tweens
    for (let i = 0; i < this.forms.length; i++) {
      const target = i === this.targetScene ? 1 : 0;
      const current = this.forms[i] ?? 0;
      this.forms[i] = lerp(current, target, dt * 7);
    }

    // Inertia damping
    if (!this.isDragging) {
      this.ry += this.vy;
      this.rp = clamp(this.rp + this.vp, -0.4, 0.4);
      this.vy *= 0.9;
      this.vp *= 0.9;
    }

    // Zoom tween
    this.zoom = lerp(this.zoom, this.targetZoom, dt * 6);
  }

  private fit(def: SceneDef, w: number, h: number) {
    const base = makeCam({ yaw: def.yaw, pitch: def.pitch, s: 1, ox: 0, oy: 0, dpr: 1, px: 0 });
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const b of def.bounds) {
      const p = P(base, b[0], b[1], b[2]);
      x0 = Math.min(x0, p[0]);
      x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    const mx = w < 520 ? 20 : 36;
    const top = h * 0.1;
    const bottom = h * 0.1;
    const aw = Math.max(40, w - mx * 2);
    const ah = Math.max(40, h - top - bottom);
    const s = Math.min(aw / (x1 - x0), ah / (y1 - y0));
    return {
      s,
      ox: mx + (aw - (x1 - x0) * s) / 2 - x0 * s,
      oy: top + (ah - (y1 - y0) * s) / 2 - y0 * s,
    };
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const q = new Queue();
    this.currentHotspots = [];

    SCENES.forEach((def, i) => {
      const form = this.forms[i] ?? 0;
      if (form < 0.005) return;

      const f = this.fit(def, w, h);
      const yaw = def.yaw + (this.u - 0.5) * def.turn + this.ry;
      const pitch = clamp(def.pitch + this.rp, 0.25, 0.95);
      const s = f.s * (1 + this.zoom * 0.35);

      const cam = makeCam({
        yaw,
        pitch,
        s,
        ox: f.ox,
        oy: f.oy,
        dpr: this.dpr,
        px: 0,
      });

      def.draw({
        ctx,
        cam,
        q,
        font: "var(--font-geist-mono), monospace",
        w,
        h,
        form,
        u: this.u,
        compact: w < 600,
        hot: this.currentHotspots,
        hover: this.hoveredHotspot?.id ?? null,
        t: this.clock,
        zoom: this.zoom,
        name: "HAHA PROTOCOL",
      });
    });

    q.flush();
  }

  public destroy(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}
