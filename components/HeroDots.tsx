"use client";

import { useEffect, useRef, useState } from "react";

type Particle = { x: number; y: number; vx: number; vy: number };

const LINK_DIST = 110; // dot-to-dot links
const MOUSE_DIST = 170; // cursor-to-dot links

export default function HeroDots() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced, setReduced] = useState(false);

  // Respect "reduce motion": fall back to the static dotted grid.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let parts: Particle[] = [];
    let raf = 0;
    let last = performance.now();
    let mouse: { x: number; y: number } | null = null;

    const init = () => {
      const r = wrap.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Fewer dots on small screens.
      const n = Math.max(28, Math.min(130, Math.floor((w * h) / 12000)));
      parts = Array.from({ length: n }, () => {
        const a = Math.random() * Math.PI * 2;
        const s = 6 + Math.random() * 10; // px per second
        return { x: Math.random() * w, y: Math.random() * h, vx: Math.cos(a) * s, vy: Math.sin(a) * s };
      });
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);

      for (const p of parts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));
      }

      // Dot-to-dot links (neutral gray).
      ctx.lineWidth = 1;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const dx = parts[i].x - parts[j].x;
          const dy = parts[i].y - parts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            ctx.strokeStyle = `rgba(120,120,120,${(1 - d / LINK_DIST) * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(parts[i].x, parts[i].y);
            ctx.lineTo(parts[j].x, parts[j].y);
            ctx.stroke();
          }
        }
      }

      // Cursor links + dots (emerald).
      for (const p of parts) {
        let radius = 1.5;
        let fill = "rgba(115,115,115,0.55)";
        if (mouse) {
          const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (d < MOUSE_DIST) {
            const t = 1 - d / MOUSE_DIST;
            ctx.strokeStyle = `rgba(16,185,129,${t * 0.7})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            radius = 1.5 + t * 1.8;
            fill = `rgba(16,185,129,${0.4 + 0.6 * t})`;
          }
        }
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        mouse = null;
        return;
      }
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      mouse = x >= -50 && x <= w + 50 && y >= -50 && y <= h + 50 ? { x, y } : null;
    };
    const onLeave = () => {
      mouse = null;
    };

    init();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(init);
    ro.observe(wrap);
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  if (reduced) return <div aria-hidden className="hero-grid" />;

  return (
    <div ref={wrapRef} aria-hidden className="hero-canvas">
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
