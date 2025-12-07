// =============================================================================
// QUICK SEARCH MODAL — Cmd+K search across all notes
// =============================================================================
// Features:
// - Global keyboard shortcut (Cmd+K / Ctrl+K)
// - Search across note titles and content
// - Keyboard navigation through results
// - Enter to open selected note
// - Recent searches
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, Calendar, X, Clock, ArrowUpRight } from 'lucide-react';
import { getAllNotes } from '../../services/noteStore';
import type { Note } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (noteId: string) => void;
  theme: 'light' | 'dark';
  colors: Record<string, string>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectNote,
  theme,
  colors,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('framelord_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search notes
  const allNotes = getAllNotes().filter(n => !n.isArchived);
  const searchResults = query.trim()
    ? allNotes.filter(note => {
        const searchStr = query.toLowerCase();
        const titleMatch = (note.title || '').toLowerCase().includes(searchStr);
        const contentMatch = (note.content || '').toLowerCase().includes(searchStr);
        return titleMatch || contentMatch;
      }).slice(0, 10)
    : [];

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      handleSelectNote(searchResults[selectedIndex]);
    }
  }, [searchResults, selectedIndex, onClose]);

  // Save recent search and select note
  const handleSelectNote = (note: Note) => {
    if (query.trim()) {
      const updated = [query.trim(), ...recentSearches.filter(s => s !== query.trim())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('framelord_recent_searches', JSON.stringify(updated));
    }
    onSelectNote(note.id);
    onClose();
  };

  // Use recent search
  const handleUseRecentSearch = (search: string) => {
    setQuery(search);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4">
        <div
          className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: colors.border }}>
            <Search size={20} style={{ color: colors.textMuted }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search notes..."
              className="flex-1 bg-transparent outline-none text-base"
              style={{ color: colors.text }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded hover:bg-white/10"
                style={{ color: colors.textMuted }}
              >
                <X size={16} />
              </button>
            )}
            <div className="text-xs px-2 py-1 rounded" style={{ background: colors.hover, color: colors.textMuted }}>
              ⌘K
            </div>
          </div>

          {/* Results */}
          <div
            ref={resultsRef}
            className="max-h-96 overflow-y-auto"
          >
            {query.trim() ? (
              searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((note, index) => (
                    <button
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                      style={{
                        background: index === selectedIndex ? colors.hover : 'transparent',
                        color: colors.text,
                      }}
                    >
                      <div className="text-lg mt-0.5">
                        {note.icon || (note.dateKey ? '📅' : '📄')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">
                            {note.title || 'Untitled'}
                          </h4>
                          {note.dateKey && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: colors.hover, color: colors.textMuted }}>
                              {note.dateKey}
                            </span>
                          )}
                        </div>
                        {note.content && (
                          <p className="text-sm line-clamp-2" style={{ color: colors.textMuted }}>
                            {note.content.slice(0, 150)}
                          </p>
                        )}
                      </div>
                      {index === selectedIndex && (
                        <ArrowUpRight size={16} style={{ color: colors.textMuted }} className="mt-1 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Search size={32} className="mb-3 opacity-20" style={{ color: colors.textMuted }} />
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    No notes found for "{query}"
                  </p>
                </div>
              )
            ) : recentSearches.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-medium" style={{ color: colors.textMuted }}>
                  Recent Searches
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleUseRecentSearch(search)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/5"
                    style={{ color: colors.text }}
                  >
                    <Clock size={16} style={{ color: colors.textMuted }} />
                    <span className="text-sm">{search}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search size={32} className="mb-3 opacity-20" style={{ color: colors.textMuted }} />
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  Start typing to search notes
                </p>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  Search by title or content
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t flex items-center justify-between text-xs" style={{ borderColor: colors.border, color: colors.textMuted }}>
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
            <div>
              {searchResults.length > 0 && `${searchResults.length} result${searchResults.length > 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickSearchModal;
