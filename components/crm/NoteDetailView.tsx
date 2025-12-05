import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowRight,
  Clock,
  Hash,
  Link as LinkIcon,
  Edit2,
  Save,
} from 'lucide-react';
import { Note } from '../../types';
import {
  getNoteById,
  getForwardLinkedNotes,
  getBacklinkedNotes,
  findNoteByTitle,
  updateNote,
  createNote,
  getNoteByExactTitle,
} from '../../services/noteStore';
import { getContactById } from '../../services/contactStore';
import { getTopicsForNote } from '../../services/topicStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { WikilinkAutocomplete } from './WikilinkAutocomplete';

interface NoteDetailViewProps {
  noteId: string;
  onClose: () => void;
  onNavigateContact: (contactId: string) => void;
  onNavigateNote: (noteId: string) => void;
}

const formatDateTime = (iso: string): string => {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const NoteDetailView: React.FC<NoteDetailViewProps> = ({
  noteId,
  onClose,
  onNavigateContact,
  onNavigateNote,
}) => {
  const note = getNoteById(noteId);
  if (!note) return null;

  // Auto-open in edit mode if note is empty (newly created from [[link]])
  const isEmptyNote = Boolean(!note.content.trim() && note.title);
  const [isEditing, setIsEditing] = useState<boolean>(isEmptyNote);
  const [editContent, setEditContent] = useState<string>(note.content);
  const [editTitle, setEditTitle] = useState<string>(note.title || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [wikilinkState, setWikilinkState] = useState<{
    active: boolean;
    query: string;
    startPos: number;
    endPos: number;
    position: { top: number; left: number };
  } | null>(null);

  useEffect(() => {
    setEditContent(note.content);
    setEditTitle(note.title || '');
    // Auto-edit if empty note
    if (!note.content.trim() && note.title) {
      setIsEditing(true);
    }
  }, [note]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const len = editContent.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing, editContent]);

  const contact = getContactById(note.contactId);
  const topics = getTopicsForNote(note.id);
  const forwardLinks = getForwardLinkedNotes(note.id);
  const backlinks = getBacklinkedNotes(note.id);

  const title = note.title || note.content.split('\n')[0] || 'Untitled';

  const handleSave = () => {
    updateNote(noteId, {
      content: editContent,
      title: editTitle || undefined,
    });
    setIsEditing(false);
  };

  const updateWikilinkState = (textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart;
    const value = textarea.value;
    
    // Find if we're inside a [[...]] sequence
    const beforeCursor = value.slice(0, start);
    const openBracketIndex = beforeCursor.lastIndexOf('[[');
    
    if (openBracketIndex !== -1) {
      const afterOpen = beforeCursor.slice(openBracketIndex + 2);
      const closeBracketIndex = afterOpen.indexOf(']');
      
      // If we haven't closed the bracket yet, we're in wikilink mode
      if (closeBracketIndex === -1 || closeBracketIndex > start - openBracketIndex - 2) {
        const query = afterOpen.slice(0, closeBracketIndex === -1 ? undefined : closeBracketIndex);
        const rect = textarea.getBoundingClientRect();
        const scrollTop = textarea.scrollTop;
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
        const lines = beforeCursor.split('\n');
        const currentLine = lines.length - 1;
        const charIndex = lines[lines.length - 1].length;
        
        // Approximate cursor position
        const top = rect.top + (currentLine * lineHeight) + lineHeight + scrollTop;
        const left = rect.left + (charIndex * 8); // Approximate char width
        
        setWikilinkState({
          active: true,
          query,
          startPos: openBracketIndex,
          endPos: start,
          position: { top, left },
        });
        return;
      }
    }
    
    setWikilinkState(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // Handle wikilink autocomplete navigation
    if (wikilinkState?.active) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
        // Let the autocomplete handle these
        return;
      }
    }

    // Detect [[ to enter wikilink mode
    if (e.key === '[' && value[start - 1] === '[') {
      // Don't prevent default, let the [ be inserted, then update state
      setTimeout(() => updateWikilinkState(textarea), 0);
      return;
    }

    // If typing inside [[...]], update autocomplete
    if (wikilinkState?.active && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setTimeout(() => updateWikilinkState(textarea), 0);
    }

    // Auto-close brackets when typing ]]
    if (e.key === ']' && value[start - 1] === ']' && value[start - 2] === '[') {
      const beforeCursor = value.slice(0, start - 1);
      const openBracketIndex = beforeCursor.lastIndexOf('[[');
      if (openBracketIndex !== -1) {
        const linkText = beforeCursor.slice(openBracketIndex + 2);
        // If there's text inside, create/ensure note exists
        if (linkText.trim()) {
        const existing = findNoteByTitle(linkText.trim());
        if (!existing) {
          createNote({
            contactId: note.contactId,
            authorContactId: note.authorContactId,
            title: linkText.trim(),
            content: '',
          });
        }
        }
        setWikilinkState(null);
      }
    }

    // Cmd/Ctrl + S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    if (textareaRef.current) {
      setTimeout(() => updateWikilinkState(textareaRef.current!), 0);
    }
  };

  const handleWikilinkSelect = (noteId: string) => {
    if (!wikilinkState) return;

    const targetNote = getNoteById(noteId);
    if (!targetNote) return;

    const title = targetNote.title || targetNote.content.slice(0, 50);
    const newValue =
      editContent.slice(0, wikilinkState.startPos) +
      `[[${title}]]` +
      editContent.slice(wikilinkState.endPos);

    setEditContent(newValue);
    setWikilinkState(null);

    // Move cursor after the link
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = wikilinkState.startPos + `[[${title}]]`.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleWikilinkCreateNew = (title: string) => {
    if (!wikilinkState) return;

    // Just insert the link text - don't create the note yet
    // The note will be created when the user clicks the link
    const newValue =
      editContent.slice(0, wikilinkState.startPos) +
      `[[${title.trim()}]]` +
      editContent.slice(wikilinkState.endPos);

    setEditContent(newValue);
    setWikilinkState(null);

    // Move cursor after the inserted link so user can keep typing
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = wikilinkState.startPos + `[[${title.trim()}]]`.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const renderLinkedLabel = (targetNote: Note) => (
    <button
      key={targetNote.id}
      onClick={() => onNavigateNote(targetNote.id)}
      className="text-xs text-[#4433FF] hover:text-white flex items-center gap-1"
    >
      <LinkIcon size={12} /> {targetNote.title || targetNote.content.slice(0, 40)}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl max-w-4xl w-full h-[90vh] shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4 shrink-0">
          <div className="flex-1">
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full bg-transparent border-none text-xl font-display font-bold text-white focus:outline-none"
              />
            ) : (
              <h2 className="text-xl font-display font-bold text-white">{title}</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 rounded-full hover:bg-[#1A1A1D] text-green-500 hover:text-green-400"
                  title="Save (Cmd/Ctrl+S)"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(note.content);
                    setEditTitle(note.title || '');
                  }}
                  className="p-2 rounded-full hover:bg-[#1A1A1D] text-gray-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-full hover:bg-[#1A1A1D] text-gray-500 hover:text-white"
                  title="Edit note"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-[#1A1A1D] text-gray-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Only show contact link if note is about someone OTHER than Contact Zero */}
          {contact && contact.id !== 'contact_zero' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigateContact(contact.id)}
                className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF]"
              >
                <img
                  src={
                    contact.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`
                  }
                  className="w-8 h-8 rounded-full border border-[#333]"
                  alt={contact.fullName}
                />
                <span className="text-sm text-white flex items-center gap-1">
                  {contact.fullName}
                  <ArrowRight size={12} className="text-[#4433FF]" />
                </span>
              </button>
            </div>
          )}

          {/* Main Editor/Viewer */}
          {isEditing ? (
            <div className="relative min-h-[300px] flex-1">
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
                  content={editContent}
                  onLinkClick={(linkText) => {
                    const target = findNoteByTitle(linkText);
                    if (target) {
                      onNavigateNote(target.id);
                    } else {
                      // Create new note and navigate to it
                      const newNote = createNote({
                        contactId: note.contactId,
                        authorContactId: note.authorContactId,
                        content: '',
                        title: linkText,
                      });
                      onNavigateNote(newNote.id);
                    }
                  }}
                />
              </div>
              {/* Editable textarea - transparent text */}
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none resize-none focus:outline-none relative z-10 min-h-[300px]"
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
                placeholder="Start writing in markdown... Use # for headers, **bold**, *italic*, [[links]], etc."
              />
            </div>
          ) : (
            <div className="text-sm text-gray-200 leading-relaxed min-h-[300px]">
              <MarkdownRenderer
                content={note.content || ''}
                onLinkClick={(linkText) => {
                  const target = findNoteByTitle(linkText);
                  if (target) {
                    onNavigateNote(target.id);
                  } else {
                    // Create new note and open it in edit mode
                    const newNote = createNote({
                      contactId: note.contactId,
                      authorContactId: note.authorContactId,
                      content: '',
                      title: linkText,
                    });
                    onNavigateNote(newNote.id);
                  }
                }}
              />
            </div>
          )}

          {/* Backlinks Section (Obsidian-style) */}
          {backlinks.length > 0 && (
            <div className="border-t border-[#2A2A2A] pt-6">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest mb-4">
                <LinkIcon size={12} />
                Linked from ({backlinks.length})
              </div>
              <div className="space-y-2">
                {backlinks.map((backlink) => {
                  // Find the link context in the backlink's content
                  const linkTitle = note.title || note.content.split('\n')[0] || 'Untitled';
                  const linkRegex = new RegExp(`\\[\\[${linkTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'i');
                  const match = backlink.content.match(linkRegex);
                  const contextStart = match ? Math.max(0, match.index! - 30) : 0;
                  const contextEnd = match ? Math.min(backlink.content.length, match.index! + match[0].length + 30) : 100;
                  const context = backlink.content.slice(contextStart, contextEnd);
                  
                  return (
                    <button
                      key={backlink.id}
                      onClick={() => onNavigateNote(backlink.id)}
                      className="w-full text-left p-3 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF] transition-colors group"
                    >
                      <div className="text-sm font-semibold text-white group-hover:text-[#4433FF] transition-colors mb-1">
                        {backlink.title || backlink.content.slice(0, 50)}
                      </div>
                      {context && (
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {contextStart > 0 ? '...' : ''}
                          {context.replace(linkRegex, match => `<span class="text-[#4433FF]">${match}</span>`)}
                          {contextEnd < backlink.content.length ? '...' : ''}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Wikilink Autocomplete */}
          {wikilinkState?.active && (
            <WikilinkAutocomplete
              query={wikilinkState.query}
              position={wikilinkState.position}
              onSelect={handleWikilinkSelect}
              onCreateNew={handleWikilinkCreateNew}
              onClose={() => setWikilinkState(null)}
              currentNoteContactId={note.contactId}
              currentNoteAuthorId={note.authorContactId}
            />
          )}

          {/* Forward Links Section */}
          {forwardLinks.length > 0 && (
            <div className="border-t border-[#2A2A2A] pt-6">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest mb-4">
                <LinkIcon size={12} />
                This note links to ({forwardLinks.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {forwardLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => onNavigateNote(link.id)}
                    className="px-3 py-1.5 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF] text-sm text-[#4433FF] hover:text-white transition-colors"
                  >
                    {link.title || link.content.slice(0, 30)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Topics */}
          {topics.length > 0 && (
            <div className="border-t border-[#2A2A2A] pt-6">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                <Hash size={12} /> Topics
              </div>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <span
                    key={topic.id}
                    className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  >
                    {topic.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
