// =============================================================================
// TOPIC MENTION SUGGESTION — Popup for # hashtag autocomplete
// =============================================================================
// Shows when user types # in the editor:
// - Displays matching topics as user types
// - Allows creating new topics if no match
// - Inserts topic mention on selection
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, Plus, Search } from 'lucide-react';
import { searchTopicsByLabel, findTopicByLabel, createTopicFromHashtag } from '../../services/topicStore';
import type { Topic } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface TopicMentionSuggestionProps {
  /** Current search query (text after #) */
  query: string;
  /** Position for popup */
  position: { top: number; left: number } | null;
  /** Theme colors */
  colors: Record<string, string>;
  /** Called when a topic is selected */
  onSelect: (topic: Topic) => void;
  /** Called when user wants to create new topic */
  onCreate: (label: string) => void;
  /** Called when popup should close */
  onClose: () => void;
  /** Whether popup is visible */
  isOpen: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TopicMentionSuggestion: React.FC<TopicMentionSuggestionProps> = ({
  query,
  position,
  colors,
  onSelect,
  onCreate,
  onClose,
  isOpen,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<Topic[]>([]);
  const [exactMatch, setExactMatch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search for matching topics
  useEffect(() => {
    if (query.length > 0) {
      const matches = searchTopicsByLabel(query, 8);
      setResults(matches);
      setSelectedIndex(0);

      // Check for exact match
      const existing = findTopicByLabel(query);
      setExactMatch(!!existing);
    } else {
      setResults([]);
      setSelectedIndex(0);
      setExactMatch(false);
    }
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      const showCreateOption = query.length > 0 && !exactMatch;
      const totalItems = results.length + (showCreateOption ? 1 : 0);

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
          } else if (showCreateOption) {
            onCreate(query);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, results, selectedIndex, query, exactMatch, onSelect, onCreate, onClose]
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

  const showCreateOption = query.length > 0 && !exactMatch;

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
        {query ? `Searching topics: "${query}"` : 'Type to search topics...'}
      </div>

      {/* Results */}
      <div className="max-h-[240px] overflow-y-auto">
        {results.length === 0 && !showCreateOption && (
          <div
            className="px-3 py-4 text-center text-sm"
            style={{ color: colors.textMuted }}
          >
            {query ? 'No matching topics' : 'Start typing to search'}
          </div>
        )}

        {results.map((topic, index) => (
          <button
            key={topic.id}
            onClick={() => onSelect(topic)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
            style={{
              background: selectedIndex === index ? colors.hover : 'transparent',
              color: colors.text,
            }}
          >
            <div
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: colors.accent + '20' }}
            >
              <Hash size={12} style={{ color: colors.accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="truncate block">{topic.label}</span>
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
            <Plus size={14} style={{ flexShrink: 0 }} />
            <span>Create topic "{query}"</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TopicMentionSuggestion;
