// =============================================================================
// NOTE DOCUMENT VIEW — Full document view for linked notes (Obsidian-style)
// =============================================================================
// Replaces the modal overlay with a full document view in the main content area
// =============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Hash,
  Link as LinkIcon,
  Edit2,
  Save,
  X,
  Image,
  Music,
  File,
  Trash2,
} from 'lucide-react';
import { Note } from '../../types';
import {
  getNoteById,
  getForwardLinkedNotes,
  getBacklinkedNotes,
  findNoteByTitle,
  updateNote,
  createNote,
  removeAttachmentFromNote,
} from '../../services/noteStore';
import { getContactById, getAllContacts } from '../../services/contactStore';
import { getTopicsForNote } from '../../services/topicStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { WikilinkAutocomplete } from './WikilinkAutocomplete';

interface NoteDocumentViewProps {
  noteId: string;
  onNavigateNote: (noteId: string) => void;
  onNavigateContact: (contactId: string) => void;
  onBack: () => void;
  onClose: () => void;
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

/**
 * Extract plain text snippet from content around a wikilink
 * Returns plain text without HTML tags or literal [[link]] markup
 */
const extractSnippet = (content: string, linkTitle: string, contextLength: number = 50): string => {
  // Escape special regex characters in linkTitle
  const escapedTitle = linkTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const linkRegex = new RegExp(`\\[\\[${escapedTitle}\\]\\]`, 'i');
  const match = content.match(linkRegex);
  
  if (!match || match.index === undefined) {
    // No link found, return first part of content
    return content.slice(0, contextLength * 2).replace(/\[\[([^\]]+)\]\]/g, '$1');
  }
  
  const start = Math.max(0, match.index - contextLength);
  const end = Math.min(content.length, match.index + match[0].length + contextLength);
  let snippet = content.slice(start, end);
  
  // Replace all wikilinks with just their text (no brackets)
  snippet = snippet.replace(/\[\[([^\]]+)\]\]/g, '$1');
  
  // Remove any HTML tags if present
  snippet = snippet.replace(/<[^>]*>/g, '');
  
  // Add ellipsis if needed
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  return snippet.trim();
};

