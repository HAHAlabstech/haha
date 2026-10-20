import type { Cam, Queue } from "./gfx";

export type V3 = readonly [number, number, number];
export type Tone = readonly [number, number, number];

export interface Hotspot {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
  r: number;
  wx: number;
  wy: number;
  wz: number;
  zoom: number;
}

export interface SceneArgs {
  ctx: CanvasRenderingContext2D;
  cam: Cam;
  q: Queue;
  font: string;
  w: number;
  h: number;
  /** how assembled the scene is, 0..1 */
  form: number;
  /** scroll/progress sub-parameter inside the scene, 0..1 */
  u: number;
  compact: boolean;
  hot: Hotspot[];
  hover: string | null;
  t: number;
  zoom: number;
  name: string;
}

export interface SceneDef {
  id: string;
  title: string;
  tag: string;
  yaw: number;
  pitch: number;
  turn: number;
  limit: number;
  bounds: V3[];
  compactBounds?: V3[];
  draw(a: SceneArgs): void;
}

/** The 8 corners of an axis-aligned world box. */
export function box8(c: V3, size: V3): V3[] {
  const [x, y, z] = c;
  const [w, h, d] = size;
  const dx = w / 2;
  const dy = h / 2;
  const dz = d / 2;
  return [
    [x - dx, y - dy, z - dz],
    [x + dx, y - dy, z - dz],
    [x + dx, y + dy, z - dz],
    [x - dx, y + dy, z - dz],
    [x - dx, y - dy, z + dz],
    [x + dx, y - dy, z + dz],
    [x + dx, y + dy, z + dz],
    [x - dx, y + dy, z + dz],
  ];
}
