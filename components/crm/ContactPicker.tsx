// =============================================================================
// CONTACT PICKER — Reusable component for selecting or creating contacts
// =============================================================================
// Used for @mention autocomplete and "Add contact" flows in notes
// =============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Plus, X } from 'lucide-react';
import { Contact } from '../../types';
import { getAllContacts, createContact } from '../../services/contactStore';
import { RelationshipDomain } from '../../types';

interface ContactPickerProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (contactId: string) => void;
  onCreateNew?: (name: string) => void;
  onClose: () => void;
  excludeContactIds?: string[]; // Contacts to exclude from results
}

export const ContactPicker: React.FC<ContactPickerProps> = ({
  query,
  position,
  onSelect,
  onCreateNew,
  onClose,
  excludeContactIds = [],
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const allContacts = useMemo(() => getAllContacts(true), []);

  // Filter contacts based on query (supports partial matching for full names)
  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return allContacts.filter(c => !excludeContactIds.includes(c.id));
    }

    // Split query into words for better matching
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

    return allContacts.filter(contact => {
      if (excludeContactIds.includes(contact.id)) return false;
      const name = contact.fullName.toLowerCase();
      const email = contact.email?.toLowerCase() || '';
      
      // If query has multiple words, check if all words appear in name
      if (queryWords.length > 1) {
        return queryWords.every(word => name.includes(word)) || email.includes(normalizedQuery);
      }
      
      // Single word: check if it's in name or email
      return name.includes(normalizedQuery) || email.includes(normalizedQuery);
    });
  }, [query, allContacts, excludeContactIds]);

  const showCreateNew = query.trim() && !filteredContacts.some(c => 
    c.fullName.toLowerCase() === query.trim().toLowerCase()
  );

  const totalOptions = filteredContacts.length + (showCreateNew ? 1 : 0);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, totalOptions - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (selectedIndex < filteredContacts.length) {
          onSelect(filteredContacts[selectedIndex].id);
        } else if (showCreateNew && onCreateNew) {
          handleCreateNew();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredContacts, selectedIndex, showCreateNew, totalOptions, onSelect, onCreateNew, onClose]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current) {
      const selectedElement = containerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleCreateNew = () => {
    if (!onCreateNew || !query.trim()) return;
    
    // Create contact with default business domain
    const newContact = createContact({
      fullName: query.trim(),
      relationshipDomain: 'business',
      relationshipRole: 'contact',
    });
    
    onSelect(newContact.id);
  };

  const handleContactClick = (contactId: string) => {
    onSelect(contactId);
  };

  if (!query.trim() && filteredContacts.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-[#0E0E0E] border border-[#4433FF]/50 rounded-lg shadow-2xl max-h-64 overflow-y-auto min-w-[300px]"
      style={{ top: position.top, left: position.left }}
    >
      {filteredContacts.length > 0 && (
        <div className="p-1">
          {filteredContacts.map((contact, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={contact.id}
                onClick={() => handleContactClick(contact.id)}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                  isSelected
                    ? 'bg-[#4433FF]/20 text-white'
                    : 'text-gray-300 hover:bg-[#1A1A1D] hover:text-white'
                }`}
              >
                {contact.avatarUrl ? (
                  <img
                    src={contact.avatarUrl}
                    alt={contact.fullName}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#4433FF]/20 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-[#4433FF]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{contact.fullName}</div>
                  {contact.email && (
                    <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showCreateNew && (
        <div className={filteredContacts.length > 0 ? 'border-t border-[#2A2A2A] p-1' : 'p-1'}>
          <button
            onClick={handleCreateNew}
            className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
              selectedIndex === filteredContacts.length
                ? 'bg-[#4433FF]/20 text-white'
                : 'text-gray-400 hover:bg-[#1A1A1D] hover:text-white'
            }`}
          >
            <Plus size={14} className="text-[#4433FF] flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">Add contact "{query.trim()}"</div>
              <div className="text-xs text-gray-500">Create new contact</div>
            </div>
          </button>
        </div>
      )}

      {filteredContacts.length === 0 && !showCreateNew && (
        <div className="p-3 text-sm text-gray-500 text-center">
          No contacts found
        </div>
      )}
    </div>
  );
};

