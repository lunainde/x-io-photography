"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const DOT_SIZE = 8;
const DOT_SIZE_HOVER = 32; // matches the outer ring's diameter

// Home and black & white lean on dark/grayscale imagery where a black dot
// has poor contrast -- accent color reads better there. Everywhere else
// keeps the default black dot.
const ACCENT_DOT_ROUTES = ["/", "/black-white"];

export default function CustomCursor() {
  const pathname = usePathname();
  const useAccentDot = ACCENT_DOT_ROUTES.includes(pathname);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const rafId = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;

    document.documentElement.classList.add("custom-cursor");

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      if (dotRef.current) {
        // translate(-50%, -50%) centers the dot on the cursor regardless of
        // its current size, so growing on hover doesn't need a separate
        // offset recalculation.
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    };
    window.addEventListener("mousemove", onMouseMove);

    const tick = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.15;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.15;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px)`;
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    // Event delegation on [data-cursor-grow] (set on gallery/hero image
    // tiles) rather than wiring hover handlers into every tile component --
    // mouseover/mouseout bubble, so one pair of listeners here covers every
    // image on the site, present or future.
    const setGrow = (isHovering: boolean) => {
      if (!dotRef.current) return;
      const size = isHovering ? DOT_SIZE_HOVER : DOT_SIZE;
      dotRef.current.style.width = `${size}px`;
      dotRef.current.style.height = `${size}px`;
    };
    const onMouseOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-cursor-grow]")) setGrow(true);
    };
    const onMouseOut = (e: MouseEvent) => {
      const leaving = (e.target as HTMLElement).closest("[data-cursor-grow]");
      const entering = (e.relatedTarget as HTMLElement | null)?.closest("[data-cursor-grow]");
      if (leaving && leaving !== entering) setGrow(false);
    };
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);

    return () => {
      document.documentElement.classList.remove("custom-cursor");
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: DOT_SIZE,
          height: DOT_SIZE,
          background: useAccentDot ? "var(--color-accent)" : "var(--color-fg)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          transform: "translate(-100px, -100px)",
          transition: "width 0.25s ease, height 0.25s ease",
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 32,
          height: 32,
          marginLeft: -12,
          marginTop: -12,
          border: "1px solid var(--color-accent)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9998,
          transform: "translate(-100px, -100px)",
        }}
      />
    </>
  );
}
