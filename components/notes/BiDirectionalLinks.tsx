// =============================================================================
// BI-DIRECTIONAL LINKS — AFFiNE-style backlinks section at bottom of note
// =============================================================================
// Shows notes that link to the current note, similar to AFFiNE's
// "Bi-Directional Links" section with a "Show" toggle.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, FileText, Link } from 'lucide-react';
import { getAllNotes, getNoteById } from '../../services/noteStore';
import type { Note } from '../../types';

interface BiDirectionalLinksProps {
  noteId: string;
  onNavigateToNote?: (noteId: string) => void;
}

/**
 * Find notes that link to the given note (backlinks).
 * Looks for [[title]] wikilinks in note content.
 */
function findBacklinks(noteId: string): Note[] {
  const currentNote = getNoteById(noteId);
  if (!currentNote) return [];

  const allNotes = getAllNotes();
  const currentTitle = currentNote.title?.toLowerCase() || '';

  // If no title, we can't have meaningful backlinks
  if (!currentTitle) return [];

  const backlinks: Note[] = [];

  for (const note of allNotes) {
    // Skip self
    if (note.id === noteId) continue;

    // Check if this note's content contains [[currentTitle]]
    const content = note.content?.toLowerCase() || '';
    if (content.includes(`[[${currentTitle}]]`)) {
      backlinks.push(note);
    }
  }

  return backlinks;
}

export function BiDirectionalLinks({ noteId, onNavigateToNote }: BiDirectionalLinksProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const backlinks = useMemo(() => findBacklinks(noteId), [noteId]);

  // Always show the section (like AFFiNE)
  return (
    <div className="mt-8 pt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left group"
      >
        <div className="flex items-center gap-2 text-sm text-[#a1a1aa]">
          <Link size={14} />
          <span>Bi-Directional Links</span>
          <span className="text-xs bg-[#27272a] px-1.5 py-0.5 rounded">
            {backlinks.length}
          </span>
        </div>
        <span className="text-xs text-[#6366f1] group-hover:text-white transition-colors">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-2">
          {backlinks.length === 0 ? (
            <div className="text-sm text-[#71717a] py-4 text-center">
              No backlinks yet. Link to this page from other notes using [[{getNoteById(noteId)?.title || 'Page Title'}]].
            </div>
          ) : (
            backlinks.map((note) => (
              <button
                key={note.id}
                onClick={() => onNavigateToNote?.(note.id)}
                className="w-full flex items-start gap-3 p-3 rounded-lg bg-[#1f1f23] hover:bg-[#27272a] transition-colors text-left"
              >
                <FileText size={16} className="text-[#6366f1] mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-medium truncate">
                    {note.title || 'Untitled'}
                  </div>
                  {note.content && (
                    <div className="text-xs text-[#71717a] mt-1 line-clamp-2">
                      {note.content.slice(0, 100)}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default BiDirectionalLinks;
