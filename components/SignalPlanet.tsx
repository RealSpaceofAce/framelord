import React, { useRef, useEffect } from 'react';

export const SignalPlanet: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = 600; // Fixed internal resolution for pixel look
      canvas.height = 600;
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0)'; // Transparent clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 200;
      const numLines = 80;
      
      // Rotation speed
      time += 0.015;

      // Draw vertical scan lines
      for (let i = 0; i < numLines; i++) {
        // Map i to x coordinate
        const xProgress = (i / numLines) * 2 - 1; // -1 to 1
        const x = centerX + xProgress * radius;

        // Calculate height of sphere at this x (circle equation)
        const zSq = 1 - xProgress * xProgress;
        if (zSq < 0) continue;
        const z = Math.sqrt(zSq);
        const height = z * radius * 2;

        // Lighting / Crescent Effect
        // We simulate a rotating light source
        // Surface normal x component is just xProgress
        // Light vector x component rotates
        const lightX = Math.sin(time);
        const lightZ = Math.cos(time);
        
        // Dot product roughly
        // We want a crescent, so we check alignment of normal with light
        // Normal vector at this slice (simplified) is (xProgress, 0, z)
        // Actually for a sphere slice, we just use the horizontal position for the "phase"
        
        let intensity = (xProgress * lightX + z * lightZ);
        
        // Glitch effect: Randomly invert or boost intensity
        if (Math.random() > 0.98) {
            intensity = Math.random() > 0.5 ? 1 : -1;
        }

        // Only draw if lit (or rim lit)
        if (intensity > -0.2) {
             const alpha = Math.max(0, Math.min(1, intensity + 0.2));
             
             // Glitchy vertical offset
             let yOffset = 0;
             if (Math.random() > 0.95) {
                yOffset = (Math.random() - 0.5) * 50;
             }

             // Color selection
             // Primary blue/purple with occasional white hot pixels
             const isHot = Math.random() > 0.9;
             const color = isHot ? 'rgba(255, 255, 255, 0.9)' : `rgba(68, 51, 255, ${alpha})`;

             const lineWidth = (canvas.width / numLines) * 0.6;
             
             // Draw the vertical bar
             // We draw it as a series of dots/rects to look more "digital"
             const segmentHeight = 4;
             const segments = Math.floor(height / segmentHeight);
             
             for (let j = 0; j < segments; j++) {
                 // Dither: skip some segments based on alpha
                 if (Math.random() > alpha * 1.5) continue;

                 const segY = centerY - height/2 + j * segmentHeight + yOffset;
                 
                 ctx.fillStyle = color;
                 ctx.fillRect(x - lineWidth/2, segY, lineWidth, segmentHeight - 1);
             }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-60 mix-blend-screen z-0">
        <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};