import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Heart, Globe, Flower, Activity, User, Sparkles, MousePointer2, Shuffle } from 'lucide-react';

type ShapeType = 'sphere' | 'heart' | 'saturn' | 'flower' | 'dna' | 'buddha' | 'fireworks' | 'statue';

interface ThreeParticlesProps {
    forcedShape?: ShapeType | null;
}

export const ThreeParticles: React.FC<ThreeParticlesProps> = ({ forcedShape = null }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeShape, setActiveShape] = useState<ShapeType>('statue');
  const [isRandomMode, setIsRandomMode] = useState(true);
  const [isHoveringControls, setIsHoveringControls] = useState(false);

  // References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  
  // Physics Data
  const targetPositionsRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const colorsRef = useRef<Float32Array | null>(null);
  
  // State refs for animation loop
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const isMouseDownRef = useRef(false);
  const timeRef = useRef(0);
  
  // Interaction State
  const rotationRef = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Track where the shape should form (in 3D space)
  const shapeCenterRef = useRef(new THREE.Vector3(0, 0, 0));

  // If forcedShape changes (e.g., navigating to Application page), update state
  useEffect(() => {
      if (forcedShape) {
          setActiveShape(forcedShape);
          setIsRandomMode(false); // Disable random mode when forced
      }
  }, [forcedShape]);

  const generateShape = (shape: ShapeType) => {
    if (!targetPositionsRef.current || !colorsRef.current) return;
    const positions = targetPositionsRef.current;
    const colors = colorsRef.current;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        let x = 0, y = 0, z = 0;
        
        // Default Color Reset
        let r = 0.26, g = 0.2, b = 1.0; // Primary Blue
        if (Math.random() > 0.4) { r = 0.45; g = 0.47; b = 1.0; } // Accent Blue

        if (shape === 'sphere') {
            const rad = 20;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            x = rad * Math.sin(phi) * Math.cos(theta);
            y = rad * Math.sin(phi) * Math.sin(theta);
            z = rad * Math.cos(phi);
        } else if (shape === 'heart') {
            const t = Math.random() * Math.PI * 2;
            const rad = 1.5;
            x = 16 * Math.pow(Math.sin(t), 3);
            y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
            z = (Math.random() - 0.5) * 6; 
            x *= rad; y *= rad; z *= rad;
            const ty = y;
            y = ty; 
            r = 1.0; g = 0.2; b = 0.4; // Red/Pink tint for heart
        } else if (shape === 'saturn') {
            const isRing = Math.random() > 0.35; 
            if (isRing) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 25 + Math.random() * 10;
                x = Math.cos(angle) * dist;
                z = Math.sin(angle) * dist;
                y = (Math.random() - 0.5) * 1;
                r = 0.8; g = 0.8; b = 1.0; // White rings
            } else {
                const rad = 12;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                x = rad * Math.sin(phi) * Math.cos(theta);
                y = rad * Math.sin(phi) * Math.sin(theta);
                z = rad * Math.cos(phi);
            }
            const tilt = 0.5;
            const ty = y;
            y = y * Math.cos(tilt) - z * Math.sin(tilt);
            z = ty * Math.sin(tilt) + z * Math.cos(tilt);
        } else if (shape === 'flower') {
            const rad = 0.8 * Math.sqrt(i);
            const angle = i * 137.5 * (Math.PI / 180);
            x = rad * Math.cos(angle);
            y = rad * Math.sin(angle);
            z = Math.sin(rad * 0.5) * 8;
            x *= 1.2; y *= 1.2;
            if (rad < 5) { r = 1.0; g = 0.9; b = 0.2; } // Yellow center
            else { r = 0.8; g = 0.2; b = 1.0; } // Purple petals
        } else if (shape === 'dna') {
            const t = (i / count) * Math.PI * 10;
            const rad = 8;
            x = Math.cos(t) * rad;
            z = Math.sin(t) * rad;
            y = (i / count) * 60 - 30;
            if (i % 2 === 0) {
               x = Math.cos(t + Math.PI) * rad;
               z = Math.sin(t + Math.PI) * rad;
               r = 0.2; g = 1.0; b = 0.5; // Green strand
            } else {
               r = 0.2; g = 0.5; b = 1.0; // Blue strand
            }
        } else if (shape === 'statue') {
            // HIGH DEFINITION PROCEDURAL BUST
            const seed = Math.random();
            const headCenterY = 8;
            
            // HEAD (Increased density: 60% of particles for max resolution)
            if (seed < 0.60) { 
                const u = Math.random();
                const v = Math.random();
                const theta = 2 * Math.PI * u;
                const phi = Math.acos(2 * v - 1);
                
                // Cranium Shape
                const rad = 6.0;
                let lx = rad * Math.sin(phi) * Math.cos(theta); 
                let ly = rad * Math.sin(phi) * Math.sin(theta); 
                let lz = rad * Math.cos(phi); 
                
                // Base head shape adjustments
                lx *= 0.88; // Slightly wider
                ly *= 1.18; // Elongate
                lz *= 1.05; // Deepen

                // Face Highlighting
                // Default face color (slightly brighter blue/white)
                r = 0.6; g = 0.7; b = 1.0; 

                // --- SCULPTING THE FACE (+Z direction) ---
                if (lz > 0) {
                    
                    // 1. JAWLINE & CHIN
                    if (ly < -1.5) {
                        const jawFactor = (ly + 1.5) * -0.25; 
                        lx *= (1.0 - jawFactor); // Taper width
                        if (lz > 0) lz *= (1.0 - jawFactor * 0.4); // Taper depth
                        
                        // Chin protrusion
                        if (Math.abs(lx) < 1.5 && ly < -4.5) lz += 0.8;
                    }

                    // 2. EYE SOCKETS (Deep depressions)
                    // Eyes at y=+1.2, x=±1.8
                    const eyeY = 1.0;
                    const eyeX = 1.9;
                    const eyeR = 1.3;
                    const distL = Math.sqrt(Math.pow(lx - (-eyeX), 2) + Math.pow(ly - eyeY, 2));
                    const distR = Math.sqrt(Math.pow(lx - eyeX, 2) + Math.pow(ly - eyeY, 2));
                    
                    if (distL < eyeR || distR < eyeR) {
                        lz -= 1.5; // Push back significantly
                        r = 0.2; g = 0.2; b = 0.5; // Darker sockets
                    }

                    // 3. NOSE (Triangular prism)
                    if (Math.abs(lx) < 1.2 && ly < 1.5 && ly > -2.8) {
                        const ridgeWidth = 0.9 * (1 - (ly - -2.8)/4.5);
                        if (Math.abs(lx) < ridgeWidth) {
                            const protrusion = 2.2 * (1 - Math.abs(lx)/ridgeWidth);
                            lz += protrusion;
                            // Highlight nose bridge
                            r = 1.0; g = 1.0; b = 1.0; 
                        }
                    }

                    // 4. MOUTH 
                    if (Math.abs(lx) < 1.8 && ly < -3.2 && ly > -4.8) {
                        // Upper lip
                        if (ly > -3.8) { lz += 0.6; r = 0.8; g = 0.8; b = 1.0; }
                        // Mouth gap (deep line)
                        else if (ly > -4.0) { lz -= 0.8; r = 0.1; g = 0.1; b = 0.3; }
                        // Lower lip
                        else { lz += 0.5; r = 0.8; g = 0.8; b = 1.0; }
                    }

                    // 5. BROWS
                    if (ly > 1.8 && ly < 2.5 && Math.abs(lx) < 3.2) {
                        lz += 0.7; // Brow ridge
                    }
                }

                x = lx;
                y = ly + headCenterY;
                z = lz;

            } else if (seed < 0.75) {
                 // NECK
                 const angle = Math.random() * Math.PI * 2;
                 const rad = 2.9;
                 x = rad * Math.cos(angle);
                 z = rad * Math.sin(angle);
                 y = (Math.random() * 5) + 3;
                 
                 // Darker neck
                 r = 0.3; g = 0.3; b = 0.8;
            } else {
                // SHOULDERS
                const rad = 17; 
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI * 0.45; 
                
                x = rad * Math.sin(phi) * Math.cos(theta);
                y = (rad * 0.5) * Math.sin(phi) * Math.sin(theta); 
                z = (rad * 0.5) * Math.cos(phi); 
                
                y -= 4;
                if (y < -8) y = -8;
                
                // Darker base
                r = 0.2; g = 0.2; b = 0.6;
            }
        } else if (shape === 'buddha') {
            const seed = Math.random();
            if (seed < 0.20) {
                // HEAD
                const rad = 4.5;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                x = rad * Math.sin(phi) * Math.cos(theta);
                y = rad * Math.sin(phi) * Math.sin(theta) + 12; 
                z = rad * Math.cos(phi);
                if (y > 15.5) { x *= 0.5; z *= 0.5; y += 1; }
                r = 1.0; g = 0.8; b = 0.2; // Golden
            } else if (seed < 0.65) {
                // BODY
                const rad = 8;
                const h = 12;
                const theta = Math.random() * Math.PI * 2;
                const yPos = Math.random() * h; 
                const widthScale = 1 - (yPos / h) * 0.7;
                x = rad * widthScale * Math.cos(theta);
                z = (rad * 0.7) * widthScale * Math.sin(theta); 
                y = yPos;
                r = 0.9; g = 0.6; b = 0.1; // Golden
            } else {
                // LEGS
                const angle = Math.random() * Math.PI * 2;
                const rMain = 10;
                const tubeR = 3;
                x = (rMain + tubeR * Math.cos(angle * 3)) * Math.cos(angle);
                z = (rMain + tubeR * Math.cos(angle * 3)) * Math.sin(angle);
                y = tubeR * Math.sin(angle * 3) * 0.5 - 2;
                r = 0.9; g = 0.6; b = 0.1; // Golden
            }
        } else if (shape === 'fireworks') {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const rad = Math.pow(Math.random(), 0.5) * 35; 
            x = rad * Math.sin(phi) * Math.cos(theta);
            y = rad * Math.sin(phi) * Math.sin(theta);
            z = rad * Math.cos(phi);
            r = Math.random(); g = Math.random(); b = Math.random();
        }

        positions[i3] = x || 0;
        positions[i3 + 1] = y || 0;
        positions[i3 + 2] = z || 0;
        
        colors[i3] = r;
        colors[i3 + 1] = g;
        colors[i3 + 2] = b;
    }
    
    // Trigger geometry update for colors
    if (particlesRef.current) {
        particlesRef.current.geometry.attributes.color.needsUpdate = true;
    }
  };

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 75; 
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // PARTICLE SYSTEM SETUP
    const particleCount = 8000; // Increased count for HD
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    colorsRef.current = colors;
    
    // Velocity buffer for physics
    const velocities = new Float32Array(particleCount * 3);
    velocitiesRef.current = velocities;

    // Initial random positions
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 300;
      positions[i3 + 1] = (Math.random() - 0.5) * 300;
      positions[i3 + 2] = (Math.random() * 200) - 100; 
      
      colors[i3] = 0.26; 
      colors[i3 + 1] = 0.2; 
      colors[i3 + 2] = 1.0; 
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // Initialize targets
    targetPositionsRef.current = new Float32Array(particleCount * 3);
    generateShape('statue'); 

    // EVENT LISTENERS
    const onMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      if (isMouseDownRef.current) {
         const deltaX = event.clientX - lastMousePos.current.x;
         const deltaY = event.clientY - lastMousePos.current.y;
         rotationRef.current.y += deltaX * 0.005;
         rotationRef.current.x += deltaY * 0.005;
      }
      lastMousePos.current = { x: event.clientX, y: event.clientY };
    };
    
    const onMouseDown = (e: MouseEvent) => { 
        isMouseDownRef.current = true; 
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isMouseDownRef.current = false; };
    
    const onTouchStart = (e: TouchEvent) => { 
        isMouseDownRef.current = true;
        if (e.touches.length > 0) {
            lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };
    const onTouchEnd = () => { isMouseDownRef.current = false; };
    const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
            mouseRef.current.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            mouseRef.current.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
            
            if (isMouseDownRef.current) {
                const deltaX = e.touches[0].clientX - lastMousePos.current.x;
                const deltaY = e.touches[0].clientY - lastMousePos.current.y;
                rotationRef.current.y += deltaX * 0.01;
                rotationRef.current.x += deltaY * 0.01;
                lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }
    };

    const onResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('resize', onResize);

    // ANIMATION LOOP
    const animate = () => {
      requestAnimationFrame(animate);
      timeRef.current += 0.01;

      if (particlesRef.current && targetPositionsRef.current && rendererRef.current && sceneRef.current && cameraRef.current && velocitiesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const target = targetPositionsRef.current;
        const velocities = velocitiesRef.current;
        const count = positions.length / 3;
        
        // Update shape center based on mouse
        if (isMouseDownRef.current) {
            const vec = new THREE.Vector3(mouseRef.current.x, mouseRef.current.y, 0.5);
            vec.unproject(cameraRef.current);
            const dir = vec.sub(cameraRef.current.position).normalize();
            const distance = -cameraRef.current.position.z / dir.z;
            const pos = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));
            
            shapeCenterRef.current.lerp(pos, 0.05); 
        } else if (forcedShape) {
            // In forced shape mode (like DNA), center it on screen
            shapeCenterRef.current.lerp(new THREE.Vector3(0, 0, 0), 0.05);
        }

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          
          if (isMouseDownRef.current || forcedShape) {
            // HOLD MODE: Fluid Attraction
            const targetX = target[i3] + shapeCenterRef.current.x;
            const targetY = target[i3 + 1] + shapeCenterRef.current.y;
            const targetZ = target[i3 + 2] + shapeCenterRef.current.z;

            const dx = targetX - positions[i3];
            const dy = targetY - positions[i3 + 1];
            const dz = targetZ - positions[i3 + 2];
            
            // PHYSICS TWEAKED FOR SLOW MOTION
            // Force reduced to 0.0005 for extremely slow, viscous formation
            const force = 0.0005; 
            // Damping increased to 0.98 for high viscosity
            const damping = 0.98; 
            
            velocities[i3] += dx * force;
            velocities[i3 + 1] += dy * force;
            velocities[i3 + 2] += dz * force;
            
            velocities[i3] *= damping;
            velocities[i3 + 1] *= damping;
            velocities[i3 + 2] *= damping;

            positions[i3] += velocities[i3];
            positions[i3 + 1] += velocities[i3 + 1];
            positions[i3 + 2] += velocities[i3 + 2];
            
          } else {
            // RELEASE MODE: Disperse
            const noise = 0.02;
            velocities[i3] += (Math.random() - 0.5) * noise;
            velocities[i3 + 1] += (Math.random() - 0.5) * noise;
            velocities[i3 + 2] += (Math.random() - 0.5) * noise;
            
            if (positions[i3 + 2] > 60) velocities[i3 + 2] -= 0.1; 
            if (positions[i3 + 2] < -200) velocities[i3 + 2] += 0.05; 

            velocities[i3] *= 0.98;
            velocities[i3 + 1] *= 0.98;
            velocities[i3 + 2] *= 0.98;
            
            positions[i3] += velocities[i3];
            positions[i3 + 1] += velocities[i3 + 1];
            positions[i3 + 2] += velocities[i3 + 2];
          }
        }
        
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
        
        if (isMouseDownRef.current || forcedShape) {
            particlesRef.current.rotation.x += (rotationRef.current.x - particlesRef.current.rotation.x) * 0.05;
            particlesRef.current.rotation.y += (rotationRef.current.y - particlesRef.current.rotation.y) * 0.05;
            if (forcedShape) {
                // Auto rotate when forced
                rotationRef.current.y += 0.01;
            }
        } else {
            particlesRef.current.rotation.y += 0.001;
            particlesRef.current.rotation.x *= 0.98;
        }

        cameraRef.current.position.x += (mouseRef.current.x * 2 - cameraRef.current.position.x) * 0.02;
        cameraRef.current.position.y += (mouseRef.current.y * 2 - cameraRef.current.position.y) * 0.02;
        cameraRef.current.lookAt(sceneRef.current.position);
      }

      rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, [activeShape]); 

  // Random Shape Selector logic
  const shapes: ShapeType[] = ['statue', 'heart', 'saturn', 'flower', 'dna', 'buddha', 'sphere', 'fireworks'];
  
  const pickRandomShape = () => {
      const currentIdx = shapes.indexOf(activeShape);
      let nextIdx = Math.floor(Math.random() * shapes.length);
      while (nextIdx === currentIdx) {
          nextIdx = Math.floor(Math.random() * shapes.length);
      }
      setActiveShape(shapes[nextIdx]);
  };

  useEffect(() => {
      const handleGlobalMouseDown = () => {
          if (isRandomMode && !forcedShape) {
              pickRandomShape();
          }
      };
      
      window.addEventListener('mousedown', handleGlobalMouseDown);
      window.addEventListener('touchstart', handleGlobalMouseDown);
      return () => {
          window.removeEventListener('mousedown', handleGlobalMouseDown);
          window.removeEventListener('touchstart', handleGlobalMouseDown);
      }
  }, [isRandomMode, activeShape, forcedShape]);

  useEffect(() => {
      generateShape(activeShape);
      if (velocitiesRef.current) {
        const vel = velocitiesRef.current;
        for(let i=0; i<vel.length; i++) vel[i] += (Math.random()-0.5) * 0.2;
      }
  }, [activeShape]);

  return (
    <>
      <div ref={containerRef} className="fixed inset-0 z-[1]" style={{ pointerEvents: 'none' }} />

      {!forcedShape && (
        <div 
            className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2"
            onMouseEnter={() => setIsHoveringControls(true)}
            onMouseLeave={() => setIsHoveringControls(false)}
        >
            <div className={`
                flex items-center gap-2 bg-fl-black/80 backdrop-blur-md border border-fl-primary/30 rounded-full p-2 pr-4 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)]
                ${isHoveringControls ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-0'}
            `}>
                <button
                    onClick={() => setIsRandomMode(!isRandomMode)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all mr-2 ${isRandomMode ? 'bg-fl-accent text-white' : 'text-fl-gray hover:text-white'}`}
                    title="Random Shape on Click"
                >
                    <Shuffle size={14} />
                </button>

                <div className="w-px h-4 bg-white/20 mx-1" />

                <div className="flex gap-1">
                    <ShapeBtn active={activeShape === 'statue'} onClick={() => { setActiveShape('statue'); setIsRandomMode(false); }} icon={<User size={16} />} />
                    <ShapeBtn active={activeShape === 'heart'} onClick={() => { setActiveShape('heart'); setIsRandomMode(false); }} icon={<Heart size={16} />} />
                    <ShapeBtn active={activeShape === 'saturn'} onClick={() => { setActiveShape('saturn'); setIsRandomMode(false); }} icon={<div className="w-4 h-4 rounded-full border border-current scale-75" />} />
                    <ShapeBtn active={activeShape === 'flower'} onClick={() => { setActiveShape('flower'); setIsRandomMode(false); }} icon={<Flower size={16} />} />
                </div>
                
                <div className="w-px h-4 bg-white/20 mx-2" />
                
                <span className="text-[10px] text-fl-primary font-mono flex items-center gap-1">
                <MousePointer2 size={10} /> {isRandomMode ? 'CLICK & HOLD' : 'CLICK & HOLD'}
                </span>
            </div>
        </div>
      )}
    </>
  );
};

const ShapeBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ active, onClick, icon }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${active ? 'bg-fl-primary text-white shadow-[0_0_10px_#4433FF] scale-110' : 'text-fl-gray hover:text-white hover:bg-white/10'}`}
    >
        {icon}
    </button>
);