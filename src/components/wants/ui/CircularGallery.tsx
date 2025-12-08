// =============================================================================
// CIRCULAR GALLERY — OGL-based 3D thumbnail gallery for Wants
// =============================================================================
// Creates a fan/carousel of Want cover images using WebGL (OGL).
// Based on ReactBits circular gallery pattern.
// =============================================================================

import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform, type OGLRenderingContext } from 'ogl';
import { useEffect, useRef } from 'react';

import './CircularGallery.css';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  } as T;
}

function lerp(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance: object): void {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach((key) => {
    if (key !== 'constructor' && typeof (instance as Record<string, unknown>)[key] === 'function') {
      (instance as Record<string, unknown>)[key] = ((instance as Record<string, unknown>)[key] as Function).bind(instance);
    }
  });
}

function createTextTexture(
  gl: OGLRenderingContext,
  text: string,
  font: string = 'bold 30px Figtree',
  color: string = 'white'
): { texture: Texture; width: number; height: number } {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(parseInt(font, 10) * 1.2);
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

// =============================================================================
// TITLE CLASS — Text labels under each image
// =============================================================================

class Title {
  gl: OGLRenderingContext;
  plane: Mesh;
  text: string;
  textColor: string;
  font: string;
  mesh!: Mesh;

  constructor({
    gl,
    plane,
    text,
    textColor = '#ffffff',
    font = 'bold 24px Figtree',
  }: {
    gl: OGLRenderingContext;
    plane: Mesh;
    renderer: Renderer;
    text: string;
    textColor?: string;
    font?: string;
  }) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }

  createMesh(): void {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    const aspect = width / height;
    const textHeight = (this.plane.scale as unknown as { y: number }).y * 0.15;
    const textWidth = textHeight * aspect;
    (this.mesh.scale as unknown as { set: (x: number, y: number, z: number) => void }).set(textWidth, textHeight, 1);
    (this.mesh.position as unknown as { y: number }).y =
      -(this.plane.scale as unknown as { y: number }).y * 0.5 - textHeight * 0.5 - 0.05;
    this.mesh.setParent(this.plane);
  }
}

// =============================================================================
// MEDIA CLASS — Individual image plane in the gallery
// =============================================================================

class Media {
  gl: OGLRenderingContext;
  geometry: Plane;
  scene: Transform;
  screen: { width: number; height: number };
  viewport: { width: number; height: number };
  image: string;
  text: string;
  index: number;
  length: number;
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  renderer: Renderer;
  program!: Program;
  plane!: Mesh;
  title!: Title;
  x = 0;
  scale = 0;
  isBefore = false;
  isAfter = false;
  extra = 0;
  onClick?: (index: number) => void;

  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    renderer,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius,
    font,
    onClick,
  }: {
    geometry: Plane;
    gl: OGLRenderingContext;
    image: string;
    index: number;
    length: number;
    renderer: Renderer;
    scene: Transform;
    screen: { width: number; height: number };
    text: string;
    viewport: { width: number; height: number };
    bend: number;
    textColor: string;
    borderRadius: number;
    font: string;
    onClick?: (index: number) => void;
  }) {
    autoBind(this);
    this.gl = gl;
    this.geometry = geometry;
    this.scene = scene;
    this.screen = screen;
    this.viewport = viewport;
    this.image = image;
    this.text = text;
    this.index = index;
    this.length = length;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.renderer = renderer;
    this.onClick = onClick;
    this.createShader();
    this.createMesh();
    this.onResize();
  }

  createShader(): void {
    const texture = new Texture(this.gl, { generateMipmaps: false });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uBend;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.z += sin(pos.x * 3.14159) * uBend * 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;

        float roundedBox(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b + r;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = uv * 2.0 - 1.0;
          float d = roundedBox(p, vec2(1.0), uBorderRadius);
          if (d > 0.0) discard;
          gl_FragColor = texture2D(tMap, uv);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uBend: { value: this.bend },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
    };
  }

  createMesh(): void {
    this.plane = new Mesh(this.gl, { geometry: this.geometry, program: this.program });
    this.plane.setParent(this.scene);
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.text,
      textColor: this.textColor,
      font: this.font,
    });
  }

  onResize({
    screen,
    viewport,
  }: { screen?: { width: number; height: number }; viewport?: { width: number; height: number } } = {}): void {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;

    this.scale = this.screen.height / 1200;
    const planeWidth = 1.6 * this.scale;
    const planeHeight = 0.9 * this.scale;
    (this.plane.scale as unknown as { set: (x: number, y: number, z: number) => void }).set(planeWidth, planeHeight, 1);
    this.extra = 0;
    this.x = 0;
    this.isBefore = false;
    this.isAfter = false;
    const widthTotal = planeWidth * this.length;
    this.extra = (this.viewport.width + widthTotal) / 2;
  }

  update(scroll: number): void {
    const planeWidth = (this.plane.scale as unknown as { x: number }).x;
    const widthTotal = planeWidth * this.length;
    this.x = this.index * planeWidth - scroll * 0.003;

    // Infinite scroll wrapping
    while (this.x < -this.extra) {
      this.x += widthTotal;
    }
    while (this.x > this.extra) {
      this.x -= widthTotal;
    }

    (this.plane.position as unknown as { x: number }).x = this.x;
    (this.plane.position as unknown as { y: number }).y = Math.sin(this.x * 0.5) * 0.1;
    (this.plane.rotation as unknown as { z: number }).z = Math.sin(this.x * 0.3) * 0.1;
    this.program.uniforms.uBend.value = this.bend + Math.sin(this.x * 0.5) * 0.02;
  }
}

