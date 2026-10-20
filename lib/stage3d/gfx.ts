/*
 * 3D isometric/orthographic drawing toolkit for Canvas 2D.
 * Calibrated for HAHA Protocol luxury dark stage aesthetic (Obsidian, Warm Gold, Titanium).
 */

import { TAU, clamp } from "./math";
import type { Tone, V3 } from "./types";

export type { Tone, V3 };

export const OBSIDIAN: Tone = [22, 23, 28];
export const OBSIDIAN_DARK: Tone = [12, 13, 17];
export const TITANIUM: Tone = [148, 153, 164];
export const WARM_GOLD: Tone = [255, 197, 61];
export const GOLD_BRIGHT: Tone = [255, 226, 138];

export interface Cam {
  s: number;
  ox: number;
  oy: number;
  cyw: number;
  syw: number;
  cp: number;
  sp: number;
  dpr: number;
  L: V3;
  pitch: number;
}

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export function makeCam(opts: {
  yaw: number;
  pitch: number;
  s: number;
  ox: number;
  oy: number;
  dpr: number;
  px: number;
}): Cam {
  return {
    s: opts.s,
    ox: opts.ox,
    oy: opts.oy,
    cyw: Math.cos(opts.yaw),
    syw: Math.sin(opts.yaw),
    cp: Math.cos(opts.pitch),
    sp: Math.sin(opts.pitch),
    dpr: opts.dpr,
    pitch: opts.pitch,
    L: norm([-0.45 + opts.px * 0.4, 0.65, 0.62]),
  };
}

/** Projects a 3D world coordinate to [screenX, screenY, depth]. */
export function P(cam: Cam, x: number, y: number, z: number): [number, number, number] {
  const x1 = x * cam.cyw + z * cam.syw;
  const z1 = -x * cam.syw + z * cam.cyw;
  const y2 = y * cam.cp - z1 * cam.sp;
  const z2 = y * cam.sp + z1 * cam.cp;
  return [cam.ox + x1 * cam.s, cam.oy - y2 * cam.s, z2];
}

/** Rotates a 3D world normal into camera view space. */
export function viewDir(cam: Cam, n: V3): V3 {
  const x1 = n[0] * cam.cyw + n[2] * cam.syw;
  const z1 = -n[0] * cam.syw + n[2] * cam.cyw;
  return [x1, n[1] * cam.cp - z1 * cam.sp, n[1] * cam.sp + z1 * cam.cp];
}

/** Painter's algorithm depth queue for z-sorting. */
export class Queue {
  private items: Array<{ d: number; fn: () => void }> = [];

  add(depth: number, fn: () => void): void {
    this.items.push({ d: depth, fn });
  }

  flush(): void {
    this.items.sort((a, b) => a.d - b.d);
    for (const item of this.items) {
      item.fn();
    }
    this.items.length = 0;
  }
}

function shade(tone: Tone, cam: Cam, normal: V3, roughness = 0.5, boost = 1): string {
  const n = viewDir(cam, normal);
  const diff = Math.max(0, n[0] * cam.L[0] + n[1] * cam.L[1] + n[2] * cam.L[2]);
  const ambient = 0.22;
  const factor = (ambient + (1 - ambient) * diff * roughness) * boost;
  const r = Math.min(255, Math.round(tone[0] * factor));
  const g = Math.min(255, Math.round(tone[1] * factor));
  const b = Math.min(255, Math.round(tone[2] * factor));
  return `rgb(${r},${g},${b})`;
}

export interface BoxOpts {
  c: V3;
  size: V3;
  tone?: Tone;
  topTone?: Tone;
  edgeTone?: string;
  engraved?: string;
  glow?: boolean;
}

