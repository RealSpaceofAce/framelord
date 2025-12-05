// =============================================================================
// BLOCKSUITE DOC EDITOR — Modern text editor like AFFiNE
// =============================================================================
// Clean dark/light editor. Matches AFFiNE styling - dark background, centered
// content, format bar appears on text selection.
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Doc, DocCollection, Schema } from '@blocksuite/store';
import { AffineSchemas, PageEditorBlockSpecs } from '@blocksuite/blocks';
import { AffineEditorContainer } from '@blocksuite/presets';
import { initializeBlockSuite } from '@/lib/blocksuite/init';
import { applyThemeToElement } from '@/lib/blocksuite/themes';

// Import base theme CSS
import '@/lib/blocksuite/theme.css';

interface Props {
  docId: string;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
  onContentChange?: (serialized: unknown) => void;
}

/**
 * Extract plain text from BlockSuite document for bi-directional links
 * Reads all paragraph blocks and concatenates their text content
 */
function extractPlainTextFromDoc(doc: Doc): string {
  let text = '';
  const paragraphs = doc.getBlocksByFlavour('affine:paragraph');
  for (const block of paragraphs) {
    const textContent = (block as any).text?.toString?.() || '';
    if (textContent) text += textContent + '\n';
  }
  return text.trim();
}

export function BlockSuiteDocEditor({ docId, theme = 'dark', readOnly, onContentChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);
  const collectionRef = useRef<DocCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    const container = containerRef.current;

    const initEditor = async () => {
      try {
        console.log('[BlockSuiteDocEditor] Initializing for doc:', docId);

        // Initialize BlockSuite effects
        initializeBlockSuite();

        // Create schema
        const schema = new Schema();
        schema.register(AffineSchemas);

        // Create document collection
        const collection = new DocCollection({ schema });
        collection.meta.initialize();
        collectionRef.current = collection;

        // Create or retrieve document
        let doc = collection.getDoc(docId);

        if (!doc) {
          doc = collection.createDoc({ id: docId });
        }

        // Load document and initialize structure
        doc.load(() => {
          if (!doc) return;

          const rootId = doc.root?.id;
          if (!rootId) {
            // Initialize document structure
            const pageBlockId = doc.addBlock('affine:page', {});
            const noteBlockId = doc.addBlock('affine:note', {}, pageBlockId);
            doc.addBlock('affine:paragraph', {}, noteBlockId);
          } else {
            // Document exists - ensure it has at least one paragraph
            const paragraphs = doc.getBlocksByFlavour('affine:paragraph');
            if (paragraphs.length === 0) {
              const notes = doc.getBlocksByFlavour('affine:note');
              if (notes.length > 0) {
                doc.addBlock('affine:paragraph', {}, notes[0].id);
              }
            }
          }
        });

        await doc.whenReady;

        if (!mounted) return;

        // Subscribe to content changes for bi-directional links
        if (onContentChange) {
          doc.slots.blockUpdated.on(() => {
            const content = extractPlainTextFromDoc(doc);
            onContentChange(content);
          });
        }

        // Create editor - set pageSpecs BEFORE doc for slash menu to work
        const editor = new AffineEditorContainer();
        editor.pageSpecs = PageEditorBlockSpecs;
        editor.doc = doc;
        editor.mode = 'page';
        editor.autofocus = true;

        if (readOnly) {
          try {
            (editor as any).readonly = true;
          } catch {
            // Ignore
          }
        }

        editorRef.current = editor;

        // Mount editor to container
        container.innerHTML = '';
        container.appendChild(editor);

        // Focus the editor after mounting
        setTimeout(() => {
          if (mounted && editorRef.current) {
            try {
              // Find the contenteditable paragraph (where slash menu can work)
              const paragraph = editorRef.current.querySelector('affine-paragraph [contenteditable="true"]');

              if (paragraph) {
                // Focus the contenteditable element
                (paragraph as HTMLElement).focus();

                // Set cursor to end of content
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(paragraph);
                range.collapse(false); // Collapse to end
                selection?.removeAllRanges();
                selection?.addRange(range);

                console.log('[BlockSuiteDocEditor] ✓ Focused contenteditable paragraph');
              } else {
                // Fallback: try the page root
                const pageRoot = editorRef.current.querySelector('affine-page-root');
                if (pageRoot) {
                  (pageRoot as HTMLElement).focus();
                  console.warn('[BlockSuiteDocEditor] ⚠ Used fallback: focused page-root instead of paragraph');
                }
              }
            } catch (err) {
              console.error('[BlockSuiteDocEditor] Focus error:', err);
            }
          }
        }, 200);

        // Make the editor fill the container
        editor.style.display = 'block';
        editor.style.width = '100%';
        editor.style.height = '100%';
        editor.style.minHeight = '100%';

        // Set data-mode attribute to help CSS selectors target page mode
        editor.setAttribute('data-mode', 'page');

        // Apply theme styling directly to the editor
        applyThemeToElement(editor, theme);

        // Re-apply theme after shadow roots are created
        setTimeout(() => {
          if (mounted && editorRef.current) {
            applyThemeToElement(editorRef.current, theme);
          }
        }, 100);

        // And again after a longer delay for any lazy-loaded components
        setTimeout(() => {
          if (mounted && editorRef.current) {
            applyThemeToElement(editorRef.current, theme);
          }
        }, 500);

        console.log('[BlockSuiteDocEditor] ✓ Initialized');

      } catch (err) {
        console.error('[BlockSuiteDocEditor] Error:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    initEditor();

    return () => {
      mounted = false;
      if (editorRef.current) {
        try {
          editorRef.current.remove();
        } catch {
          // Ignore
        }
        editorRef.current = null;
      }
      collectionRef.current = null;
    };
  }, [docId, readOnly]);

  // Re-apply theme when it changes
  useEffect(() => {
    if (editorRef.current) {
      applyThemeToElement(editorRef.current, theme);
    }
  }, [theme]);

  // Theme colors
  const bgColor = theme === 'light' ? '#ffffff' : '#1f1f23';
  const textColor = theme === 'light' ? '#1f2937' : '#fafafa';
  const mutedColor = theme === 'light' ? '#6b7280' : '#71717a';

  if (error) {
    return (
      <div
        className="flex items-center justify-center h-full p-8"
        style={{ background: bgColor }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-50">📝</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>
            Editor couldn't load
          </h3>
          <p className="text-sm max-w-md mb-4" style={{ color: mutedColor }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#5558e8] transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Simple full-height container - let BlockSuite handle all the styling
  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{
        background: bgColor,
        minHeight: '100%',
      }}
    />
  );
}

export default BlockSuiteDocEditor;
