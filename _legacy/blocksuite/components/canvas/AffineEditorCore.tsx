// =============================================================================
// AFFINE EDITOR CORE — Rich text editor for Frame Canvas nodes
// =============================================================================
// Simplified rich-text editor with contenteditable.
// Avoids BlockSuite compatibility issues while providing a good editing experience.
// =============================================================================

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import type { CanvasNode } from '../../stores/canvasStore';

interface AffineEditorCoreProps {
  node: CanvasNode;
  onContentChange: (serialized: any) => void;
  onLoad?: () => void;
}

export const AffineEditorCore = forwardRef<
  { insertText: (text: string) => void },
  AffineEditorCoreProps
>(({ node, onContentChange, onLoad }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(node.body || '');
  const saveTimeoutRef = useRef<number | null>(null);

  // Expose insertText method for transcription
  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      if (editorRef.current) {
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0
          ? selection.getRangeAt(0)
          : null;

        // Create a new paragraph with the transcribed text
        const p = document.createElement('p');
        p.innerHTML = `<strong style="color: #818cf8;">🎤 Voice Note:</strong><br/>${text.replace(/\n/g, '<br/>')}`;
        p.style.marginBottom = '12px';

        if (range && editorRef.current.contains(range.commonAncestorContainer)) {
          range.insertNode(p);
          range.collapse(false);
        } else {
          editorRef.current.appendChild(p);
        }

        // Trigger save
        handleInput();
      }
    },
  }));

  useEffect(() => {
    // Initialize content
    if (editorRef.current && !editorRef.current.innerHTML) {
      if (node.body) {
        editorRef.current.innerHTML = node.body.replace(/\n/g, '<br/>');
      } else {
        editorRef.current.innerHTML = '<p style="color: #6b7280;">Start typing...</p>';
      }
    }
    onLoad?.();
  }, [node.id]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const text = editorRef.current.textContent || '';

      setContent(html);

      // Debounce save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(() => {
        onContentChange({ text, html });
      }, 500);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Prevent rich formatting from being pasted
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      className="w-full h-full p-3 overflow-auto text-white text-sm leading-relaxed outline-none"
      style={{
        minHeight: '100%',
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
      }}
    />
  );
});

AffineEditorCore.displayName = 'AffineEditorCore';

export default AffineEditorCore;
