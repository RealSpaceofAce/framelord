// =============================================================================
// BACKLINKS — Shows notes that link to the current note
// =============================================================================
// Displays at the bottom of each note:
// - Lists all notes containing [[This Note]] links
// - Shows context snippet where link appears
// - Clickable to navigate to linking note
// =============================================================================

import React, { useMemo } from 'react';
import { Link2, FileText, ChevronRight } from 'lucide-react';
import { getBacklinksWithContext, type BacklinkInfo } from '../../services/noteStore';

// =============================================================================
// TYPES
// =============================================================================

export interface BacklinksProps {
  /** Current note ID */
  noteId: string;
  /** Theme colors */
  colors: Record<string, string>;
  /** Called when a backlink is clicked */
  onNavigateToNote: (noteId: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const Backlinks: React.FC<BacklinksProps> = ({
  noteId,
  colors,
  onNavigateToNote,
}) => {
  // Get backlinks with context
  const backlinks = useMemo(() => {
    return getBacklinksWithContext(noteId);
  }, [noteId]);

  return (
    <div
      className="mt-8 pt-6 border-t"
      style={{ borderColor: colors.border }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Link2 size={16} style={{ color: colors.textMuted }} />
        <h3 className="text-sm font-medium" style={{ color: colors.text }}>
          Backlinks
        </h3>
        {backlinks.length > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: colors.hover, color: colors.textMuted }}
          >
            {backlinks.length}
          </span>
        )}
      </div>

      {/* Backlinks list */}
      {backlinks.length === 0 ? (
        <p className="text-sm" style={{ color: colors.textMuted }}>
          No backlinks yet
        </p>
      ) : (
        <div className="space-y-2">
          {backlinks.map((backlink) => (
            <BacklinkItem
              key={backlink.noteId}
              backlink={backlink}
              colors={colors}
              onClick={() => onNavigateToNote(backlink.noteId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// BACKLINK ITEM
// =============================================================================

interface BacklinkItemProps {
  backlink: BacklinkInfo;
  colors: Record<string, string>;
  onClick: () => void;
}

const BacklinkItem: React.FC<BacklinkItemProps> = ({ backlink, colors, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg transition-colors group"
      style={{ background: colors.hover }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-1">
        <FileText size={14} style={{ color: colors.textMuted }} />
        <span className="text-sm font-medium" style={{ color: colors.text }}>
          {backlink.noteTitle}
        </span>
        <ChevronRight
          size={14}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: colors.textMuted }}
        />
      </div>

      {/* Context snippet */}
      {backlink.snippet && (
        <p
          className="text-xs pl-6 line-clamp-2"
          style={{ color: colors.textMuted }}
        >
          {highlightWikiLink(backlink.snippet, colors.accent)}
        </p>
      )}
    </button>
  );
};

// =============================================================================
// HELPER
// =============================================================================

/**
 * Highlight [[wiki links]] in the snippet
 */
const highlightWikiLink = (text: string, accentColor: string): React.ReactNode => {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);

  return parts.map((part, i) => {
    if (part.match(/^\[\[[^\]]+\]\]$/)) {
      return (
        <span key={i} style={{ color: accentColor, fontWeight: 500 }}>
          {part}
        </span>
      );
    }
    return part;
  });
};

export default Backlinks;