export const NoteDocumentView: React.FC<NoteDocumentViewProps> = ({
  noteId,
  onNavigateNote,
  onNavigateContact,
  onBack,
  onClose,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const note = useMemo(() => getNoteById(noteId), [noteId, refreshKey]);
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
    const currentNote = getNoteById(noteId);
    if (currentNote) {
      setEditContent(currentNote.content);
      setEditTitle(currentNote.title || '');
      // Auto-edit if empty note
      if (!currentNote.content.trim() && currentNote.title) {
        setIsEditing(true);
      }
    }
  }, [noteId, refreshKey]);

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
    const beforeCursor = value.slice(0, start);
    const wikilinkMatch = beforeCursor.match(/\[\[([^\]]*)$/);
    
    if (wikilinkMatch) {
      const rect = textarea.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
      const lines = beforeCursor.split('\n');
      const currentLine = lines.length - 1;
      
      setWikilinkState({
        active: true,
        query: wikilinkMatch[1],
        startPos: start - wikilinkMatch[1].length - 2, // -2 for [[
        endPos: start,
        position: {
          top: rect.top + (currentLine * lineHeight) + lineHeight,
          left: rect.left + 20, // Approximate cursor position
        },
      });
    } else {
      setWikilinkState(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    updateWikilinkState(e.target);
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

  const handleWikilinkSelect = (noteId: string) => {
    if (!wikilinkState) return;

    const targetNote = getNoteById(noteId);
    if (!targetNote) return;

    const before = editContent.slice(0, wikilinkState.startPos);
    const after = editContent.slice(wikilinkState.endPos);
    const newValue = `${before}[[${targetNote.title || targetNote.content.slice(0, 40)}]]${after}`;

    setEditContent(newValue);
    setWikilinkState(null);

    // Move cursor after the inserted link
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = wikilinkState.startPos + `[[${targetNote.title || targetNote.content.slice(0, 40)}]]`.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleWikilinkCreateNew = (title: string) => {
    if (!wikilinkState) return;

    // Just insert the link text - don't create the note yet
    // The note will be created when the user clicks the link
    const before = editContent.slice(0, wikilinkState.startPos);
    const after = editContent.slice(wikilinkState.endPos);
    const newValue = `${before}[[${title.trim()}]]${after}`;

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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-[#1A1A1D] text-gray-400 hover:text-white transition-colors"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full bg-transparent border-none text-2xl font-display font-bold text-white focus:outline-none"
              />
            ) : (
              <h1 className="text-2xl font-display font-bold text-white">{title}</h1>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-[#4433FF] hover:bg-[#4433FF]/80 text-white text-sm font-medium transition-colors"
                title="Save (Cmd/Ctrl+S)"
              >
                <Save size={16} className="inline mr-2" />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(note.content);
                  setEditTitle(note.title || '');
                }}
                className="p-2 rounded-lg hover:bg-[#1A1A1D] text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg hover:bg-[#1A1A1D] text-gray-400 hover:text-white transition-colors"
                title="Edit note"
              >
                <Edit2 size={16} className="inline mr-2" />
                Edit
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[#1A1A1D] text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Contact Link */}
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

        {/* Editor/Viewer */}
        {isEditing ? (
          <div className="relative min-h-[400px]">
            {/* Visible markdown rendering overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                fontSize: '0.875rem',
                lineHeight: '1.5rem',
                padding: '1rem',
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
            {/* Editable textarea */}
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#0A0A0A] border border-[#1F1F24] rounded-lg resize-none focus:outline-none focus:border-[#4433FF] relative z-10 min-h-[400px]"
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                fontSize: '0.875rem',
                lineHeight: '1.5rem',
                padding: '1rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'transparent',
                caretColor: 'white',
                WebkitTextFillColor: 'transparent',
              }}
              placeholder="Start writing in markdown... Use # for headers, **bold**, *italic*, [[links]], etc."
            />
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
          </div>
        ) : (
          <div className="bg-[#0A0A0A] border border-[#1F1F24] rounded-lg p-6 text-sm text-gray-200 leading-relaxed min-h-[400px]">
            <MarkdownRenderer
              content={note.content || ''}
              onMentionClick={(contactName) => {
                const contacts = getAllContacts();
                const contact = contacts.find(
                  c => c.fullName.toLowerCase() === contactName.toLowerCase()
                );
                if (contact) {
                  onNavigateContact(contact.id);
                }
              }}
              onLinkClick={(linkText) => {
                const target = findNoteByTitle(linkText);
                if (target) {
                  onNavigateNote(target.id);
                } else {
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
            
            {/* Attachments */}
            {note.attachments && note.attachments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[#2A2A2A] space-y-4">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">
                  Attachments ({note.attachments.length})
                </div>
                {note.attachments.map((attachment) => (
                  <div key={attachment.id} className="relative">
                    {attachment.type === 'image' && (
                      <div className="relative group">
                        <img
                          src={attachment.dataUrl}
                          alt={attachment.filename || 'Image'}
                          className="max-w-full max-h-96 rounded-lg border border-[#333] cursor-pointer hover:border-[#4433FF]/50 transition-colors"
                          onClick={() => window.open(attachment.dataUrl, '_blank')}
                        />
                        <button
                          onClick={() => {
                            removeAttachmentFromNote(note.id, attachment.id);
                            setRefreshKey((k) => k + 1);
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-[#0E0E0E]/80 rounded hover:bg-red-500/80 transition-opacity"
                        >
                          <Trash2 size={14} className="text-white" />
                        </button>
                      </div>
                    )}
                    {attachment.type === 'audio' && (
                      <div className="flex items-center gap-3 p-4 bg-[#1A1A1D] border border-[#333] rounded-lg">
                        <Music size={20} className="text-[#4433FF]" />
                        <audio
                          src={attachment.dataUrl}
                          controls
                          className="flex-1 h-10"
                        />
                        <button
                          onClick={() => {
                            removeAttachmentFromNote(note.id, attachment.id);
                            const updatedNote = getNoteById(note.id);
                            if (updatedNote) {
                              window.location.reload();
                            }
                          }}
                          className="p-2 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 size={16} className="text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    )}
                    {(attachment.type === 'file' || attachment.mimeType === 'application/pdf') && (
                      <div className="flex items-center gap-3 p-4 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF]/50 transition-colors group">
                        <File size={20} className="text-[#4433FF]" />
                        <a
                          href={attachment.dataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-sm text-gray-300 hover:text-[#4433FF] truncate"
                        >
                          {attachment.filename || 'File'}
                        </a>
                        <button
                          onClick={() => {
                            removeAttachmentFromNote(note.id, attachment.id);
                            const updatedNote = getNoteById(note.id);
                            if (updatedNote) {
                              window.location.reload();
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded transition-opacity"
                        >
                          <Trash2 size={16} className="text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Backlinks Section - Fixed to show plain text snippets */}
        {backlinks.length > 0 && (
          <div className="border-t border-[#2A2A2A] pt-6">
            <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest mb-4">
              <LinkIcon size={12} />
              Linked from ({backlinks.length})
            </div>
            <div className="space-y-3">
              {backlinks.map((backlink) => {
                const linkTitle = note.title || note.content.split('\n')[0] || 'Untitled';
                const snippet = extractSnippet(backlink.content, linkTitle, 60);
                
                return (
                  <button
                    key={backlink.id}
                    onClick={() => onNavigateNote(backlink.id)}
                    className="w-full text-left p-4 bg-[#1A1A1D] border border-[#333] rounded-lg hover:border-[#4433FF] transition-colors group"
                  >
                    <div className="text-sm font-semibold text-white group-hover:text-[#4433FF] transition-colors mb-2">
                      {backlink.title || backlink.content.split('\n')[0] || 'Untitled'}
                    </div>
                    {snippet && (
                      <div className="text-xs text-gray-400 leading-relaxed">
                        {snippet}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
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

        {/* Metadata */}
        <div className="border-t border-[#2A2A2A] pt-4 flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            Created {formatDateTime(note.createdAt)}
          </div>
          {note.updatedAt && (
            <div className="flex items-center gap-1">
              <Clock size={12} />
              Updated {formatDateTime(note.updatedAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

