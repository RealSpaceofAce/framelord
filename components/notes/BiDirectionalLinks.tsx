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
 * Looks for:
 * 1. [[title]] wikilinks in note content
 * 2. [[noteId]] ID references in note content
 * 3. Direct noteId references (from BlockSuite affine-reference format)
 * 4. The linkedDocIds array (if available)
 */
function findBacklinks(noteId: string): Note[] {
  const currentNote = getNoteById(noteId);
  if (!currentNote) return [];

  const allNotes = getAllNotes();
  const currentTitle = currentNote.title?.toLowerCase() || '';

  const backlinks: Note[] = [];
  const addedIds = new Set<string>();

  for (const note of allNotes) {
    // Skip self
    if (note.id === noteId) continue;
    if (addedIds.has(note.id)) continue;

    const content = note.content?.toLowerCase() || '';

    // Check 1: [[title]] pattern (case-insensitive)
    if (currentTitle && content.includes(`[[${currentTitle}]]`)) {
      backlinks.push(note);
      addedIds.add(note.id);
      continue;
    }

    // Check 2: [[noteId]] pattern - BlockSuite stores by ID
    if (content.includes(`[[${noteId.toLowerCase()}]]`) || content.includes(`[[${noteId}]]`)) {
      backlinks.push(note);
      addedIds.add(note.id);
      continue;
    }

    // Check 3: [link:noteId] pattern from content extraction
    if (content.includes(`[link:${noteId.toLowerCase()}]`) || content.includes(`[link:${noteId}]`)) {
      backlinks.push(note);
      addedIds.add(note.id);
      continue;
    }

    // Check 4: [linkedDocs:id1,id2,id3] pattern from content extraction
    const linkedDocsMatch = note.content?.match(/\[linkedDocs:([^\]]+)\]/);
    if (linkedDocsMatch) {
      const linkedIds = linkedDocsMatch[1].split(',');
      if (linkedIds.includes(noteId)) {
        backlinks.push(note);
        addedIds.add(note.id);
        continue;
      }
    }

    // Check 5: linkedDocIds array (if stored as separate field on the note)
    const linkedDocIds = (note as any).linkedDocIds as string[] | undefined;
    if (linkedDocIds && linkedDocIds.includes(noteId)) {
      backlinks.push(note);
      addedIds.add(note.id);
      continue;
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
