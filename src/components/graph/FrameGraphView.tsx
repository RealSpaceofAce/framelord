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
import { Search, Filter, Target, Maximize2, Minimize2, X } from 'lucide-react';
import {
  buildFrameGraphData,
  type FrameGraphData,
  type FrameGraphNode,
  type GraphNodeType,
} from '../../services/graph/graphDataBuilder';
import { createSampleGraphData } from '../../services/graph/graphDevFixtures';
import { getAllContacts } from '../../services/contactStore';
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
// STYLING CONSTANTS
// =============================================================================

const NODE_COLORS: Record<GraphNodeType, string> = {
  contact_zero: '#ff00ff',      // Magenta - Contact Zero
  contact: '#4433ff',           // Primary purple - Contacts
  note: '#00d4ff',              // Cyan - Notes
  topic: '#00ff88',             // Green - Topics
  task: '#ffaa00',              // Orange - Tasks
  interaction: '#ff6b6b',       // Red - Interactions
  framescan: '#ffd700',         // Gold - FrameScans
};

const NODE_SIZES: Record<GraphNodeType, number> = {
  contact_zero: 12,
  contact: 8,
  note: 6,
  topic: 5,
  task: 4,
  interaction: 3,
  framescan: 7,
};

const LINK_COLOR = 'rgba(255, 255, 255, 0.1)';
const HIGHLIGHT_LINK_COLOR = 'rgba(68, 51, 255, 0.6)';

// =============================================================================
// COMPONENT
// =============================================================================

