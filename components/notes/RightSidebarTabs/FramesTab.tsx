// =============================================================================
// FRAMES TAB — Edgeless frames for right sidebar
// =============================================================================
// Displays frames for edgeless mode presentation
// - "All frames" header with settings gear
// - "Presentation" button
// - Frame list with thumbnails and navigation
// - Support for edgeless frame blocks
// =============================================================================

import React, { useState, useMemo } from 'react';
import { Settings, Play, Grid3X3, Eye, Maximize2, ChevronRight } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface Frame {
  id: string;
  title: string;
  order: number;
  thumbnail?: string;
  createdAt: string;
}

export interface FramesTabProps {
  noteId?: string;
  theme: 'light' | 'gray' | 'dark';
  colors: Record<string, string>;
  onNavigateToFrame?: (frameId: string) => void;
  onStartPresentation?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const FramesTab: React.FC<FramesTabProps> = ({
  noteId,
  theme,
  colors,
  onNavigateToFrame,
  onStartPresentation,
}) => {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  // Mock frames - in real implementation, would fetch from BlockSuite edgeless document
  // Frames are extracted from the edgeless mode frame blocks
  const frames = useMemo<Frame[]>(() => {
    if (!noteId) return [];

    // TODO: Integrate with BlockSuite to extract actual frames from edgeless document
    // This would query the BlockSuite document for frame blocks and extract their metadata
    // For now, returning mock data for demonstration
    return [
      {
        id: 'frame-1',
        title: 'Overview',
        order: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'frame-2',
        title: 'Key Points',
        order: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'frame-3',
        title: 'Conclusion',
        order: 2,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [noteId]);

  // Handle frame navigation
  const handleNavigateToFrame = (frameId: string) => {
    setSelectedFrameId(frameId);
    onNavigateToFrame?.(frameId);
  };

  // Handle presentation mode
  const handleStartPresentation = () => {
    onStartPresentation?.();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
        <h3 className="text-sm font-medium" style={{ color: colors.text }}>
          All frames
        </h3>
        <button
          onClick={() => alert('Coming soon')}
          className="p-1.5 rounded transition-colors"
          style={{ color: colors.textMuted }}
          title="Frame Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Presentation Button */}
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <button
          onClick={handleStartPresentation}
          disabled={frames.length === 0}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: colors.accent,
            color: '#fff',
          }}
        >
          <Play size={16} />
          Start Presentation ({frames.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {frames.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Grid3X3 size={32} className="mb-3 opacity-20" style={{ color: colors.textMuted }} />
            <p className="text-xs mb-1" style={{ color: colors.textMuted }}>
              No frames in this document
            </p>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Switch to Edgeless mode to create frames
            </p>
          </div>
        ) : (
          // Frames List
          <div className="space-y-2">
            {frames.map((frame) => {
              const isSelected = selectedFrameId === frame.id;
              return (
                <button
                  key={frame.id}
                  onClick={() => handleNavigateToFrame(frame.id)}
                  className="w-full p-3 rounded-lg text-left transition-all group"
                  style={{
                    background: isSelected ? colors.active : colors.hover,
                    border: `1px solid ${isSelected ? colors.accent : 'transparent'}`,
                  }}
                >
                  {/* Thumbnail Placeholder */}
                  <div
                    className="aspect-video rounded mb-2 flex items-center justify-center relative overflow-hidden group-hover:opacity-80 transition-opacity"
                    style={{ background: colors.border }}
                  >
                    {frame.thumbnail ? (
                      <img src={frame.thumbnail} alt={frame.title} className="w-full h-full object-cover" />
                    ) : (
                      <Grid3X3 size={24} style={{ color: colors.textMuted, opacity: 0.3 }} />
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: colors.bg }}>
                        <Eye size={12} style={{ color: colors.accent }} />
                        <span className="text-xs font-medium" style={{ color: colors.text }}>
                          View
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Frame Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: colors.text }}>
                        {frame.title || `Frame ${frame.order + 1}`}
                      </p>
                      <p className="text-xs" style={{ color: colors.textMuted }}>
                        Slide {frame.order + 1}
                      </p>
                    </div>
                    <ChevronRight size={14} style={{ color: colors.textMuted }} className={isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FramesTab;
