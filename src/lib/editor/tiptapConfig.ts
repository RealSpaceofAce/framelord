// =============================================================================
// TIPTAP CONFIGURATION — Centralized editor configuration for FrameLord
// =============================================================================
// This module provides the canonical TipTap setup for FrameLord's notes editor.
//
// DATA FLOW:
// - Incoming: HTML string from noteStore (content field)
// - Editor: TipTap JSON (ProseMirror document)
// - Outgoing: HTML string via editor.getHTML() saved back to noteStore
//
// EXTENSIONS INCLUDED:
// - StarterKit: Basic editing (bold, italic, headings, lists, code blocks, etc.)
// - Placeholder: Empty editor placeholder text
// - Link: Clickable hyperlinks
// - TaskList/TaskItem: Checkbox task lists
// - Highlight: Text highlighting
// - ResizableImageNode: Images with drag-to-resize handles
// - TweetEmbedNode: Twitter/X embeds with paste-to-embed
// - WikiLinkNode: [[wiki link]] syntax for note linking
// - ContactMentionNode: @contact mentions
// - TopicMentionNode: #topic hashtags
// - SlashCommandExtension: "/" menu for quick block insertion
//
// NO PRO/CLOUD FEATURES - All extensions are open-source core.
// =============================================================================

import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';

// Custom extensions
import { ResizableImageNode } from '../../components/notes/extensions/ResizableImageNode';
import { TweetEmbedNode } from '../../components/notes/extensions/TweetEmbedNode';
import { WikiLinkNode } from '../../components/notes/extensions/WikiLinkNode';
import { ContactMentionNode } from '../../components/notes/extensions/ContactMentionNode';
import { TopicMentionNode } from '../../components/notes/extensions/TopicMentionNode';
import { SlashCommandExtension } from './SlashCommandExtension';

// =============================================================================
// THEME COLORS
// =============================================================================

export interface EditorThemeColors {
  bg: string;
  sidebar: string;
  text: string;
  textMuted: string;
  border: string;
  hover: string;
  accent: string;
  toolbar: string;
  active: string;
}

export const getEditorThemeColors = (theme: 'light' | 'gray' | 'dark'): EditorThemeColors => {
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
    case 'gray':
      return {
        bg: '#1f2023',
        sidebar: '#17181c',
        text: '#e5e7eb',
        textMuted: '#9ca3af',
        border: '#2d2f36',
        hover: '#2d2f36',
        accent: '#6366f1',
        toolbar: '#17181c',
        active: '#3d3f46',
      };
    case 'dark':
    default:
      return {
        bg: '#0f0f10',
        sidebar: '#0a0a0b',
        text: '#f3f4f6',
        textMuted: '#9ca3af',
        border: '#1f2023',
        hover: '#1f2023',
        accent: '#6366f1',
        toolbar: '#0a0a0b',
        active: '#2d2f36',
      };
  }
};

// =============================================================================
// EXTENSION FACTORY
// =============================================================================

export interface TiptapExtensionOptions {
  /** Placeholder text for empty editor */
  placeholder?: string;
  /** Theme colors for slash command menu */
  colors: EditorThemeColors;
  /** Callback when navigating to a wiki-linked note */
  onNavigateToNote?: (noteId: string) => void;
  /** Callback when navigating to a mentioned contact */
  onNavigateToContact?: (contactId: string) => void;
  /** Callback when navigating to a topic */
  onNavigateToTopic?: (topicId: string) => void;
  /** Whether to enable slash commands */
  enableSlashCommands?: boolean;
}

/**
 * Create the TipTap extensions array with FrameLord's Notion-like configuration.
 *
 * @param options Configuration options
 * @returns Array of TipTap extensions
 */
