// =============================================================================
// FRAME GRAPH VIEW — Obsidian-style knowledge graph visualization
// =============================================================================
// A read-only projection of all FrameLord data as an interactive force graph.
// Shows contacts, notes, topics, tasks, interactions, and FrameScans.
// Contact Zero is always central and visually prominent.
// =============================================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import { Search, Filter, Target, Maximize2, Minimize2, X, Expand, Shrink } from 'lucide-react';
import {
  buildFrameGraphData,
  type FrameGraphNode,
  type GraphNodeType,
  type GraphLinkType,
} from '../../services/graph/graphDataBuilder';
import { createSampleGraphData } from '../../services/graph/graphDevFixtures';
import { getAllContacts, CONTACT_ZERO } from '../../services/contactStore';
import { getAllNotes } from '../../services/noteStore';
import { getAllTopics } from '../../services/topicStore';
import { getAllTasks } from '../../services/taskStore';
import { getAllInteractions } from '../../services/interactionStore';
import { getFrameScanReports } from '../../services/frameScanReportStore';

// =============================================================================
// TYPES
// =============================================================================

interface FrameGraphViewProps {
  selectedContactId?: string;
  onNodeClick?: (node: FrameGraphNode) => void;
  onGraphSelectionChange?: (node: FrameGraphNode | null) => void;
  onFullScreenChange?: (isFullScreen: boolean) => void;
}

interface TypeFilter {
  contact: boolean;
  note: boolean;
  topic: boolean;
  task: boolean;
  interaction: boolean;
  framescan: boolean;
}

// =============================================================================
// STYLING CONSTANTS — Muted, coherent palette
// =============================================================================

const NODE_COLORS: Record<GraphNodeType, string> = {
  contact_zero: '#6366f1',    // Indigo accent for Contact Zero
  contact: '#8b5cf6',         // Soft purple for contacts
  note: '#64748b',            // Slate for notes
  topic: '#0ea5e9',           // Sky blue for topics
  task: '#f59e0b',            // Amber for tasks
  interaction: '#78716c',     // Stone for interactions
  framescan: '#a78bfa',       // Light violet for FrameScans
};

// Tight size range so no node dominates
const NODE_RADII: Record<GraphNodeType, number> = {
  contact_zero: 6,            // Slightly larger
  contact: 4.5,               // Medium
  note: 3,                    // Small
  topic: 3.5,                 // Similar to notes
  task: 2,                    // Tiny
  interaction: 2,             // Tiny
  framescan: 4,               // Medium (diamond shape)
};

const BACKGROUND_COLOR = '#080810';
// Obsidian-style: lines always clearly visible
const LINK_COLOR = 'rgba(136, 136, 170, 0.5)';            // More visible baseline (Obsidian uses ~50% opacity)
const HIGHLIGHT_LINK_COLOR = 'rgba(147, 130, 255, 0.9)';  // Bright highlight on hover
const NOTE_LINK_COLOR = 'rgba(160, 160, 200, 0.6)';       // Wikilinks slightly brighter
const FADED_ALPHA = 0.15;

// =============================================================================
// COMPONENT
// =============================================================================

