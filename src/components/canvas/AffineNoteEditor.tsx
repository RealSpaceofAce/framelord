// =============================================================================
// AFFINE NOTE EDITOR — Real AFFiNE/BlockSuite editor for Canvas nodes
// =============================================================================
// Uses BlockSuite framework - the actual AFFiNE editor
// =============================================================================

import React, { useRef } from 'react';
import type { CanvasNode } from '../../stores/canvasStore';
import { AffineEditor } from './AffineEditor';

interface AffineNoteEditorProps {
  node: CanvasNode;
  onContentChange: (serialized: any) => void;
}

export const AffineNoteEditor = React.forwardRef<
  { insertText: (text: string) => void },
  AffineNoteEditorProps
>(({ node, onContentChange }, ref) => {
  const editorRef = useRef<{ insertText: (text: string) => void } | null>(null);

  // Expose insertText for mic transcription
  React.useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      if (editorRef.current) {
        editorRef.current.insertText(text);
      }
    },
  }));

  return (
    <div className="w-full h-full">
      <AffineEditor
        ref={editorRef}
        node={node}
        onContentChange={onContentChange}
      />
    </div>
  );
});

AffineNoteEditor.displayName = 'AffineNoteEditor';

export default AffineNoteEditor;