export function createTiptapExtensions(options: TiptapExtensionOptions) {
  const {
    placeholder = 'Type "/" for commands...',
    colors,
    onNavigateToNote,
    onNavigateToContact,
    onNavigateToTopic,
    enableSlashCommands = true,
  } = options;

  const extensions = [
    // Core editing capabilities
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // These are included in StarterKit
      // - Document
      // - Paragraph
      // - Text
      // - Bold
      // - Italic
      // - Strike
      // - Code
      // - CodeBlock
      // - Blockquote
      // - BulletList
      // - OrderedList
      // - ListItem
      // - HorizontalRule
      // - HardBreak
      // - History (undo/redo)
      // - Dropcursor
      // - Gapcursor
    }),

    // Placeholder text
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),

    // Links
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-indigo-400 hover:text-indigo-300 underline cursor-pointer',
      },
    }),

    // Task lists
    TaskList,
    TaskItem.configure({
      nested: true,
    }),

    // Text highlighting
    Highlight.configure({
      multicolor: true,
    }),

    // Wiki links [[Note Title]]
    WikiLinkNode.configure({
      onNavigate: (title: string, noteId?: string) => {
        if (noteId && onNavigateToNote) {
          onNavigateToNote(noteId);
        }
      },
    }),

    // Contact mentions @Contact
    ContactMentionNode.configure({
      onNavigate: (contactId: string) => {
        if (contactId && onNavigateToContact) {
          onNavigateToContact(contactId);
        }
      },
    }),

    // Topic hashtags #Topic
    TopicMentionNode.configure({
      onNavigate: (topicId: string) => {
        if (topicId && onNavigateToTopic) {
          onNavigateToTopic(topicId);
        }
      },
    }),

    // Resizable images
    ResizableImageNode,

    // Tweet embeds (with paste-to-embed)
    TweetEmbedNode,
  ];

  // Optional slash command menu
  if (enableSlashCommands) {
    extensions.push(
      SlashCommandExtension.configure({
        colors: {
          bg: colors.bg,
          border: colors.border,
          text: colors.text,
          textMuted: colors.textMuted,
          hover: colors.hover,
          accent: colors.accent,
        },
      }) as any
    );
  }

  return extensions;
}

// =============================================================================
// EDITOR PROPS FACTORY
// =============================================================================

/**
 * Create the editorProps object for TipTap's useEditor.
 * Handles image drop/paste and other editor behaviors.
 */
export function createEditorProps(editor: any) {
  return {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-1',
    },
    handleDrop: (view: any, event: DragEvent, _slice: any, moved: boolean) => {
      if (!moved && event.dataTransfer?.files?.length) {
        const files = Array.from(event.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
          event.preventDefault();

          imageFiles.forEach(file => {
            const MAX_SIZE = 5 * 1024 * 1024; // 5MB
            if (file.size > MAX_SIZE) {
              alert(`Image "${file.name}" is too large. Maximum size is 5MB.`);
              return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl && editor) {
                const coordinates = view.posAtCoords({
                  left: event.clientX,
                  top: event.clientY,
                });

                if (coordinates) {
                  editor.chain().focus().insertContentAt(coordinates.pos, {
                    type: 'resizableImage',
                    attrs: { src: dataUrl },
                  }).run();
                } else {
                  editor.chain().focus().setResizableImage({ src: dataUrl }).run();
                }
              }
            };
            reader.readAsDataURL(file);
          });

          return true;
        }
      }
      return false;
    },
    handlePaste: (_view: any, event: ClipboardEvent, _slice: any) => {
      if (event.clipboardData?.files?.length) {
        const files = Array.from(event.clipboardData.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
          event.preventDefault();

          imageFiles.forEach(file => {
            const MAX_SIZE = 5 * 1024 * 1024;
            if (file.size > MAX_SIZE) {
              alert(`Pasted image is too large. Maximum size is 5MB.`);
              return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl && editor) {
                editor.chain().focus().setResizableImage({ src: dataUrl }).run();
              }
            };
            reader.readAsDataURL(file);
          });

          return true;
        }
      }
      return false;
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  StarterKit,
  Placeholder,
  Link,
  TaskList,
  TaskItem,
  Highlight,
  ResizableImageNode,
  TweetEmbedNode,
  WikiLinkNode,
  ContactMentionNode,
  TopicMentionNode,
  SlashCommandExtension,
};
