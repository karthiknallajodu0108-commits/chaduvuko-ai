import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CinematicIntroProps {
  onComplete: () => void;
}

export function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<'universe' | 'logo' | 'sweep' | 'exit'>('universe');

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      onComplete();
      return;
    }

    const t1 = window.setTimeout(() => setPhase('logo'), 1100);
    const t2 = window.setTimeout(() => setPhase('sweep'), 2500);
    const t3 = window.setTimeout(() => setPhase('exit'), 4100);
    const t4 = window.setTimeout(() => onComplete(), 4900);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // 3D starfield & depth particles
    const starCount = width < 768 ? 70 : 130;
    const stars = Array.from({ length: starCount }, () => ({
      x: (Math.random() - 0.5) * width * 1.8,
      y: (Math.random() - 0.5) * height * 1.8,
      z: Math.random() * 1200 + 100,
      size: Math.random() * 1.6 + 0.5,
      hue: Math.random() > 0.7 ? '#6EE7B7' : Math.random() > 0.4 ? '#93C5FD' : '#E2E8F0',
    }));

    const startTime = performance.now();

    const draw = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // Deep midnight atmospheric gradient
      const bg = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.78
      );
      bg.addColorStop(0, '#16243D');
      bg.addColorStop(0.45, '#101828');
      bg.addColorStop(1, '#080D17');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric aurora glow behind center emblem
      const glowRadius = Math.min(width, height) * (0.28 + Math.min(elapsed * 0.04, 0.14));
      const glow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        0,
        width * 0.5,
        height * 0.5,
        glowRadius
      );
      glow.addColorStop(0, 'rgba(110, 231, 183, 0.14)');
      glow.addColorStop(0.5, 'rgba(147, 197, 253, 0.08)');
      glow.addColorStop(1, 'rgba(16, 24, 40, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Perspective camera forward motion through particles
      const cx = width * 0.5;
      const cy = height * 0.5;
      const speed = elapsed > 3.6 ? 11.5 : 3.4;

      for (const s of stars) {
        s.z -= speed;
        if (s.z <= 20) {
          s.z = 1200;
          s.x = (Math.random() - 0.5) * width * 1.8;
          s.y = (Math.random() - 0.5) * height * 1.8;
        }
        const scale = 380 / s.z;
        const sx = cx + s.x * scale;
        const sy = cy + s.y * scale;
        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;

        const alpha = Math.min(1, (1200 - s.z) / 900) * 0.75;
        ctx.beginPath();
        ctx.fillStyle = s.hue;
        ctx.globalAlpha = alpha;
        ctx.arc(sx, sy, Math.max(0.5, s.size * scale * 0.9), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 3D-tilted orbital trajectory lines
      const orbits = [
        { rx: Math.min(width, height) * 0.24, ry: Math.min(width, height) * 0.1, rot: -0.35, color: 'rgba(147, 197, 253, 0.22)', speed: 0.28 },
        { rx: Math.min(width, height) * 0.34, ry: Math.min(width, height) * 0.14, rot: 0.42, color: 'rgba(196, 181, 253, 0.18)', speed: -0.2 },
        { rx: Math.min(width, height) * 0.44, ry: Math.min(width, height) * 0.18, rot: -0.12, color: 'rgba(110, 231, 183, 0.14)', speed: 0.14 },
      ];

      orbits.forEach((orb, idx) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(orb.rot + elapsed * orb.speed * 0.2);
        const zoom = 1 + Math.min(elapsed * 0.03, 0.16);
        ctx.scale(zoom, zoom);

        ctx.beginPath();
        ctx.ellipse(0, 0, orb.rx, orb.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = orb.color;
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Orbital satellite node
        const angle = elapsed * (0.9 + idx * 0.3) + idx * 2.1;
        const nx = Math.cos(angle) * orb.rx;
        const ny = Math.sin(angle) * orb.ry;
        ctx.beginPath();
        ctx.fillStyle = idx === 2 ? '#6EE7B7' : idx === 1 ? '#C4B5FD' : '#93C5FD';
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="cinematic-intro"
        initial={{ opacity: 1 }}
        animate={{
          opacity: phase === 'exit' ? 0 : 1,
          scale: phase === 'exit' ? 1.06 : 1,
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 overflow-hidden bg-[#080D17] flex items-center justify-center"
        aria-label="CHADHUVUKO opening sequence"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Skip Intro Button */}
        <button
          type="button"
          onClick={onComplete}
          className="absolute top-6 right-6 z-20 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EE7B7]"
        >
          Skip intro
        </button>

        {/* Center 3D-inspired Emblem + Wordmark + Specular Sweep */}
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.72, y: 12 }}
            animate={{
              opacity: phase === 'universe' ? 0.35 : 1,
              scale: phase === 'universe' ? 0.85 : 1,
              y: 0,
            }}
            transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-7"
          >
            {/* Soft radial emblem halo */}
            <div
              className="absolute -inset-6 rounded-full blur-2xl opacity-45 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, rgba(110,231,183,0.45) 0%, rgba(147,197,253,0.22) 55%, transparent 75%)',
              }}
            />

            <svg
              width="92"
              height="92"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative drop-shadow-2xl"
            >
              <defs>
                <linearGradient id="introSweep" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6EE7B7" />
                  <stop offset="55%" stopColor="#93C5FD" />
                  <stop offset="100%" stopColor="#C4B5FD" />
                </linearGradient>
              </defs>
              <rect
                x="4"
                y="4"
                width="72"
                height="72"
                rx="20"
                fill="#142033"
                stroke="url(#introSweep)"
                strokeWidth="1.5"
              />
              <motion.path
                d="M21 53C17 43.6 19.6 31.6 28.2 24.4C36.8 17.2 49.6 17.4 57.8 24.8"
                stroke="#93C5FD"
                strokeWidth="2.6"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.path
                d="M59.6 41C58.8 51.4 50.2 59.6 39.6 59.6C34.4 59.6 29.6 57.6 26 54.4"
                stroke="#C4B5FD"
                strokeWidth="2.2"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={{ duration: 1.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.path
                d="M27 51L53.6 26.4L44.4 53.2L38.8 42.2L27 51Z"
                fill="#6EE7B7"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: '40px 40px' }}
              />
              <circle cx="40" cy="40" r="3" fill="#101828" />
            </svg>
          </motion.div>

          {/* Wordmark with subtle light sweep */}
          <div className="relative overflow-hidden py-1 px-4">
            <motion.h1
              initial={{ opacity: 0, y: 18, letterSpacing: '0.14em' }}
              animate={{
                opacity: phase === 'universe' ? 0 : 1,
                y: phase === 'universe' ? 18 : 0,
                letterSpacing: phase === 'universe' ? '0.14em' : '-0.02em',
              }}
              transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl sm:text-5xl font-bold text-white"
            >
              CHADHUVUKO
            </motion.h1>

            {/* Specular Light Sweep Overlay */}
            {phase === 'sweep' && (
              <motion.div
                initial={{ x: '-120%' }}
                animate={{ x: '220%' }}
                transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-y-0 w-24 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
              />
            )}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: phase === 'logo' || phase === 'sweep' ? 0.88 : 0,
              y: phase === 'logo' || phase === 'sweep' ? 0 : 12,
            }}
            transition={{ duration: 0.85, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 text-sm sm:text-base text-slate-300 tracking-wide font-normal"
          >
            Find your fit. Build your edge. Land your role.
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