// =============================================================================
// APP CLASS — Main gallery controller
// =============================================================================

class App {
  container: HTMLDivElement;
  items: { image: string; text: string }[];
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  scrollSpeed: number;
  scrollEase: number;
  renderer!: Renderer;
  gl!: OGLRenderingContext;
  camera!: Camera;
  scene!: Transform;
  geometry!: Plane;
  medias: Media[] = [];
  scroll = { current: 0, target: 0, ease: 0.05, speed: 2 };
  screen = { width: 0, height: 0 };
  viewport = { width: 0, height: 0 };
  animationFrame = 0;
  onItemClick?: (index: number) => void;
  touchStart?: number;

  constructor({
    container,
    items,
    bend,
    textColor,
    borderRadius,
    font,
    scrollSpeed,
    scrollEase,
    onItemClick,
  }: {
    container: HTMLDivElement;
    items: { image: string; text: string }[];
    bend: number;
    textColor: string;
    borderRadius: number;
    font: string;
    scrollSpeed: number;
    scrollEase: number;
    onItemClick?: (index: number) => void;
  }) {
    autoBind(this);
    this.container = container;
    this.items = items;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.scrollSpeed = scrollSpeed;
    this.scrollEase = scrollEase;
    this.scroll.ease = scrollEase;
    this.scroll.speed = scrollSpeed;
    this.onItemClick = onItemClick;
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias();
    this.addEventListeners();
    this.update();
  }

  createRenderer(): void {
    this.renderer = new Renderer({ alpha: true, antialias: true });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);
  }

  createCamera(): void {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    (this.camera.position as unknown as { z: number }).z = 5;
  }

  createScene(): void {
    this.scene = new Transform();
  }

  createGeometry(): void {
    this.geometry = new Plane(this.gl, { widthSegments: 32, heightSegments: 32 });
  }

  createMedias(): void {
    this.medias = this.items.map((item, index) => {
      return new Media({
        geometry: this.geometry,
        gl: this.gl,
        image: item.image,
        index,
        length: this.items.length,
        renderer: this.renderer,
        scene: this.scene,
        screen: this.screen,
        text: item.text,
        viewport: this.viewport,
        bend: this.bend,
        textColor: this.textColor,
        borderRadius: this.borderRadius,
        font: this.font,
        onClick: this.onItemClick,
      });
    });
  }

  onResize(): void {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * (this.camera.position as unknown as { z: number }).z;
    const width = height * (this.screen.width / this.screen.height);
    this.viewport = { width, height };
    this.medias.forEach((media) => media.onResize({ screen: this.screen, viewport: this.viewport }));
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.scroll.target += event.deltaY * this.scroll.speed;
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStart = event.touches[0].clientX;
  }

  onTouchMove(event: TouchEvent): void {
    if (this.touchStart === undefined) return;
    const touchEnd = event.touches[0].clientX;
    const delta = (this.touchStart - touchEnd) * 2;
    this.scroll.target += delta * this.scroll.speed;
    this.touchStart = touchEnd;
  }

  addEventListeners(): void {
    this.container.addEventListener('wheel', this.onWheel, { passive: false });
    this.container.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.container.addEventListener('touchmove', this.onTouchMove, { passive: true });
    window.addEventListener('resize', debounce(this.onResize, 100));
  }

  removeEventListeners(): void {
    this.container.removeEventListener('wheel', this.onWheel);
    this.container.removeEventListener('touchstart', this.onTouchStart);
    this.container.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('resize', this.onResize);
  }

  update(): void {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    this.medias.forEach((media) => media.update(this.scroll.current));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.animationFrame = requestAnimationFrame(this.update);
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame);
    this.removeEventListeners();
    if (this.gl.canvas.parentNode) {
      this.gl.canvas.parentNode.removeChild(this.gl.canvas);
    }
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface CircularGalleryItem {
  image: string;
  text: string;
}

interface CircularGalleryProps {
  items: CircularGalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  onItemClick?: (index: number) => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CircularGallery({
  items,
  bend = 3,
  textColor = '#ffffff',
  borderRadius = 0.05,
  font = 'bold 24px Figtree',
  scrollSpeed = 2,
  scrollEase = 0.05,
  onItemClick,
  className = '',
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<App | null>(null);

  useEffect(() => {
    if (!containerRef.current || items.length === 0) return;

    appRef.current = new App({
      container: containerRef.current,
      items,
      bend,
      textColor,
      borderRadius,
      font,
      scrollSpeed,
      scrollEase,
      onItemClick,
    });

    return () => {
      appRef.current?.destroy();
      appRef.current = null;
    };
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, onItemClick]);

  return <div ref={containerRef} className={`circular-gallery ${className}`} />;
}

export type { CircularGalleryItem, CircularGalleryProps };
