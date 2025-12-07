// =============================================================================
// WIKI LINK SUGGESTION — Popup for [[ wiki link autocomplete
// =============================================================================
// Shows when user types [[ in the editor:
// - Displays matching notes as user types
// - Allows creating new notes if no match
// - Inserts [[Note Title]] on selection
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import {
  searchNotesByTitle,
  findNoteByTitle,
  createNoteFromWikiLink,
} from '../../services/noteStore';
import type { Note } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface WikiLinkSuggestionProps {
  /** Current search query (text after [[) */
  query: string;
  /** Position for popup */
  position: { top: number; left: number } | null;
  /** Theme colors */
  colors: Record<string, string>;
  /** Called when a note is selected */
  onSelect: (note: Note) => void;
  /** Called when user wants to create new note */
  onCreate: (title: string) => void;
  /** Called when popup should close */
  onClose: () => void;
  /** Whether popup is visible */
  isOpen: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const WikiLinkSuggestion: React.FC<WikiLinkSuggestionProps> = ({
  query,
  position,
  colors,
  onSelect,
  onCreate,
  onClose,
  isOpen,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<Note[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search for matching notes
  useEffect(() => {
    if (query.length > 0) {
      const matches = searchNotesByTitle(query, 8);
      setResults(matches);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setSelectedIndex(0);
    }
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      const totalItems = results.length + (query.length > 0 ? 1 : 0); // +1 for "Create new"

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex < results.length) {
            onSelect(results[selectedIndex]);
          } else if (query.length > 0) {
            onCreate(query);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, results, selectedIndex, query, onSelect, onCreate, onClose]
  );

  // Attach keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  const showCreateOption = query.length > 0 && !findNoteByTitle(query);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 py-1 rounded-lg shadow-xl overflow-hidden min-w-[240px] max-w-[320px]"
      style={{
        top: position.top,
        left: position.left,
        background: colors.sidebar || '#1f2023',
        border: `1px solid ${colors.border || '#2d2f36'}`,
      }}
    >
      {/* Search hint */}
      <div
        className="px-3 py-2 text-xs flex items-center gap-2 border-b"
        style={{ color: colors.textMuted, borderColor: colors.border }}
      >
        <Search size={12} />
        {query ? `Searching: "${query}"` : 'Type to search notes...'}
      </div>

      {/* Results */}
      <div className="max-h-[240px] overflow-y-auto">
        {results.length === 0 && !showCreateOption && (
          <div
            className="px-3 py-4 text-center text-sm"
            style={{ color: colors.textMuted }}
          >
            {query ? 'No matching notes' : 'Start typing to search'}
          </div>
        )}

        {results.map((note, index) => (
          <button
            key={note.id}
            onClick={() => onSelect(note)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
            style={{
              background: selectedIndex === index ? colors.hover : 'transparent',
              color: colors.text,
            }}
          >
            <FileText size={14} style={{ color: colors.textMuted, flexShrink: 0 }} />
            <span className="truncate">{note.title || 'Untitled'}</span>
          </button>
        ))}

        {/* Create new option */}
        {showCreateOption && (
          <button
            onClick={() => onCreate(query)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors border-t"
            style={{
              background: selectedIndex === results.length ? colors.hover : 'transparent',
              color: colors.accent,
              borderColor: colors.border,
            }}
          >
            <Plus size={14} style={{ flexShrink: 0 }} />
            <span>Create "{query}"</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default WikiLinkSuggestion;
