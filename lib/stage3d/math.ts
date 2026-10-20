/*
 * Math and easing primitives for the orthographic 3D Canvas stage engine.
 */

export const TAU = Math.PI * 2;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Extracts a sub-progress [0..1] from progress within [start, start + dur]. */
export function piece(progress: number, start: number, dur: number): number {
  if (dur <= 0) return progress >= start ? 1 : 0;
  return clamp((progress - start) / dur, 0, 1);
}

export const ease = {
  out(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  },
  inOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  quadOut(t: number): number {
    return 1 - (1 - t) * (1 - t);
  },
};
