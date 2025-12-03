// =============================================================================
// WIKILINK AUTOCOMPLETE — Dropdown suggestions for [[links]]
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Note } from '../../types';
import { searchNotesByTitle, createNote } from '../../services/noteStore';
import { CONTACT_ZERO } from '../../services/contactStore';

interface WikilinkAutocompleteProps {
  query: string; // The text inside [[...]]
  position: { top: number; left: number };
  onSelect: (noteId: string) => void;
  onCreateNew: (title: string) => void;
  onClose: () => void;
  currentNoteContactId: string;
  currentNoteAuthorId: string;
}

export const WikilinkAutocomplete: React.FC<WikilinkAutocompleteProps> = ({
  query,
  position,
  onSelect,
  onCreateNew,
  onClose,
  currentNoteContactId,
  currentNoteAuthorId,
}) => {
  const [suggestions, setSuggestions] = useState<Note[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim()) {
      const results = searchNotesByTitle(query, 8);
      setSuggestions(results);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (suggestions.length > 0 && selectedIndex < suggestions.length) {
          onSelect(suggestions[selectedIndex].id);
        } else if (query.trim()) {
          // Create new note
          onCreateNew(query.trim());
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, query, onSelect, onCreateNew, onClose]);

  const handleSuggestionClick = (noteId: string) => {
    onSelect(noteId);
  };

  const handleCreateNewClick = () => {
    if (query.trim()) {
      onCreateNew(query.trim());
    }
  };

  if (!query.trim() && suggestions.length === 0) {
    return null;
  }

  const showCreateNew = query.trim() && !suggestions.some(n => 
    (n.title || '').toLowerCase() === query.toLowerCase()
  );

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-[#0E0E0E] border border-[#4433FF]/50 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '280px',
      }}
    >
      {suggestions.length > 0 && (
        <div className="p-1">
          {suggestions.map((note, index) => {
            const title = note.title || note.content.slice(0, 50);
            const isSelected = index === selectedIndex;
            return (
              <button
                key={note.id}
                onClick={() => handleSuggestionClick(note.id)}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                  isSelected
                    ? 'bg-[#4433FF]/20 text-white'
                    : 'text-gray-300 hover:bg-[#1A1A1D] hover:text-white'
                }`}
              >
                <FileText size={14} className="text-[#4433FF] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{title}</div>
                  {note.content && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {note.content.slice(0, 60)}...
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {showCreateNew && (
        <div className="border-t border-[#2A2A2A] p-1">
          <button
            onClick={handleCreateNewClick}
            className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
              selectedIndex === suggestions.length
                ? 'bg-[#4433FF]/20 text-white'
                : 'text-gray-400 hover:bg-[#1A1A1D] hover:text-white'
            }`}
          >
            <Plus size={14} className="text-[#4433FF] flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">Create "{query.trim()}"</div>
              <div className="text-xs text-gray-500">New note page</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