export const FrameGraphView: React.FC<FrameGraphViewProps> = ({
  selectedContactId,
  onNodeClick,
  onGraphSelectionChange,
}) => {
  const graphRef = useRef<ForceGraphMethods>();

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
      if (link.source === node.id) {
        neighbors.add(link.target);
        linkIds.add(link.id);
      }
      if (link.target === node.id) {
        neighbors.add(link.source);
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

  // Render node on canvas
  const paintNode = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as unknown as FrameGraphNode;
      const isHighlighted = highlightNodes.has(graphNode.id);
      const isHovered = hoveredNode?.id === graphNode.id;

      // Determine size based on type and importance
      const baseSize = NODE_SIZES[graphNode.type] || 5;
      const importanceMultiplier = Math.sqrt((graphNode.importance || 1) / 10);
      const size = baseSize * importanceMultiplier;

      // Fade non-highlighted nodes when hovering
      let opacity = 1;
      if (hoveredNode && !isHighlighted) {
        opacity = 0.2;
      }

      // Draw node
      ctx.save();
      ctx.globalAlpha = opacity;

      const color = NODE_COLORS[graphNode.type] || '#ffffff';
      ctx.fillStyle = color;

      if (graphNode.type === 'contact_zero') {
        // Draw Contact Zero as a special star/diamond shape
        ctx.beginPath();
        const spikes = 8;
        const outerRadius = size;
        const innerRadius = size * 0.5;

        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (Math.PI * i) / spikes;
          const x = (node.x || 0) + Math.cos(angle) * radius;
          const y = (node.y || 0) + Math.sin(angle) * radius;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
      } else if (graphNode.type === 'framescan') {
        // Draw FrameScans as diamonds
        ctx.beginPath();
        ctx.moveTo((node.x || 0), (node.y || 0) - size);
        ctx.lineTo((node.x || 0) + size, (node.y || 0));
        ctx.lineTo((node.x || 0), (node.y || 0) + size);
        ctx.lineTo((node.x || 0) - size, (node.y || 0));
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw regular nodes as circles
        ctx.beginPath();
        ctx.arc(node.x || 0, node.y || 0, size, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw highlight ring if hovered
      if (isHovered) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / globalScale;
        ctx.beginPath();
        ctx.arc(node.x || 0, node.y || 0, size + 2, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Draw label if zoomed in enough or if hovered
      if (globalScale > 1 || isHovered) {
        ctx.font = `${12 / globalScale}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(graphNode.label, node.x || 0, (node.y || 0) + size + 4);
      }

      ctx.restore();
    },
    [highlightNodes, hoveredNode]
  );

  // Paint link
  const paintLink = useCallback(
    (link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphLink = link as any;
      const isHighlighted = highlightLinks.has(graphLink.id);

      ctx.save();

      if (hoveredNode && !isHighlighted) {
        ctx.globalAlpha = 0.1;
      } else {
        ctx.globalAlpha = isHighlighted ? 0.6 : 0.15;
      }

      ctx.strokeStyle = isHighlighted ? HIGHLIGHT_LINK_COLOR : LINK_COLOR;
      ctx.lineWidth = isHighlighted ? 2 / globalScale : 1 / globalScale;

      ctx.beginPath();
      ctx.moveTo(link.source.x || 0, link.source.y || 0);
      ctx.lineTo(link.target.x || 0, link.target.y || 0);
      ctx.stroke();

      ctx.restore();
    },
    [highlightLinks, hoveredNode]
  );

  // Center on Contact Zero on mount
  useEffect(() => {
    if (graphRef.current && filteredGraphData.nodes.length > 0) {
      const contactZeroNode = filteredGraphData.nodes.find(n => n.type === 'contact_zero');
      if (contactZeroNode) {
        setTimeout(() => {
          graphRef.current?.centerAt(0, 0, 1000);
        }, 100);
      }
    }
  }, [filteredGraphData]);

  // Toggle type filter
  const toggleTypeFilter = (type: keyof TypeFilter) => {
    setTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Center on Contact Zero
  const centerOnContactZero = () => {
    const contactZeroNode = filteredGraphData.nodes.find(n => n.type === 'contact_zero');
    if (contactZeroNode && graphRef.current) {
      graphRef.current.centerAt(contactZeroNode.x, contactZeroNode.y, 1000);
      graphRef.current.zoom(2, 1000);
    }
  };

  // Center on selected contact
  const centerOnSelectedContact = () => {
    if (selectedContactId && graphRef.current) {
      const contactNode = filteredGraphData.nodes.find(n => n.contactId === selectedContactId);
      if (contactNode) {
        graphRef.current.centerAt(contactNode.x, contactNode.y, 1000);
        graphRef.current.zoom(2, 1000);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#030412]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-[#0a0f1e]/90 backdrop-blur-sm">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-2">Knowledge Graph</h2>
          <p className="text-sm text-gray-400 mb-4">
            Visual map of your contacts, notes, topics, tasks, interactions, and FrameScan reports
          </p>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#4433ff] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                showFilters
                  ? 'bg-[#4433ff]/20 border-[#4433ff] text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <Filter size={18} />
              Filters
            </button>

            {/* View Toggle */}
            <button
              onClick={() => setIsLocalView(!isLocalView)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                isLocalView
                  ? 'bg-[#4433ff]/20 border-[#4433ff] text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {isLocalView ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              {isLocalView ? 'Local View' : 'Global View'}
            </button>

            {/* Center Buttons */}
            <button
              onClick={centerOnContactZero}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <Target size={18} />
              Center on You
            </button>

            {selectedContactId && (
              <button
                onClick={centerOnSelectedContact}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <Target size={18} />
                Center on Selected
              </button>
            )}
          </div>

          {/* Type Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-sm text-gray-400 mb-3">Show node types:</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(typeFilters).map(([type, enabled]) => (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type as keyof TypeFilter)}
                    className={`px-3 py-1 rounded-md border text-sm transition-colors ${
                      enabled
                        ? 'bg-[#4433ff]/20 border-[#4433ff] text-white'
                        : 'bg-white/5 border-white/10 text-gray-500'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 flex gap-6 text-sm text-gray-400">
            <span>
              <span className="text-white font-semibold">{filteredGraphData.nodes.length}</span> nodes
            </span>
            <span>
              <span className="text-white font-semibold">{filteredGraphData.links.length}</span> connections
            </span>
          </div>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 relative">
        <ForceGraph2D
          ref={graphRef}
          graphData={filteredGraphData}
          nodeId="id"
          nodeLabel={(node: any) => `${node.label}${node.subLabel ? ` - ${node.subLabel}` : ''}`}
          nodeCanvasObject={paintNode}
          linkCanvasObject={paintLink}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          backgroundColor="#030412"
          warmupTicks={100}
          d3VelocityDecay={0.3}
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[#0a0f1e]/90 backdrop-blur-sm border border-white/10 rounded-lg p-4 max-w-xs">
          <p className="text-sm font-semibold text-white mb-3">Node Types</p>
          <div className="space-y-2">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2 text-xs text-gray-400">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