export const FrameGraphView: React.FC<FrameGraphViewProps> = ({
  selectedContactId,
  onNodeClick,
  onGraphSelectionChange,
  onFullScreenChange,
}) => {
  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState<TypeFilter>({
    contact: true,
    note: true,
    topic: true,
    task: true,
    interaction: true,
    framescan: true,
  });
  const [isLocalView, setIsLocalView] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeObject | null>(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set<string>());
  const [highlightLinks, setHighlightLinks] = useState(new Set<string>());
  const [showFilters, setShowFilters] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Build graph data from stores
  const graphData = useMemo(() => {
    const contacts = getAllContacts();
    const notes = getAllNotes();
    const topics = getAllTopics();
    const tasks = getAllTasks();
    const interactions = getAllInteractions();
    const frameScanReports = getFrameScanReports();

    // Use dev fixtures if stores are empty
    if (
      contacts.length <= 1 &&
      notes.length === 0 &&
      topics.length === 0 &&
      tasks.length === 0 &&
      interactions.length === 0 &&
      frameScanReports.length === 0
    ) {
      return createSampleGraphData();
    }

    return buildFrameGraphData(
      contacts,
      notes,
      topics,
      tasks,
      interactions,
      frameScanReports,
      {
        focusContactId: isLocalView && focusNodeId ? focusNodeId : undefined,
        maxNodes: 500,
        maxDepth: 3,
      }
    );
  }, [isLocalView, focusNodeId]);

  // Filter graph data by search and type filters
  const filteredGraphData = useMemo(() => {
    let filteredNodes = graphData.nodes;
    let filteredLinks = graphData.links;

    // Apply type filters (always show Contact Zero)
    filteredNodes = filteredNodes.filter(node => {
      if (node.type === 'contact_zero') return true;
      if (node.type === 'contact') return typeFilters.contact;
      if (node.type === 'note') return typeFilters.note;
      if (node.type === 'topic') return typeFilters.topic;
      if (node.type === 'task') return typeFilters.task;
      if (node.type === 'interaction') return typeFilters.interaction;
      if (node.type === 'framescan') return typeFilters.framescan;
      return true;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(
        node =>
          node.label.toLowerCase().includes(query) ||
          node.subLabel?.toLowerCase().includes(query)
      );
    }

    // Filter links to only include nodes that passed filters
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredLinks = filteredLinks.filter(
      link => nodeIds.has(link.source) && nodeIds.has(link.target)
    );

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [graphData, searchQuery, typeFilters]);

  // Measure container and update dimensions
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  // Handle resize
  useEffect(() => {
    updateDimensions();
    const handleResize = () => {
      updateDimensions();
      // zoomToFit after resize
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 60);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateDimensions]);

  // zoomToFit on data change, view mode change, or fullscreen change
  useEffect(() => {
    if (graphRef.current && filteredGraphData.nodes.length > 0) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 60);
      }, 300);
    }
  }, [filteredGraphData, isLocalView, isFullScreen]);

  // Update dimensions when fullscreen changes
  useEffect(() => {
    updateDimensions();
    if (onFullScreenChange) {
      onFullScreenChange(isFullScreen);
    }
  }, [isFullScreen, updateDimensions, onFullScreenChange]);

  // Handle node hover
  const handleNodeHover = useCallback((node: NodeObject | null) => {
    setHoveredNode(node);

    if (!node) {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }

    const neighbors = new Set<string>();
    const linkIds = new Set<string>();

    filteredGraphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;

      if (sourceId === node.id) {
        neighbors.add(targetId);
        linkIds.add(link.id);
      }
      if (targetId === node.id) {
        neighbors.add(sourceId);
        linkIds.add(link.id);
      }
    });

    neighbors.add(node.id as string);

    setHighlightNodes(neighbors);
    setHighlightLinks(linkIds);
  }, [filteredGraphData.links]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      const graphNode = node as unknown as FrameGraphNode;

      if (onNodeClick) {
        onNodeClick(graphNode);
      }

      if (onGraphSelectionChange) {
        onGraphSelectionChange(graphNode);
      }

      // Set focus for local view
      setFocusNodeId(graphNode.id);
    },
    [onNodeClick, onGraphSelectionChange]
  );

  // Render node on canvas — Obsidian-style with glow
  const paintNode = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as unknown as FrameGraphNode;
      const isHighlighted = highlightNodes.has(graphNode.id);
      const isHovered = hoveredNode?.id === graphNode.id;
      const isContactZero = graphNode.type === 'contact_zero';
      const isFocusedContact = graphNode.contactId === selectedContactId;

      // Get base radius (tight range)
      const radius = NODE_RADII[graphNode.type] || 3;

      // Fade non-highlighted nodes when hovering
      let opacity = 1;
      if (hoveredNode && !isHighlighted) {
        opacity = FADED_ALPHA;
      }

      ctx.save();
      ctx.globalAlpha = opacity;

      const color = NODE_COLORS[graphNode.type] || '#64748b';
      const x = node.x || 0;
      const y = node.y || 0;

      // Obsidian-style subtle glow effect
      if (isHovered || isHighlighted) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
      }

      // Draw node based on type - all filled circles like Obsidian
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Contact Zero gets an extra outer ring
      if (isContactZero) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // FrameScan gets a small indicator mark
      if (graphNode.type === 'framescan') {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1 / globalScale;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Topics get outline
      if (graphNode.type === 'topic') {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.8 / globalScale;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Clear shadow for highlight ring
      ctx.shadowBlur = 0;

      // Draw highlight ring if hovered
      if (isHovered) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / globalScale;
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Label logic: Always show for Contact Zero and focused contact
      // Show on hover for others
      const shouldShowLabel = isContactZero || isFocusedContact || isHovered;

      if (shouldShowLabel) {
        const fontSize = Math.max(10 / globalScale, 3);
        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        const labelText = graphNode.label;
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;
        const padding = 3 / globalScale;
        const labelY = y + radius + 8 / globalScale;

        // Dark background rectangle behind label
        ctx.fillStyle = 'rgba(8, 8, 16, 0.9)';
        ctx.fillRect(
          x - textWidth / 2 - padding,
          labelY - textHeight / 2 - padding,
          textWidth + padding * 2,
          textHeight + padding * 2
        );

        // Label text
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, x, labelY);
      }

      ctx.restore();
    },
    [highlightNodes, hoveredNode, selectedContactId]
  );

  // Paint link — Obsidian-style: always visible, highlight on hover
  const paintLink = useCallback(
    (link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphLink = link as any;
      const isHighlighted = highlightLinks.has(graphLink.id);
      const isNoteLink = graphLink.type === 'note_note';

      ctx.save();

      // Obsidian-style: links always visible, fade others on hover
      if (hoveredNode && !isHighlighted) {
        ctx.globalAlpha = FADED_ALPHA;
      } else if (isHighlighted) {
        ctx.globalAlpha = 1;
      } else {
        // Default: clearly visible (Obsidian keeps lines at ~50-60% opacity)
        ctx.globalAlpha = 0.55;
      }

      // Color and width - thicker lines like Obsidian
      if (isHighlighted) {
        ctx.strokeStyle = HIGHLIGHT_LINK_COLOR;
        ctx.lineWidth = 2 / globalScale;
      } else if (isNoteLink) {
        // Wikilink edges slightly more visible
        ctx.strokeStyle = NOTE_LINK_COLOR;
        ctx.lineWidth = 1.2 / globalScale;
      } else {
        ctx.strokeStyle = LINK_COLOR;
        ctx.lineWidth = 1 / globalScale;
      }

      const sourceX = typeof link.source === 'object' ? link.source.x : 0;
      const sourceY = typeof link.source === 'object' ? link.source.y : 0;
      const targetX = typeof link.target === 'object' ? link.target.x : 0;
      const targetY = typeof link.target === 'object' ? link.target.y : 0;

      ctx.beginPath();
      ctx.moveTo(sourceX || 0, sourceY || 0);
      ctx.lineTo(targetX || 0, targetY || 0);
      ctx.stroke();

      ctx.restore();
    },
    [highlightLinks, hoveredNode]
  );

  // Toggle type filter
  const toggleTypeFilter = (type: keyof TypeFilter) => {
    setTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Center on Contact Zero
  const centerOnContactZero = () => {
    graphRef.current?.zoomToFit(400, 60);
  };

  // Center on selected contact
  const centerOnSelectedContact = () => {
    if (selectedContactId && graphRef.current) {
      const contactNode = filteredGraphData.nodes.find(n => n.contactId === selectedContactId);
      if (contactNode) {
        graphRef.current.centerAt(contactNode.x, contactNode.y, 1000);
        graphRef.current.zoom(3, 1000);
      }
    }
  };

  // Toggle full screen
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Toggle local/global view with zoomToFit
  const toggleViewMode = () => {
    setIsLocalView(!isLocalView);
  };

  return (
    <div
      className={`flex flex-col bg-[#0a0a0f] ${
        isFullScreen
          ? 'fixed inset-0 z-50'
          : 'h-full'
      }`}
    >
      {/* Compact Header/Control Panel */}
      <div className="flex-shrink-0 border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          {/* Title row with fullscreen toggle */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-white">Knowledge Graph</h2>
            <button
              onClick={toggleFullScreen}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isFullScreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullScreen ? <Shrink size={16} /> : <Expand size={16} />}
            </button>
          </div>

          {/* Compact explanation */}
          <div className="text-xs text-gray-500 mb-3 space-y-0.5">
            <p><span className="text-gray-400">What:</span> Live map of contacts, notes, topics, tasks, and scans.</p>
            <p><span className="text-gray-400">Why:</span> See how everything connects around you.</p>
            <p><span className="text-gray-400">How:</span> Hover to explore, click to navigate, filter to focus.</p>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[150px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-md border text-xs transition-colors flex items-center gap-1.5 ${
                showFilters
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <Filter size={12} />
              Filters
            </button>

            {/* View Toggle */}
            <button
              onClick={toggleViewMode}
              className={`px-3 py-1.5 rounded-md border text-xs transition-colors flex items-center gap-1.5 ${
                isLocalView
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {isLocalView ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              {isLocalView ? 'Local' : 'Global'}
            </button>

            {/* Center Buttons */}
            <button
              onClick={centerOnContactZero}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Target size={12} />
              Fit
            </button>

            {selectedContactId && selectedContactId !== CONTACT_ZERO.id && (
              <button
                onClick={centerOnSelectedContact}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Target size={12} />
                Focus
              </button>
            )}

            {/* Stats */}
            <div className="text-xs text-gray-500 ml-auto">
              <span className="text-gray-400">{filteredGraphData.nodes.length}</span> nodes
              <span className="mx-1">·</span>
              <span className="text-gray-400">{filteredGraphData.links.length}</span> links
            </div>
          </div>

          {/* Type Filters (collapsible) */}
          {showFilters && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(typeFilters).map(([type, enabled]) => (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type as keyof TypeFilter)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      enabled
                        ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                        : 'bg-white/5 border border-white/10 text-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Graph Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <ForceGraph2D
          ref={graphRef}
          graphData={filteredGraphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeId="id"
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            const radius = NODE_RADII[(node as any).type] || 3;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, radius + 3, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkCanvasObject={paintLink}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          cooldownTicks={80}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          backgroundColor={BACKGROUND_COLOR}
          warmupTicks={50}
          d3VelocityDecay={0.4}
          d3AlphaDecay={0.02}
          onEngineStop={() => {
            // zoomToFit when simulation settles
            graphRef.current?.zoomToFit(400, 60);
          }}
        />

        {/* Compact Legend */}
        <div className="absolute bottom-3 left-3 bg-[#0a0a0f]/90 backdrop-blur-sm border border-white/10 rounded-md px-3 py-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{type.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
