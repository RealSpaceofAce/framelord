// =============================================================================
// WIKI LINK POPUP — Autocomplete for [[Note Title]] linking
// =============================================================================
// Shows a popup when user types [[ to create links to other notes.
// Supports fuzzy search and creating new notes on the fly.
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Note } from '@/types';

interface WikiLinkPopupProps {
  isOpen: boolean;
  position: { x: number; y: number };
  searchQuery: string;
  notes: Note[];
  onSelect: (note: Note) => void;
  onCreate: (title: string) => void;
  onClose: () => void;
}

export function WikiLinkPopup({
  isOpen,
  position,
  searchQuery,
  notes,
  onSelect,
  onCreate,
  onClose,
}: WikiLinkPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => {
    const title = note.title || 'Untitled';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Add "Create new" option if there's a search query and no exact match
  const hasExactMatch = filteredNotes.some(
    note => (note.title || 'Untitled').toLowerCase() === searchQuery.toLowerCase()
  );
  const showCreateOption = searchQuery.trim().length > 0 && !hasExactMatch;

  // Total options = filtered notes + create option (if shown)
  const totalOptions = filteredNotes.length + (showCreateOption ? 1 : 0);

  // Reset selected index when notes change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalOptions);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalOptions) % totalOptions);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(selectedIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, totalOptions, filteredNotes, searchQuery]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSelect = (index: number) => {
    if (index < filteredNotes.length) {
      onSelect(filteredNotes[index]);
    } else if (showCreateOption) {
      onCreate(searchQuery.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="fixed bg-[#000000] border border-[#1c1c1c] rounded-lg shadow-xl overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 999999,
        minWidth: '280px',
        maxWidth: '400px',
        maxHeight: '300px',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1c1c1c] bg-[#000000]">
        <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
          <span>🔗</span>
          <span>Link to note</span>
        </div>
      </div>

      {/* Results */}
      <div className="overflow-y-auto max-h-[240px]">
        {filteredNotes.length === 0 && !showCreateOption ? (
          <div className="px-3 py-6 text-center text-sm text-[#71717a]">
            No notes found
          </div>
        ) : (
          <>
            {filteredNotes.map((note, index) => {
              const title = note.title || 'Untitled';
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={note.id}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#0043ff] bg-opacity-10 border-l-2 border-[#0043ff]'
                      : 'hover:bg-[#0a0a0a] border-l-2 border-transparent'
                  }`}
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        isSelected ? 'text-[#0043ff]' : 'text-[#ffffff]'
                      }`}>
                        {title}
                      </div>
                      {note.content && (
                        <div className="text-xs text-[#a1a1aa] truncate mt-0.5">
                          {note.content.slice(0, 60)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {showCreateOption && (
              <div
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  selectedIndex === filteredNotes.length
                    ? 'bg-[#10b981] bg-opacity-10 border-l-2 border-[#10b981]'
                    : 'hover:bg-[#0a0a0a] border-l-2 border-transparent'
                }`}
                onClick={() => handleSelect(filteredNotes.length)}
                onMouseEnter={() => setSelectedIndex(filteredNotes.length)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      selectedIndex === filteredNotes.length
                        ? 'text-[#10b981]'
                        : 'text-[#fafafa]'
                    }`}>
                      Create "{searchQuery}"
                    </div>
                    <div className="text-xs text-[#a1a1aa] mt-0.5">
                      Create a new note with this title
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer - keyboard hints */}
      <div className="px-3 py-2 border-t border-[#1c1c1c] bg-[#000000] flex items-center gap-4 text-xs text-[#888888]">
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-[#0a0a0a] rounded text-[10px]">↑↓</kbd>
          <span>Navigate</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-[#0a0a0a] rounded text-[10px]">Enter</kbd>
          <span>Select</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-[#0a0a0a] rounded text-[10px]">Esc</kbd>
          <span>Close</span>
        </div>
      </div>
    </div>
  );
}
