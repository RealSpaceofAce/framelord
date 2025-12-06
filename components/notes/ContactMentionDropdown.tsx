// =============================================================================
// CONTACT MENTION DROPDOWN — Autocomplete for '&' contact mentions
// =============================================================================
// Shows a searchable dropdown of contacts when triggered.
// Used by text editors to insert contact mentions.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Building, Mail } from 'lucide-react';
import { searchContacts } from '../../services/contactStore';
import type { Contact } from '../../types';

interface ContactMentionDropdownProps {
  /** Search query (text after '&') */
  query: string;
  /** Position to show the dropdown */
  position: { top: number; left: number };
  /** Called when a contact is selected */
  onSelect: (contact: Contact) => void;
  /** Called when dropdown should close */
  onClose: () => void;
  /** Whether the dropdown is visible */
  isOpen: boolean;
}

export const ContactMentionDropdown: React.FC<ContactMentionDropdownProps> = ({
  query,
  position,
  onSelect,
  onClose,
  isOpen,
}) => {
  const [results, setResults] = useState<Contact[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search contacts when query changes
  useEffect(() => {
    if (isOpen) {
      const contacts = searchContacts(query, 8);
      setResults(contacts);
      setSelectedIndex(0);
    }
  }, [query, isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelect(results[selectedIndex]);
        }
        break;
    }
  }, [isOpen, results, selectedIndex, onSelect, onClose]);

  // Add keyboard listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-[#1A1A1D] border border-[#2A2A2A] rounded-lg shadow-xl overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        minWidth: '240px',
        maxWidth: '320px',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#2A2A2A] bg-[#0A0A0F]">
        <p className="text-xs text-gray-500">
          {query ? `Searching "${query}"...` : 'Type to search contacts'}
        </p>
      </div>

      {/* Results */}
      <div className="max-h-64 overflow-y-auto">
        {results.length === 0 ? (
          <div className="px-3 py-4 text-center text-gray-500 text-sm">
            {query ? 'No contacts found' : 'Start typing to search'}
          </div>
        ) : (
          results.map((contact, index) => (
            <button
              key={contact.id}
              onClick={() => onSelect(contact)}
              className={`w-full flex items-start gap-3 px-3 py-2 text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-[#4433FF]/20 text-white'
                  : 'text-gray-300 hover:bg-[#2A2A2A]'
              }`}
            >
              {/* Avatar */}
              {contact.avatarUrl ? (
                <img
                  src={contact.avatarUrl}
                  alt={contact.fullName}
                  className="w-8 h-8 rounded-full bg-[#2A2A2A] shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#4433FF]/20 flex items-center justify-center shrink-0">
                  <User size={14} className="text-[#4433FF]" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{contact.fullName}</p>
                {(contact.company || contact.title) && (
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <Building size={10} />
                    {contact.title ? `${contact.title}` : ''}
                    {contact.title && contact.company ? ' at ' : ''}
                    {contact.company || ''}
                  </p>
                )}
                {contact.email && (
                  <p className="text-xs text-gray-600 truncate flex items-center gap-1">
                    <Mail size={10} />
                    {contact.email}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-[#2A2A2A] bg-[#0A0A0F]">
        <p className="text-[10px] text-gray-600">
          <kbd className="px-1 py-0.5 bg-[#2A2A2A] rounded text-gray-500">↑↓</kbd> navigate
          <span className="mx-2">·</span>
          <kbd className="px-1 py-0.5 bg-[#2A2A2A] rounded text-gray-500">Enter</kbd> select
          <span className="mx-2">·</span>
          <kbd className="px-1 py-0.5 bg-[#2A2A2A] rounded text-gray-500">Esc</kbd> close
        </p>
      </div>
    </div>
  );
};

/**
 * Contact mention pill component for inline display.
 */
interface ContactMentionPillProps {
  contact: Contact;
  onClick?: () => void;
}

export const ContactMentionPill: React.FC<ContactMentionPillProps> = ({
  contact,
  onClick,
}) => {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 bg-[#4433FF]/20 text-[#4433FF] rounded text-sm ${
        onClick ? 'cursor-pointer hover:bg-[#4433FF]/30' : ''
      }`}
    >
      <User size={12} />
      @{contact.fullName}
    </span>
  );
};

export default ContactMentionDropdown;
