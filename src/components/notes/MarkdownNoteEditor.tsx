// =============================================================================
// MARKDOWN NOTE EDITOR — Simple Tiptap-based editor for notes
// =============================================================================
// Clean, minimal markdown editor replacing BlockSuite for v1
// - Rich text editing with Tiptap
// - Theme-aware styling
// - Auto-save on blur
// =============================================================================

import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Link as LinkIcon,
  Highlighter,
  Undo,
  Redo,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface MarkdownNoteEditorProps {
  /** Initial content (HTML) */
  content: string;
  /** Called when content changes */
  onContentChange: (content: string) => void;
  /** Current theme */
  theme: 'light' | 'gray' | 'dark';
  /** Placeholder text */
  placeholder?: string;
  /** Optional callback when navigating to a linked note */
  onNavigateToNote?: (noteId: string) => void;
}

// =============================================================================
// THEME COLORS
// =============================================================================

const getThemeColors = (theme: 'light' | 'gray' | 'dark') => {
  switch (theme) {
    case 'light':
      return {
        bg: '#ffffff',
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
// COMPONENT
// =============================================================================

export const MarkdownNoteEditor: React.FC<MarkdownNoteEditorProps> = ({
  content,
  onContentChange,
  theme,
  placeholder = 'Start writing...',
  onNavigateToNote,
}) => {
  const colors = getThemeColors(theme);

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
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-1',
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
  });

  // Sync content when it changes externally (e.g., switching notes)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  // Handle link clicks for wiki-links
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
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

  useEffect(() => {
    const editorElement = document.querySelector('.ProseMirror');
    if (editorElement) {
      editorElement.addEventListener('click', handleClick as EventListener);
      return () => editorElement.removeEventListener('click', handleClick as EventListener);
    }
  }, [handleClick, editor]);

  if (!editor) {
    return (
      <div className="animate-pulse h-40 rounded" style={{ background: colors.hover }} />
    );
  }

  // Toolbar button component
  const ToolbarButton = ({
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
        color: isActive ? colors.accent : colors.textMuted,
      }}
      title={title}
    >
      <Icon size={16} />
    </button>
  );

  const Separator = () => (
    <div className="w-px h-5 mx-1" style={{ background: colors.border }} />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-2 py-1.5 border-b sticky top-0 z-10 flex-wrap"
        style={{ background: colors.toolbar, borderColor: colors.border }}
      >
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          icon={Undo}
          title="Undo"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          icon={Redo}
          title="Redo"
        />

        <Separator />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={Bold}
          title="Bold (Cmd+B)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={Italic}
          title="Italic (Cmd+I)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          icon={Strikethrough}
          title="Strikethrough"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          icon={Highlighter}
          title="Highlight"
        />

        <Separator />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          icon={Heading1}
          title="Heading 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          icon={Heading2}
          title="Heading 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          icon={Heading3}
          title="Heading 3"
        />

        <Separator />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={List}
          title="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={ListOrdered}
          title="Numbered List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          icon={CheckSquare}
          title="Task List"
        />

        <Separator />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          icon={Quote}
          title="Quote"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          icon={Code}
          title="Code Block"
        />
        <ToolbarButton
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

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <EditorContent editor={editor} />
      </div>

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
      `}</style>
    </div>
  );
};

export default MarkdownNoteEditor;
