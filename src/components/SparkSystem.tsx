import React, { useEffect, useRef } from 'react';

class Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;

  constructor(x: number, y: number, color?: string) {
    this.x = x;
    this.y = y;
    // Explode outward
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.color = color || (Math.random() > 0.5 ? '#FFFFFF' : '#737AFF');
    this.size = Math.random() * 2 + 0.5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.92; // Friction
    this.vy *= 0.92;
    this.life -= 0.05; // Fade out fast
  }

  draw(context: CanvasRenderingContext2D) {
    context.globalAlpha = this.life;
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1.0;
  }
}

// Global reference for spawning sparks from other components
export const spawnGlobalSpark = (x: number, y: number, color?: string) => {
    // This is a bridge to the running system. 
    // We dispatch a custom event that the system listens to.
    const event = new CustomEvent('spawn-spark', { detail: { x, y, color } });
    window.dispatchEvent(event);
};

export const SparkSystem: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Spark[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();

    const loop = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.update();
            p.draw(ctx);
            if (p.life <= 0) {
                particlesRef.current.splice(i, 1);
            }
        }
        
        animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    // Interaction Listener
    const handleInteraction = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInteractive = target.closest('button') || 
                              target.closest('a') || 
                              target.closest('input') || 
                              target.closest('textarea') ||
                              target.closest('.interactive');
        
        if (isInteractive) {
             for (let i = 0; i < 2; i++) {
                 particlesRef.current.push(new Spark(e.clientX, e.clientY));
             }
        }
    };
    
    const handleClick = (e: MouseEvent) => {
        for (let i = 0; i < 8; i++) {
            particlesRef.current.push(new Spark(e.clientX, e.clientY));
        }
    }

    // Listen for custom spawn events
    const handleSpawnEvent = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail) {
            for(let i=0; i<3; i++) {
                particlesRef.current.push(new Spark(detail.x, detail.y, detail.color));
            }
        }
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('click', handleClick);
    window.addEventListener('spawn-spark', handleSpawnEvent);

    return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', handleInteraction);
        window.removeEventListener('click', handleClick);
        window.removeEventListener('spawn-spark', handleSpawnEvent);
        cancelAnimationFrame(animationFrameId);
    };

  }, []);

  return (
    <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full pointer-events-none z-[100]" 
    />
  );
};

// Wrapper component to trigger sparks on hover
interface SparkBorderProps {
    children: React.ReactNode;
    className?: string;
    color?: string;
}

export const SparkBorder: React.FC<SparkBorderProps> = ({ children, className = "", color }) => {
    const handleMouseMove = (e: React.MouseEvent) => {
        // Spawn sparks at cursor position with slightly lower frequency
        if (Math.random() > 0.8) {
            spawnGlobalSpark(e.clientX, e.clientY, color);
        }
    };

    return (
        <div onMouseMove={handleMouseMove} className={`relative group ${className}`}>
            {/* Optional border glow effect */}
            <div className="absolute inset-0 border border-white/5 group-hover:border-white/20 transition-colors pointer-events-none rounded-inherit z-10" />
            {children}
        </div>
    );
};
