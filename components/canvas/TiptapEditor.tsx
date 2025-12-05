// =============================================================================
// TIPTAP EDITOR — Rich block editor for Frame Canvas nodes
// =============================================================================
// Professional block-based editor with formatting toolbar, similar to Affine/Notion.
// =============================================================================

import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Heading2, Code } from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  nodeWidth?: number;
  nodeHeight?: number;
}

export const TiptapEditor = forwardRef<
  { insertText: (text: string) => void; getEditor: () => Editor | null },
  TiptapEditorProps
>(({ content, onChange, placeholder = 'Start typing...', nodeWidth = 400, nodeHeight = 280 }, ref) => {
  // Calculate scale factor based on node size (larger nodes = larger text)
  const scaleFactor = Math.max(0.8, Math.min(1.5, nodeWidth / 400));
  const baseFontSize = 14 * scaleFactor; // Scale base font from 14px
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none p-3 min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      if (editor) {
        editor
          .chain()
          .focus()
          .insertContent(`<p><strong style="color: #818cf8;">🎤 Voice Note:</strong></p><p>${text}</p>`)
          .run();
      }
    },
    getEditor: () => editor,
  }));

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#2A2D35]/50 bg-[#12141A]/50 flex-shrink-0">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded transition-colors ${
            editor.isActive('bold') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
          }`}
          title="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded transition-colors ${
            editor.isActive('italic') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
          }`}
          title="Italic"
        >
          <Italic size={14} />
        </button>
        <div className="w-px h-4 bg-[#2A2D35]" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1 rounded transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
          }`}
          title="Heading"
        >
          <Heading2 size={14} />
        </button>
        <div className="w-px h-4 bg-[#2A2D35]" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded transition-colors ${
            editor.isActive('bulletList') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
          }`}
          title="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
          }`}
          title="Numbered List"
        >
          <ListOrdered size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1 rounded transition-colors ${
            editor.isActive('codeBlock') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2A2D35]'
          }`}
          title="Code Block"
        >
          <Code size={14} />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Dynamic Tiptap Styles */}
      <style>{`
        .ProseMirror {
          min-height: 100%;
          color: #e5e7eb;
          font-size: ${baseFontSize}px;
          line-height: 1.6;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #6b7280;
          pointer-events: none;
          height: 0;
          font-size: ${baseFontSize}px;
        }

        .ProseMirror h1 {
          font-size: ${baseFontSize * 2}px;
          font-weight: 700;
          margin: ${baseFontSize * 0.5}px 0;
          color: #f3f4f6;
          line-height: 1.3;
        }

        .ProseMirror h2 {
          font-size: ${baseFontSize * 1.5}px;
          font-weight: 600;
          margin: ${baseFontSize * 0.5}px 0;
          color: #f3f4f6;
          line-height: 1.3;
        }

        .ProseMirror h3 {
          font-size: ${baseFontSize * 1.25}px;
          font-weight: 600;
          margin: ${baseFontSize * 0.5}px 0;
          color: #f3f4f6;
          line-height: 1.3;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: ${baseFontSize * 1.5}px;
          margin: ${baseFontSize * 0.5}px 0;
        }

        .ProseMirror li {
          margin: ${baseFontSize * 0.25}px 0;
          font-size: ${baseFontSize}px;
        }

        .ProseMirror code {
          background: #1f2937;
          padding: ${baseFontSize * 0.15}px ${baseFontSize * 0.3}px;
          border-radius: ${baseFontSize * 0.2}px;
          font-family: 'Courier New', monospace;
          font-size: ${baseFontSize * 0.9}px;
          color: #a5b4fc;
        }

        .ProseMirror pre {
          background: #1f2937;
          padding: ${baseFontSize * 0.75}px;
          border-radius: ${baseFontSize * 0.5}px;
          margin: ${baseFontSize * 0.5}px 0;
          overflow-x: auto;
        }

        .ProseMirror pre code {
          background: none;
          padding: 0;
          color: #e5e7eb;
          font-size: ${baseFontSize * 0.9}px;
        }

        .ProseMirror strong {
          font-weight: 600;
          color: #f3f4f6;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror a {
          color: #818cf8;
          text-decoration: underline;
        }

        .ProseMirror p {
          margin: ${baseFontSize * 0.4}px 0;
          font-size: ${baseFontSize}px;
        }

        .ProseMirror p:first-child {
          margin-top: 0;
        }

        .ProseMirror p:last-child {
          margin-bottom: 0;
        }

        .ProseMirror blockquote {
          border-left: 3px solid #4f46e5;
          padding-left: ${baseFontSize}px;
          margin: ${baseFontSize * 0.5}px 0;
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
    </div>
  );
});

TiptapEditor.displayName = 'TiptapEditor';

export default TiptapEditor;
