import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useTime, useMotionTemplate, useAnimationFrame } from 'framer-motion';

export const MouseBackground: React.FC = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Track if the user has interacted yet
  const [isIdle, setIsIdle] = useState(true);
  
  // Ref to track mouse for canvas without re-rendering
  const mouseRef = useRef({ x: -1000, y: -1000 });

  // Time hook for idle animation and color shifts
  const time = useTime();

  // Smoother, springier configuration for "extreme" responsiveness
  const springConfig = { damping: 15, stiffness: 150, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);
  
  // The lag layer trails behind more noticeably now
  const lagX = useSpring(mouseX, { damping: 30, stiffness: 50, mass: 1 });
  const lagY = useSpring(mouseY, { damping: 30, stiffness: 50, mass: 1 });

  // Offsets for centering elements on mouse
  const glowX = useTransform(smoothX, x => x - 400); // 800px width / 2
  const glowY = useTransform(smoothY, y => y - 400);

  const lagGlowX = useTransform(lagX, x => x - 300); // 600px width / 2
  const lagGlowY = useTransform(lagY, y => y - 300);

  const flashX = useTransform(smoothX, x => x - 500); // 1000px width / 2
  const flashY = useTransform(smoothY, y => y - 500);

  // Minimal Color Changes: Cycle grid color subtly using brand blue #0043ff
  const gridColor = useTransform(
    time,
    [0, 5000, 10000],
    ["rgba(0, 67, 255, 0.15)", "rgba(0, 67, 255, 0.2)", "rgba(0, 67, 255, 0.15)"]
  );
  
  const gridBackgroundImage = useMotionTemplate`linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`;

  // Idle Animation Loop: Move the light around until user interacts
  useAnimationFrame((t) => {
    if (!isIdle) return;
    
    // Create a wandering figure-8 or lissajous pattern
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Slow, sweeping movements
    const autoX = (Math.sin(t / 2500) * 0.35 + 0.5) * width;
    const autoY = (Math.cos(t / 3500) * 0.25 + 0.5) * height;
    
    mouseX.set(autoX);
    mouseY.set(autoY);
    mouseRef.current = { x: autoX, y: autoY };
  });

  useEffect(() => {
    const updateMouse = (x: number, y: number) => {
      if (isIdle) setIsIdle(false);
      mouseX.set(x);
      mouseY.set(y);
      mouseRef.current = { x, y };
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateMouse(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length > 0) {
            updateMouse(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isIdle, mouseX, mouseY]);

  // Particle System Effect (2D Dust)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      opacity: number;
      density: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.2;  // Reduced velocity for slower, floatier motion
        this.vy = (Math.random() - 0.5) * 0.2;
        this.life = Math.random() * 100;
        this.maxLife = 100 + Math.random() * 100;
        this.opacity = Math.random() * 0.25 + 0.08; // Further reduced opacity
        this.density = (Math.random() * 30) + 1;
      }

      update() {
        this.life++;
        this.x += this.vx;
        this.y += this.vy;

        // Mouse interaction
        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 350;

        if (distance < maxDistance) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (maxDistance - distance) / maxDistance;
            
            const directionX = forceDirectionX * force * this.density * 1.5;
            const directionY = forceDirectionY * force * this.density * 1.5;
            
            this.x -= directionX;
            this.y -= directionY;
        }

        // Twinkle
        if (this.life > this.maxLife) {
            this.opacity -= 0.01;
            if (this.opacity <= 0) {
                this.life = 0;
                this.opacity = 0;
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
            }
        } else if (this.opacity < 0.4) {
             this.opacity += 0.005;
        }

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        if (!ctx) return;
        // Brand blue #0043ff = rgb(0, 67, 255)
        ctx.fillStyle = `rgba(0, 67, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      // Further reduced particle density - dividing by 50000 for subtle starfield
      const particleCount = Math.max(20, (window.innerWidth * window.innerHeight) / 50000);
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* BACKGROUND LAYER: Pure Black Void - Blue only appears on mouse */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" style={{ backgroundColor: '#000000' }}>

        {/* REMOVED: Deep Atmospheric Glows - background should be pure black */}
        {/* Blue only appears where mouse light exposes it */}

        {/* Floating Digital Dust Particles (2D Layer) */}
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 z-[1] mix-blend-screen opacity-50"
        />

        {/* The Grid */}
        <motion.div 
          className="absolute inset-0 z-[2]"
          style={{
            backgroundImage: gridBackgroundImage,
            backgroundSize: '40px 40px',
            WebkitMaskImage: useTransform(
              [smoothX, smoothY],
              ([x, y]) => `radial-gradient(circle 1200px at ${x}px ${y}px, black 0%, transparent 80%)`
            ),
            maskImage: useTransform(
              [smoothX, smoothY],
              ([x, y]) => `radial-gradient(circle 1200px at ${x}px ${y}px, black 0%, transparent 80%)`
            )
          }}
        />

        {/* Primary Glow Follower - Brand blue #0043ff */}
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full blur-[100px] mix-blend-screen opacity-50 z-[3]"
          style={{
            x: glowX,
            y: glowY,
            backgroundColor: 'rgba(0, 67, 255, 0.2)',
          }}
        />

        {/* Secondary Lagging Glow - Brand blue #0043ff */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[80px] mix-blend-screen z-[3]"
          style={{
            x: lagGlowX,
            y: lagGlowY,
            backgroundColor: 'rgba(0, 67, 255, 0.15)',
          }}
        />
        
        {/* Film Grain */}
        <div className="absolute inset-0 opacity-[0.25] mix-blend-overlay pointer-events-none z-[4]" 
             style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} 
        />
      </div>

      {/* FOREGROUND LAYER: The Flashlight */}
      <div className="fixed inset-0 z-[60] pointer-events-none mix-blend-overlay">
        <motion.div 
           className="absolute w-[1000px] h-[1000px] bg-gradient-radial from-white/15 to-transparent blur-[60px]"
           style={{
             x: flashX,
             y: flashY,
           }}
        />
      </div>
    </>
  );
};