// =============================================================================
// BLOCKSUITE DOC EDITOR — Modern text editor like AFFiNE
// =============================================================================
// Clean dark/light editor. Matches AFFiNE styling - dark background, centered
// content, format bar appears on text selection.
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Doc, DocCollection, Schema } from '@blocksuite/store';
import { AffineSchemas, PageEditorBlockSpecs, EdgelessEditorBlockSpecs } from '@blocksuite/blocks';
import { AffineEditorContainer } from '@blocksuite/presets';
import { initializeBlockSuite } from '@/lib/blocksuite/init';
import { applyThemeToElement } from '@/lib/blocksuite/themes';
import { WikiLinkPopup } from './WikiLinkPopup';
import { getAllNotes, createNote } from '@/services/noteStore';
import { Note } from '@/types';

// Import our theme CSS
import '@/lib/blocksuite/theme.css';

interface Props {
  docId: string;
  theme?: 'light' | 'dark';
  mode?: 'page' | 'edgeless';
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

export function BlockSuiteDocEditor({ docId, theme = 'dark', mode = 'page', readOnly, onContentChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);
  const collectionRef = useRef<DocCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Wiki link popup state
  const [wikiLinkPopup, setWikiLinkPopup] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    searchQuery: string;
    bracketStartPos: number | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    searchQuery: '',
    bracketStartPos: null,
  });

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

        // CRITICAL: Start the collection (from official BlockSuite example)
        // This starts internal processes that may be required for widgets to work
        collection.start();

        collectionRef.current = collection;

        // Create or retrieve document
        let doc = collection.getDoc(docId);

        if (!doc) {
          doc = collection.createDoc({ id: docId });
        }

        // Load document and initialize structure
        // CRITICAL: Wrap callback in try/catch - errors here were being swallowed silently
        doc.load(() => {
          try {
            if (!doc) return;

            const rootId = doc.root?.id;
            if (!rootId) {
              // Initialize document structure
              console.log('[BlockSuiteDocEditor] Creating new document structure');
              const pageBlockId = doc.addBlock('affine:page', {});

              // Add surface block for edgeless mode support
              doc.addBlock('affine:surface', {}, pageBlockId);

              const noteBlockId = doc.addBlock('affine:note', {}, pageBlockId);
              doc.addBlock('affine:paragraph', {}, noteBlockId);
              console.log('[BlockSuiteDocEditor] Document structure created successfully');
            } else {
              // Document exists - ensure it has surface block for edgeless mode
              console.log('[BlockSuiteDocEditor] Document exists, checking structure');
              const surfaces = doc.getBlocksByFlavour('affine:surface');
              if (surfaces.length === 0 && doc.root) {
                doc.addBlock('affine:surface', {}, doc.root.id);
              }

              // Ensure it has at least one paragraph
              const paragraphs = doc.getBlocksByFlavour('affine:paragraph');
              if (paragraphs.length === 0) {
                const notes = doc.getBlocksByFlavour('affine:note');
                if (notes.length > 0) {
                  doc.addBlock('affine:paragraph', {}, notes[0].id);
                }
              }
            }
          } catch (loadErr) {
            console.error('[BlockSuiteDocEditor] Error in doc.load callback:', loadErr);
            // We can't call setError here directly since this is a callback
            // But we log it for debugging
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

        // Create editor with appropriate block specs
        // IMPORTANT: Always set BOTH specs so mode switching works properly
        const editor = new AffineEditorContainer();
        editor.pageSpecs = PageEditorBlockSpecs;  // REQUIRED for page mode and slash menu
        editor.edgelessSpecs = EdgelessEditorBlockSpecs;  // REQUIRED for edgeless mode
        editor.doc = doc;

        // Set initial mode
        if (mode === 'edgeless') {
          editor.mode = 'edgeless';
          console.log('[BlockSuiteDocEditor] Using edgeless mode with EdgelessEditorBlockSpecs');
        } else {
          editor.mode = 'page';
          console.log('[BlockSuiteDocEditor] Using page mode with PageEditorBlockSpecs');
        }

        // Enable autofocus - this triggers proper focus on the inline editor
        // which is REQUIRED for the slash menu dispatcher to be "active"
        (editor as any).autofocus = true;

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

        // CRITICAL: Apply theme to editor element (sets background color and CSS vars)
        // Without this, the editor has transparent background causing black screen
        applyThemeToElement(editor, theme);

        // NOTE: Do NOT manually focus elements - let autofocus=true handle it!
        // Manual focus manipulation was interfering with BlockSuite's internal focus handling.
        // The test component works WITHOUT any manual focus logic.

        // Set up MutationObserver to detect when slash menu appears (like the test)
        const slashMenuObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node instanceof HTMLElement) {
                if (node.tagName?.toLowerCase().includes('slash') ||
                    node.className?.includes('slash') ||
                    node.className?.includes('Slash')) {
                  console.log('[BlockSuiteDocEditor] ====================================');
                  console.log('[BlockSuiteDocEditor] SLASH MENU DETECTED IN DOM!');
                  console.log('[BlockSuiteDocEditor] Element:', node.tagName, node.className);
                  console.log('[BlockSuiteDocEditor] ====================================');
                }
                const slashEls = node.querySelectorAll('[class*="slash"], [class*="Slash"], affine-slash-menu');
                if (slashEls.length > 0) {
                  console.log('[BlockSuiteDocEditor] SLASH MENU CHILDREN DETECTED!', slashEls.length);
                }
              }
            }
          }
        });
        slashMenuObserver.observe(document.body, { childList: true, subtree: true });
        (container as any)._slashMenuObserver = slashMenuObserver;

        // Diagnostic logging after editor is mounted (same timing as test)
        setTimeout(() => {
          if (mounted && editorRef.current) {
            console.log('[BlockSuiteDocEditor] ====================================');
            console.log('[BlockSuiteDocEditor] DIAGNOSTICS');
            console.log('[BlockSuiteDocEditor] ====================================');
            console.log('[BlockSuiteDocEditor] Editor mode:', editorRef.current.mode);
            console.log('[BlockSuiteDocEditor] Active element:', document.activeElement);
            console.log('[BlockSuiteDocEditor] Active element tagName:', document.activeElement?.tagName);

            // Check std and dispatcher (CRITICAL - same as test)
            const std = (editorRef.current as any).std;
            console.log('[BlockSuiteDocEditor] Editor std:', std);
            if (std) {
              console.log('[BlockSuiteDocEditor] std.host:', std.host);
              const eventDispatcher = std.event;
              console.log('[BlockSuiteDocEditor] Event dispatcher:', eventDispatcher);
              console.log('[BlockSuiteDocEditor] Dispatcher.active:', eventDispatcher?.active);
              console.log('[BlockSuiteDocEditor] Dispatcher._active:', eventDispatcher?._active);
            }

            // Check for slash widget
            const slashWidget = editorRef.current.querySelector('affine-slash-menu-widget');
            console.log('[BlockSuiteDocEditor] Slash widget found:', !!slashWidget);
            if (slashWidget) {
              console.log('[BlockSuiteDocEditor] Slash widget connected:', slashWidget.isConnected);
            }

            // Check for inline editor
            const inlineEditorEl = editorRef.current.querySelector('.inline-editor');
            console.log('[BlockSuiteDocEditor] .inline-editor found:', !!inlineEditorEl);
            if (inlineEditorEl) {
              console.log('[BlockSuiteDocEditor] .inline-editor has inlineEditor:', !!(inlineEditorEl as any).inlineEditor);
            }

            console.log('[BlockSuiteDocEditor] ====================================');
          }
        }, 1000);

        // Comprehensive event logging for slash key diagnosis
        const handleKeydown = (e: KeyboardEvent) => {
          if (e.key === '/') {
            console.log('[SLASH DEBUG] keydown - key:', e.key, 'target:', (e.target as HTMLElement)?.tagName);

            // Check for slash menu popup after a short delay
            setTimeout(() => {
              // Search for any slash menu elements
              const slashMenus = document.querySelectorAll('[class*="slash"], [class*="Slash"], affine-slash-menu, .affine-slash-menu');
              console.log('[SLASH DEBUG] Slash menu elements after keydown:', slashMenus.length);
              slashMenus.forEach((el, i) => {
                const styles = window.getComputedStyle(el);
                console.log(`[SLASH DEBUG] Menu ${i}:`, {
                  tag: el.tagName,
                  display: styles.display,
                  visibility: styles.visibility,
                  opacity: styles.opacity,
                  height: styles.height,
                  zIndex: styles.zIndex,
                });
              });

              // Also check for any popup/overlay elements
              const popups = document.querySelectorAll('[class*="popup"], [class*="overlay"], [class*="menu"], [class*="suggestion"]');
              console.log('[SLASH DEBUG] Popup/overlay elements:', popups.length);
            }, 200);
          }
        };
        const handleKeypress = (e: KeyboardEvent) => {
          if (e.key === '/') {
            console.log('[SLASH DEBUG] keypress - key:', e.key);
          }
        };
        const handleInput = (e: Event) => {
          const inputEvent = e as InputEvent;
          if (inputEvent.data === '/') {
            console.log('[SLASH DEBUG] input - data:', inputEvent.data, 'inputType:', inputEvent.inputType);
          }
        };
        const handleBeforeInput = (e: Event) => {
          const inputEvent = e as InputEvent;
          if (inputEvent.data === '/') {
            console.log('[SLASH DEBUG] beforeinput - data:', inputEvent.data, 'inputType:', inputEvent.inputType);
          }
        };

        document.addEventListener('keydown', handleKeydown, true);
        document.addEventListener('keypress', handleKeypress, true);
        editor.addEventListener('input', handleInput, true);
        editor.addEventListener('beforeinput', handleBeforeInput, true);

        // Wiki link [[ detection
        const handleWikiLinkInput = (e: Event) => {
          const inputEvent = e as InputEvent;

          // Check if user typed '['
          if (inputEvent.data === '[') {
            // Get the current selection and text content
            const selection = document.getSelection();
            if (!selection || !selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const textNode = range.startContainer;

            // Check if the previous character is also '['
            if (textNode.nodeType === Node.TEXT_NODE) {
              const textContent = textNode.textContent || '';
              const cursorPos = range.startOffset;

              // Check if we just typed the second '[' (first one is at cursorPos - 2 because we just typed one)
              if (cursorPos >= 2 && textContent[cursorPos - 2] === '[') {
                // Get cursor position on screen
                const rect = range.getBoundingClientRect();

                setWikiLinkPopup({
                  isOpen: true,
                  position: { x: rect.left, y: rect.bottom + 8 },
                  searchQuery: '',
                  bracketStartPos: cursorPos - 1, // Position of first '['
                });

                console.log('[WikiLink] Detected [[, opening popup');
              }
            }
          }

          // If popup is open, update search query as user types
          if (wikiLinkPopup.isOpen) {
            const selection = document.getSelection();
            if (!selection || !selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const textNode = range.startContainer;

            if (textNode.nodeType === Node.TEXT_NODE && wikiLinkPopup.bracketStartPos !== null) {
              const textContent = textNode.textContent || '';
              const cursorPos = range.startOffset;

              // Extract text between [[ and cursor
              const query = textContent.slice(wikiLinkPopup.bracketStartPos + 1, cursorPos);

              setWikiLinkPopup(prev => ({
                ...prev,
                searchQuery: query,
              }));
            }
          }
        };

        editor.addEventListener('input', handleWikiLinkInput, true);

        // Store handlers for cleanup
        (container as any)._handlers = {
          handleKeydown,
          handleKeypress,
          handleInput,
          handleBeforeInput,
          handleWikiLinkInput,
        };

        // Basic styling to fill container
        editor.style.display = 'block';
        editor.style.width = '100%';
        editor.style.height = '100%';
        editor.style.minHeight = '100%';
        editor.setAttribute('data-mode', mode);
        editor.setAttribute('data-theme', theme);

        console.log('[BlockSuiteDocEditor] ✓ Initialized');
        setIsLoading(false);

      } catch (err) {
        console.error('[BlockSuiteDocEditor] Error:', err);
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    };

    initEditor();

    return () => {
      mounted = false;

      // Disconnect MutationObserver
      if (containerRef.current && (containerRef.current as any)._slashMenuObserver) {
        (containerRef.current as any)._slashMenuObserver.disconnect();
      }

      // Remove event listeners
      if (containerRef.current && (containerRef.current as any)._handlers) {
        const h = (containerRef.current as any)._handlers;
        document.removeEventListener('keydown', h.handleKeydown, true);
        document.removeEventListener('keypress', h.handleKeypress, true);
        if (editorRef.current) {
          editorRef.current.removeEventListener('input', h.handleInput, true);
          editorRef.current.removeEventListener('beforeinput', h.handleBeforeInput, true);
          if (h.handleWikiLinkInput) {
            editorRef.current.removeEventListener('input', h.handleWikiLinkInput, true);
          }
        }
      }

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
  }, [docId, mode, readOnly]);

  // Update editor mode when mode prop changes
  useEffect(() => {
    if (editorRef.current && mode) {
      console.log('[BlockSuiteDocEditor] Switching mode to:', mode);
      editorRef.current.mode = mode;
      editorRef.current.setAttribute('data-mode', mode);
    }
  }, [mode]);

  // Re-apply theme when theme prop changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setAttribute('data-theme', theme);
      // Re-apply full theme including background color and CSS vars
      applyThemeToElement(editorRef.current, theme);
    }
  }, [theme]);

  // Wiki link handlers
  const handleNoteSelect = (note: Note) => {
    console.log('[WikiLink] Selected note:', note.title);

    // Insert [[Note Title]] at cursor position
    const selection = document.getSelection();
    if (!selection || !selection.rangeCount) {
      setWikiLinkPopup(prev => ({ ...prev, isOpen: false }));
      return;
    }

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE && wikiLinkPopup.bracketStartPos !== null) {
      const textContent = textNode.textContent || '';
      const cursorPos = range.startOffset;

      // Replace [[ with [[Note Title]]
      const beforeBracket = textContent.slice(0, wikiLinkPopup.bracketStartPos);
      const afterCursor = textContent.slice(cursorPos);
      const noteTitle = note.title || 'Untitled';

      textNode.textContent = `${beforeBracket}[[${noteTitle}]]${afterCursor}`;

      // Move cursor after the inserted text
      const newPos = beforeBracket.length + noteTitle.length + 4; // 4 for [[ and ]]
      range.setStart(textNode, newPos);
      range.setEnd(textNode, newPos);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Close popup
    setWikiLinkPopup(prev => ({ ...prev, isOpen: false }));
  };

  const handleNoteCreate = (title: string) => {
    console.log('[WikiLink] Creating new note:', title);

    // Create the note
    const newNote = createNote({
      title,
      content: '',
      kind: 'note',
      isInbox: true,
    });

    // Insert the link
    handleNoteSelect(newNote);
  };

  const handleWikiLinkClose = () => {
    setWikiLinkPopup(prev => ({ ...prev, isOpen: false }));
  };

  // Theme colors - use explicit colors as fallback (NOT transparent)
  // Transparent caused black screen when applyThemeToElement failed
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

  // Simple full-height container - ALWAYS render this so containerRef is available
  // Show loading overlay on top while initializing
  return (
    <>
      <div
        ref={containerRef}
        className="h-full w-full relative"
        data-theme={theme}
        style={{
          background: bgColor,
          minHeight: '100%',
        }}
      >
        {/* Loading overlay - shown while editor initializes */}
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: bgColor }}
          >
            <div className="text-center">
              <div className="text-4xl mb-4 animate-pulse">📝</div>
              <p className="text-sm" style={{ color: mutedColor }}>
                Loading editor...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Wiki link popup */}
      <WikiLinkPopup
        isOpen={wikiLinkPopup.isOpen}
        position={wikiLinkPopup.position}
        searchQuery={wikiLinkPopup.searchQuery}
        notes={getAllNotes()}
        onSelect={handleNoteSelect}
        onCreate={handleNoteCreate}
        onClose={handleWikiLinkClose}
      />
    </>
  );
}

export default BlockSuiteDocEditor;
