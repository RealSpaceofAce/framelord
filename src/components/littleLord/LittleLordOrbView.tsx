// =============================================================================
// LITTLE LORD ORB VIEW — Immersive AI spirit visualization
// =============================================================================
// Canvas-based 3D particle orb that responds to interaction and AI state.
// Ported from aether-entity-interface/components/AISpirit.tsx
// =============================================================================

import React, { useRef, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface SpiritState {
  isThinking: boolean;
  isSpeaking: boolean;
  emotion: 'neutral' | 'excited' | 'contemplative';
}

interface LittleLordOrbViewProps {
  state: SpiritState;
  onInteraction?: () => void;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Vertex {
  x: number;
  y: number;
  z: number;
  ox: number;
  oy: number;
  oz: number;
}

// =============================================================================
// SIMPLEX NOISE
// =============================================================================

class SimplexNoise {
  perm: number[];
  grad3: number[][];

  constructor() {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    this.perm = new Array(512);
    const p = new Uint8Array([
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
    ]);
    for (let i = 0; i < 256; i++) {
      this.perm[i] = this.perm[i + 256] = p[i];
    }
  }

  noise3D(x: number, y: number, z: number): number {
    let n0, n1, n2, n3;
    const F3 = 1.0 / 3.0;
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const G3 = 1.0 / 6.0;
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;

    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
    const gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
    const gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0.0;
    else { t0 *= t0; n0 = t0 * t0 * (this.grad3[gi0][0] * x0 + this.grad3[gi0][1] * y0 + this.grad3[gi0][2] * z0); }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0.0;
    else { t1 *= t1; n1 = t1 * t1 * (this.grad3[gi1][0] * x1 + this.grad3[gi1][1] * y1 + this.grad3[gi1][2] * z1); }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0.0;
    else { t2 *= t2; n2 = t2 * t2 * (this.grad3[gi2][0] * x2 + this.grad3[gi2][1] * y2 + this.grad3[gi2][2] * z2); }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0.0;
    else { t3 *= t3; n3 = t3 * t3 * (this.grad3[gi3][0] * x3 + this.grad3[gi3][1] * y3 + this.grad3[gi3][2] * z3); }

    return 32.0 * (n0 + n1 + n2 + n3);
  }
}

const noise = new SimplexNoise();

// =============================================================================
// PARTICLE CLASS
// =============================================================================

class Particle {
  x: number;
  y: number;
  z: number;
  ox: number;
  oy: number;
  oz: number;
  size: number;
  color: string;
  vx: number = 0;
  vy: number = 0;
  vz: number = 0;
  speedMod: number;
  noiseOffset: number;
  isShooting: boolean = false;
  life: number = 1.0;

  constructor(radius: number) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const r = radius * (1.2 + Math.random() * 1.5);

    this.ox = r * Math.sin(phi) * Math.cos(theta);
    this.oy = r * Math.sin(phi) * Math.sin(theta);
    this.oz = r * Math.cos(phi);
    this.x = this.ox;
    this.y = this.oy;
    this.z = this.oz;

    this.size = Math.random() * 1.5 + 0.5;
    this.speedMod = 0.5 + Math.random() * 1.5;
    this.noiseOffset = Math.random() * 1000;

    const colors = [
      'rgba(68, 51, 255, 0.8)',   // FrameLord indigo
      'rgba(255, 255, 255, 0.9)', // White
      'rgba(100, 100, 255, 0.6)', // Light indigo
      'rgba(150, 100, 255, 0.5)'  // Purple hint
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  reset() {
    this.isShooting = false;
    this.life = 1.0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.x = this.ox * (1 + Math.random() * 0.2);
    this.y = this.oy * (1 + Math.random() * 0.2);
    this.z = this.oz * (1 + Math.random() * 0.2);
  }

  update(agitation: number, rotY: number, rotX: number, time: number) {
    if (this.isShooting) {
      this.x += this.vx;
      this.y += this.vy;
      this.z += this.vz;
      this.life -= 0.02;
      if (this.life <= 0) this.reset();
      return;
    }

    // Chance to become shooting star if agitated
    if (Math.random() < (0.00003 + agitation * 0.0005)) {
      this.isShooting = true;
      this.life = 1.0;
      const speed = 15 + Math.random() * 15;
      const mag = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
      this.vx = (this.x / mag) * speed;
      this.vy = (this.y / mag) * speed;
      this.vz = (this.z / mag) * speed;
      return;
    }

    // Chaotic orbit logic
    const orbitSpeed = (0.04 + agitation * 0.05) * this.speedMod;
    const cosY = Math.cos(rotY * orbitSpeed);
    const sinY = Math.sin(rotY * orbitSpeed);

    const jitterMag = 20 + agitation * 40;
    const jitterX = noise.noise3D(this.ox * 0.01, time, this.noiseOffset) * jitterMag;
    const jitterY = noise.noise3D(this.oy * 0.01, time + 100, this.noiseOffset) * jitterMag;
    const jitterZ = noise.noise3D(this.oz * 0.01, time + 200, this.noiseOffset) * jitterMag;

    let tx = this.ox * cosY - this.oz * sinY + jitterX;
    let tz = this.ox * sinY + this.oz * cosY + jitterZ;
    let ty = this.oy + jitterY;

    const looseFactor = this.speedMod > 1.5 ? 0.01 : 0.08;

    this.vx += (tx - this.x) * looseFactor;
    this.vy += (ty - this.y) * looseFactor;
    this.vz += (tz - this.z) * looseFactor;

    this.vx *= 0.94;
    this.vy *= 0.94;
    this.vz *= 0.94;

    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function project(v: Vector3, fov: number, cx: number, cy: number) {
  const scale = fov / (fov + v.z);
  return {
    x: cx + v.x * scale,
    y: cy + v.y * scale
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export const LittleLordOrbView: React.FC<LittleLordOrbViewProps> = ({ state, onInteraction }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Geometry refs
  const meshRef = useRef<{ vertices: Vertex[], faces: number[][] } | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Physics state
  const timeRef = useRef(0);

  // Interaction state
  const isDraggingRef = useRef(false);
  const dragPosRef = useRef({ x: 0, y: 0 });
  const hoverPosRef = useRef({ x: -1000, y: -1000 });
  const spiritPosRef = useRef({ x: 0, y: 0 });
  const agitationRef = useRef(0);

  // Initialize mesh geometry
  useEffect(() => {
    const initGeometry = () => {
      const radius = 110;
      const latSegments = 50;
      const lonSegments = 50;

      const vertices: Vertex[] = [];
      const faces: number[][] = [];

      for (let lat = 0; lat <= latSegments; lat++) {
        const theta = (lat * Math.PI) / latSegments;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let lon = 0; lon <= lonSegments; lon++) {
          const phi = (lon * 2 * Math.PI) / lonSegments;
          const sinPhi = Math.sin(phi);
          const cosPhi = Math.cos(phi);

          const x = radius * cosPhi * sinTheta;
          const y = radius * cosTheta;
          const z = radius * sinPhi * sinTheta;

          vertices.push({ x, y, z, ox: x, oy: y, oz: z });
        }
      }

      for (let lat = 0; lat < latSegments; lat++) {
        for (let lon = 0; lon < lonSegments; lon++) {
          const first = (lat * (lonSegments + 1)) + lon;
          const second = first + lonSegments + 1;
          faces.push([first, second, first + 1]);
          faces.push([second, second + 1, first + 1]);
        }
      }

      meshRef.current = { vertices, faces };

      particlesRef.current = [];
      for (let i = 0; i < 120; i++) {
        particlesRef.current.push(new Particle(130));
      }
    };

    initGeometry();
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const fov = 600;

    const render = () => {
      if (!canvas || !containerRef.current || !meshRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Update physics
      if (isDraggingRef.current) {
        const pullStrength = 0.05;
        spiritPosRef.current.x += (dragPosRef.current.x - spiritPosRef.current.x) * pullStrength;
        spiritPosRef.current.y += (dragPosRef.current.y - spiritPosRef.current.y) * pullStrength;
        agitationRef.current = Math.min(agitationRef.current + 0.02, 1.0);
      } else {
        spiritPosRef.current.x += (centerX - spiritPosRef.current.x) * 0.05;
        spiritPosRef.current.y += (centerY - spiritPosRef.current.y) * 0.05;
        agitationRef.current *= 0.96;
      }

      // Thinking state increases agitation
      if (state.isThinking) {
        agitationRef.current = Math.min(agitationRef.current + 0.01, 0.6);
      }

      // Hover drift
      const driftX = Math.sin(timeRef.current * 0.8) * 25;
      const driftY = Math.cos(timeRef.current * 0.5) * 15;

      const cx = spiritPosRef.current.x + driftX;
      const cy = spiritPosRef.current.y + driftY;

      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const agitation = agitationRef.current;
      timeRef.current += 0.01 + (agitation * 0.02);

      const globalRotY = timeRef.current * 0.25;
      const globalRotX = (spiritPosRef.current.y - centerY) * 0.002;

      // Update mesh
      const transformedVertices: Vector3[] = [];
      const noiseFreq = 0.008 + (agitation * 0.005);

      meshRef.current.vertices.forEach(v => {
        const n = noise.noise3D(
          v.ox * noiseFreq + timeRef.current * 0.6,
          v.oy * noiseFreq + timeRef.current * 0.2,
          v.oz * noiseFreq
        );

        const scale = 1 + (n * 0.25);
        let x = v.ox * scale;
        let y = v.oy * scale;
        let z = v.oz * scale;

        // Rotation Y
        const cosY = Math.cos(globalRotY);
        const sinY = Math.sin(globalRotY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        x = x1;
        z = z1;

        // Rotation X
        const cosX = Math.cos(globalRotX);
        const sinX = Math.sin(globalRotX);
        const y2 = y * cosX - z * sinX;
        const z2 = y * sinX + z * cosX;
        y = y2;
        z = z2;

        // Interaction: ripple & pull
        const pScale = fov / (fov + z);
        const pX = cx + x * pScale;
        const pY = cy + y * pScale;

        const dx = hoverPosRef.current.x - pX;
        const dy = hoverPosRef.current.y - pY;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);

        // Hover ripple
        if (distToMouse < 150) {
          const influence = (1 - distToMouse / 150);
          const rippleAmp = 0.15;
          const rippleFreq = 0.1;
          const rippleSpeed = 15;
          const wave = Math.sin(distToMouse * rippleFreq - timeRef.current * rippleSpeed);
          const displacement = wave * influence * rippleAmp;
          x += x * displacement;
          y += y * displacement;
          z += z * displacement;
        }

        // Drag indentation
        if (isDraggingRef.current) {
          const grabRadius = 200;
          if (distToMouse < grabRadius) {
            const grabInfluence = Math.pow((1 - distToMouse / grabRadius), 2);
            x += dx * grabInfluence * 0.3;
            y += dy * grabInfluence * 0.3;
          }
        }

        transformedVertices.push({ x, y, z });
      });

      // Render list for z-sorting
      const renderList: { type: string, z: number, draw: () => void }[] = [];

      // Blob particles
      meshRef.current.faces.forEach(face => {
        const v1 = transformedVertices[face[0]];
        const v2 = transformedVertices[face[1]];
        const v3 = transformedVertices[face[2]];

        const cx3 = (v1.x + v2.x + v3.x) / 3;
        const cy3 = (v1.y + v2.y + v3.y) / 3;
        const cz3 = (v1.z + v2.z + v3.z) / 3;

        // Normal calculation
        const ax = v2.x - v1.x, ay = v2.y - v1.y, az = v2.z - v1.z;
        const bx = v3.x - v1.x, by = v3.y - v1.y, bz = v3.z - v1.z;
        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const nnz = nz / len;

        const dotView = nnz;
        const fresnel = Math.pow(1 - Math.abs(dotView), 2);

        let r, g, b, a;

        if (agitation > 0.3) {
          // Agitated - brighter
          r = 68 + agitation * 100;
          g = 51 + agitation * 100;
          b = 255;
          a = (0.2 + fresnel * 0.8);
        } else if (state.isThinking) {
          // Thinking - pulsing glow
          r = 100;
          g = 150;
          b = 255;
          a = 0.2 + fresnel * 0.8;
        } else {
          // Normal - FrameLord indigo
          const nnx = nx / len;
          const nny = ny / len;
          r = 50 + Math.abs(nnx) * 30;
          g = 40 + Math.abs(nny) * 40;
          b = 255;
          a = 0.1 + fresnel * 0.9;
        }

        const p = project({ x: cx3, y: cy3, z: cz3 }, fov, cx, cy);
        const particleScale = fov / (fov + cz3);

        if (particleScale > 0) {
          const size = 1.6 * particleScale;

          renderList.push({
            type: 'blob_particle',
            z: cz3,
            draw: () => {
              ctx.fillStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${a.toFixed(2)})`;
              ctx.beginPath();
              ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      });

      // Cloud particles
      particlesRef.current.forEach(p => {
        p.update(agitation, globalRotY, globalRotX, timeRef.current);

        const particleScale = fov / (fov + p.z);
        if (particleScale < 0) return;
        const px = cx + p.x * particleScale;
        const py = cy + p.y * particleScale;

        renderList.push({
          type: 'cloud_particle',
          z: p.z,
          draw: () => {
            if (p.isShooting) {
              ctx.strokeStyle = `rgba(255, 255, 255, ${p.life})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(px, py);
              const tailScale = fov / (fov + (p.z - p.vz * 3));
              const tx = cx + (p.x - p.vx * 3) * tailScale;
              const ty = cy + (p.y - p.vy * 3) * tailScale;
              ctx.lineTo(tx, ty);
              ctx.stroke();
            } else {
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(px, py, p.size * particleScale, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      });

      // Sort by depth and render
      renderList.sort((a, b) => b.z - a.z);
      renderList.forEach(item => item.draw());

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [state]);

  // Mouse tracking
  const updateMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    hoverPosRef.current = { x: relX, y: relY };

    if (isDraggingRef.current) {
      dragPosRef.current = { x: relX, y: relY };
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingRef.current = true;
    updateMousePos(e);
    onInteraction?.();
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    updateMousePos(e);
  };

  const handleEnd = () => {
    isDraggingRef.current = false;
  };

  // Set initial spirit position
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      spiritPosRef.current = { x: rect.width / 2, y: rect.height / 2 };
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden cursor-grab active:cursor-grabbing touch-none"
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchEnd={handleEnd}
    >
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />
    </div>
  );
};

export default LittleLordOrbView;
