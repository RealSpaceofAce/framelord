// =============================================================================
// NOTES VIEW — Journal entries synced to contacts
// =============================================================================
// Accepts selectedContactId and setSelectedContactId as props from Dashboard.
// - Filters notes by selectedContactId
// - Creates new notes with contactId = selectedContactId
// - Contact dropdown calls setSelectedContactId to change focus across the app
// =============================================================================

import React, { useState, useMemo } from 'react';
import { Note } from '../../types';
import { CONTACT_ZERO, MOCK_CONTACTS, getContactById } from '../../services/contactStore';
import { 
  getNotesByContactId, 
  createNote, 
  getAllNotes 
} from '../../services/noteStore';
import { 
  FileText, Calendar, Tag, Send, 
  ChevronDown, Clock
} from 'lucide-react';

// --- PROPS ---

interface NotesViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
}

type ViewMode = 'contact' | 'all';

// --- COMPONENT ---

export const NotesView: React.FC<NotesViewProps> = ({ 
  selectedContactId, 
  setSelectedContactId 
}) => {
  // Local state for view mode and new note input
  const [viewMode, setViewMode] = useState<ViewMode>('contact');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Get notes based on view mode — always uses selectedContactId
  const notes = useMemo(() => {
    if (viewMode === 'all') {
      return getAllNotes();
    }
    // IMPORTANT: Always filter by the centralized selectedContactId
    return getNotesByContactId(selectedContactId);
  }, [viewMode, selectedContactId, refreshKey]);

  // Get selected contact for display
  const selectedContact = useMemo(() => {
    return getContactById(selectedContactId) || CONTACT_ZERO;
  }, [selectedContactId]);

  // Handle creating a new note — ALWAYS uses selectedContactId
  const handleCreateNote = () => {
    if (!newNoteContent.trim()) return;

    // Create note with contactId = selectedContactId
    // This is the key invariant: notes always attach to the active contact
    createNote(selectedContactId, newNoteContent.trim());
    
    // Clear input and refresh
    setNewNoteContent('');
    setRefreshKey(k => k + 1);
  };

  // Handle key press in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateNote();
    }
  };

  // Handle contact dropdown change — updates centralized state
  const handleContactChange = (newContactId: string) => {
    // This updates selectedContactId across the entire app
    setSelectedContactId(newContactId);
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

  // Group notes by date
  const notesByDate = useMemo((): Record<string, Note[]> => {
    const groups: Record<string, Note[]> = {};
    notes.forEach((note: Note) => {
      const dateKey = new Date(note.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(note);
    });
    return groups;
  }, [notes]);

  const isContactZero = selectedContactId === CONTACT_ZERO.id;

  return (
    <div className="flex h-full bg-[#030412]">
      {/* Sidebar */}
      <div className="w-72 bg-[#0E0E0E] border-r border-[#2A2A2A] flex flex-col">
        {/* View Toggle */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex bg-[#1A1A1D] rounded-lg p-1">
            <button
              onClick={() => setViewMode('contact')}
              className={`flex-1 px-3 py-2 text-xs font-bold uppercase rounded transition-colors ${
                viewMode === 'contact'
                  ? 'bg-[#4433FF] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              By Contact
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
          </div>
        </div>

        {/* Contact Selector — always visible, changes app-wide selectedContactId */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
            Active Contact
          </label>
          <div className="relative">
            <select
              value={selectedContactId}
              onChange={(e) => handleContactChange(e.target.value)}
              className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-3 text-white text-sm appearance-none cursor-pointer focus:border-[#4433FF] outline-none"
            >
              {MOCK_CONTACTS.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.fullName} {contact.id === CONTACT_ZERO.id ? '(You)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <p className="text-[10px] text-gray-600 mt-2">
            Changing this updates the selected contact app-wide
          </p>
        </div>

        {/* Selected Contact Info */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <img 
              src={selectedContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedContact.id}`}
              alt={selectedContact.fullName}
              className={`w-12 h-12 rounded-full border-2 ${
                isContactZero 
                  ? 'border-[#4433FF]' 
                  : 'border-[#333]'
              }`}
            />
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {selectedContact.fullName}
                {isContactZero && (
                  <span className="text-[9px] bg-[#4433FF] text-white px-1 py-0.5 rounded">YOU</span>
                )}
              </div>
              <div className="text-xs text-gray-500 capitalize">{selectedContact.relationshipRole}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 flex-1">
          <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#333]">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-[#4433FF]" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {viewMode === 'contact' ? 'Contact Notes' : 'Total Notes'}
              </span>
            </div>
            <div className="text-3xl font-display font-bold text-white">
              {notes.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] bg-[#0E0E0E]">
          <h1 className="text-xl font-display font-bold text-white">
            {viewMode === 'contact' 
              ? `Notes: ${selectedContact.fullName}` 
              : 'All Notes'
            }
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === 'contact' 
              ? `Journal entries synced to ${selectedContact.fullName}`
              : 'All notes across all contacts'
            }
          </p>
        </div>

        {/* New Note Input — always creates notes for selectedContactId */}
        <div className="p-6 border-b border-[#2A2A2A] bg-[#0A0A0A]">
          <div className="flex gap-4">
            <img 
              src={CONTACT_ZERO.avatarUrl}
              alt="You"
              className="w-10 h-10 rounded-full border-2 border-[#4433FF] shrink-0"
            />
            <div className="flex-1">
              <div className="mb-2 text-xs text-gray-500">
                Adding note to: <span className="text-[#4433FF] font-bold">{selectedContact.fullName}</span>
              </div>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Add a note about ${selectedContact.fullName}...`}
                className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg p-4 text-white text-sm resize-none focus:border-[#4433FF] outline-none min-h-[100px]"
                rows={3}
              />
              <div className="flex justify-between items-center mt-3">
                <div className="text-[10px] text-gray-600">
                  Press Enter to save • Shift+Enter for new line
                </div>
                <button
                  onClick={handleCreateNote}
                  disabled={!newNoteContent.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:bg-[#333] disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
                >
                  <Send size={14} /> Save Note
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-6">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText size={48} className="text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-500 mb-2">No notes yet</h3>
              <p className="text-sm text-gray-600 max-w-sm">
                {viewMode === 'contact' 
                  ? `Start documenting your interactions with ${selectedContact.fullName}`
                  : 'No notes have been created yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(notesByDate).map(([dateKey, dateNotes]: [string, Note[]]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar size={14} className="text-[#4433FF]" />
                    <span className="text-sm font-bold text-white">{formatDate(dateNotes[0].createdAt)}</span>
                    <div className="flex-1 h-px bg-[#2A2A2A]" />
                  </div>

                  {/* Notes for this date */}
                  <div className="space-y-4 pl-7">
                    {dateNotes.map((note) => {
                      const noteContact = getContactById(note.contactId);
                      const isNoteForSelectedContact = note.contactId === selectedContactId;
                      
                      return (
                        <div 
                          key={note.id}
                          className={`bg-[#0E0E0E] border rounded-lg p-4 transition-colors ${
                            isNoteForSelectedContact 
                              ? 'border-[#4433FF]/30 hover:border-[#4433FF]/50' 
                              : 'border-[#2A2A2A] hover:border-[#333]'
                          }`}
                        >
                          {/* Note Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {viewMode === 'all' && noteContact && (
                                <>
                                  <img 
                                    src={noteContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${noteContact.id}`}
                                    alt={noteContact.fullName}
                                    className="w-6 h-6 rounded-full border border-[#333]"
                                  />
                                  <span className={`text-xs font-bold ${
                                    isNoteForSelectedContact ? 'text-[#4433FF]' : 'text-gray-400'
                                  }`}>
                                    {noteContact.fullName}
                                  </span>
                                  <span className="text-gray-600">•</span>
                                </>
                              )}
                              <Clock size={12} className="text-gray-600" />
                              <span className="text-xs text-gray-500">{formatTime(note.createdAt)}</span>
                            </div>
                            {note.updatedAt && (
                              <span className="text-[10px] text-gray-600 italic">edited</span>
                            )}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
