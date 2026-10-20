"use client";

import { useEffect } from "react";
import type Lenis from "lenis";

/* Smooth wheel scrolling for the landing page, inspired by Dojang's smooth-scroll.tsx.
   Eases mouse wheel steps into continuous 60/120fps motion so scroll-driven 3D and CSS
   timelines glide smoothly without coarse stepping. */

const SMOOTH = true;
let lenis: Lenis | null = null;
let wake: () => void = () => {};

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/* Scrolls to an element by id smoothly using Lenis */
export function scrollToId(id: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.getElementById(id);
  if (!el) return false;
  if (lenis) {
    lenis.scrollTo(el, { duration: 1.4, easing: easeOutQuart });
    wake();
    return true;
  }
  el.scrollIntoView({
    behavior: reducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  return true;
}

export default function SmoothScroll() {
  useEffect(() => {
    if (!SMOOTH || reducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let alive = true;
    let raf = 0;
    let lastWake = 0;
    let teardown = () => {};

    const boot = async () => {
      try {
        const { default: LenisClass } = await import("lenis");
        if (!alive) return;

        const l = new LenisClass({
          lerp: 0.1,
          smoothWheel: true,
          wheelMultiplier: 1.0,
          syncTouch: false,
          autoRaf: false,
          anchors: false,
          prevent: (node) =>
            !!node.closest('[role="dialog"], [data-lenis-prevent]'),
        });
        lenis = l;

        const tick = (time: number) => {
          raf = 0;
          l.raf(time);
          if (l.isScrolling || performance.now() - lastWake < 220) {
            raf = requestAnimationFrame(tick);
          }
        };

        wake = () => {
          lastWake = performance.now();
          if (!raf) raf = requestAnimationFrame(tick);
        };

        window.addEventListener("wheel", wake, { passive: true });
        window.addEventListener("keydown", wake, { passive: true });
        window.addEventListener("scroll", wake, { passive: true });

        teardown = () => {
          window.removeEventListener("wheel", wake);
          window.removeEventListener("keydown", wake);
          window.removeEventListener("scroll", wake);
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          l.destroy();
          if (lenis === l) lenis = null;
          wake = () => {};
        };
      } catch (err) {
        console.warn("SmoothScroll failed to initialize:", err);
      }
    };

    const idle = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          o?: { timeout: number },
        ) => number;
      }
    ).requestIdleCallback;

    if (idle) {
      const id = idle(() => boot(), { timeout: 1000 });
      return () => {
        alive = false;
        teardown();
        (
          window as Window & { cancelIdleCallback?: (id: number) => void }
        ).cancelIdleCallback?.(id);
      };
    } else {
      const t = setTimeout(boot, 100);
      return () => {
        alive = false;
        clearTimeout(t);
        teardown();
      };
    }
  }, []);

  return null;
}
