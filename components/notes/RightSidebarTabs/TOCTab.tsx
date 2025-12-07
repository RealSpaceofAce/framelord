// =============================================================================
// TOC TAB — Table of Contents for right sidebar
// =============================================================================
// Extracts headings from document content
// - Shows hierarchical heading structure
// - Click to jump to heading (future enhancement)
// - Settings gear icon
// - Empty state: "Use headings to create a table of contents"
// =============================================================================

import React, { useMemo } from 'react';
import { Settings, Hash } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface TOCTabProps {
  noteContent?: string;
  theme: 'light' | 'gray' | 'dark';
  colors: Record<string, string>;
}

interface Heading {
  level: number;
  text: string;
  id: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TOCTab: React.FC<TOCTabProps> = ({
  noteContent,
  theme,
  colors,
}) => {
  // Extract headings from markdown content
  const headings = useMemo(() => {
    if (!noteContent) return [];

    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const matches = [...noteContent.matchAll(headingRegex)];

    return matches.map((match, index) => ({
      level: match[1].length,
      text: match[2].trim(),
      id: `heading-${index}`,
    }));
  }, [noteContent]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
        <h3 className="text-sm font-medium" style={{ color: colors.text }}>
          Table of Contents
        </h3>
        <button
          onClick={() => alert('Coming soon')}
          className="p-1.5 rounded transition-colors"
          style={{ color: colors.textMuted }}
          title="TOC Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {headings.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Hash size={32} className="mb-3 opacity-20" style={{ color: colors.textMuted }} />
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Use headings to create a table of contents
            </p>
          </div>
        ) : (
          // Headings List
          <div className="space-y-1">
            {headings.map((heading, index) => (
              <button
                key={heading.id}
                onClick={() => alert('Jumping to headings is coming soon!')}
                className="w-full text-left px-2 py-1.5 rounded text-xs transition-colors hover:bg-white/5"
                style={{
                  paddingLeft: `${(heading.level - 1) * 12 + 8}px`,
                  color: colors.text,
                }}
                title={heading.text}
              >
                <span className="truncate block">{heading.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TOCTab;
