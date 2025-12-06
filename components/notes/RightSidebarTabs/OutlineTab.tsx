// =============================================================================
// OUTLINE TAB — Document outline for right sidebar
// =============================================================================
// Similar to TOC but shows document structure
// - Extracts headings and shows hierarchical structure
// - Different from TOC: focuses on document structure/navigation
// - Empty state when no headings
// =============================================================================

import React, { useMemo } from 'react';
import { FileText, ChevronRight } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface OutlineTabProps {
  noteContent?: string;
  theme: 'light' | 'dark';
  colors: Record<string, string>;
}

interface OutlineItem {
  level: number;
  text: string;
  id: string;
  children: OutlineItem[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export const OutlineTab: React.FC<OutlineTabProps> = ({
  noteContent,
  theme,
  colors,
}) => {
  // Extract outline structure from markdown content
  const outlineItems = useMemo(() => {
    if (!noteContent) return [];

    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const matches = [...noteContent.matchAll(headingRegex)];

    // Build flat list first
    const flatItems = matches.map((match, index) => ({
      level: match[1].length,
      text: match[2].trim(),
      id: `outline-${index}`,
      children: [] as OutlineItem[],
    }));

    return flatItems;
  }, [noteContent]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <h3 className="text-sm font-medium" style={{ color: colors.text }}>
          Outline
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {outlineItems.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <FileText size={32} className="mb-3 opacity-20" style={{ color: colors.textMuted }} />
            <p className="text-xs" style={{ color: colors.textMuted }}>
              No outline available
            </p>
            <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
              Add headings to create an outline
            </p>
          </div>
        ) : (
          // Outline List
          <div className="space-y-0.5">
            {outlineItems.map((item, index) => (
              <OutlineItemView
                key={item.id}
                item={item}
                colors={colors}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// OUTLINE ITEM VIEW
// =============================================================================

interface OutlineItemViewProps {
  item: OutlineItem;
  colors: Record<string, string>;
}

const OutlineItemView: React.FC<OutlineItemViewProps> = ({ item, colors }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-white/5"
        style={{
          paddingLeft: `${(item.level - 1) * 12 + 8}px`,
          color: colors.text,
        }}
      >
        {item.children.length > 0 && (
          <ChevronRight
            size={12}
            className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            style={{ color: colors.textMuted }}
          />
        )}
        <span className="flex-1 text-left truncate">{item.text}</span>
        <span className="text-xs" style={{ color: colors.textMuted }}>
          H{item.level}
        </span>
      </button>

      {/* Render children if expanded */}
      {isExpanded && item.children.length > 0 && (
        <div className="ml-3">
          {item.children.map((child) => (
            <OutlineItemView key={child.id} item={child} colors={colors} />
          ))}
        </div>
      )}
    </div>
  );
};

export default OutlineTab;
