// =============================================================================
// NOTES VIEW — Three-Column Layout (Daily Notes)
// =============================================================================
// Left: Search + Navigation + Pinned Notes
// Center: Daily Notes Editor / All Notes Graph View
// Right: Calendar + Note Actions
// =============================================================================

import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Notebook,
  ArrowRight,
  Clock,
  Search,
  Star,
  Layers,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Mic,
  CheckSquare,
  Map,
  Pin,
  Pencil,
  FileText,
} from 'lucide-react';
import { Note } from '../../types';
import {
  CONTACT_ZERO,
  getAllContacts,
  getContactById,
} from '../../services/contactStore';
import {
  createNote,
  getNotesByDate,
  getAllNotes,
  updateNote,
  findNoteByTitle,
  searchNotesByTitle,
  getNoteById,
} from '../../services/noteStore';
import { DatePicker } from '../DatePicker';
import { MarkdownRenderer } from './MarkdownRenderer';
import { NoteDocumentView } from './NoteDocumentView';

interface NotesViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier?: () => void;
  onNavigateToTasks?: () => void;
}

const todayKey = (): string => new Date().toISOString().split('T')[0];

const formatHeading = (dateKey: string): string => {
  const date = new Date(dateKey + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatShortDate = (dateKey: string): string => {
  const date = new Date(dateKey + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const NotesView: React.FC<NotesViewProps> = ({
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier,
  onNavigateToTasks,
}) => {
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({
    [todayKey()]: '• ',
  });
  const [visibleDates, setVisibleDates] = useState<string[]>([todayKey()]);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<'daily' | 'all' | 'tasks' | 'map' | 'document'>('daily');
  const [noteHistory, setNoteHistory] = useState<string[]>([]); // Navigation history for linked notes
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [pinnedNotes, setPinnedNotes] = useState<string[]>(() => {
    // Load from localStorage if available
    const stored = localStorage.getItem('framelord_pinned_notes');
    return stored ? JSON.parse(stored) : [];
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [wikilinkState, setWikilinkState] = useState<Record<string, {
    active: boolean;
    query: string;
    startPos: number;
    endPos: number;
  } | null>>({});
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<Record<string, number>>({});
  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const contacts = useMemo(() => getAllContacts(true), []);
  const hasVisibleContent = (note: Note): boolean => note.content.trim().length > 0;

  // Save pinned notes to localStorage
  useEffect(() => {
    localStorage.setItem('framelord_pinned_notes', JSON.stringify(pinnedNotes));
  }, [pinnedNotes]);

  const notesByDate: Record<string, Note[]> = useMemo(() => {
    const map: Record<string, Note[]> = {};
    visibleDates.forEach((dateKey) => {
      map[dateKey] = getNotesByDate(dateKey).filter(hasVisibleContent);
    });
    return map;
  }, [visibleDates, refreshKey]);

  const allNotes = useMemo(
    () => getAllNotes().filter(hasVisibleContent),
    [refreshKey]
  );

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return allNotes;
    const query = searchQuery.toLowerCase();
    return allNotes.filter(note => 
      note.content.toLowerCase().includes(query) ||
      (note.title && note.title.toLowerCase().includes(query)) ||
      note.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [allNotes, searchQuery]);

  // Get pinned notes data
  const pinnedNotesData = useMemo(() => {
    return pinnedNotes
      .map(id => allNotes.find(n => n.id === id))
      .filter((note): note is Note => note !== undefined);
  }, [pinnedNotes, allNotes]);

  const parseMention = (text: string): string | null => {
    const match = text.match(/@([A-Za-z][A-Za-z\s]*)/);
    if (!match) return null;
    const name = match[1].trim().toLowerCase();
    const contact = contacts.find(
      (c) =>
        c.fullName.toLowerCase() === name ||
        c.fullName.toLowerCase().startsWith(name)
    );
    return contact ? contact.id : null;
  };

  const submitNote = (dateKey: string, textarea?: HTMLTextAreaElement) => {
    const draft = noteDrafts[dateKey] || '';

    // Extract the first line (the note to submit)
    const lines = draft.split('\n');
    const firstLine = lines[0] || '';
    const remainingLines = lines.slice(1).join('\n');

    // Remove bullet point if present
    const noteContent = firstLine.trim().replace(/^•\s*/, '').trim();

    // Don't submit if no actual content
    if (!noteContent) {
      // If there's remaining content, keep it; otherwise reset to bullet
      if (remainingLines.trim()) {
        // Ensure first remaining line has a bullet
        const firstRemaining = remainingLines.split('\n')[0] || '';
        if (!firstRemaining.trim().startsWith('•')) {
          setNoteDrafts((prev) => ({ ...prev, [dateKey]: '• ' + remainingLines }));
        } else {
          setNoteDrafts((prev) => ({ ...prev, [dateKey]: remainingLines }));
        }
      } else {
        setNoteDrafts((prev) => ({ ...prev, [dateKey]: '• ' }));
      }
      return;
    }

    const mentionedContactId = parseMention(noteContent);
    // Notes created in the main Notes view always default to CONTACT_ZERO
    // Only use mentioned contact if explicitly @mentioned
    const targetContactId = mentionedContactId || CONTACT_ZERO.id;

    // Create note - processNoteLinks will automatically handle [[links]]
    createNote({
      contactId: targetContactId,
      authorContactId: CONTACT_ZERO.id,
      content: noteContent,
    });

    // Always reset to a clean single bullet - no remaining lines
    setNoteDrafts((prev) => ({ ...prev, [dateKey]: '• ' }));
    setRefreshKey((k) => k + 1);

    // Restore focus and cursor position after state update
    const targetTextarea = textarea || textareaRefs.current[dateKey];
    if (targetTextarea) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        targetTextarea.focus();
        // Position cursor right after the bullet
        targetTextarea.setSelectionRange(2, 2);
      });
    }
  };

  // Update wikilink state when typing
  const updateWikilinkState = (dateKey: string, textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart;
    const value = textarea.value;
    const beforeCursor = value.slice(0, start);

    // Check if we're inside [[...]]
    const wikilinkMatch = beforeCursor.match(/\[\[([^\]]*)$/);

    if (wikilinkMatch) {
      const query = wikilinkMatch[1];
      const startPos = start - query.length - 2; // -2 for [[

      setWikilinkState((prev) => ({
        ...prev,
        [dateKey]: {
          active: true,
          query,
          startPos,
          endPos: start,
        },
      }));
      setSelectedSuggestionIndex((prev) => ({ ...prev, [dateKey]: 0 }));
    } else {
      setWikilinkState((prev) => ({ ...prev, [dateKey]: null }));
    }
  };

  // Handle wikilink selection from autocomplete
  const handleWikilinkSelect = (dateKey: string, noteId: string, textarea?: HTMLTextAreaElement) => {
    const state = wikilinkState[dateKey];
    if (!state) return;

    const targetTextarea = textarea || textareaRefs.current[dateKey];
    if (!targetTextarea) return;

    const targetNote = getNoteById(noteId);
    if (!targetNote) return;

    const title = targetNote.title || targetNote.content.slice(0, 40);
    const currentValue = targetTextarea.value;

    // Find the current [[...]] range in the text
    const wikilinkMatch = currentValue.slice(0, targetTextarea.selectionStart).match(/\[\[([^\]]*)$/);
    if (!wikilinkMatch) return;

    const query = wikilinkMatch[1];
    const startPos = targetTextarea.selectionStart - query.length - 2; // -2 for [[
    const endPos = targetTextarea.selectionStart;

    const before = currentValue.slice(0, startPos);
    const after = currentValue.slice(endPos);
    const newValue = `${before}[[${title}]] ${after}`;
    const newPos = startPos + `[[${title}]] `.length;

    // Update textarea value directly (imperatively) first
    targetTextarea.value = newValue;
    targetTextarea.focus();
    targetTextarea.setSelectionRange(newPos, newPos);

    // Then sync to React state
    setNoteDrafts((prev) => ({ ...prev, [dateKey]: newValue }));
    setWikilinkState((prev) => ({ ...prev, [dateKey]: null }));
  };

  // Handle creating new note from wikilink
  const handleWikilinkCreateNew = (dateKey: string, title: string, textarea?: HTMLTextAreaElement) => {
    const state = wikilinkState[dateKey];
    if (!state) return;

    const targetTextarea = textarea || textareaRefs.current[dateKey];
    if (!targetTextarea) return;

    // Just insert the link text - don't create the note yet
    // The note will be created when the user clicks the link
    const currentValue = targetTextarea.value;

    // Find the current [[...]] range in the text
    const wikilinkMatch = currentValue.slice(0, targetTextarea.selectionStart).match(/\[\[([^\]]*)$/);
    if (!wikilinkMatch) return;

    const query = wikilinkMatch[1];
    const startPos = targetTextarea.selectionStart - query.length - 2; // -2 for [[
    const endPos = targetTextarea.selectionStart;

    const before = currentValue.slice(0, startPos);
    const after = currentValue.slice(endPos);
    const newValue = `${before}[[${title.trim()}]] ${after}`;
    const newPos = startPos + `[[${title.trim()}]] `.length;

    // Update textarea value directly (imperatively) first
    targetTextarea.value = newValue;
    targetTextarea.focus();
    targetTextarea.setSelectionRange(newPos, newPos);

    // Then sync to React state
    setNoteDrafts((prev) => ({ ...prev, [dateKey]: newValue }));
    setWikilinkState((prev) => ({ ...prev, [dateKey]: null }));
  };

  const handleEditorKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    dateKey: string
  ) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const state = wikilinkState[dateKey];

    // Handle wikilink autocomplete navigation
    if (state?.active) {
      const suggestions = searchNotesByTitle(state.query, 8);
      const maxIndex = suggestions.length + (state.query.trim() ? 1 : 0) - 1; // +1 for "Create new"
      const currentIndex = selectedSuggestionIndex[dateKey] || 0;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => ({
          ...prev,
          [dateKey]: Math.min(currentIndex + 1, maxIndex),
        }));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => ({
          ...prev,
          [dateKey]: Math.max(currentIndex - 1, 0),
        }));
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (suggestions.length > 0 && currentIndex < suggestions.length) {
          // Select existing note
          handleWikilinkSelect(dateKey, suggestions[currentIndex].id, textarea);
        } else if (state.query.trim()) {
          // Create new note
          handleWikilinkCreateNew(dateKey, state.query.trim(), textarea);
        } else {
          // If no query, just close the wikilink mode without doing anything
          setWikilinkState((prev) => ({ ...prev, [dateKey]: null }));
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setWikilinkState((prev) => ({ ...prev, [dateKey]: null }));
        return;
      }
    }

    // Handle Shift+Enter (soft break - newline without bullet)
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      const newValue = value.slice(0, start) + '\n' + value.slice(end);
      setNoteDrafts((prev) => ({ ...prev, [dateKey]: newValue }));
      // Synchronous cursor positioning
      textarea.setSelectionRange(start + 1, start + 1);
      return;
    }

    // Handle Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      // Get current line content
      const lines = value.split('\n');
      const cursorLine = value.slice(0, start).split('\n').length - 1;
      const currentLine = lines[cursorLine] || '';

      // Extract actual content (no bullet, no whitespace)
      const content = currentLine.replace(/^•\s*/, '').trim();

      // Only submit if there's real content on the current line
      if (content) {
        // Use the standard submitNote function
        submitNote(dateKey, textarea);
      }
      // If empty line, do nothing
    }
  };

  const handleContactNavigate = (contactId: string) => {
    setSelectedContactId(contactId);
    onNavigateToDossier?.();
  };

  const handleDateSelect = (dateKey: string) => {
    setSelectedDate(dateKey);
    if (!visibleDates.includes(dateKey)) {
      setVisibleDates([dateKey]);
    }
    // Initialize with bullet point if empty
    setNoteDrafts((prev) => ({ ...prev, [dateKey]: prev[dateKey] || '• ' }));
  };

  const handlePinNote = (noteId: string) => {
    setPinnedNotes(prev => {
      if (prev.includes(noteId)) {
        return prev.filter(id => id !== noteId);
      } else {
        return [...prev, noteId];
      }
    });
  };

  const handleTasksClick = () => {
    setViewMode('tasks');
    if (onNavigateToTasks) {
      onNavigateToTasks();
    }
  };

  // Render note content with clickable [[links]]
  const renderNoteContent = (content: string, noteId: string) => {
    const parts: (string | React.ReactElement)[] = [];
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = linkRegex.exec(content)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      // Add the link
      const linkText = match[1];
      parts.push(
        <button
          key={key++}
          onClick={() => {
            // Find or create note with this title
            const existingNote = allNotes.find(n => 
              n.title && n.title.toLowerCase() === linkText.toLowerCase()
            );
            if (existingNote) {
              setSelectedNoteId(existingNote.id);
            } else {
              // Create new note page
              const newNote = createNote({
                contactId: CONTACT_ZERO.id,
                authorContactId: CONTACT_ZERO.id,
                content: '',
                title: linkText,
              });
              setSelectedNoteId(newNote.id);
              setRefreshKey(k => k + 1);
            }
          }}
          className="text-[#4433FF] hover:text-white underline-offset-2 hover:underline"
        >
          [[{linkText}]]
        </button>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  // Calendar helpers
  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (number | null)[] = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const getDateKeyForDay = (day: number | null): string | null => {
    if (day === null) return null;
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    return date.toISOString().split('T')[0];
  };

  const navigateCalendarMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendarMonth(newDate);
  };

  const hasNotesForDate = (dateKey: string): boolean => {
    return getNotesByDate(dateKey).some(hasVisibleContent);
  };

  const isSelectedDate = (dateKey: string | null): boolean => {
    return dateKey === selectedDate;
  };

  const calendarDays = getCalendarDays();
  const monthYear = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get current note for pinning
  const currentNote = selectedNoteId ? allNotes.find(n => n.id === selectedNoteId) : null;
  const isCurrentNotePinned = currentNote ? pinnedNotes.includes(currentNote.id) : false;

  return (
    <div className="flex h-full text-white relative overflow-hidden app-neon">
      <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,209,0.07),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(122,93,255,0.08),transparent_40%)]" />
      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-[#0E0E0E] border-r border-[#1C1D26] flex flex-col">
        {/* Search Bar */}
          <div className="p-4 border-b border-[#1C1D26]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything..."
              className="w-full bg-[#0A0A12] border border-[#1F2028] rounded-lg pl-9 pr-8 py-2 text-sm text-gray-200 focus:border-[#4433FF] outline-none"
              />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="text-[10px] text-gray-500 bg-[#1A1A1D] px-1.5 py-0.5 rounded">⌘K</kbd>
              <button className="p-1 text-gray-500 hover:text-gray-300">
                <Mic size={12} />
              </button>
            </div>
          </div>
            </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <button
            onClick={() => setViewMode('daily')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              viewMode === 'daily'
                ? 'bg-[#4433FF]/20 text-[#4433FF]'
                : 'text-gray-400 hover:text-white hover:bg-[#151623]'
            }`}
          >
            <Pencil size={14} />
              Daily notes
            </button>
          <button
            onClick={() => setViewMode('all')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              viewMode === 'all'
                ? 'bg-[#4433FF]/20 text-[#4433FF]'
                : 'text-gray-400 hover:text-white hover:bg-[#151623]'
            }`}
          >
            <FileText size={14} />
              All notes
            </button>
              <button
            onClick={handleTasksClick}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              viewMode === 'tasks'
                ? 'bg-[#4433FF]/20 text-[#4433FF]'
                : 'text-gray-400 hover:text-white hover:bg-[#151623]'
            }`}
          >
            <CheckSquare size={14} />
            Tasks
              </button>
              <button
            onClick={() => setViewMode('map')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              viewMode === 'map'
                ? 'bg-[#4433FF]/20 text-[#4433FF]'
                : 'text-gray-400 hover:text-white hover:bg-[#151623]'
            }`}
          >
            <Map size={14} />
            Map
              </button>

          {/* Pinned Notes Section */}
          <div className="mt-8">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 px-3">
              Pinned notes
            </div>
            <div className="space-y-1">
              {pinnedNotesData.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-600 italic">
                  No pinned notes yet
          </div>
              ) : (
                pinnedNotesData.map((note) => (
            <button
                    key={note.id}
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setViewMode('document');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#151623] transition-colors"
            >
                    {note.title || note.content.slice(0, 30)}
            </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Icon */}
        <div className="p-4 border-t border-[#1C1D26]">
          <div className="w-8 h-8 rounded-lg bg-[#4433FF]/20 flex items-center justify-center">
            <Notebook size={16} className="text-[#4433FF]" />
          </div>
        </div>
      </aside>

      {/* CENTER CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {/* Document View - Full Note Editor */}
          {viewMode === 'document' && selectedNoteId && (
            <NoteDocumentView
              noteId={selectedNoteId}
              onNavigateNote={(noteId) => {
                // Add current note to history before navigating
                if (selectedNoteId) {
                  setNoteHistory(prev => [...prev, selectedNoteId]);
                }
                setSelectedNoteId(noteId);
              }}
              onNavigateContact={handleContactNavigate}
              onBack={() => {
                if (noteHistory.length > 0) {
                  const previousNoteId = noteHistory[noteHistory.length - 1];
                  setNoteHistory(prev => prev.slice(0, -1));
                  setSelectedNoteId(previousNoteId);
                } else {
                  // Go back to daily view
                  setViewMode('daily');
                  setSelectedNoteId(null);
                }
              }}
              onClose={() => {
                setViewMode('daily');
                setSelectedNoteId(null);
                setNoteHistory([]);
              }}
            />
          )}
          
          {viewMode === 'daily' && visibleDates.map((dateKey) => {
            const notes = notesByDate[dateKey] || [];
            return (
              <div key={dateKey} className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  {formatHeading(dateKey)}
                </h2>
                
                {/* Existing Notes - Newest First (Top) */}
                {notes.length > 0 && (
                  <div className="space-y-2 mb-6">
                    {[...notes].reverse().map((note) => {
                      const contact = getContactById(note.contactId);
                      const isAboutContactZero = note.contactId === CONTACT_ZERO.id;
                      return (
                        <div
                          key={note.id}
                          className="flex items-start gap-2 group cursor-pointer"
                          onClick={() => {
                            setSelectedNoteId(note.id);
                            setViewMode('document');
                          }}
                        >
                          <span className="text-gray-600 mt-1">•</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-300 leading-relaxed">
                              <MarkdownRenderer
                                content={note.content}
                                onLinkClick={(linkText) => {
                                  const existingNote = findNoteByTitle(linkText);
                                  if (existingNote) {
                                    // Add current view to history and navigate to document view
                                    setNoteHistory(prev => [...prev, note.id]);
                                    setSelectedNoteId(existingNote.id);
                                    setViewMode('document');
                                  } else {
                                    const newNote = createNote({
                                      contactId: note.contactId || CONTACT_ZERO.id,
                                      authorContactId: CONTACT_ZERO.id,
                                      content: '',
                                      title: linkText,
                                    });
                                    setNoteHistory(prev => [...prev, note.id]);
                                    setSelectedNoteId(newNote.id);
                                    setViewMode('document');
                                    setRefreshKey(k => k + 1);
                                  }
                                }}
                              />
                            </div>
                            {/* Only show contact link if note is about someone OTHER than Contact Zero */}
                            {contact && !isAboutContactZero && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContactNavigate(contact.id);
                                }}
                                className="mt-1 text-xs text-[#4433FF] hover:text-white flex items-center gap-1"
                              >
                                {contact.fullName}
                                <ArrowRight size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Editor - At Bottom with Real-time Link Highlighting */}
                <div className="space-y-2 relative">
                  <div className="relative min-h-[100px]">
                    {/* Visible markdown rendering overlay - Must match textarea exactly */}
                    <div
                      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                        fontSize: '0.875rem',
                        lineHeight: '1.5rem',
                        padding: '0.5rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      <MarkdownRenderer
                        content={noteDrafts[dateKey] || '• '}
                        onLinkClick={() => {}}
                        preserveFormattingMarkers
                      />
                    </div>
                    {/* Textarea for input - transparent text, visible caret */}
                    <textarea
                      ref={(el) => {
                        textareaRefs.current[dateKey] = el;
                      }}
                      value={noteDrafts[dateKey] || '• '}
                      onChange={(e) => {
                        const text = e.target.value;
                        setNoteDrafts((prev) => ({ ...prev, [dateKey]: text }));
                        // Update wikilink state on every change
                        updateWikilinkState(dateKey, e.target);
                      }}
                      onKeyDown={(e) => handleEditorKeyDown(e, dateKey)}
                      placeholder="• Start typing... Press Enter to save"
                      className="w-full bg-transparent border-none resize-none focus:outline-none placeholder:text-gray-600 min-h-[100px] relative z-10"
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                        fontSize: '0.875rem',
                        lineHeight: '1.5rem',
                        padding: '0.5rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'transparent',
                        caretColor: 'white',
                        WebkitTextFillColor: 'transparent',
                        margin: 0,
                        border: 'none',
                        outline: 'none',
                      }}
                    />

                    {/* Wikilink Autocomplete Dropdown */}
                    {wikilinkState[dateKey]?.active && (() => {
                      const state = wikilinkState[dateKey]!;
                      const suggestions = searchNotesByTitle(state.query, 8);
                      const selectedIndex = selectedSuggestionIndex[dateKey] || 0;
                      const showCreateNew = state.query.trim() && !suggestions.some(n =>
                        (n.title || '').toLowerCase() === state.query.toLowerCase()
                      );

                      return (
                        <div className="absolute z-50 mt-1 bg-[#0E0E0E] border border-[#4433FF]/50 rounded-lg shadow-2xl max-h-64 overflow-y-auto min-w-[300px]">
                          {suggestions.length > 0 && (
                            <div className="p-1">
                              {suggestions.map((note, index) => {
                                const title = note.title || note.content.slice(0, 50);
                                const isSelected = index === selectedIndex;
                                return (
                                  <button
                                    key={note.id}
                                    onClick={() => handleWikilinkSelect(dateKey, note.id, textareaRefs.current[dateKey])}
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
                            <div className={suggestions.length > 0 ? 'border-t border-[#2A2A2A] p-1' : 'p-1'}>
                              <button
                                onClick={() => handleWikilinkCreateNew(dateKey, state.query.trim(), textareaRefs.current[dateKey])}
                                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                                  selectedIndex === suggestions.length
                                    ? 'bg-[#4433FF]/20 text-white'
                                    : 'text-gray-400 hover:bg-[#1A1A1D] hover:text-white'
                                }`}
                              >
                                <Pencil size={14} className="text-[#4433FF] flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">Create "{state.query.trim()}"</div>
                                  <div className="text-xs text-gray-500">New note page</div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
            </div>
          );
        })}

          {/* All Notes View - Running Graph */}
          {viewMode === 'all' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">All Notes</h2>
                {searchQuery && (
                  <span className="text-sm text-gray-500">
                    {filteredNotes.length} result{filteredNotes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                {filteredNotes.map((note) => {
                  const contact = getContactById(note.contactId);
                  const isAboutContactZero = note.contactId === CONTACT_ZERO.id;
                  const noteDate = new Date(note.createdAt);
                  const dateStr = noteDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  
                  return (
                    <div
                      key={note.id}
                      className="p-4 bg-[#0E0E16] border border-[#1C1D26] rounded-lg hover:border-[#4433FF]/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedNoteId(note.id);
                        setViewMode('document');
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          {note.title && (
                            <h3 className="text-sm font-semibold text-white mb-1">
                              {note.title}
                            </h3>
                          )}
                          <div className="text-sm text-gray-300 leading-relaxed">
                            <MarkdownRenderer
                              content={note.content}
                              onLinkClick={(linkText) => {
                                const existingNote = findNoteByTitle(linkText);
                                if (existingNote) {
                                  setNoteHistory(prev => [...prev, note.id]);
                                  setSelectedNoteId(existingNote.id);
                                  setViewMode('document');
                                } else {
                                  const newNote = createNote({
                                    contactId: note.contactId || CONTACT_ZERO.id,
                                    authorContactId: CONTACT_ZERO.id,
                                    content: '',
                                    title: linkText,
                                  });
                                  setNoteHistory(prev => [...prev, note.id]);
                                  setSelectedNoteId(newNote.id);
                                  setViewMode('document');
                                  setRefreshKey(k => k + 1);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                        <span>{dateStr}</span>
                        {/* Only show contact link if note is about someone OTHER than Contact Zero */}
                        {contact && !isAboutContactZero && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContactNavigate(contact.id);
                            }}
                            className="text-[#4433FF] hover:text-white flex items-center gap-1"
                          >
                            {contact.fullName}
                            <ArrowRight size={10} />
                          </button>
                        )}
                        {pinnedNotes.includes(note.id) && (
                          <Pin size={12} className="text-[#4433FF]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <aside className="w-80 bg-[#0E0E0E] border-l border-[#1C1D26] flex flex-col">
        {/* Calendar */}
        <div className="p-4 border-b border-[#1C1D26]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">{monthYear}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateCalendarMonth('prev')}
                className="p-1 text-gray-400 hover:text-white"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => navigateCalendarMonth('next')}
                className="p-1 text-gray-400 hover:text-white"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-1">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                <div key={day} className="text-[10px] text-gray-500 text-center py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const dateKey = getDateKeyForDay(day);
                const isSelected = isSelectedDate(dateKey);
                const hasNotes = dateKey ? hasNotesForDate(dateKey) : false;
                
                return (
                  <button
                    key={idx}
                    onClick={() => dateKey && handleDateSelect(dateKey)}
                    disabled={day === null}
                    className={`
                      aspect-square rounded-lg text-xs transition-colors
                      ${day === null ? 'cursor-default' : 'cursor-pointer hover:bg-[#1A1A1D]'}
                      ${isSelected ? 'bg-[#4433FF] text-white' : 'text-gray-300'}
                      ${hasNotes && !isSelected ? 'text-[#4433FF]' : ''}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Note Actions */}
        {currentNote && (
          <div className="p-4 space-y-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">
              Note actions
            </div>
            <button
              onClick={() => handlePinNote(currentNote.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isCurrentNotePinned
                  ? 'text-[#4433FF] bg-[#4433FF]/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#151623]'
              }`}
            >
              <Pin size={14} className={isCurrentNotePinned ? 'fill-current' : ''} />
              {isCurrentNotePinned ? 'Unpin this note' : 'Pin this note'}
            </button>
          </div>
        )}
      </aside>

    </div>
  );
};

export { NotesView };
