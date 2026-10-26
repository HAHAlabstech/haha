"use client";

import { useEffect } from "react";
import type Lenis from "lenis";

const SMOOTH = true;
let lenis: Lenis | null = null;
let wake: () => void = () => {};

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

function computeTargetScrollY(el: HTMLElement, id: string): number {
  const rect = el.getBoundingClientRect();
  const baseTop = rect.top + window.scrollY;
  const isDesktopPinned = window.matchMedia(
    "(min-width: 1024px) and (min-height: 680px)",
  ).matches;

  // #waveform (01 / The Science) overlaps the hero by -160vh and zooms in over 60vh (--lp-zin).
  // Scrolling +65vh into #waveform lands right where --zk === 1 and the first step is active.
  if (id === "waveform" && isDesktopPinned) {
    return baseTop + window.innerHeight * 0.65;
  }

  // #how-it-works (How HAHA Works) uses a sticky 100vh stage inside a 340vh runway.
  // Landing at baseTop aligns the sticky stage flush with the viewport top.
  if (id === "how-it-works") {
    return baseTop;
  }

  return Math.max(0, baseTop - 72);
}

/* Scrolls to an element by id smoothly using Lenis */
export function scrollToId(id: string): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }
  const el = document.getElementById(id);
  if (!el) return false;
  const targetY = computeTargetScrollY(el, id);

  if (lenis) {
    lenis.scrollTo(targetY, { duration: 1.15, easing: easeOutQuart });
    wake();
    return true;
  }
  window.scrollTo({
    top: targetY,
    behavior: reducedMotion() ? "auto" : "smooth",
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

        const onAnchorClick = (e: MouseEvent) => {
          const target = (e.target as HTMLElement)?.closest("a");
          if (!target) return;
          const href = target.getAttribute("href");
          if (!href) return;
          const hashIndex = href.indexOf("#");
          if (hashIndex === -1) return;
          const path = href.slice(0, hashIndex);
          const hash = href.slice(hashIndex + 1);
          if (!hash) return;
          if (
            path === "" ||
            path === "/" ||
            (typeof window !== "undefined" && path === window.location.pathname)
          ) {
            const el = document.getElementById(hash);
            if (el) {
              e.preventDefault();
              window.history.pushState(null, "", `#${hash}`);
              scrollToId(hash);
            }
          }
        };

        document.addEventListener("click", onAnchorClick, { capture: true });

        if (typeof window !== "undefined" && window.location.hash) {
          const initialHash = window.location.hash.slice(1);
          setTimeout(() => {
            scrollToId(initialHash);
          }, 350);
        }

        teardown = () => {
          window.removeEventListener("wheel", wake);
          window.removeEventListener("keydown", wake);
          window.removeEventListener("scroll", wake);
          document.removeEventListener("click", onAnchorClick, {
            capture: true,
          });
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
