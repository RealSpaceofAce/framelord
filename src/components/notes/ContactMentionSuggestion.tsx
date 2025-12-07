// =============================================================================
// CONTACT MENTION SUGGESTION — Popup for @ contact autocomplete
// =============================================================================
// Shows when user types @ in the editor:
// - Displays matching contacts as user types
// - Allows creating new contacts if no match
// - Inserts contact mention on selection
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, UserPlus, Search, AlertCircle } from 'lucide-react';
import {
  searchContactsByName,
  findContactByName,
  createContactFromMention,
} from '../../services/contactStore';
import type { Contact } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface ContactMentionSuggestionProps {
  /** Current search query (text after @) */
  query: string;
  /** Position for popup */
  position: { top: number; left: number } | null;
  /** Theme colors */
  colors: Record<string, string>;
  /** Called when a contact is selected */
  onSelect: (contact: Contact) => void;
  /** Called when user wants to create new contact */
  onCreate: (name: string) => void;
  /** Called when popup should close */
  onClose: () => void;
  /** Whether popup is visible */
  isOpen: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ContactMentionSuggestion: React.FC<ContactMentionSuggestionProps> = ({
  query,
  position,
  colors,
  onSelect,
  onCreate,
  onClose,
  isOpen,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<Contact[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search for matching contacts
  useEffect(() => {
    if (query.length > 0) {
      const matches = searchContactsByName(query, 8);
      setResults(matches);
      setSelectedIndex(0);

      // Check for exact match to show duplicate warning
      const exactMatch = findContactByName(query);
      setDuplicateWarning(!!exactMatch);
    } else {
      setResults([]);
      setSelectedIndex(0);
      setDuplicateWarning(false);
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

  const showCreateOption = query.length > 0;

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
        {query ? `Searching contacts: "${query}"` : 'Type to search contacts...'}
      </div>

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div
          className="px-3 py-2 text-xs flex items-center gap-2 border-b"
          style={{
            color: '#f59e0b',
            borderColor: colors.border,
            background: 'rgba(245, 158, 11, 0.1)',
          }}
        >
          <AlertCircle size={12} />
          A contact with this name already exists
        </div>
      )}

      {/* Results */}
      <div className="max-h-[240px] overflow-y-auto">
        {results.length === 0 && !showCreateOption && (
          <div
            className="px-3 py-4 text-center text-sm"
            style={{ color: colors.textMuted }}
          >
            {query ? 'No matching contacts' : 'Start typing to search'}
          </div>
        )}

        {results.map((contact, index) => (
          <button
            key={contact.id}
            onClick={() => onSelect(contact)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
            style={{
              background: selectedIndex === index ? colors.hover : 'transparent',
              color: colors.text,
            }}
          >
            {contact.avatarUrl ? (
              <img
                src={contact.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: colors.hover }}
              >
                <User size={12} style={{ color: colors.textMuted }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="truncate block">{contact.fullName || 'Unnamed'}</span>
              {contact.title && (
                <span className="text-xs truncate block" style={{ color: colors.textMuted }}>
                  {contact.title}
                </span>
              )}
            </div>
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
            <UserPlus size={14} style={{ flexShrink: 0 }} />
            <span>Create contact "{query}"</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ContactMentionSuggestion;
