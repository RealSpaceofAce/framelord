import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { GraphNodeType, NoteGraphData } from './graphStore';

type GraphNodeInternal = {
  id: string;
  type: GraphNodeType;
  label: string;
  linkCount: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

type GraphEdgeInternal = {
  id: string;
  source: string | GraphNodeInternal;
  target: string | GraphNodeInternal;
};

interface NoteGraphProps {
  data: NoteGraphData;
  selectedNoteId?: string | null;
  selectedContactId?: string | null;
  selectedTopicId?: string | null;
  onSelectNote?: (id: string) => void;
  onSelectContact?: (id: string) => void;
  onSelectTopic?: (id: string) => void;
}

const NODE_COLORS: Record<GraphNodeType, string> = {
  note: '#7a5dff',
  topic: '#1cf1ff',
  contact: '#8beaff',
};

const NODE_GLOW_COLORS: Record<GraphNodeType, string> = {
  note: 'rgba(122, 93, 255, 0.6)',
  topic: 'rgba(28, 241, 255, 0.6)',
  contact: 'rgba(139, 234, 255, 0.6)',
};

export const NoteGraph: React.FC<NoteGraphProps> = ({
  data,
  selectedNoteId,
  selectedContactId,
  selectedTopicId,
  onSelectNote,
  onSelectContact,
  onSelectTopic,
}) => {
  const fgRef = useRef<ForceGraphMethods>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const graphPayload = useMemo(
    () => ({ nodes: data.nodes as GraphNodeInternal[], links: data.edges as GraphEdgeInternal[] }),
    [data]
  );

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    graphPayload.links.forEach((edge) => {
      const source = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const target = typeof edge.target === 'string' ? edge.target : edge.target.id;
      if (!map.has(source)) map.set(source, new Set());
      if (!map.has(target)) map.set(target, new Set());
      map.get(source)?.add(target);
      map.get(target)?.add(source);
    });
    return map;
  }, [graphPayload.links]);

  const activeSelectedId = selectedNoteId || selectedContactId || selectedTopicId || null;

  const focusNode = useCallback((nodeId: string | null) => {
    if (!nodeId || !fgRef.current) return;
    
    // Wait for graph to initialize and nodes to have positions
    const tryFocus = () => {
      const node = graphPayload.nodes.find((n) => n.id === nodeId) as GraphNodeInternal | undefined;
      if (node && node.x !== undefined && node.y !== undefined) {
        fgRef.current?.centerAt(node.x, node.y, 1000);
        fgRef.current?.zoom(2.5, 1000);
        return true;
      }
      return false;
    };

    // Try immediately
    if (tryFocus()) return;

    // If nodes don't have positions yet, wait a bit and try again
    const timeout = setTimeout(() => {
      tryFocus();
    }, 500);

    return () => clearTimeout(timeout);
  }, [graphPayload.nodes]);

  useEffect(() => {
    if (activeSelectedId && hasInitialized) {
      focusNode(activeSelectedId);
    }
  }, [activeSelectedId, hasInitialized, focusNode]);

  // Mark as initialized after first render
  useEffect(() => {
    if (graphPayload.nodes.length > 0 && !hasInitialized) {
      const timer = setTimeout(() => setHasInitialized(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [graphPayload.nodes.length, hasInitialized]);

  const getNodeColor = (node: GraphNodeInternal, highlighted: boolean) => {
    const base = NODE_COLORS[node.type];
    if (highlighted) return '#ffffff';
    if (node.id === selectedNoteId || node.id === selectedContactId || node.id === selectedTopicId) {
      return base;
    }
    return base;
  };

  const isNodeHighlighted = (nodeId: string) => {
    if (hoveredId === nodeId) return true;
    if (hoveredId && neighbors.get(hoveredId)?.has(nodeId)) return true;
    if (activeSelectedId === nodeId) return true;
    if (activeSelectedId && neighbors.get(activeSelectedId)?.has(nodeId)) return true;
    return false;
  };

  const linkIsHighlighted = (edge: GraphEdgeInternal) => {
    const source = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const target = typeof edge.target === 'string' ? edge.target : edge.target.id;
    if (hoveredId && (source === hoveredId || target === hoveredId)) return true;
    if (activeSelectedId && (source === activeSelectedId || target === activeSelectedId)) return true;
    return false;
  };

  const getNodeShape = (node: GraphNodeInternal): 'circle' | 'square' | 'diamond' => {
    if (node.type === 'contact') return 'circle';
    if (node.type === 'topic') return 'diamond';
    return 'circle';
  };

  return (
    <ForceGraph2D
      ref={fgRef as any}
      graphData={graphPayload}
      nodeId="id"
      nodeLabel={(node: GraphNodeInternal) => `${node.label} (${node.type})`}
      backgroundColor="#050910"
      enableNodeDrag={true}
      enablePanInteraction={true}
      enableZoomInteraction={true}
      cooldownTicks={100}
      onEngineStop={() => setHasInitialized(true)}
      linkDirectionalParticles={(edge: GraphEdgeInternal) => (linkIsHighlighted(edge) ? 4 : 0)}
      linkDirectionalParticleWidth={2}
      linkDirectionalParticleSpeed={0.006}
      linkCurvature={0.15}
      onNodeHover={(node: GraphNodeInternal | null) => setHoveredId(node?.id || null)}
      onNodeClick={(node: GraphNodeInternal) => {
        if (node.type === 'note' && onSelectNote) onSelectNote(node.id);
        if (node.type === 'contact' && onSelectContact) onSelectContact(node.id);
        if (node.type === 'topic' && onSelectTopic) onSelectTopic(node.id);
      }}
      linkColor={(edge: GraphEdgeInternal) => (linkIsHighlighted(edge) ? '#7a5dff' : 'rgba(126, 161, 199, 0.3)')}
      linkWidth={(edge: GraphEdgeInternal) => (linkIsHighlighted(edge) ? 2.5 : 0.8)}
      nodeRelSize={6}
      nodeCanvasObject={(node: GraphNodeInternal, ctx, globalScale) => {
        const baseRadius = 4 + Math.min(node.linkCount, 15) * 0.5;
        const radius = Math.max(3, baseRadius);
        const highlighted = isNodeHighlighted(node.id);
        const color = getNodeColor(node, highlighted);
        const glowColor = NODE_GLOW_COLORS[node.type];
        const alpha = highlighted ? 0.95 : 0.7;
        const shape = getNodeShape(node);

        ctx.save();
        
        // Outer glow for highlighted nodes
        if (highlighted) {
          ctx.shadowBlur = 30;
          ctx.shadowColor = glowColor;
          ctx.fillStyle = glowColor;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, radius + 4, 0, 2 * Math.PI, false);
          ctx.fill();
        }

        // Main node with glow
        ctx.shadowBlur = highlighted ? 20 : 12;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        
        if (shape === 'diamond') {
          // Diamond shape for topics
          const size = radius;
          ctx.moveTo(node.x || 0, (node.y || 0) - size);
          ctx.lineTo((node.x || 0) + size, node.y || 0);
          ctx.lineTo(node.x || 0, (node.y || 0) + size);
          ctx.lineTo((node.x || 0) - size, node.y || 0);
          ctx.closePath();
        } else {
          // Circle for notes and contacts
          ctx.arc(node.x || 0, node.y || 0, radius, 0, 2 * Math.PI, false);
        }
        ctx.fill();

        // Border for contacts and selected nodes
        if (node.type === 'contact' || node.id === activeSelectedId) {
          ctx.lineWidth = highlighted ? 3 : 2;
          ctx.strokeStyle = node.type === 'contact' ? '#1cf1ff' : color;
          ctx.globalAlpha = 0.9;
          ctx.stroke();
        }

        // Text label with better rendering
        const fontSize = Math.max(9, 12 / Math.sqrt(globalScale));
        const label = node.label.length > 20 ? node.label.slice(0, 17) + '...' : node.label;
        ctx.font = `${fontSize}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Text shadow for readability
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.fillStyle = highlighted ? '#ffffff' : '#cfe7ff';
        ctx.globalAlpha = 0.95;
        ctx.fillText(label, node.x || 0, (node.y || 0) + radius + 6);
        
        ctx.restore();
      }}
      nodeCanvasObjectMode={() => 'after'}
    />
  );
};
