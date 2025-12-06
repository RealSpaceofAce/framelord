// =============================================================================
// CONTACT LOG VIEW — Notes mentioning a specific contact
// =============================================================================
// Shows all notes where the contact is mentioned (in targetContactIds).
// Groups notes by date for chronological browsing.
// =============================================================================

import React, { useMemo } from 'react';
import { FileText, Calendar, Inbox } from 'lucide-react';
import { NoteCard } from '../notes/NoteCard';
import { getNotesForContact } from '../../services/noteStore';
import { getContactById } from '../../services/contactStore';
import type { Note } from '../../types';

interface ContactLogViewProps {
  /** ID of the contact to show notes for */
  contactId: string;
  /** Called when a note is selected */
  onNoteSelect?: (noteId: string) => void;
}

interface DateGroup {
  date: string;
  label: string;
  notes: Note[];
}

/**
 * Group notes by their dateKey (for log entries) or createdAt date.
 */
function groupNotesByDate(notes: Note[]): DateGroup[] {
  const groups: Map<string, Note[]> = new Map();

  for (const note of notes) {
    // Use dateKey for log entries, otherwise use createdAt date
    const dateKey = note.dateKey || note.createdAt.split('T')[0];

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(note);
  }

  // Sort by date descending (most recent first)
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return sortedDates.map(date => ({
    date,
    label: formatDateLabel(date),
    notes: groups.get(date)!.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
  }));
}

/**
 * Format a date string as a human-readable label.
 */
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const noteDate = new Date(dateStr);
  noteDate.setHours(0, 0, 0, 0);

  if (noteDate.getTime() === today.getTime()) {
    return 'Today';
  }
  if (noteDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  // Format as "Monday, December 5, 2025"
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const ContactLogView: React.FC<ContactLogViewProps> = ({
  contactId,
  onNoteSelect,
}) => {
  const contact = useMemo(() => getContactById(contactId), [contactId]);
  const notes = useMemo(() => getNotesForContact(contactId), [contactId]);
  const groupedNotes = useMemo(() => groupNotesByDate(notes), [notes]);

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Contact not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText size={20} className="text-[#4433FF]" />
          Notes about {contact.fullName}
        </h2>
        <span className="text-sm text-gray-500 bg-[#2A2A2A] px-2 py-1 rounded">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {groupedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Inbox size={48} className="mb-4 opacity-50" />
            <p className="text-lg mb-2">No notes yet</p>
            <p className="text-sm text-gray-600">
              Mention {contact.fullName} in a note using &{contact.fullName.split(' ')[0]}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedNotes.map(group => (
              <div key={group.date}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} className="text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-400">{group.label}</h3>
                  <div className="flex-1 h-px bg-[#2A2A2A]" />
                </div>

                {/* Notes in this date group */}
                <div className="space-y-3 pl-5">
                  {group.notes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => onNoteSelect?.(note.id)}
                      showDate={false}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactLogView;
