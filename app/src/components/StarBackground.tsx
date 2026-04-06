"use client";
import { useEffect, useRef } from "react";

export function StarBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number) {
      ctx.clearRect(0, 0, w, h);
      let seed = 42;
      function rand() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
      }
      for (let i = 0; i < 220; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = rand() * 1.2 + 0.3;
        const opacity = rand() * 0.6 + 0.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${opacity.toFixed(2)})`;
        ctx.fill();
      }
      seed = 99;
      for (let i = 0; i < 20; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = rand() * 1.0 + 1.2;
        const opacity = rand() * 0.4 + 0.55;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,225,255,${opacity.toFixed(2)})`;
        ctx.fill();
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawStars(ctx, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
