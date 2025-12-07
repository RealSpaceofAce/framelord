// =============================================================================
// SIDEBAR PARTICLES — Faint drifting particle layer for FrameLord sidebar
// =============================================================================
// Extremely subtle ambient particles that drift slowly behind sidebar content.
// - 15-25 sparse particles, 1-2px size
// - Very low alpha: rgba(160,190,255,0.08)
// - Slow drift with random direction changes
// =============================================================================

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  nextDirectionChange: number;
}

const PARTICLE_COUNT = 20;
const MIN_SIZE = 1;
const MAX_SIZE = 2;
const MIN_SPEED = 0.05;
const MAX_SPEED = 0.15;
const MIN_DIRECTION_INTERVAL = 6000;
const MAX_DIRECTION_INTERVAL = 12000;
const PARTICLE_COLOR = 'rgba(220, 235, 255, 0.15)';

export const SidebarParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    // Create a single particle
    const createParticle = (width: number, height: number): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        nextDirectionChange: Date.now() + MIN_DIRECTION_INTERVAL +
          Math.random() * (MAX_DIRECTION_INTERVAL - MIN_DIRECTION_INTERVAL),
      };
    };

    // Initialize particles
    const initParticles = () => {
      resizeCanvas();
      particlesRef.current = [];

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlesRef.current.push(createParticle(canvas.width, canvas.height));
      }
    };

    // Update particle position and direction
    const updateParticle = (p: Particle, width: number, height: number) => {
      // Check for direction change
      if (Date.now() > p.nextDirectionChange) {
        const angle = Math.random() * Math.PI * 2;
        const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.nextDirectionChange = Date.now() + MIN_DIRECTION_INTERVAL +
          Math.random() * (MAX_DIRECTION_INTERVAL - MIN_DIRECTION_INTERVAL);
      }

      // Move particle
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
    };

    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = PARTICLE_COLOR;

      for (const p of particlesRef.current) {
        updateParticle(p, canvas.width, canvas.height);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Setup
    initParticles();
    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Cleanup
    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};

export default SidebarParticles;
