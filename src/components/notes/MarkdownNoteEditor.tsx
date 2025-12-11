// =============================================================================
// MARKDOWN NOTE EDITOR — Tiptap-based editor with wiki links and @mentions
// =============================================================================
// Features:
// - Rich text editing with Tiptap
// - Obsidian-style [[wiki links]] with [[ trigger
// - @mentions for contacts with @ trigger
// - Backlinks section at bottom
// - Theme-aware styling
// - Auto-save on change
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
// Using custom ResizableImageNode instead of basic Image for resize capability
import { ResizableImageNode } from './extensions/ResizableImageNode';
import { AudioEmbedNode } from './extensions/AudioEmbedNode';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Highlighter,
  Plus,
  GripVertical,
} from 'lucide-react';
import { WikiLinkNode } from './extensions/WikiLinkNode';
import { WikiLinkSuggestion } from './WikiLinkSuggestion';
import { ContactMentionNode } from './extensions/ContactMentionNode';
import { ContactMentionSuggestion } from './ContactMentionSuggestion';
import { TopicMentionNode } from './extensions/TopicMentionNode';
import { TopicMentionSuggestion } from './TopicMentionSuggestion';
import { TweetEmbedNode } from './extensions/TweetEmbedNode';
import { SlashCommandExtension } from '../../lib/editor/SlashCommandExtension';
import { BiDirectionalLinks } from './BiDirectionalLinks';
import {
  findNoteByTitle,
  createNoteFromWikiLink,
  getNoteById,
} from '../../services/noteStore';
import {
  createContactFromMention,
} from '../../services/contactStore';
import {
  createTopicFromHashtag,
} from '../../services/topicStore';
import type { Note, Contact, Topic } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface MarkdownNoteEditorProps {
  /** Note ID (for backlinks) */
  noteId?: string;
  /** Initial content (HTML) */
  content: string;
  /** Called when content changes */
  onContentChange: (content: string) => void;
  /** Current theme (only light/dark supported) */
  theme: 'light' | 'dark';
  /** Placeholder text */
  placeholder?: string;
  /** Callback when navigating to a linked note */
  onNavigateToNote?: (noteId: string) => void;
  /** Callback when navigating to a contact */
  onNavigateToContact?: (contactId: string) => void;
  /** Whether to show backlinks section */
  showBacklinks?: boolean;
}

// =============================================================================
// THEME COLORS
// =============================================================================

