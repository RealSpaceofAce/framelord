// =============================================================================
// FRAME CANVAS — Custom minimal whiteboard built with Konva (MIT)
// =============================================================================
// Clean, brandable canvas with just the essentials
// =============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Arrow, Image as KonvaImage, Transformer } from 'react-konva';
import { Maximize2, Minimize2, Trash2, Square, Circle as CircleIcon, Type, Minus, ArrowRight, MousePointer2, X, Link, PenTool } from 'lucide-react';
import type { CanvasThread, CanvasNode } from '../../stores/canvasStore';
import { getNodesForCanvas, createNode, updateNode, deleteNode, createConnection, getConnectionsForCanvas, deleteConnection } from '../../stores/canvasStore';
import type Konva from 'konva';
import { CanvasNodeCard } from './CanvasNodeCard';

interface FrameCanvasProps {
  thread: CanvasThread;
  onCanvasChange?: () => void;
}

type Tool = 'select' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'note' | 'connect' | 'pen';

interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'note' | 'image' | 'pen';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  text?: string;
  html?: string;
  fill?: string;
  stroke?: string;
  image?: HTMLImageElement;
}

export const FrameCanvas: React.FC<FrameCanvasProps> = ({ thread, onCanvasChange }) => {
  const [tool, setTool] = useState<Tool>('select');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [nodes, setNodes] = useState<CanvasNode[]>(() => getNodesForCanvas(thread.id));
  const [connections, setConnections] = useState(() => getConnectionsForCanvas(thread.id));
  const [connectionSource, setConnectionSource] = useState<string | null>(null); // For connect mode
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [stageSize, setStageSize] = useState({ width: 1000, height: 800 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDrawingConnection, setIsDrawingConnection] = useState(false);
  const [connectionLine, setConnectionLine] = useState<number[]>([]);

  // Handle container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      if (selectedId) {
        const selectedNode = stage.findOne(`#${selectedId}`);
        if (selectedNode) {
          transformerRef.current.nodes([selectedNode]);
        }
      } else {
        transformerRef.current.nodes([]);
      }
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard delete handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.key === 'Backspace' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault();
        }

        if (selectedId) {
          // Check if it's a node
          const node = nodes.find(n => n.id === selectedId);
          if (node) {
            handleNodeDelete(selectedId);
            return;
          }

          // Check if it's a connection
          const connection = connections.find(c => c.id === selectedId);
          if (connection) {
            handleConnectionDelete(selectedId);
            return;
          }

          // Otherwise it's a shape
          setShapes(shapes.filter(s => s.id !== selectedId));
          setSelectedId(null);
          onCanvasChange?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, nodes, shapes, connections, onCanvasChange]);

  // Image drag and drop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const stage = stageRef.current;
          if (!stage) return;

          const pointer = stage.getPointerPosition();
          if (!pointer) return;

          // Convert screen coordinates to canvas coordinates
          const transform = stage.getAbsoluteTransform().copy().invert();
          const canvasPos = transform.point(pointer);

          // Scale down large images to max 400px while maintaining aspect ratio
          const maxSize = 400;
          let scaledWidth = img.width;
          let scaledHeight = img.height;

          if (img.width > maxSize || img.height > maxSize) {
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            scaledWidth = img.width * scale;
            scaledHeight = img.height * scale;
          }

          setShapes([...shapes, {
            id: `image-${Date.now()}`,
            type: 'image',
            x: canvasPos.x,
            y: canvasPos.y,
            width: scaledWidth,
            height: scaledHeight,
            image: img,
          }]);
          onCanvasChange?.();
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, [shapes, onCanvasChange]);

  // Global mouseup handler for connection dragging
  useEffect(() => {
    if (!isDrawingConnection) return;

    const handleGlobalMouseUp = (e: MouseEvent) => {
      const stage = stageRef.current;

      // Always reset state at the end, no matter what
      const cleanup = () => {
        setIsDrawingConnection(false);
        setConnectionLine([]);
        setConnectionSource(null);
        setTool('select');
      };

      if (!stage) {
        cleanup();
        return;
      }

      // Use native event coordinates for robustness
      const stageRect = stage.container().getBoundingClientRect();
      const pos = {
        x: e.clientX - stageRect.left,
        y: e.clientY - stageRect.top
      };

      const transform = stage.getAbsoluteTransform().copy().invert();
      const canvasPos = transform.point(pos);

      let targetId = null;
      let targetType: 'node' | 'shape' | null = null;

      // 1. Check DOM nodes first (they're rendered on top, so check them first)
      for (const node of nodes) {
        if (node.id === connectionSource) continue;
        // Use a small tolerance for easier clicking
        const tolerance = 10 / (stage.scaleX() || 1);
        if (
          canvasPos.x >= node.x - tolerance &&
          canvasPos.x <= node.x + node.width + tolerance &&
          canvasPos.y >= node.y - tolerance &&
          canvasPos.y <= node.y + node.height + tolerance
        ) {
          console.log('[Connection] Hit DOM node:', node.id);
          targetId = node.id;
          targetType = 'node';
          break;
        }
      }

      // 2. Check Konva shapes (if no node found)
      if (!targetId) {
        // Temporarily hide connection line for accurate hit testing
        const connectionLineShape = stage.findOne('.connection-line-preview');
        if (connectionLineShape) {
          connectionLineShape.visible(false);
        }
        
        const targetShape = stage.getIntersection(pos);
        
        if (connectionLineShape) {
          connectionLineShape.visible(true);
        }
        
        if (targetShape && typeof targetShape.id === 'function') {
          const shapeId = targetShape.id();
          if (shapeId && shapeId !== connectionSource && shapeId !== 'grid-layer') {
            console.log('[Connection] Hit Konva shape:', shapeId);
            targetId = shapeId;
            targetType = 'shape';
          }
        }
      }

      if (targetId && connectionSource && targetId !== connectionSource) {
        console.log(`[Connection] Creating connection: ${connectionSource} -> ${targetId} (${targetType})`);
        // Create connection
        const newConnection = createConnection(thread.id, connectionSource, targetId);
        setConnections(prev => [...prev, newConnection]);
        onCanvasChange?.();
      } else {
        if (!targetId) {
          console.log('[Connection] Failed: No target found at drop position');
        } else if (!connectionSource) {
          console.log('[Connection] Failed: No source set');
        } else if (targetId === connectionSource) {
          console.log('[Connection] Failed: Cannot connect object to itself');
        }
      }

      cleanup();
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDrawingConnection, connectionSource, nodes, shapes, thread.id, onCanvasChange]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleClearCanvas = useCallback(() => {
    if (window.confirm('Clear the entire canvas? This cannot be undone.')) {
      setShapes([]);
      setSelectedId(null);
      onCanvasChange?.();
    }
  }, [onCanvasChange]);

  // Node handlers for CanvasNodeCard
  const handleNodeUpdate = (nodeId: string, updates: Partial<CanvasNode>) => {
    // console.log('[FrameCanvas] Updating node:', nodeId, updates);
    const updatedNodes = nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n));
    setNodes(updatedNodes);
    updateNode(nodeId, updates);
    onCanvasChange?.();
  };

  const handleNodeDelete = useCallback((nodeId: string) => {
    if (window.confirm('Delete this note?')) {
      deleteNode(nodeId);
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      // Also remove any connections involving this node
      setConnections((prev) => prev.filter(
        c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
      ));
      if (selectedId === nodeId) {
        setSelectedId(null);
      }
      onCanvasChange?.();
    }
  }, [selectedId, onCanvasChange]);

  const handleConnectionDelete = useCallback((connectionId: string) => {
    if (window.confirm('Delete this connection?')) {
      deleteConnection(connectionId);
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      if (selectedId === connectionId) {
        setSelectedId(null);
      }
      onCanvasChange?.();
    }
  }, [selectedId, onCanvasChange]);

  const handleNodeStartConnection = useCallback((nodeId: string) => {
    // Switch to connect mode and set this node as source
    setTool('connect');
    setConnectionSource(nodeId);
    console.log('[Connection Mode] Select target object to connect');
  }, []);

  // Handle shape selection
  const handleShapeClick = (id: string, shapeType: string, e?: any) => {
    // In connect mode, don't handle clicks - let the connect tool handle it
    if (tool === 'connect') {
      if (e) e.cancelBubble = true;
      return;
    }
    if (tool === 'select') {
      setSelectedId(id);
    }
  };


  // Handle stage click (deselect)
  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  };

  // Handle shape drag
  const handleShapeDragEnd = (id: string, e: any) => {
    const newShapes = shapes.map((shape) => {
      if (shape.id === id) {
        return {
          ...shape,
          x: e.target.x(),
          y: e.target.y(),
        };
      }
      return shape;
    });
    setShapes(newShapes);
    onCanvasChange?.();
  };

  // Handle shape transform
  const handleShapeTransform = (id: string, node: any) => {
    const newShapes = shapes.map((shape) => {
      if (shape.id === id) {
        return {
          ...shape,
          x: node.x(),
          y: node.y(),
          width: node.width() * node.scaleX(),
          height: node.height() * node.scaleY(),
          radius: shape.type === 'circle' ? node.radius() * node.scaleX() : shape.radius,
        };
      }
      return shape;
    });
    setShapes(newShapes);
    node.scaleX(1);
    node.scaleY(1);
    onCanvasChange?.();
  };



  // Drawing handlers
  const handleMouseDown = (e: any) => {
    // Check if clicking on stage background (not a shape)
    const clickedOnEmpty = e.target === e.target.getStage();

    // In select mode: allow panning when clicking empty canvas
    if (tool === 'select' && clickedOnEmpty) {
      setIsPanning(true);
      setPanStart({ x: e.evt.clientX - stagePos.x, y: e.evt.clientY - stagePos.y });
      return;
    }

    // Connect tool: start drawing connection line
    if (tool === 'connect') {
      // Prevent default behavior and stop propagation
      e.evt.preventDefault();
      e.evt.stopPropagation();
      
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const transform = stage.getAbsoluteTransform().copy().invert();
      const canvasPos = transform.point(pos);

      // If connectionSource is already set (from node link button), use it
      // Otherwise, try to get it from the clicked target
      let sourceId = connectionSource;
      if (!sourceId) {
        // Check if clicking on a Konva shape
        const clickedShape = e.target;
        if (clickedShape && typeof clickedShape.id === 'function') {
          const shapeId = clickedShape.id();
          if (shapeId && shapeId !== 'grid-layer') {
            sourceId = shapeId;
          }
        }
        
        // If no Konva shape found, check if clicking on a DOM node by checking bounds
        if (!sourceId) {
          for (const node of nodes) {
            if (
              canvasPos.x >= node.x &&
              canvasPos.x <= node.x + node.width &&
              canvasPos.y >= node.y &&
              canvasPos.y <= node.y + node.height
            ) {
              sourceId = node.id;
              break;
            }
          }
        }
      }

      if (sourceId) {
        setIsDrawingConnection(true);
        setConnectionSource(sourceId);
        setConnectionLine([canvasPos.x, canvasPos.y, canvasPos.x, canvasPos.y]);
      } else {
        // If clicking empty space in connect mode, just return (don't start connection)
        console.log('[Connect] Clicked empty space - select an object to connect');
      }
      return;
    }

    if (tool === 'select') return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Convert screen coordinates to canvas coordinates
    const transform = stage.getAbsoluteTransform().copy().invert();
    const canvasPos = transform.point(pos);

    const id = `shape-${Date.now()}`;

    setIsDrawing(true);
    setSelectedId(null);

    if (tool === 'rectangle') {
      setShapes([...shapes, {
        id,
        type: 'rectangle',
        x: canvasPos.x,
        y: canvasPos.y,
        width: 0,
        height: 0,
        fill: 'transparent',
        stroke: '#4f46e5',
      }]);
    } else if (tool === 'circle') {
      setShapes([...shapes, {
        id,
        type: 'circle',
        x: canvasPos.x,
        y: canvasPos.y,
        radius: 0,
        fill: 'transparent',
        stroke: '#4f46e5',
      }]);
    } else if (tool === 'line' || tool === 'arrow') {
      setShapes([...shapes, {
        id,
        type: tool,
        x: 0,
        y: 0,
        points: [canvasPos.x, canvasPos.y, canvasPos.x, canvasPos.y],
        stroke: '#4f46e5',
      }]);
    } else if (tool === 'pen') {
      setShapes([...shapes, {
        id,
        type: 'pen',
        x: 0,
        y: 0,
        points: [canvasPos.x, canvasPos.y],
        stroke: '#4f46e5',
      }]);
    } else if (tool === 'note') {
      // Create a new CanvasNode for the note
      const newNode = createNode(thread.id, canvasPos.x, canvasPos.y, 'New Note', '');
      setNodes([...nodes, newNode]);
      setTool('select');
      onCanvasChange?.();
    }
  };

  const handleMouseMove = (e: any) => {
    // Handle canvas panning
    if (isPanning) {
      const newPos = {
        x: e.evt.clientX - panStart.x,
        y: e.evt.clientY - panStart.y,
      };
      setStagePos(newPos);
      return;
    }

    // Handle connection line drawing
    if (isDrawingConnection && connectionLine.length > 0) {
      // Safety check: if mouse button is not pressed, cancel drawing
      if (e.evt.buttons === 0) {
        setIsDrawingConnection(false);
        setConnectionLine([]);
        setConnectionSource(null);
        setTool('select');
        return;
      }

      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      const transform = stage.getAbsoluteTransform().copy().invert();
      const canvasPos = transform.point(pos);

      // Check for potential target (snap to center)
      let snapX = canvasPos.x;
      let snapY = canvasPos.y;
      let foundTarget = null;

      // 1. Check DOM nodes (manual bounds check with tolerance)
      const tolerance = 10 / (stage.scaleX() || 1);
      for (const node of nodes) {
        if (node.id === connectionSource) continue;
        if (
          canvasPos.x >= node.x - tolerance &&
          canvasPos.x <= node.x + node.width + tolerance &&
          canvasPos.y >= node.y - tolerance &&
          canvasPos.y <= node.y + node.height + tolerance
        ) {
          snapX = node.x + node.width / 2;
          snapY = node.y + node.height / 2;
          foundTarget = node.id;
          break;
        }
      }

      // 2. Check Konva shapes (if no node found)
      if (!foundTarget) {
        // Hide connection line preview for accurate hit testing
        const connectionLineShape = stage.findOne('.connection-line-preview');
        if (connectionLineShape) {
          connectionLineShape.visible(false);
        }
        
        const targetShape = stage.getIntersection(pos);
        
        if (connectionLineShape) {
          connectionLineShape.visible(true);
        }

        if (targetShape && typeof targetShape.id === 'function') {
          const shapeId = targetShape.id();
          if (shapeId && shapeId !== connectionSource && shapeId !== 'grid-layer') {
            const shape = shapes.find(s => s.id === shapeId);
            if (shape) {
              // Calculate center point based on shape type
              if (shape.type === 'circle' && shape.radius) {
                snapX = shape.x;
                snapY = shape.y;
              } else {
                snapX = shape.x + (shape.width || 0) / 2;
                snapY = shape.y + (shape.height || 0) / 2;
              }
              foundTarget = shape.id;
            }
          }
        }
      }

      // Update line with snap position
      setConnectionLine([connectionLine[0], connectionLine[1], snapX, snapY]);
      return;
    }

    if (!isDrawing || tool === 'select' || tool === 'note' || tool === 'connect') return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Convert screen coordinates to canvas coordinates
    const transform = stage.getAbsoluteTransform().copy().invert();
    const canvasPos = transform.point(pos);

    const lastShape = shapes[shapes.length - 1];

    if (!lastShape) return;

    const updatedShapes = shapes.slice(0, -1);

    if (tool === 'rectangle') {
      updatedShapes.push({
        ...lastShape,
        width: canvasPos.x - lastShape.x,
        height: canvasPos.y - lastShape.y,
      });
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(canvasPos.x - lastShape.x, 2) + Math.pow(canvasPos.y - lastShape.y, 2)
      );
      updatedShapes.push({
        ...lastShape,
        radius,
      });
    } else if (tool === 'line' || tool === 'arrow') {
      const points = lastShape.points!;
      updatedShapes.push({
        ...lastShape,
        points: [points[0], points[1], canvasPos.x, canvasPos.y],
      });
    } else if (tool === 'pen') {
      // Add new point to the pen stroke
      updatedShapes.push({
        ...lastShape,
        points: [...(lastShape.points || []), canvasPos.x, canvasPos.y],
      });
    }

    setShapes(updatedShapes);
  };

  const handleMouseUp = (e: any) => {
    setIsPanning(false);

    if (isDrawing) {
      setIsDrawing(false);
      setTool('select'); // Auto-switch to select after drawing
      onCanvasChange?.();
    }
  };

  // Handle wheel for zoom
  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Smoother zoom with limited range
    const scaleBy = 1.05;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    // Limit zoom range: 25% to 200%
    const clampedScale = Math.max(0.25, Math.min(2, newScale));

    // Calculate new position to zoom toward pointer
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    stage.scale({ x: clampedScale, y: clampedScale });
    stage.position(newPos);
    setStageScale(clampedScale);
    setStagePos(newPos);
    stage.batchDraw();
  };

  // Render dot grid background
  const renderGrid = () => {
    const gridSize = 40; // Spacing between dots
    const dotRadius = 1; // Small dot size
    const dots = [];

    // Calculate visible area in canvas coordinates
    const stage = stageRef.current;
    if (!stage) return dots;

    const scale = stage.scaleX();
    const pos = stage.position();

    // Calculate the bounds of the visible area
    const startX = Math.floor((-pos.x / scale) / gridSize) * gridSize;
    const endX = Math.ceil((-pos.x + stageSize.width) / scale / gridSize) * gridSize;
    const startY = Math.floor((-pos.y / scale) / gridSize) * gridSize;
    const endY = Math.ceil((-pos.y + stageSize.height) / scale / gridSize) * gridSize;

    // Create dots at grid intersections
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        dots.push(
          <Circle
            key={`dot-${x}-${y}`}
            x={x}
            y={y}
            radius={dotRadius / scale}
            fill="rgba(79, 70, 229, 0.15)"
            listening={false}
          />
        );
      }
    }

    return dots;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-0 bg-[#191B20]">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-[#1E2028]/90 backdrop-blur-sm rounded-lg p-2 border border-[#2A2D35] shadow-lg">
        <button
          onClick={() => setTool('select')}
          className={`p-2 rounded transition-colors ${tool === 'select' ? 'bg-[#4f46e5] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
            }`}
          title="Select"
        >
          <MousePointer2 size={18} />
        </button>
        <div className="w-px h-6 bg-[#2A2D35]" />
        <button
          onClick={() => setTool('rectangle')}
          className={`p-2 rounded transition-colors ${tool === 'rectangle' ? 'bg-[#4f46e5] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
            }`}
          title="Rectangle"
        >
          <Square size={18} />
        </button>
        <button
          onClick={() => setTool('circle')}
          className={`p-2 rounded transition-colors ${tool === 'circle' ? 'bg-[#4f46e5] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
            }`}
          title="Circle"
        >
          <CircleIcon size={18} />
        </button>
        <button
          onClick={() => setTool('line')}
          className={`p-2 rounded transition-colors ${tool === 'line' ? 'bg-[#4f46e5] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
            }`}
          title="Line"
        >
          <Minus size={18} />
        </button>
        <button
          onClick={() => setTool('arrow')}
          className={`p-2 rounded transition-colors ${tool === 'arrow' ? 'bg-[#4f46e5] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
            }`}
          title="Arrow"
        >
          <ArrowRight size={18} />
        </button>
        <button
          onClick={() => setTool('note')}
          className={`p-2 rounded transition-colors ${tool === 'note' ? 'bg-[#4f46e5] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
            }`}
          title="Note (Rich Text Box)"
        >
          <Type size={18} />
        </button>
        <button
          onClick={() => setTool('pen')}
          className={`p-2 rounded transition-colors ${tool === 'pen' ? 'bg-[#4f46e5] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
            }`}
          title="Pen / Draw"
        >
          <PenTool size={18} />
        </button>
        <div className="w-px h-6 bg-[#2A2D35]" />
        <button
          onClick={() => {
            setTool('connect');
            setConnectionSource(null);
          }}
          className={`p-2 rounded transition-colors ${tool === 'connect' ? 'bg-[#4f46e5] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
            }`}
          title="Connect Objects"
        >
          <Link size={18} />
        </button>
      </div>

      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={handleClearCanvas}
          className="p-2 bg-[#1E2028]/90 backdrop-blur-sm text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors shadow-lg border border-[#2A2D35]"
          title="Clear Canvas"
        >
          <Trash2 size={18} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-[#1E2028]/90 backdrop-blur-sm text-gray-400 hover:text-white hover:bg-[#2A2D35] rounded-lg transition-colors shadow-lg border border-[#2A2D35]"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* Hints */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#1E2028]/80 backdrop-blur-sm text-gray-400 text-xs px-3 py-1.5 rounded-lg border border-[#2A2D35]">
        Click objects to drag • Click empty canvas to pan • Scroll to zoom
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 right-4 z-50 bg-[#1E2028]/90 backdrop-blur-sm text-gray-300 text-xs px-3 py-1.5 rounded-lg border border-[#2A2D35]">
        {Math.round(stageScale * 100)}%
      </div>

      {/* Konva Canvas */}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
        onWheel={handleWheel}
        draggable={false}
      >
        {/* Grid Layer */}
        <Layer>
          {renderGrid()}
        </Layer>

        {/* Shapes Layer */}
        <Layer>
          {/* Render connection lines first (so they appear behind objects) */}
          {connections.map((conn) => {
            // Find source and target (could be shapes or nodes)
            const sourceShape = shapes.find(s => s.id === conn.sourceNodeId);
            const targetShape = shapes.find(s => s.id === conn.targetNodeId);
            const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
            const targetNode = nodes.find(n => n.id === conn.targetNodeId);

            // Skip if source or target not found
            if (!sourceShape && !sourceNode) return null;
            if (!targetShape && !targetNode) return null;

            // Calculate center points
            let sourceX = 0, sourceY = 0, targetX = 0, targetY = 0;

            if (sourceShape) {
              if (sourceShape.type === 'circle' && sourceShape.radius) {
                sourceX = sourceShape.x;
                sourceY = sourceShape.y;
              } else {
                sourceX = sourceShape.x + (sourceShape.width || 0) / 2;
                sourceY = sourceShape.y + (sourceShape.height || 0) / 2;
              }
            } else if (sourceNode) {
              sourceX = sourceNode.x + sourceNode.width / 2;
              sourceY = sourceNode.y + sourceNode.height / 2;
            }

            if (targetShape) {
              if (targetShape.type === 'circle' && targetShape.radius) {
                targetX = targetShape.x;
                targetY = targetShape.y;
              } else {
                targetX = targetShape.x + (targetShape.width || 0) / 2;
                targetY = targetShape.y + (targetShape.height || 0) / 2;
              }
            } else if (targetNode) {
              targetX = targetNode.x + targetNode.width / 2;
              targetY = targetNode.y + targetNode.height / 2;
            }

            const isSelected = selectedId === conn.id;

            return (
              <Arrow
                key={conn.id}
                id={conn.id}
                points={[sourceX, sourceY, targetX, targetY]}
                stroke={isSelected ? '#818cf8' : '#6366f1'}
                strokeWidth={isSelected ? 3 : 2}
                fill={isSelected ? '#818cf8' : '#6366f1'}
                listening={true}
                dash={[10, 5]}
                hitStrokeWidth={20}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (tool === 'select') {
                    setSelectedId(conn.id);
                  }
                }}
              />
            );
          })}

          {/* Preview connection line while drawing */}
          {isDrawingConnection && connectionLine.length === 4 && (
            <Line
              className="connection-line-preview"
              points={connectionLine}
              stroke="#6366f1"
              strokeWidth={2}
              dash={[10, 5]}
              listening={false}
            />
          )}

          {shapes.map((shape) => {
            // Objects are draggable in select mode
            const isDraggable = tool === 'select';
            // In connect mode, disable onClick on shapes so connect tool can handle clicks
            const shouldHandleClick = tool !== 'connect';

            if (shape.type === 'rectangle') {
              return (
                <Rect
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill={shape.fill}
                  stroke={connectionSource === shape.id ? '#6366f1' : shape.stroke}
                  strokeWidth={connectionSource === shape.id ? 4 : 2}
                  draggable={isDraggable}
                  onClick={shouldHandleClick ? (e) => handleShapeClick(shape.id, shape.type, e) : undefined}
                  onDragMove={(e) => {
                    const newShapes = shapes.map((s) =>
                      s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s
                    );
                    setShapes(newShapes);
                  }}
                  onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                  onTransformEnd={(e) => handleShapeTransform(shape.id, e.target)}
                />
              );
            } else if (shape.type === 'circle') {
              return (
                <Circle
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                  fill={shape.fill}
                  stroke={connectionSource === shape.id ? '#6366f1' : shape.stroke}
                  strokeWidth={connectionSource === shape.id ? 4 : 2}
                  draggable={isDraggable}
                  onClick={shouldHandleClick ? (e) => handleShapeClick(shape.id, shape.type, e) : undefined}
                  onDragMove={(e) => {
                    const newShapes = shapes.map((s) =>
                      s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s
                    );
                    setShapes(newShapes);
                  }}
                  onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                  onTransformEnd={(e) => handleShapeTransform(shape.id, e.target)}
                />
              );
            } else if (shape.type === 'line') {
              return (
                <Line
                  key={shape.id}
                  id={shape.id}
                  points={shape.points}
                  stroke={shape.stroke}
                  strokeWidth={2}
                  draggable={isDraggable}
                  onClick={shouldHandleClick ? (e) => handleShapeClick(shape.id, shape.type, e) : undefined}
                  onDragMove={(e) => {
                    const newShapes = shapes.map((s) =>
                      s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s
                    );
                    setShapes(newShapes);
                  }}
                  onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                />
              );
            } else if (shape.type === 'arrow') {
              return (
                <Arrow
                  key={shape.id}
                  id={shape.id}
                  points={shape.points}
                  stroke={connectionSource === shape.id ? '#6366f1' : shape.stroke}
                  strokeWidth={connectionSource === shape.id ? 4 : 2}
                  fill={connectionSource === shape.id ? '#6366f1' : shape.stroke}
                  draggable={isDraggable}
                  onClick={() => handleShapeClick(shape.id, shape.type)}
                  onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                />
              );
            } else if (shape.type === 'pen') {
              return (
                <Line
                  key={shape.id}
                  id={shape.id}
                  points={shape.points}
                  stroke={shape.stroke}
                  strokeWidth={2}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  draggable={isDraggable}
                  onClick={shouldHandleClick ? (e) => handleShapeClick(shape.id, shape.type, e) : undefined}
                  onDragMove={(e) => {
                    const newShapes = shapes.map((s) =>
                      s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s
                    );
                    setShapes(newShapes);
                  }}
                  onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                />
              );
            } else if (shape.type === 'image' && shape.image) {
              return (
                <KonvaImage
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  image={shape.image}
                  draggable={isDraggable}
                  onClick={shouldHandleClick ? (e) => handleShapeClick(shape.id, shape.type, e) : undefined}
                  onDragMove={(e) => {
                    const newShapes = shapes.map((s) =>
                      s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s
                    );
                    setShapes(newShapes);
                  }}
                  onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                  onTransformEnd={(e) => handleShapeTransform(shape.id, e.target)}
                />
              );
            }
            return null;
          })}
          {/* Transformer for resizing */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>

      {/* DOM Overlay for Note Nodes */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            transform: `translate(${stagePos.x}px, ${stagePos.y}px) scale(${stageScale})`,
            transformOrigin: '0 0',
          }}
        >
          {nodes.map((node) => (
            <CanvasNodeCard
              key={node.id}
              node={node}
              zoom={stageScale}
              isSelected={selectedId === node.id}
              isConnectionSource={connectionSource === node.id}
              tool={tool}
              onSelect={setSelectedId}
              onUpdate={handleNodeUpdate}
              onDelete={handleNodeDelete}
              onStartConnection={handleNodeStartConnection}
            />
          ))}
        </div>
      </div>
    </div >
  );
};

export default FrameCanvas;