export function drawBox(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  fontMono: string,
  opts: BoxOpts
): void {
  const [x, y, z] = opts.c;
  const [w, h, d] = opts.size;
  const dx = w / 2;
  const dy = h / 2;
  const dz = d / 2;
  const tone = opts.tone ?? OBSIDIAN;
  const topTone = opts.topTone ?? tone;

  // 8 corners
  const p000 = P(cam, x - dx, y - dy, z - dz);
  const p100 = P(cam, x + dx, y - dy, z - dz);
  const p110 = P(cam, x + dx, y + dy, z - dz);
  const p010 = P(cam, x - dx, y + dy, z - dz);
  const p001 = P(cam, x - dx, y - dy, z + dz);
  const p101 = P(cam, x + dx, y - dy, z + dz);
  const p111 = P(cam, x + dx, y + dy, z + dz);
  const p011 = P(cam, x - dx, y + dy, z + dz);

  // Draw visible faces based on normal projection
  // Top face (+Y)
  ctx.beginPath();
  ctx.moveTo(p010[0], p010[1]);
  ctx.lineTo(p110[0], p110[1]);
  ctx.lineTo(p111[0], p111[1]);
  ctx.lineTo(p011[0], p011[1]);
  ctx.closePath();
  ctx.fillStyle = shade(topTone, cam, [0, 1, 0], 0.7, opts.glow ? 1.3 : 1);
  ctx.fill();

  if (opts.edgeTone) {
    ctx.strokeStyle = opts.edgeTone;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Front face (+Z) if pointing towards viewer
  const nZ = viewDir(cam, [0, 0, 1]);
  if (nZ[2] > -0.01) {
    ctx.beginPath();
    ctx.moveTo(p001[0], p001[1]);
    ctx.lineTo(p101[0], p101[1]);
    ctx.lineTo(p111[0], p111[1]);
    ctx.lineTo(p011[0], p011[1]);
    ctx.closePath();
    ctx.fillStyle = shade(tone, cam, [0, 0, 1], 0.45);
    ctx.fill();
    if (opts.edgeTone) {
      ctx.strokeStyle = opts.edgeTone;
      ctx.stroke();
    }
  }

  // Right face (+X)
  const nX = viewDir(cam, [1, 0, 0]);
  if (nX[2] > -0.01) {
    ctx.beginPath();
    ctx.moveTo(p100[0], p100[1]);
    ctx.lineTo(p101[0], p101[1]);
    ctx.lineTo(p111[0], p111[1]);
    ctx.lineTo(p110[0], p110[1]);
    ctx.closePath();
    ctx.fillStyle = shade(tone, cam, [1, 0, 0], 0.55);
    ctx.fill();
    if (opts.edgeTone) {
      ctx.strokeStyle = opts.edgeTone;
      ctx.stroke();
    }
  }

  // Left face (-X)
  const nNegX = viewDir(cam, [-1, 0, 0]);
  if (nNegX[2] > -0.01) {
    ctx.beginPath();
    ctx.moveTo(p000[0], p000[1]);
    ctx.lineTo(p001[0], p001[1]);
    ctx.lineTo(p011[0], p011[1]);
    ctx.lineTo(p010[0], p010[1]);
    ctx.closePath();
    ctx.fillStyle = shade(tone, cam, [-1, 0, 0], 0.35);
    ctx.fill();
    if (opts.edgeTone) {
      ctx.strokeStyle = opts.edgeTone;
      ctx.stroke();
    }
  }

  // Engraved text on front or top
  if (opts.engraved) {
    const pc = P(cam, x, y + dy + 0.1, z);
    ctx.save();
    ctx.font = `600 ${Math.max(9, Math.round(11 * cam.s * 0.01))}px ${fontMono}`;
    ctx.fillStyle = opts.glow ? "rgba(255,197,61,0.95)" : "rgba(255,255,255,0.6)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.engraved, pc[0], pc[1]);
    ctx.restore();
  }
}

export function drawCyl(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  c: V3,
  radius: number,
  height: number,
  tone: Tone,
  segments = 24
): void {
  const [x, y, z] = c;
  const hy = height / 2;

  // Draw side faces
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * TAU;
    const a1 = ((i + 1) / segments) * TAU;
    const x0 = x + Math.cos(a0) * radius;
    const z0 = z + Math.sin(a0) * radius;
    const x1 = x + Math.cos(a1) * radius;
    const z1 = z + Math.sin(a1) * radius;

    const midA = (a0 + a1) / 2;
    const normal: V3 = [Math.cos(midA), 0, Math.sin(midA)];
    const n = viewDir(cam, normal);
    if (n[2] < -0.05) continue; // culled backface

    const p0b = P(cam, x0, y - hy, z0);
    const p1b = P(cam, x1, y - hy, z1);
    const p1t = P(cam, x1, y + hy, z1);
    const p0t = P(cam, x0, y + hy, z0);

    ctx.beginPath();
    ctx.moveTo(p0b[0], p0b[1]);
    ctx.lineTo(p1b[0], p1b[1]);
    ctx.lineTo(p1t[0], p1t[1]);
    ctx.lineTo(p0t[0], p0t[1]);
    ctx.closePath();
    ctx.fillStyle = shade(tone, cam, normal, 0.6);
    ctx.fill();
  }

  // Top cap
  ctx.beginPath();
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * TAU;
    const px = x + Math.cos(a) * radius;
    const pz = z + Math.sin(a) * radius;
    const pt = P(cam, px, y + hy, pz);
    if (i === 0) ctx.moveTo(pt[0], pt[1]);
    else ctx.lineTo(pt[0], pt[1]);
  }
  ctx.closePath();
  ctx.fillStyle = shade(tone, cam, [0, 1, 0], 0.8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,197,61,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawFloor(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  radius: number,
  opacity: number
): void {
  if (opacity <= 0.01) return;
  const p0 = P(cam, -radius, 0, -radius);
  const p1 = P(cam, radius, 0, -radius);
  const p2 = P(cam, radius, 0, radius);
  const p3 = P(cam, -radius, 0, radius);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.lineTo(p3[0], p3[1]);
  ctx.closePath();
  ctx.fillStyle = `rgba(10, 10, 14, ${0.85 * opacity})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 197, 61, ${0.15 * opacity})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  c: V3,
  rx: number,
  rz: number,
  opacity: number
): void {
  if (opacity <= 0.01) return;
  const pc = P(cam, c[0], 0, c[2]);
  const pr = rx * cam.s;

  ctx.save();
  const grad = ctx.createRadialGradient(pc[0], pc[1], 0, pc[0], pc[1], pr);
  grad.addColorStop(0, `rgba(0, 0, 0, ${0.65 * opacity})`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(pc[0], pc[1], pr, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawLaser(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  from: V3,
  to: V3,
  color = "rgba(255,197,61,0.85)",
  width = 1.5
): void {
  const p1 = P(cam, from[0], from[1], from[2]);
  const p2 = P(cam, to[0], to[1], to[2]);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();

  // Glow line
  ctx.strokeStyle = "rgba(255,197,61,0.2)";
  ctx.lineWidth = width * 3;
  ctx.stroke();
  ctx.restore();
}
