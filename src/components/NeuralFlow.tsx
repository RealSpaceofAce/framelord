import React, { useRef, useEffect } from 'react';

export const NeuralFlow: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let flowField: number[] = [];
    let rows: number;
    let cols: number;
    const scale = 20; // Scale of the grid
    const inc = 0.05; // Noise increment
    let zoff = 0; // Time dimension for noise

    // Simple Pseudo-Perlin Noise implementation
    const noise = (x: number, y: number, z: number) => {
        const p = new Uint8Array([151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180]);
        const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
        const lerp = (t: number, a: number, b: number) => a + t * (b - a);
        const grad = (hash: number, x: number, y: number, z: number) => {
            const h = hash & 15;
            const u = h < 8 ? x : y;
            const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        };

        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = fade(x);
        const v = fade(y);
        const w = fade(z);

        const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
        const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;

        return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
            lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
            lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
                lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      history: {x: number, y: number}[];
      maxLength: number;
      speed: number;
      age: number;
      lifespan: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.vx = 0;
        this.vy = 0;
        this.history = [];
        this.maxLength = Math.random() * 20 + 10;
        this.speed = Math.random() * 1 + 0.5;
        this.age = 0;
        this.lifespan = Math.random() * 200 + 100;
        // Use brand colors randomly
        this.color = Math.random() > 0.6 ? '#4433FF' : '#737AFF';
      }

      update() {
        this.age++;
        if (this.age > this.lifespan) {
            this.reset();
        }

        const xIndex = Math.floor(this.x / scale);
        const yIndex = Math.floor(this.y / scale);
        const index = xIndex + yIndex * cols;
        
        if (flowField[index]) {
            const angle = flowField[index];
            this.vx += Math.cos(angle) * 0.1;
            this.vy += Math.sin(angle) * 0.1;
        }

        // Limit speed
        const vel = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (vel > this.speed) {
             this.vx = (this.vx / vel) * this.speed;
             this.vy = (this.vy / vel) * this.speed;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > this.maxLength) {
          this.history.shift();
        }

        // Wrap around edges
        if (this.x > canvas!.width) { this.x = 0; this.history = []; }
        if (this.x < 0) { this.x = canvas!.width; this.history = []; }
        if (this.y > canvas!.height) { this.y = 0; this.history = []; }
        if (this.y < 0) { this.y = canvas!.height; this.history = []; }
      }

      reset() {
         this.x = Math.random() * canvas!.width;
         this.y = Math.random() * canvas!.height;
         this.history = [];
         this.age = 0;
         this.vx = 0;
         this.vy = 0;
      }

      draw() {
        if (!ctx) return;
        if (this.history.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) {
            ctx.lineTo(this.history[i].x, this.history[i].y);
        }
        
        // Fade out based on age
        const alpha = Math.max(0, 1 - (this.age / this.lifespan)) * 0.4;
        ctx.strokeStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', '') === this.color 
            ? `rgba(68, 51, 255, ${alpha})` // fallback
            : this.color === '#4433FF' ? `rgba(68, 51, 255, ${alpha})` : `rgba(115, 122, 255, ${alpha})`;
            
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / scale);
      rows = Math.floor(canvas.height / scale);
      
      particles = [];
      const numParticles = 600; // number of flow lines
      for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let yoff = 0;
      for (let y = 0; y < rows; y++) {
        let xoff = 0;
        for (let x = 0; x < cols; x++) {
          const index = x + y * cols;
          // Perlin noise angle
          const angle = noise(xoff, yoff, zoff) * Math.PI * 4;
          flowField[index] = angle;
          xoff += inc;
        }
        yoff += inc;
      }
      zoff += 0.0005; // Slow time evolution

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      animationId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full pointer-events-none z-0 mix-blend-screen opacity-50" 
    />
  );
};
