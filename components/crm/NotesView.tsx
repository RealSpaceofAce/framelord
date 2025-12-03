// =============================================================================
// NOTES VIEW — Global Notes Dashboard with All Notes + Daily modes
// =============================================================================
// - All Notes: Shows all notes across all contacts with clickable contact names
// - Daily: Groups notes by day and contact, with @mention support for quick notes
// =============================================================================

import React, { useState, useMemo } from 'react';
import { Note, Contact } from '../../types';
import { CONTACT_ZERO, getAllContacts, getContactById } from '../../services/contactStore';
import { 
  createNote, 
  getAllNotes 
} from '../../services/noteStore';
import { getAllGroups, getMembers } from '../../services/groupStore';
import { 
  FileText, Calendar, Tag, Send, 
  ChevronDown, Clock, ArrowRight, User, AtSign
} from 'lucide-react';

// --- PROPS ---

interface NotesViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier?: () => void;
}

type ViewMode = 'all' | 'daily' | 'group';

// --- COMPONENT ---

export const NotesView: React.FC<NotesViewProps> = ({ 
  selectedContactId, 
  setSelectedContactId,
  onNavigateToDossier
}) => {
  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [dailyNoteContent, setDailyNoteContent] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Get all notes (filtered by group if in group mode)
  const allNotes = useMemo(() => {
    const notes = getAllNotes();
    if (viewMode === 'group' && selectedGroupId) {
      const memberIds = getMembers(selectedGroupId);
      return notes.filter(note => memberIds.includes(note.contactId));
    }
    return notes;
  }, [refreshKey, viewMode, selectedGroupId]);

  // --- HELPER FUNCTIONS ---

  // Parse @mention from text — finds first @Name pattern
  const parseMention = (text: string): string | null => {
    // Match @Name where Name can contain letters and spaces
    const match = text.match(/@([A-Za-z][A-Za-z\s]*)/);
    if (!match) return null;
    return match[1].trim();
  };

  // Find contact by name (case-insensitive, startsWith or exact match)
  const findContactByName = (name: string): Contact | null => {
    const lowerName = name.toLowerCase();
    
    const allContacts = getAllContacts();
    
    // Try exact match first
    const exactMatch = allContacts.find(
      c => c.fullName.toLowerCase() === lowerName
    );
    if (exactMatch) return exactMatch;
    
    // Try startsWith match
    const startsWithMatch = allContacts.find(
      c => c.fullName.toLowerCase().startsWith(lowerName)
    );
    if (startsWithMatch) return startsWithMatch;
    
    // Try contains match
    const containsMatch = allContacts.find(
      c => c.fullName.toLowerCase().includes(lowerName)
    );
    return containsMatch || null;
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDayHeader = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric'
    });
  };

  // Truncate text for snippets
  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '…';
  };

  // --- HANDLERS ---

  // Handle contact click — navigate to dossier
  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    if (onNavigateToDossier) {
      onNavigateToDossier();
    }
  };

  // Handle Daily note submission with @mention parsing
  const handleDailyNoteSubmit = () => {
    if (!dailyNoteContent.trim()) return;

    const mentionedName = parseMention(dailyNoteContent);
    let targetContactId: string = CONTACT_ZERO.id;

    if (mentionedName) {
      const matchedContact = findContactByName(mentionedName);
      if (matchedContact) {
        targetContactId = matchedContact.id;
      }
    }

    createNote({
      contactId: targetContactId,
      authorContactId: CONTACT_ZERO.id,
      content: dailyNoteContent.trim(),
    });

    setDailyNoteContent('');
    setRefreshKey(k => k + 1);
  };

  const handleDailyNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
      handleDailyNoteSubmit();
    }
  };

  // --- COMPUTED DATA ---

  // Group notes by date (for Daily view)
  const notesByDate = useMemo((): Record<string, Note[]> => {
    const groups: Record<string, Note[]> = {};
    allNotes.forEach((note) => {
      const dateKey = new Date(note.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(note);
    });
    return groups;
  }, [allNotes]);

  // For Daily view: group notes by date, then by contact
  const dailyData = useMemo(() => {
    const result: Array<{
      dateKey: string;
      dateDisplay: string;
      contacts: Array<{
        contact: Contact;
        notes: Note[];
        latestNote: Note;
      }>;
    }> = [];

    (Object.entries(notesByDate) as [string, Note[]][]).forEach(([dateKey, dateNotes]) => {
      // Group by contactId
      const byContact: Record<string, Note[]> = {};
      dateNotes.forEach(note => {
        if (!byContact[note.contactId]) {
          byContact[note.contactId] = [];
        }
        byContact[note.contactId].push(note);
      });

      const contacts = Object.entries(byContact).map(([contactId, notes]) => {
        const contact = getContactById(contactId);
        if (!contact) return null;
        return {
          contact,
          notes,
          latestNote: notes[0], // Already sorted by createdAt desc
        };
      }).filter(Boolean) as Array<{
        contact: Contact;
        notes: Note[];
        latestNote: Note;
      }>;

      result.push({
        dateKey,
        dateDisplay: formatDayHeader(dateNotes[0].createdAt),
        contacts,
      });
    });

    return result;
  }, [notesByDate]);

  // --- RENDER ---

    return (
    <div className="flex h-full bg-[#030412]">
      {/* Sidebar */}
      <div className="w-72 bg-[#0E0E0E] border-r border-[#2A2A2A] flex flex-col">
        {/* View Toggle */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex bg-[#1A1A1D] rounded-lg p-1">
            <button
              onClick={() => setViewMode('daily')}
              className={`flex-1 px-3 py-2 text-xs font-bold uppercase rounded transition-colors ${
                viewMode === 'daily'
                  ? 'bg-[#4433FF] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`flex-1 px-3 py-2 text-xs font-bold uppercase rounded transition-colors ${
                viewMode === 'all'
                  ? 'bg-[#4433FF] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Notes
            </button>
            <button
              onClick={() => setViewMode('group')}
              className={`flex-1 px-3 py-2 text-xs font-bold uppercase rounded transition-colors ${
                viewMode === 'group'
                  ? 'bg-[#4433FF] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              By Group
            </button>
          </div>
          {viewMode === 'group' && (
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full mt-3 bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
            >
              <option value="">Select a group...</option>
              {getAllGroups().map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Stats */}
        <div className="p-4 flex-1">
          <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#333] mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-[#4433FF]" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Total Notes
              </span>
            </div>
            <div className="text-3xl font-display font-bold text-white">
              {allNotes.length}
            </div>
          </div>

          <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-green-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Days Active
              </span>
            </div>
            <div className="text-3xl font-display font-bold text-white">
              {Object.keys(notesByDate).length}
            </div>
          </div>
        </div>

        {/* Quick tip */}
        <div className="p-4 border-t border-[#2A2A2A]">
          <div className="text-[10px] text-gray-600">
            <div className="flex items-center gap-1 mb-1">
              <AtSign size={10} />
              <span className="font-bold text-gray-500">Pro tip</span>
            </div>
            Use @Name in Daily view to attach notes to contacts
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] bg-[#0E0E0E]">
          <h1 className="text-xl font-display font-bold text-white">
            {viewMode === 'daily' ? 'Daily Log' : viewMode === 'group' ? 'Notes by Group' : 'All Notes'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === 'daily' 
              ? 'Track your daily touchpoints with contacts'
              : viewMode === 'group'
                ? 'Notes for contacts in the selected group'
                : 'Browse all notes across all contacts'
            }
          </p>
        </div>

        {/* Daily Note Composer (only in Daily view) */}
        {viewMode === 'daily' && (
          <div className="p-6 border-b border-[#2A2A2A] bg-[#0A0A0A]">
            <div className="flex gap-4">
              <img 
                src={CONTACT_ZERO.avatarUrl}
                alt="You"
                className="w-10 h-10 rounded-full border-2 border-[#4433FF] shrink-0"
              />
              <div className="flex-1">
                <div className="mb-2 text-xs text-gray-500 flex items-center gap-2">
                  <AtSign size={12} className="text-[#4433FF]" />
                  Type @Name to attach this note to a contact
                </div>
                <textarea
                  value={dailyNoteContent}
                  onChange={(e) => setDailyNoteContent(e.target.value)}
                  onKeyDown={handleDailyNoteKeyDown}
                  placeholder="What did you do today? Use @Name to mention someone..."
                  className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg p-4 text-white text-sm resize-none focus:border-[#4433FF] outline-none min-h-[80px]"
                  rows={2}
                />
                <div className="flex justify-between items-center mt-3">
                  <div className="text-[10px] text-gray-600">
                    Press Enter to save • Shift+Enter for new line
                  </div>
                  <button
                    onClick={handleDailyNoteSubmit}
                    disabled={!dailyNoteContent.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
                  >
                    <Send size={14} /> Add Daily Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {allNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText size={48} className="text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-500 mb-2">No notes yet</h3>
              <p className="text-sm text-gray-600 max-w-sm">
                Start documenting your interactions and thoughts
              </p>
            </div>
          ) : viewMode === 'group' && selectedGroupId ? (
            // GROUP NOTES VIEW (same as all notes but filtered)
            <div className="space-y-4">
              {allNotes.map((note) => {
                const noteContact = getContactById(note.contactId);
                if (!noteContact) return null;
    
                return (
                  <div 
                    key={note.id}
                    className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-lg p-4 hover:border-[#333] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={noteContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${noteContact.id}`}
                        alt={noteContact.fullName}
                        className="w-10 h-10 rounded-full border border-[#333] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => handleContactClick(noteContact.id)}
                          className="text-sm font-bold text-[#4433FF] hover:text-white transition-colors flex items-center gap-2 mb-1"
                        >
                          {noteContact.fullName}
                          <ArrowRight size={12} />
                        </button>
                        <div className="text-xs text-gray-600 mb-2">
                          {new Date(note.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
            </div>
        </div>
    );
              })}
              {allNotes.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No notes for this group yet
                </div>
              )}
            </div>
          ) : viewMode === 'all' ? (
            // ALL NOTES VIEW
            <div className="space-y-4">
              {allNotes.map((note) => {
                const noteContact = getContactById(note.contactId);
                if (!noteContact) return null;
    
    return (
                  <div 
                    key={note.id}
                    className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-lg p-4 hover:border-[#333] transition-colors"
                  >
                    {/* Note Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={noteContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${noteContact.id}`}
                          alt={noteContact.fullName}
                          className="w-8 h-8 rounded-full border border-[#333]"
                        />
                        <div>
                          <button
                            onClick={() => handleContactClick(noteContact.id)}
                            className="text-sm font-bold text-[#4433FF] hover:text-white transition-colors flex items-center gap-1"
                          >
                            {noteContact.fullName}
                            {noteContact.id === CONTACT_ZERO.id && (
                              <span className="text-[9px] bg-[#4433FF]/20 text-[#4433FF] px-1 py-0.5 rounded ml-1">You</span>
                            )}
                            <ArrowRight size={12} />
                          </button>
                          <div className="text-[10px] text-gray-500 capitalize">{noteContact.relationshipRole}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">{formatDate(note.createdAt)}</div>
                        <div className="text-[10px] text-gray-600">{formatTime(note.createdAt)}</div>
                      </div>
                    </div>

                    {/* Note Content */}
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        <Tag size={12} className="text-gray-600" />
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag, idx) => (
                            <span 
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#1A1A1D] text-gray-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // DAILY VIEW
            <div className="space-y-8">
              {dailyData.map(({ dateKey, dateDisplay, contacts }) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar size={16} className="text-[#4433FF]" />
                    <span className="text-lg font-display font-bold text-white">{dateDisplay}</span>
                    <div className="flex-1 h-px bg-[#2A2A2A]" />
                    <span className="text-xs text-gray-600">
                      {contacts.reduce((sum, c) => sum + c.notes.length, 0)} notes
                    </span>
                  </div>

                  {/* Contacts for this day */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-7">
                    {contacts.map(({ contact, notes, latestNote }) => (
                      <div 
                        key={contact.id}
                        className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-lg p-4 hover:border-[#4433FF]/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <img 
                            src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                            alt={contact.fullName}
                            className="w-10 h-10 rounded-full border border-[#333]"
                          />
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => handleContactClick(contact.id)}
                              className="text-sm font-bold text-white hover:text-[#4433FF] transition-colors flex items-center gap-1"
                            >
                              {contact.fullName}
                              {contact.id === CONTACT_ZERO.id && (
                                <span className="text-[9px] bg-[#4433FF]/20 text-[#4433FF] px-1 py-0.5 rounded ml-1">You</span>
                              )}
                            </button>
                            <div className="text-[10px] text-gray-500 capitalize">{contact.relationshipRole}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-display font-bold text-[#4433FF]">{notes.length}</div>
                            <div className="text-[9px] text-gray-600 uppercase">notes</div>
                          </div>
                        </div>

                        {/* Latest note snippet */}
                        <div className="bg-[#1A1A1D] rounded p-3 border-l-2 border-[#4433FF]/30">
                          <div className="flex items-center gap-1 mb-1">
                            <Clock size={10} className="text-gray-600" />
                            <span className="text-[10px] text-gray-500">{formatTime(latestNote.createdAt)}</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {truncate(latestNote.content, 60)}
                          </p>
                        </div>

                        {/* View more link */}
                        <button
                          onClick={() => handleContactClick(contact.id)}
                          className="mt-3 w-full text-center text-[10px] text-[#4433FF] hover:text-white transition-colors flex items-center justify-center gap-1"
                        >
                          View {contact.fullName}'s Dossier <ArrowRight size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
            </div>
        </div>
    );
};