const getThemeColors = (theme: 'light' | 'dark') => {
  switch (theme) {
    case 'light':
      return {
        bg: '#ffffff',
        sidebar: '#f9fafb',
        text: '#1f2937',
        textMuted: '#6b7280',
        border: '#e5e7eb',
        hover: '#f3f4f6',
        accent: '#6366f1',
        toolbar: '#f9fafb',
        active: '#e5e7eb',
      };
    case 'dark':
    default:
      return {
        bg: '#0E0E10',
        sidebar: '#0A0A0C',
        text: '#f3f4f6',
        textMuted: '#9ca3af',
        border: '#1f2023',
        hover: '#1a1a1c',
        accent: '#6366f1',
        toolbar: '#0A0A0C',
        active: '#2d2f36',
      };
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export const MarkdownNoteEditor: React.FC<MarkdownNoteEditorProps> = ({
  noteId,
  content,
  onContentChange,
  theme,
  placeholder = 'Start writing...',
  onNavigateToNote,
  onNavigateToContact,
  showBacklinks = true,
}) => {
  const colors = getThemeColors(theme);
  const editorRef = useRef<HTMLDivElement>(null);

  // Wiki link suggestion state
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionPosition, setSuggestionPosition] = useState<{ top: number; left: number } | null>(null);
  const [triggerStart, setTriggerStart] = useState<number | null>(null);

  // Contact mention suggestion state
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | null>(null);
  const [mentionTriggerStart, setMentionTriggerStart] = useState<number | null>(null);

  // Topic hashtag suggestion state
  const [topicOpen, setTopicOpen] = useState(false);
  const [topicQuery, setTopicQuery] = useState('');
  const [topicPosition, setTopicPosition] = useState<{ top: number; left: number } | null>(null);
  const [topicTriggerStart, setTopicTriggerStart] = useState<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-400 hover:text-indigo-300 underline cursor-pointer',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      WikiLinkNode.configure({
        onNavigate: (title: string, noteId?: string) => {
          // First try to use provided noteId, otherwise find by title
          if (noteId && onNavigateToNote) {
            onNavigateToNote(noteId);
          } else if (title) {
            const note = findNoteByTitle(title);
            if (note && onNavigateToNote) {
              onNavigateToNote(note.id);
            }
          }
        },
      }),
      ContactMentionNode.configure({
        onNavigate: (contactId: string) => {
          if (contactId && onNavigateToContact) {
            onNavigateToContact(contactId);
          }
        },
      }),
      TopicMentionNode.configure({
        onNavigate: (topicId: string) => {
          // Topic navigation - can be implemented later
          console.log('Navigate to topic:', topicId);
        },
      }),
      // ResizableImageNode replaces Image - provides drag handles for resizing
      ResizableImageNode,
      TweetEmbedNode,
      // Audio embed for recorded/uploaded audio with player
      AudioEmbedNode,
      // Slash command menu for block insertion (Notion-style "/" commands)
      SlashCommandExtension.configure({
        colors: {
          bg: colors.bg,
          border: colors.border,
          text: colors.text,
          textMuted: colors.textMuted,
          hover: colors.hover,
          accent: colors.accent,
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-1',
      },
      handleDrop: (view, event, _slice, moved) => {
        // Handle image drops
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter(file => file.type.startsWith('image/'));

          if (imageFiles.length > 0) {
            event.preventDefault();

            imageFiles.forEach(file => {
              // Check file size (5MB limit)
              const MAX_SIZE = 5 * 1024 * 1024; // 5MB
              if (file.size > MAX_SIZE) {
                alert(`Image "${file.name}" is too large. Maximum size is 5MB.`);
                return;
              }

              const reader = new FileReader();
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                if (dataUrl && editor) {
                  // Get drop position
                  const coordinates = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                  });

                  if (coordinates) {
                    // Insert resizable image at drop position
                    editor.chain().focus().insertContentAt(coordinates.pos, {
                      type: 'resizableImage',
                      attrs: { src: dataUrl },
                    }).run();
                  } else {
                    // Fallback: insert at current cursor position
                    editor.chain().focus().setResizableImage({ src: dataUrl }).run();
                  }
                }
              };
              reader.readAsDataURL(file);
            });

            return true; // Handled
          }
        }
        return false; // Not handled
      },
      handlePaste: (view, event, _slice) => {
        // Handle pasted images
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
          const files = Array.from(event.clipboardData.files);
          const imageFiles = files.filter(file => file.type.startsWith('image/'));

          if (imageFiles.length > 0) {
            event.preventDefault();

            imageFiles.forEach(file => {
              // Check file size (5MB limit)
              const MAX_SIZE = 5 * 1024 * 1024; // 5MB
              if (file.size > MAX_SIZE) {
                alert(`Pasted image is too large. Maximum size is 5MB.`);
                return;
              }

              const reader = new FileReader();
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                if (dataUrl && editor) {
                  // Insert resizable image at current cursor position
                  editor.chain().focus().setResizableImage({ src: dataUrl }).run();
                }
              };
              reader.readAsDataURL(file);
            });

            return true; // Handled
          }
        }
        return false; // Not handled
      },
      handleKeyDown: (view, event) => {
        // Handle [[ trigger for wiki links
        if (event.key === '[') {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

          // Check if previous char is also [
          if (textBefore.endsWith('[')) {
            // Get cursor position for popup
            const coords = view.coordsAtPos($from.pos);
            setSuggestionPosition({
              top: coords.bottom + 4,
              left: coords.left,
            });
            setTriggerStart($from.pos - 1); // Include the first [
            setSuggestionQuery('');
            setSuggestionOpen(true);
            return false; // Let the [ be inserted
          }
        }

        // Handle @ trigger for contact mentions
        if (event.key === '@') {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

          // Only trigger at start of word (after space, newline, or at start)
          const lastChar = textBefore.slice(-1);
          if (textBefore.length === 0 || lastChar === ' ' || lastChar === '\n') {
            // Get cursor position for popup
            const coords = view.coordsAtPos($from.pos);
            setMentionPosition({
              top: coords.bottom + 4,
              left: coords.left,
            });
            setMentionTriggerStart($from.pos); // Position before @
            setMentionQuery('');
            setMentionOpen(true);
            return false; // Let the @ be inserted
          }
        }

        // Handle # trigger for topic hashtags
        if (event.key === '#') {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

          // Only trigger at start of word (after space, newline, or at start)
          const lastChar = textBefore.slice(-1);
          if (textBefore.length === 0 || lastChar === ' ' || lastChar === '\n') {
            // Get cursor position for popup
            const coords = view.coordsAtPos($from.pos);
            setTopicPosition({
              top: coords.bottom + 4,
              left: coords.left,
            });
            setTopicTriggerStart($from.pos); // Position before #
            setTopicQuery('');
            setTopicOpen(true);
            return false; // Let the # be inserted
          }
        }

        // Handle typing while wiki suggestion is open
        if (suggestionOpen && triggerStart !== null) {
          if (event.key === 'Escape') {
            closeSuggestion();
            return true;
          }
          if (event.key === 'Backspace') {
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;

            // If we're back to the trigger position, close
            if ($from.pos <= triggerStart + 2) {
              closeSuggestion();
            }
          }
        }

        // Handle typing while mention suggestion is open
        if (mentionOpen && mentionTriggerStart !== null) {
          if (event.key === 'Escape') {
            closeMention();
            return true;
          }
          if (event.key === 'Backspace') {
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;

            // If we're back to the trigger position, close
            if ($from.pos <= mentionTriggerStart + 1) {
              closeMention();
            }
          }
        }

        // Handle typing while topic suggestion is open
        if (topicOpen && topicTriggerStart !== null) {
          if (event.key === 'Escape') {
            closeTopic();
            return true;
          }
          if (event.key === 'Backspace') {
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;

            // If we're back to the trigger position, close
            if ($from.pos <= topicTriggerStart + 1) {
              closeTopic();
            }
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);

      // Update wiki link suggestion query if popup is open
      if (suggestionOpen && triggerStart !== null) {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        const textAfterTrigger = $from.parent.textContent.slice(
          triggerStart - $from.start() + 2, // Skip [[
          $from.parentOffset
        );
        setSuggestionQuery(textAfterTrigger);
      }

      // Update mention suggestion query if popup is open
      if (mentionOpen && mentionTriggerStart !== null) {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        const textAfterTrigger = $from.parent.textContent.slice(
          mentionTriggerStart - $from.start() + 1, // Skip @
          $from.parentOffset
        );
        setMentionQuery(textAfterTrigger);
      }

      // Update topic suggestion query if popup is open
      if (topicOpen && topicTriggerStart !== null) {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        const textAfterTrigger = $from.parent.textContent.slice(
          topicTriggerStart - $from.start() + 1, // Skip #
          $from.parentOffset
        );
        setTopicQuery(textAfterTrigger);
      }
    },
  });

  // Close suggestion popup
  const closeSuggestion = useCallback(() => {
    setSuggestionOpen(false);
    setSuggestionQuery('');
    setSuggestionPosition(null);
    setTriggerStart(null);
  }, []);

  // Handle wiki link selection
  const handleSelectNote = useCallback(
    (note: Note) => {
      if (!editor || triggerStart === null) return;

      const noteTitle = note.title || 'Untitled';

      // Delete the [[ trigger text and insert a WikiLinkNode
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { selection } = state;
          const { $from } = selection;
          const currentPos = $from.pos;

          // Delete from triggerStart to current position (removes [[ and any typed text)
          tr.delete(triggerStart, currentPos);

          // Create and insert the WikiLinkNode
          const wikiLinkNode = state.schema.nodes.wikiLinkNode.create({
            title: noteTitle,
            noteId: note.id,
          });
          tr.insert(triggerStart, wikiLinkNode);

          return true;
        })
        .run();

      closeSuggestion();
    },
    [editor, triggerStart, closeSuggestion]
  );

  // Handle creating new note from wiki link
  const handleCreateNote = useCallback(
    (title: string) => {
      const newNote = createNoteFromWikiLink(title);
      handleSelectNote(newNote);
    },
    [handleSelectNote]
  );

  // Close mention popup
  const closeMention = useCallback(() => {
    setMentionOpen(false);
    setMentionQuery('');
    setMentionPosition(null);
    setMentionTriggerStart(null);
  }, []);

  // Handle contact mention selection
  const handleSelectContact = useCallback(
    (contact: Contact) => {
      if (!editor || mentionTriggerStart === null) return;

      const contactName = contact.fullName || 'Unknown';

      // Delete the @ trigger text and insert a ContactMentionNode
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { selection } = state;
          const { $from } = selection;
          const currentPos = $from.pos;

          // Delete from mentionTriggerStart to current position (removes @ and any typed text)
          tr.delete(mentionTriggerStart, currentPos);

          // Create and insert the ContactMentionNode
          const mentionNode = state.schema.nodes.contactMentionNode.create({
            contactId: contact.id,
            name: contactName,
          });
          tr.insert(mentionTriggerStart, mentionNode);

          return true;
        })
        .run();

      closeMention();
    },
    [editor, mentionTriggerStart, closeMention]
  );

  // Handle creating new contact from mention
  const handleCreateContact = useCallback(
    (name: string) => {
      const newContact = createContactFromMention(name);
      handleSelectContact(newContact);
    },
    [handleSelectContact]
  );

  // Close topic popup
  const closeTopic = useCallback(() => {
    setTopicOpen(false);
    setTopicQuery('');
    setTopicPosition(null);
    setTopicTriggerStart(null);
  }, []);

  // Handle topic selection
  const handleSelectTopic = useCallback(
    (topic: Topic) => {
      if (!editor || topicTriggerStart === null) return;

      // Delete the # trigger text and insert a TopicMentionNode
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { selection } = state;
          const { $from } = selection;
          const currentPos = $from.pos;

          // Delete from topicTriggerStart to current position (removes # and any typed text)
          tr.delete(topicTriggerStart, currentPos);

          // Create and insert the TopicMentionNode
          const topicNode = state.schema.nodes.topicMentionNode.create({
            topicId: topic.id,
            label: topic.label,
          });
          tr.insert(topicTriggerStart, topicNode);

          return true;
        })
        .run();

      closeTopic();
    },
    [editor, topicTriggerStart, closeTopic]
  );

  // Handle creating new topic from hashtag
  const handleCreateTopic = useCallback(
    (label: string) => {
      const newTopic = createTopicFromHashtag(label);
      handleSelectTopic(newTopic);
    },
    [handleSelectTopic]
  );

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  // Handle clicks on regular links (note:// protocol)
  const handleEditorClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Regular link handling for note:// protocol
      if (target.tagName === 'A') {
        const href = target.getAttribute('href');
        if (href?.startsWith('note://')) {
          e.preventDefault();
          const noteId = href.replace('note://', '');
          onNavigateToNote?.(noteId);
        }
      }
    },
    [onNavigateToNote]
  );

  // Listen for audio recorded events to embed audio using TipTap
  useEffect(() => {
    const handleAudioRecorded = (e: CustomEvent<{ src: string; title?: string }>) => {
      if (editor && e.detail.src) {
        editor.chain().focus().setAudioEmbed({
          src: e.detail.src,
          title: e.detail.title || 'Audio Recording'
        }).run();
      }
    };

    window.addEventListener('framelord:audio-recorded', handleAudioRecorded as EventListener);
    return () => window.removeEventListener('framelord:audio-recorded', handleAudioRecorded as EventListener);
  }, [editor]);

  useEffect(() => {
    const editorElement = editorRef.current?.querySelector('.ProseMirror');
    if (editorElement) {
      editorElement.addEventListener('click', handleEditorClick as EventListener);
      return () => editorElement.removeEventListener('click', handleEditorClick as EventListener);
    }
  }, [handleEditorClick, editor]);

  if (!editor) {
    return (
      <div className="animate-pulse h-40 rounded" style={{ background: colors.hover }} />
    );
  }

  // Bubble menu button component
  const BubbleButton = ({
    onClick,
    isActive,
    icon: Icon,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    icon: React.FC<{ size: number }>;
    title: string;
  }) => (
    <button
      onClick={onClick}
      className="p-1.5 rounded transition-colors"
      style={{
        background: isActive ? colors.active : 'transparent',
        color: isActive ? colors.accent : colors.text,
      }}
      title={title}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div className="flex flex-col h-full notion-editor" ref={editorRef}>
      {/* Floating Bubble Menu - appears when text is selected */}
      <BubbleMenu
        editor={editor}
        className="bubble-menu"
      >
        <div
          className="flex items-center gap-0.5 px-1 py-1 rounded-lg shadow-xl"
          style={{
            background: colors.bg,
            border: `1px solid ${colors.border}`,
          }}
        >
          <BubbleButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={Bold}
            title="Bold (Cmd+B)"
          />
          <BubbleButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={Italic}
            title="Italic (Cmd+I)"
          />
          <BubbleButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            icon={Strikethrough}
            title="Strikethrough"
          />
          <BubbleButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            icon={Code}
            title="Inline Code"
          />
          <BubbleButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            icon={Highlighter}
            title="Highlight"
          />
          <div className="w-px h-4 mx-1" style={{ background: colors.border }} />
          <BubbleButton
            onClick={() => {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            isActive={editor.isActive('link')}
            icon={LinkIcon}
            title="Add Link"
          />
        </div>
      </BubbleMenu>

      {/* Drag Handle - TipTap style clean icons positioned OUTSIDE content area */}
      <DragHandle
        editor={editor}
        tippyOptions={{
          // Position to the left of the block, outside the padded content
          placement: 'left-start',
          offset: [0, 48], // [skidding, distance] - push further left outside content
          // Disable animations for snappy feel
          duration: 0,
          // Style the container as transparent
          theme: 'drag-handle',
        }}
      >
        <div
          className="drag-handle-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            cursor: 'grab',
          }}
        >
          <button
            className="drag-handle-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0',
              border: 'none',
              background: 'transparent',
              color: theme === 'light' ? '#9ca3af' : '#525252',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme === 'light' ? '#374151' : '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme === 'light' ? '#9ca3af' : '#525252';
            }}
            onClick={() => {
              // Add a new paragraph below current block - move to end of block first
              editor?.chain().focus().selectParentNode().insertContentAt(editor.state.selection.to, { type: 'paragraph' }).run();
            }}
            title="Add block below"
          >
            <Plus size={18} strokeWidth={1.5} />
          </button>
          <div
            className="drag-handle-grip"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0',
              color: theme === 'light' ? '#9ca3af' : '#525252',
              cursor: 'grab',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme === 'light' ? '#374151' : '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme === 'light' ? '#9ca3af' : '#525252';
            }}
            title="Drag to move"
          >
            <GripVertical size={18} strokeWidth={1.5} />
          </div>
        </div>
      </DragHandle>

      {/* Editor Content - Notion-style clean layout */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <EditorContent editor={editor} />

          {/* Bi-Directional Links Section */}
          {showBacklinks && noteId && (
            <BiDirectionalLinks
              noteId={noteId}
              onNavigateToNote={onNavigateToNote}
            />
          )}
        </div>
      </div>

      {/* Wiki Link Suggestion Popup */}
      <WikiLinkSuggestion
        isOpen={suggestionOpen}
        query={suggestionQuery}
        position={suggestionPosition}
        colors={colors}
        onSelect={handleSelectNote}
        onCreate={handleCreateNote}
        onClose={closeSuggestion}
      />

      {/* Contact Mention Suggestion Popup */}
      <ContactMentionSuggestion
        isOpen={mentionOpen}
        query={mentionQuery}
        position={mentionPosition}
        colors={colors}
        onSelect={handleSelectContact}
        onCreate={handleCreateContact}
        onClose={closeMention}
      />

      {/* Topic Hashtag Suggestion Popup */}
      <TopicMentionSuggestion
        isOpen={topicOpen}
        query={topicQuery}
        position={topicPosition}
        colors={colors}
        onSelect={handleSelectTopic}
        onCreate={handleCreateTopic}
        onClose={closeTopic}
      />

      {/* Dynamic Styles */}
      <style>{`
        .ProseMirror {
          min-height: 200px;
          color: ${colors.text};
          font-size: 16px;
          line-height: 1.7;
          caret-color: ${colors.accent};
        }

        .ProseMirror:focus {
          outline: none;
        }

        .ProseMirror.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: ${colors.textMuted};
          pointer-events: none;
          height: 0;
        }

        .ProseMirror p {
          margin: 0.5em 0;
        }

        .ProseMirror h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 1em 0 0.5em;
          color: ${colors.text};
          line-height: 1.3;
        }

        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.8em 0 0.4em;
          color: ${colors.text};
          line-height: 1.3;
        }

        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.6em 0 0.3em;
          color: ${colors.text};
          line-height: 1.3;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }

        .ProseMirror li {
          margin: 0.25em 0;
        }

        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }

        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5em;
        }

        .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.25em;
        }

        .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: ${colors.accent};
          cursor: pointer;
        }

        .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
          text-decoration: line-through;
          color: ${colors.textMuted};
        }

        .ProseMirror code {
          background: ${colors.hover};
          padding: 0.15em 0.4em;
          border-radius: 4px;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.9em;
          color: ${colors.accent};
        }

        .ProseMirror pre {
          background: ${colors.hover};
          padding: 1em;
          border-radius: 8px;
          margin: 0.5em 0;
          overflow-x: auto;
        }

        .ProseMirror pre code {
          background: none;
          padding: 0;
          color: ${colors.text};
        }

        .ProseMirror blockquote {
          border-left: 3px solid ${colors.accent};
          padding-left: 1em;
          margin: 0.5em 0;
          color: ${colors.textMuted};
          font-style: italic;
        }

        .ProseMirror strong {
          font-weight: 600;
          color: ${colors.text};
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror mark {
          background-color: rgba(255, 255, 0, 0.3);
          padding: 0.1em 0.2em;
          border-radius: 2px;
        }

        .ProseMirror a {
          color: ${colors.accent};
          text-decoration: underline;
          cursor: pointer;
        }

        .ProseMirror a:hover {
          opacity: 0.8;
        }

        .ProseMirror hr {
          border: none;
          border-top: 1px solid ${colors.border};
          margin: 1em 0;
        }

        /* Wiki link node styling - icon on LEFT like Affine */
        .ProseMirror .wikilink {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          vertical-align: baseline;
          user-select: none;
        }

        .ProseMirror .wikilink-icon {
          flex-shrink: 0;
          width: 12px;
          height: 12px;
          opacity: 0.5;
          color: ${colors.textMuted};
          transition: opacity 0.15s;
        }

        .ProseMirror .wikilink-text {
          color: ${colors.text};
          text-decoration: none;
          transition: text-decoration 0.15s;
        }

        .ProseMirror .wikilink:hover .wikilink-icon {
          opacity: 0.8;
        }

        .ProseMirror .wikilink:hover .wikilink-text {
          text-decoration: underline;
          text-decoration-color: ${colors.textMuted};
        }

        /* Contact mention node styling - icon on LEFT like wiki links */
        .ProseMirror .contact-mention {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          vertical-align: baseline;
          user-select: none;
        }

        .ProseMirror .mention-icon {
          flex-shrink: 0;
          width: 12px;
          height: 12px;
          opacity: 0.5;
          color: ${colors.textMuted};
          transition: opacity 0.15s;
        }

        .ProseMirror .mention-text {
          color: ${colors.text};
          text-decoration: none;
          transition: text-decoration 0.15s;
        }

        .ProseMirror .contact-mention:hover .mention-icon {
          opacity: 0.8;
        }

        .ProseMirror .contact-mention:hover .mention-text {
          text-decoration: underline;
          text-decoration-color: ${colors.textMuted};
        }

        /* Topic mention node styling - icon on LEFT like wiki links */
        .ProseMirror .topic-mention {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          vertical-align: baseline;
          user-select: none;
        }

        .ProseMirror .topic-mention .mention-icon {
          flex-shrink: 0;
          width: 12px;
          height: 12px;
          opacity: 0.5;
          color: ${colors.accent};
          transition: opacity 0.15s;
        }

        .ProseMirror .topic-mention .mention-text {
          color: ${colors.accent};
          text-decoration: none;
          transition: text-decoration 0.15s;
        }

        .ProseMirror .topic-mention:hover .mention-icon {
          opacity: 0.8;
        }

        .ProseMirror .topic-mention:hover .mention-text {
          text-decoration: underline;
          text-decoration-color: ${colors.accent};
        }

        /* Drag Handle Styles - Clean TipTap style */
        .drag-handle-container {
          opacity: 1;
          transition: opacity 0.15s ease;
        }

        /* Make editor content have room for drag handles on left */
        .notion-editor .ProseMirror {
          position: relative;
          padding-left: 48px;
          margin-left: -48px;
        }

        /* TipTap DragHandle - clean floating icons with transparent container */
        .tippy-box[data-theme='drag-handle'] {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .tippy-box[data-theme='drag-handle'] .tippy-content {
          padding: 0 !important;
        }

        /* Drag handle appears on the left side of content */
        .drag-handle-container {
          display: flex;
          align-items: center;
          gap: 2px;
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export default MarkdownNoteEditor;
