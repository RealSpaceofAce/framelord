// =============================================================================
// AFFINE EDITOR — Real BlockSuite/AFFiNE editor for Canvas notes
// =============================================================================
// Uses @blocksuite/presets for simpler integration
// =============================================================================

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { CanvasNode } from '../../stores/canvasStore';
import { Doc, DocCollection, Schema } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks';
import { AffineEditorContainer } from '@blocksuite/presets';

// Import BlockSuite styles (trying different path)
// import '@blocksuite/blocks/dist/blocks.css'; // This might work or might not exist

interface AffineEditorProps {
  node: CanvasNode;
  onContentChange: (serialized: any) => void;
}

export const AffineEditor = forwardRef<
  { insertText: (text: string) => void },
  AffineEditorProps
>(({ node, onContentChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);
  const collectionRef = useRef<DocCollection | null>(null);
  const docRef = useRef<Doc | null>(null);

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      if (editorRef.current && docRef.current) {
        // Insert text into editor
        // We'll need to find the current block and insert text
        console.log('[AFFiNE] Insert text:', text);
      }
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    const container = containerRef.current;

    const initEditor = async () => {
      try {
        console.log('[AFFiNE] Initializing editor...');

        // Create schema
        const schema = new Schema();
        schema.register(AffineSchemas);

        // Create collection
        const collection = new DocCollection({ schema });
        collectionRef.current = collection;

        // Create or get doc
        const docId = node.affineDocId || `doc_${node.id}`;
        let doc = collection.getDoc(docId);

        if (!doc) {
          doc = collection.createDoc({ id: docId });
        }

        docRef.current = doc;

        // Load document
        doc.load(() => {
          if (!doc) return;

          // Check if document is empty
          const rootId = doc.root?.id;
          if (!rootId) {
            // Initialize page structure
            const pageBlockId = doc.addBlock('affine:page', {
              title: new doc.Text(node.title || ''),
            });

            doc.addBlock('affine:surface', {}, pageBlockId);

            const noteBlockId = doc.addBlock('affine:note', {}, pageBlockId);

            // Add initial content if exists
            if (node.body && node.body.trim()) {
              doc.addBlock(
                'affine:paragraph',
                {
                  text: new doc.Text(node.body),
                },
                noteBlockId
              );
            }
          }
        });

        // Wait for doc to be ready
        await doc.whenReady;

        if (!mounted) return;

        // Create editor container
        const editor = new AffineEditorContainer();
        editor.doc = doc;
        editor.mode = 'page'; // Use page mode (not edgeless)

        editorRef.current = editor;

        // Mount editor
        container.innerHTML = '';
        container.appendChild(editor);

        // Listen for changes
        doc.slots.blockUpdated.on(() => {
          try {
            const snapshot = doc.toJSON();
            onContentChange({
              snapshot,
              text: extractText(doc),
            });
          } catch (err) {
            console.warn('[AFFiNE] Failed to serialize:', err);
          }
        });

        console.log('[AFFiNE] Editor initialized successfully');

      } catch (error) {
        console.error('[AFFiNE] Initialization error:', error);

        // Show error in UI
        if (mounted && container) {
          container.innerHTML = `
            <div style="padding: 16px; color: #9ca3af;">
              <p style="margin-bottom: 8px; color: #fff; font-weight: 600;">
                BlockSuite Editor Error
              </p>
              <p style="font-size: 14px; margin-bottom: 4px;">
                Failed to initialize AFFiNE editor
              </p>
              <p style="font-size: 12px; color: #6b7280;">
                ${error instanceof Error ? error.message : String(error)}
              </p>
              <p style="font-size: 12px; margin-top: 8px; color: #6b7280;">
                Falling back to basic text display
              </p>
              <div style="margin-top: 12px; padding: 12px; background: #1f2937; border-radius: 8px; font-family: monospace; font-size: 13px;">
                ${node.body || '(empty)'}
              </div>
            </div>
          `;
        }
      }
    };

    initEditor();

    return () => {
      mounted = false;

      // Cleanup
      if (editorRef.current) {
        editorRef.current.remove();
        editorRef.current = null;
      }

      if (collectionRef.current) {
        // Note: DocCollection disposal might not be available in all versions
        // collectionRef.current.dispose();
        collectionRef.current = null;
      }
    };
  }, [node.id]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto affine-editor-root"
      style={{
        background: 'transparent',
      }}
    />
  );
});

// Helper to extract plain text from document
function extractText(doc: Doc): string {
  try {
    // This is a simplified version - would need proper traversal
    let text = '';
    const root = doc.root;
    if (root) {
      // Traverse blocks and extract text
      // This is placeholder - real implementation would traverse block tree
      text = doc.Text ? String(doc.Text) : '';
    }
    return text;
  } catch {
    return '';
  }
}

AffineEditor.displayName = 'AffineEditor';

export default AffineEditor;
