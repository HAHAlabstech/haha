"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  direction?: "up" | "left" | "right" | "scale";
  threshold?: number;
}

export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  direction = "up",
  threshold = 0.14,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== "undefined") {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        setVisible(true);
        return;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const hiddenTransform =
    direction === "left"
      ? "translate3d(-32px, 0, 0) scale(0.985)"
      : direction === "right"
        ? "translate3d(32px, 0, 0) scale(0.985)"
        : direction === "scale"
          ? "translate3d(0, 18px, 0) scale(0.95)"
          : "translate3d(0, 32px, 0) scale(0.985)";

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0, 0, 0) scale(1)" : hiddenTransform,
        filter: visible ? "blur(0px)" : "blur(6px)",
        transition: `opacity 780ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms, transform 780ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms, filter 680ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
        willChange: "opacity, transform, filter",
      }}
      className={className}
    >
      {children}
    </div>
  );
}
