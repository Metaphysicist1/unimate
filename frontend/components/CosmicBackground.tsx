"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useScroll, useMotionValue } from "framer-motion";

const PARTICLE_COUNT = 1800;
const BASE_COLOR = { r: 160, g: 216, b: 255 };

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  opacity: number;
}

function createParticles(w: number, h: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: (Math.random() - 0.5) * w * 2.5,
      y: (Math.random() - 0.5) * h * 2.5,
      z: Math.random() * 1000,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3 - 0.15,
      vz: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 1.8 + 0.3,
      opacity: Math.random() * 0.6 + 0.25,
    });
  }
  return particles;
}

const CosmicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const animRef = useRef<number>(0);
  const { scrollYProgress } = useScroll();

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mouseX.set((e.clientX - cx) / cx);
      mouseY.set((e.clientY - cy) / cy);
    },
    [mouseX, mouseY],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particlesRef.current.length === 0) {
        particlesRef.current = createParticles(canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const mx = mouseX.get();
      const my = mouseY.get();
      const scroll = scrollYProgress.get();

      ctx.fillStyle = "#000213";
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2 + mx * 80;
      const cy = h / 2 + my * 50;
      const fov = 500;
      const depthShift = scroll * 400;

      for (const p of particlesRef.current) {
        p.x += p.vx + mx * 0.08;
        p.y += p.vy + my * 0.06;
        p.z += p.vz - depthShift * 0.002;

        if (p.z < 1) p.z = 1000;
        if (p.z > 1000) p.z = 1;
        if (p.x > w * 1.3) p.x = -w * 1.3;
        if (p.x < -w * 1.3) p.x = w * 1.3;
        if (p.y > h * 1.3) p.y = -h * 1.3;
        if (p.y < -h * 1.3) p.y = h * 1.3;

        const scale = fov / (fov + p.z);
        const sx = cx + p.x * scale;
        const sy = cy + p.y * scale;
        const r = p.size * scale * 1.5;

        if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;

        const a = p.opacity * scale;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(r, 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${BASE_COLOR.r},${BASE_COLOR.g},${BASE_COLOR.b},${a})`;
        ctx.fill();
      }

      const grd = ctx.createRadialGradient(cx, cy, h * 0.15, cx, cy, h * 0.9);
      grd.addColorStop(0, "rgba(30,80,200,0.04)");
      grd.addColorStop(0.5, "rgba(10,20,40,0.02)");
      grd.addColorStop(1, "rgba(0,2,19,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY, scrollYProgress, handleMouseMove]);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-auto">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/50" />
    </div>
  );
};

export default CosmicBackground;
