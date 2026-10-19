"use client";

import { useEffect, useRef } from "react";

export default function LaocoonChrome({
  showStoryDashes = false,
  dashProgress = [0, 0, 0, 0],
}: {
  showStoryDashes?: boolean;
  dashProgress?: [number, number, number, number];
}) {
  const dot0Ref = useRef<HTMLDivElement>(null);
  const dot1Ref = useRef<HTMLDivElement>(null);
  const dot2Ref = useRef<HTMLDivElement>(null);
  const dot3Ref = useRef<HTMLDivElement>(null);
  const cursorInnerRef = useRef<HTMLDivElement>(null);
  const cursorOuterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;

    const updateDots = () => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const s = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      if (dot0Ref.current) {
        dot0Ref.current.style.top = `${12 + ((s * 160) % 78)}%`;
      }
      if (dot1Ref.current) {
        dot1Ref.current.style.top = `${88 - ((s * 190) % 76)}%`;
      }
      if (dot2Ref.current) {
        dot2Ref.current.style.top = `${28 + ((s * 140) % 66)}%`;
      }
      if (dot3Ref.current) {
        dot3Ref.current.style.top = `${74 - ((s * 170) % 64)}%`;
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateDots);
    };

    updateDots();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // Custom Dual-Ring Cursor
    let targetX = -100;
    let targetY = -100;
    let outerX = -100;
    let outerY = -100;
    let cursorRaf = 0;

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (cursorInnerRef.current) {
        cursorInnerRef.current.style.left = `${targetX}px`;
        cursorInnerRef.current.style.top = `${targetY}px`;
      }
      const el = e.target as HTMLElement | null;
      const isInteractive =
        el?.closest(
          "a, button, summary, input, textarea, select, [data-cursor-hot]",
        ) != null;
      const customLabel =
        el?.closest("[data-cursor-label]")?.getAttribute("data-cursor-label") ??
        "";
      if (cursorOuterRef.current) {
        cursorOuterRef.current.classList.toggle("hot", isInteractive);
        cursorOuterRef.current.textContent = customLabel;
      }
    };

    const tickCursor = () => {
      outerX += (targetX - outerX) * 0.18;
      outerY += (targetY - outerY) * 0.18;
      if (cursorOuterRef.current) {
        cursorOuterRef.current.style.left = `${outerX}px`;
        cursorOuterRef.current.style.top = `${outerY}px`;
      }
      cursorRaf = requestAnimationFrame(tickCursor);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    cursorRaf = requestAnimationFrame(tickCursor);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(cursorRaf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <>
      <div ref={cursorInnerRef} className="cursor-inner" aria-hidden="true" />
      <div ref={cursorOuterRef} className="cursor-outer" aria-hidden="true" />
    </>
  );
}
