// =============================================================================
// BLOCKSUITE DOC EDITOR — Modern text editor like AFFiNE
// =============================================================================
// Clean dark/light editor. Matches AFFiNE styling - dark background, centered
// content, format bar appears on text selection.
// =============================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Doc, DocCollection, Schema } from '@blocksuite/store';
import {
  AffineSchemas,
  PageEditorBlockSpecs,
  EdgelessEditorBlockSpecs,
  LinkedDocIcon,
  NewDocIcon,
  insertLinkedNode,
} from '@blocksuite/blocks';
import { AffineEditorContainer } from '@blocksuite/presets';
import { ConfigExtension } from '@blocksuite/block-std';
import { html } from 'lit';
import { initializeBlockSuite } from '@/lib/blocksuite/init';
import { applyThemeToElement } from '@/lib/blocksuite/themes';
import { getAllNotes, createNote } from '@/services/noteStore';
import type { Note } from '@/types';
import { NoteCanvasToolbar, CanvasTool, ShapeType } from './NoteCanvasToolbar';

// Custom linked-doc widget configuration using our noteStore
// This makes [[ and @ show notes from our app, not BlockSuite's internal docs
function createNoteStoreLinkedDocConfig(currentDocId: string) {
  console.log('[LinkedDocConfig] Creating config for docId:', currentDocId);

  return ConfigExtension('affine:page', {
    linkedWidget: {
      // CRITICAL: Specify trigger keys - default is only '@', we want '[[' too
      triggerKeys: ['@', '[['],
      convertTriggerKey: true, // Convert [[ to @ for internal processing
      getMenus: (
        query: string,
        abort: () => void,
        editorHost: any,
        inlineEditor: any,
        abortSignal?: AbortSignal
      ) => {
        try {
          console.log('[LinkedDocConfig] getMenus CALLED, query:', query);

          // Get notes from our store
          const notes = getAllNotes();
          const filteredNotes = notes
            .filter(n => n.id !== currentDocId) // Exclude current note
            .filter(n => {
              const title = n.title || 'Untitled';
              return title.toLowerCase().includes(query.toLowerCase());
            });

          const MAX_DOCS = 6;

          // Get the collection from the editor host to create docs for linking
          const collection = editorHost?.doc?.collection;
          console.log('[LinkedDocConfig] Collection available:', !!collection);

          // Helper function to ensure a doc exists in the collection and insert a linked reference
          // We need to delete the trigger text (@ or [[) + query before inserting the link
          const insertLinkedReference = (noteId: string, noteTitle: string) => {
            if (!collection) {
              console.error('[LinkedDocConfig] No collection available');
              return;
            }

            // Check if doc already exists in collection
            let targetDoc = collection.getDoc(noteId);

            if (!targetDoc) {
              // Create the doc in the collection so the reference works
              console.log('[LinkedDocConfig] Creating doc in collection:', noteId, noteTitle);
              targetDoc = collection.createDoc({ id: noteId });

              // Initialize the doc structure
              targetDoc.load(() => {
                if (!targetDoc) return;
                const pageBlockId = targetDoc.addBlock('affine:page', { title: new targetDoc.Text(noteTitle) });
                targetDoc.addBlock('affine:surface', {}, pageBlockId);
                const noteBlockId = targetDoc.addBlock('affine:note', {}, pageBlockId);
                targetDoc.addBlock('affine:paragraph', {}, noteBlockId);
              });
            }

            // CRITICAL: Delete the trigger text + query BEFORE inserting the link
            // This prevents duplicates and keeps the link inline
            try {
              const inlineRange = inlineEditor.getInlineRange?.();
              if (!inlineRange) {
                console.error('[LinkedDocConfig] No inline range');
                return;
              }

              const yText = inlineEditor.yText;
              const fullText = yText.toString();
              const cursorIndex = inlineRange.index;

              // Look backwards from cursor to find what trigger was used
              // Could be @ or [[ (with possible conversion to @)
              // We need to find and delete: triggerKey + query

              // First check for @query pattern (either direct @ or converted [[)
              const possibleTriggers = ['@', '[['];
              let deleteLength = 0;
              let deleteStart = cursorIndex;

              for (const trigger of possibleTriggers) {
                const expectedStart = cursorIndex - trigger.length - query.length;
                if (expectedStart >= 0) {
                  const textAtPosition = fullText.slice(expectedStart, cursorIndex);
                  const expectedText = trigger + query;

                  console.log('[LinkedDocConfig] Checking trigger:', trigger, 'expected:', expectedText, 'actual:', textAtPosition);

                  if (textAtPosition === expectedText) {
                    deleteStart = expectedStart;
                    deleteLength = expectedText.length;
                    console.log('[LinkedDocConfig] Found matching trigger pattern');
                    break;
                  }
                }
              }

              // If we couldn't find an exact match, try to find just the query
              // (in case trigger was already removed by widget)
              if (deleteLength === 0 && query.length > 0) {
                const queryStart = cursorIndex - query.length;
                if (queryStart >= 0) {
                  const textAtQuery = fullText.slice(queryStart, cursorIndex);
                  if (textAtQuery === query) {
                    deleteStart = queryStart;
                    deleteLength = query.length;
                    console.log('[LinkedDocConfig] Found query without trigger:', query);
                  }
                }
              }

              console.log('[LinkedDocConfig] Cursor at:', cursorIndex, 'Delete from:', deleteStart, 'Length:', deleteLength);

              if (deleteLength > 0) {
                // Delete the trigger + query text
                inlineEditor.deleteText({ index: deleteStart, length: deleteLength });

                // Set cursor to the deletion point
                inlineEditor.setInlineRange({ index: deleteStart, length: 0 });

                // Now insert the linked node at the cleaned position
                insertLinkedNode({
                  inlineEditor,
                  docId: noteId,
                });

                console.log('[LinkedDocConfig] ✓ Inserted linked reference to:', noteTitle);
              } else {
                // If we can't find what to delete, just insert at cursor
                // This handles edge cases where the text is already clean
                console.warn('[LinkedDocConfig] No trigger/query to delete, inserting at cursor');
                insertLinkedNode({
                  inlineEditor,
                  docId: noteId,
                });
              }
            } catch (e) {
              console.error('[LinkedDocConfig] Error inserting linked reference:', e);
            }
          };

          // Create "Link to existing note" menu group
          const linkToNoteGroup = {
            name: 'Link to Note',
            items: filteredNotes.slice(0, MAX_DOCS).map(note => ({
              key: note.id,
              name: note.title || 'Untitled',
              icon: LinkedDocIcon,
              action: () => {
                // CRITICAL: Save cursor position BEFORE abort() which might move it
                const savedRange = inlineEditor.getInlineRange?.();
                abort();
                // Restore cursor position after abort
                if (savedRange) {
                  inlineEditor.setInlineRange(savedRange);
                }
                insertLinkedReference(note.id, note.title || 'Untitled');
              },
            })),
            maxDisplay: MAX_DOCS,
            overflowText: filteredNotes.length > MAX_DOCS
              ? `${filteredNotes.length - MAX_DOCS} more notes`
              : undefined,
          };

          // Create "New Note" menu group
          const docName = query || 'Untitled';
          const displayName = docName.length > 8 ? docName.slice(0, 8) + '..' : docName;

          const newNoteGroup = {
            name: 'New',
            items: [
              {
                key: 'create-page',
                name: `New "${displayName}" page`,
                icon: NewDocIcon,
                action: () => {
                  // CRITICAL: Save cursor position BEFORE abort() which might move it
                  const savedRange = inlineEditor.getInlineRange?.();
                  abort();
                  // Restore cursor position after abort
                  if (savedRange) {
                    inlineEditor.setInlineRange(savedRange);
                  }
                  // Create a new note in our store
                  const newNote = createNote({
                    title: query || 'Untitled',
                    content: '',
                    kind: 'note',
                    preferredView: 'doc',
                  });
                  // Insert linked reference (creates doc in collection too)
                  insertLinkedReference(newNote.id, newNote.title || 'Untitled');
                  // Dispatch event to refresh notes list in sidebar
                  window.dispatchEvent(new CustomEvent('notes-refresh'));
                  console.log('[LinkedDocConfig] Created note:', newNote.title);
                },
              },
              {
                key: 'create-edgeless',
                name: `New "${displayName}" edgeless`,
                icon: html`<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3h14v14H3V3zm1 1v12h12V4H4z"/></svg>`,
                action: () => {
                  // CRITICAL: Save cursor position BEFORE abort() which might move it
                  const savedRange = inlineEditor.getInlineRange?.();
                  abort();
                  // Restore cursor position after abort
                  if (savedRange) {
                    inlineEditor.setInlineRange(savedRange);
                  }
                  // Create a new edgeless note in our store
                  const newNote = createNote({
                    title: query || 'Untitled',
                    content: '',
                    kind: 'note',
                    preferredView: 'canvas',
                  });
                  // Insert linked reference (creates doc in collection too)
                  insertLinkedReference(newNote.id, newNote.title || 'Untitled');
                  // Dispatch event to refresh notes list in sidebar
                  window.dispatchEvent(new CustomEvent('notes-refresh'));
                  console.log('[LinkedDocConfig] Created edgeless note:', newNote.title);
                },
              },
            ],
          };

          return Promise.resolve([linkToNoteGroup, newNoteGroup]);
        } catch (error) {
          console.error('[LinkedDocConfig] ERROR in getMenus:', error);
          throw error;
        }
      },
    },
  });
}

// Import our theme CSS
import '@/lib/blocksuite/theme.css';

interface Props {
  docId: string;
  theme?: 'light' | 'gray' | 'dark';
  mode?: 'page' | 'edgeless';
  readOnly?: boolean;
  onContentChange?: (serialized: unknown) => void;
  onNavigateToNote?: (noteId: string) => void;
}

/**
 * Extract plain text from BlockSuite document for bi-directional links
 * Reads all paragraph blocks and concatenates their text content
 * Also extracts [[linked-note-title]] markers and [link:noteId] for bi-directional link detection
 */
function extractPlainTextFromDoc(doc: Doc): string {
  let text = '';
  const linkedDocIds: string[] = [];

  const paragraphs = doc.getBlocksByFlavour('affine:paragraph');
  for (const block of paragraphs) {
    const blockAny = block as any;
    const textContent = blockAny.text?.toString?.() || '';
    if (textContent) text += textContent + '\n';

    // Also check for linked doc references (affine-reference format)
    // These are stored in the text's deltas as attributes
    if (blockAny.text?.deltas) {
      try {
        const deltas = blockAny.text.deltas();
        for (const delta of deltas) {
          if (delta.attributes?.reference?.pageId) {
            // Get the linked note ID and title
            const linkedNoteId = delta.attributes.reference.pageId;
            if (!linkedDocIds.includes(linkedNoteId)) {
              linkedDocIds.push(linkedNoteId);
            }
            const linkedNote = getAllNotes().find(n => n.id === linkedNoteId);
            if (linkedNote?.title) {
              text += ` [[${linkedNote.title}]] `;
            }
            // Also add ID reference for reliable detection
            text += ` [link:${linkedNoteId}] `;
          }
        }
      } catch (e) {
        // Ignore delta extraction errors
      }
    }
  }

  // Append linked doc IDs at the end for reliable backlink detection
  if (linkedDocIds.length > 0) {
    text += `\n[linkedDocs:${linkedDocIds.join(',')}]`;
  }

  return text.trim();
}

export function BlockSuiteDocEditor({ docId, theme = 'dark', mode = 'page', readOnly, onContentChange, onNavigateToNote }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);
  const collectionRef = useRef<DocCollection | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null); // Separate ref for BlockSuite - React won't touch this
  const onNavigateToNoteRef = useRef(onNavigateToNote); // Ref to always access latest callback
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Canvas toolbar state
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [zoom, setZoom] = useState(100);
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helper function to find and hide white dots
  const hideWhiteDots = (editor: HTMLElement) => {
    // This function is now empty as per previous steps, but kept for structure
  };
  
  // Standalone helper function for applying text colors and hiding dots
  const forceTextColorsAndHideDots = (editor: AffineEditorContainer, theme: 'light' | 'gray' | 'dark') => {
    // All caret, text, and placeholder styling is now handled by global CSS (theme.css)
    // This function is now primarily responsible for hiding specific UI artifacts like "white dots"
    hideWhiteDots(editor);
  };

  // Helper: Convert file to data URL
  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper: Get viewport for zoom/pan operations
  const getViewport = useCallback(() => {
    if (!editorRef.current) return null;
    try {
      const host = editorRef.current.host;
      if (!host || !host.std) return null;
      // Cast to any to avoid TypeScript issues with BlockSuite internal APIs
      const edgelessService = (host.std as any).get('affine:page');
      return edgelessService?.viewport || null;
    } catch (e) {
      console.warn('[Canvas] Could not get viewport:', e);
      return null;
    }
  }, []);

  // Helper: Get tool controller for tool switching
  const getToolController = useCallback(() => {
    if (!editorRef.current) return null;
    try {
      const host = editorRef.current.host;
      if (!host || !host.std) return null;
      // Cast to any to avoid TypeScript issues with BlockSuite internal APIs
      const rootService = (host.std as any).get('affine:page');
      return rootService?.tool || null;
    } catch (e) {
      console.warn('[Canvas] Could not get tool controller:', e);
      return null;
    }
  }, []);

  // Canvas toolbar handlers - WIRED TO BLOCKSUITE API
  const handleToolChange = useCallback((tool: CanvasTool) => {
    setActiveTool(tool);

    const toolController = getToolController();
    if (!toolController || !toolController.setTool) {
      console.warn('[Canvas] Tool controller not available');
      return;
    }

    console.log('[Canvas] Switching to tool:', tool);

    try {
      switch (tool) {
        case 'select':
          toolController.setTool({ type: 'default' });
          break;
        case 'text':
          toolController.setTool({ type: 'text' });
          break;
        case 'shape':
          // Default to rect - specific shape will be set via handleShapeCreate
          toolController.setTool({ type: 'shape', shapeType: 'rect' });
          break;
        case 'connector':
          toolController.setTool({ type: 'connector', mode: 'straight' });
          break;
        case 'brush':
          toolController.setTool({ type: 'brush' });
          break;
        case 'pan':
          toolController.setTool({ type: 'pan' });
          break;
      }
    } catch (e) {
      console.error('[Canvas] Error setting tool:', e);
    }
  }, [getToolController]);

  const handleShapeCreate = useCallback((shapeType: ShapeType) => {
    const toolController = getToolController();
    if (!toolController || !toolController.setTool) {
      console.warn('[Canvas] Tool controller not available for shape');
      return;
    }

    console.log('[Canvas] Setting shape type:', shapeType);

    try {
      toolController.setTool({ type: 'shape', shapeType });
      setActiveTool('shape');
    } catch (e) {
      console.error('[Canvas] Error setting shape type:', e);
    }
  }, [getToolController]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editorRef.current) return;

    console.log('[Canvas] Uploading image:', file.name);

    try {
      // Convert file to data URL
      const dataUrl = await fileToDataURL(file);

      // Get the document
      const editor = editorRef.current;
      const doc = editor.doc;

      if (doc) {
        // Find the surface block
        const surfaces = doc.getBlocksByFlavour('affine:surface');
        if (surfaces.length > 0) {
          const surface = surfaces[0];

          // Get viewport center for positioning
          const viewport = getViewport();
          const centerX = viewport?.centerX || 400;
          const centerY = viewport?.centerY || 300;

          // Create image block on canvas at center
          doc.addBlock('affine:image', {
            sourceId: dataUrl,
            xywh: `[${centerX - 100},${centerY - 100},200,200]`,
          }, surface.id);

          console.log('[Canvas] Image uploaded to canvas');
        } else {
          console.warn('[Canvas] No surface block found');
        }
      }
    } catch (e) {
      console.error('[Canvas] Failed to upload image:', e);
    }
  }, [getViewport]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);

    const viewport = getViewport();
    if (viewport && viewport.setZoom) {
      // Convert percentage to zoom factor (100% = 1.0)
      const zoomFactor = newZoom / 100;
      viewport.setZoom(zoomFactor);
      console.log('[Canvas] Zoom set to:', zoomFactor);
    } else {
      console.log('[Canvas] Zoom UI updated to:', newZoom);
    }
  }, [getViewport]);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    console.log('[Canvas] Color changed to:', color);
    // Note: Color will be applied when creating new shapes
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const newValue = !prev;
      console.log('[Canvas] Fullscreen toggled:', newValue);
      // Actually toggle fullscreen using browser API
      if (newValue) {
        containerRef.current?.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      return newValue;
    });
  }, []);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onNavigateToNoteRef.current = onNavigateToNote;
  }, [onNavigateToNote]);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current || !editorContainerRef.current) {
      return;
    }

    let mounted = true;
    const editorContainer = editorContainerRef.current;

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
        collection.start();

        collectionRef.current = collection;

        // Create or retrieve document
        let doc = collection.getDoc(docId);

        if (!doc) {
          doc = collection.createDoc({ id: docId });
        }

        // Load document and initialize structure
        doc.load(() => {
          try {
            if (!doc) return;

            const rootId = doc.root?.id;
            if (!rootId) {
              console.log('[BlockSuiteDocEditor] Creating new document structure');
              const pageBlockId = doc.addBlock('affine:page', {});
              doc.addBlock('affine:surface', {}, pageBlockId);
              const noteBlockId = doc.addBlock('affine:note', {}, pageBlockId);
              doc.addBlock('affine:paragraph', {}, noteBlockId);
            } else {
              const surfaces = doc.getBlocksByFlavour('affine:surface');
              if (surfaces.length === 0 && doc.root) {
                doc.addBlock('affine:surface', {}, doc.root.id);
              }
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
          }
        });

        // Wait for doc to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!mounted) return;

        // Subscribe to content changes
        if (onContentChange) {
          // Debounce utility within the component's scope to delay onContentChange
          const debounce = (func: Function, delay: number) => {
            let timeout: ReturnType<typeof setTimeout>;
            return (...args: any[]) => {
              clearTimeout(timeout);
              timeout = setTimeout(() => func(...args), delay);
            };
          };

          const debouncedOnContentChange = debounce((content: unknown) => {
            onContentChange(content);
          }, 300); // Debounce by 300ms

          doc.slots.blockUpdated.on(() => {
            const content = extractPlainTextFromDoc(doc);
            debouncedOnContentChange(content);
          });
        }

        // Create editor with custom linked-doc config
        const editor = new AffineEditorContainer();
        editor.doc = doc;

        const linkedDocConfig = createNoteStoreLinkedDocConfig(docId);
        editor.pageSpecs = [...PageEditorBlockSpecs, linkedDocConfig];
        editor.edgelessSpecs = [...EdgelessEditorBlockSpecs, linkedDocConfig];

        editor.mode = mode;
        (editor as any).autofocus = true;

        if (readOnly) {
          try {
            (editor as any).readonly = true;
          } catch {
            // Ignore
          }
        }

        editorRef.current = editor;

        // Mount editor
        editorContainer.innerHTML = '';
        editorContainer.appendChild(editor);

        // Apply theme
        applyThemeToElement(editor, theme);

        // Focus the editor to show cursor
        setTimeout(() => {
          if (editor.host) {
            editor.host.focus();
            // Also try to focus the first paragraph
            const paragraph = editor.host.querySelector('[data-block-id] [contenteditable="true"]');
            if (paragraph instanceof HTMLElement) {
              paragraph.focus();
            }
          }
        }, 100);



        forceTextColorsAndHideDots(editor, theme, hideWhiteDots);



        // Add .can-link-doc class for widget detection
        const addCanLinkDocClass = () => {
          if (!mounted || !editorRef.current) return;

          const addClassToElement = (el: Element) => {
            if (el.tagName.toLowerCase() === 'rich-text' || el.tagName.toLowerCase() === 'affine-paragraph') {
              el.classList.add('can-link-doc');
            }
            if ((el as any).shadowRoot) {
              (el as any).shadowRoot.querySelectorAll('rich-text, affine-paragraph').forEach((child: Element) => {
                child.classList.add('can-link-doc');
              });
            }
          };

          editorRef.current.querySelectorAll('rich-text, affine-paragraph').forEach(addClassToElement);

          const processShadowRoots = (element: Element) => {
            if ((element as any).shadowRoot) {
              (element as any).shadowRoot.querySelectorAll('rich-text, affine-paragraph').forEach((el: Element) => {
                el.classList.add('can-link-doc');
                processShadowRoots(el);
              });
            }
          };
          editorRef.current.querySelectorAll('*').forEach(processShadowRoots);
        };

        addCanLinkDocClass();
        setTimeout(addCanLinkDocClass, 200);
        setTimeout(addCanLinkDocClass, 500);
        setTimeout(addCanLinkDocClass, 1000);

        // NOTE: Manual keydown handler REMOVED - the linkedWidget.getMenus config
        // handles wiki link triggering automatically via triggerKeys: ['@', '[[']
        // Having both causes duplicate menus to appear.

        // Wiki link click handler
        const handleWikiLinkClick = (e: MouseEvent) => {
          if (!onNavigateToNoteRef.current) return;

          const target = e.target as HTMLElement;

          // Check for BlockSuite affine-reference element
          const referenceEl = target.closest('affine-reference');
          if (referenceEl) {
            const model = (referenceEl as any).model;
            const docId = model?.reference || (referenceEl as any).reference || referenceEl.getAttribute('reference');

            if (docId) {
              console.log('[WikiLink] Clicked affine-reference, navigating to note:', docId);
              onNavigateToNoteRef.current(docId);
              e.preventDefault();
              e.stopPropagation();
              return;
            }

            const delta = (referenceEl as any).delta;
            if (delta?.attributes?.reference?.pageId) {
              const pageId = delta.attributes.reference.pageId;
              console.log('[WikiLink] Clicked affine-reference (delta), navigating to note:', pageId);
              onNavigateToNoteRef.current(pageId);
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }

          // Check styled wiki link span
          if (target.hasAttribute && target.hasAttribute('data-wiki-link')) {
            const noteId = target.getAttribute('data-note-id');
            if (noteId) {
              onNavigateToNoteRef.current(noteId);
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }
        };

        editor.addEventListener('click', handleWikiLinkClick, true);

        // Listen for custom insert text event from Little Lord
        const handleInsertText = (e: Event) => {
          const customEvent = e as CustomEvent;
          const { text, noteId } = customEvent.detail;

          if (noteId !== docId) return;

          console.log('[BlockSuiteDocEditor] Inserting text from Little Lord:', text);

          const paragraphs = doc.getBlocksByFlavour('affine:paragraph');
          let targetParagraph: any = paragraphs[paragraphs.length - 1];

          if (!targetParagraph) {
            const notes = doc.getBlocksByFlavour('affine:note');
            if (notes.length > 0) {
              const paragraphId = doc.addBlock('affine:paragraph', {}, notes[0].id);
              targetParagraph = doc.getBlockById(paragraphId) as any;
            }
          }

          if (targetParagraph) {
            const existingText = (targetParagraph as any).text?.toString() || '';
            const newText = existingText ? `${existingText}\n\n${text}` : text;

            if ((targetParagraph as any).text?.insert) {
              (targetParagraph as any).text.clear();
              (targetParagraph as any).text.insert(newText, 0);
            }
          }
        };

        window.addEventListener('blocksuite-insert-text', handleInsertText);

        // Store handlers for cleanup
        (editorContainer as any)._handlers = {
          handleWikiLinkClick,
          handleInsertText,
        };

        // Styling - edgeless mode needs explicit dimensions
        editor.style.display = 'block';
        editor.style.width = '100%';
        editor.style.height = mode === 'edgeless' ? '100%' : 'auto';
        editor.style.minHeight = mode === 'edgeless' ? '600px' : '100%';
        editor.setAttribute('data-mode', mode);
        editor.setAttribute('data-theme', theme);

        // CRITICAL: Set CSS variable on editor element to remove internal side padding
        // This must be set directly on the element to penetrate Shadow DOM
        editor.style.setProperty('--affine-editor-side-padding', '0px');
        editor.style.setProperty('padding', '0');
        editor.style.setProperty('margin', '0');

        // For edgeless mode, add special class for CSS targeting
        if (mode === 'edgeless') {
          editor.classList.add('blocksuite-edgeless-mode');
        }

        // Force remove padding from internal elements after mount
        const removePaddingFromShadow = () => {
          const removeStyles = (root: ShadowRoot | HTMLElement) => {
            const selectors = [
              '.affine-note-block-container',
              'affine-note',
              '.affine-block-children-container',
              'affine-paragraph',
              '.affine-paragraph-block-container',
              '.affine-page-viewport',
              '.affine-doc-viewport'
            ];
            selectors.forEach(sel => {
              root.querySelectorAll(sel).forEach((el: Element) => {
                (el as HTMLElement).style.setProperty('padding-left', '0', 'important');
                (el as HTMLElement).style.setProperty('margin-left', '0', 'important');
                (el as HTMLElement).style.setProperty('--affine-editor-side-padding', '0px', 'important');
              });
            });
            // Recurse into shadow roots
            root.querySelectorAll('*').forEach((el: Element) => {
              if ((el as any).shadowRoot) {
                removeStyles((el as any).shadowRoot);
              }
            });
          };
          if ((editor as any).shadowRoot) {
            removeStyles((editor as any).shadowRoot);
          }
          removeStyles(editor);
        };

        // Run immediately and after delays to catch late-rendering elements
        removePaddingFromShadow();
        setTimeout(removePaddingFromShadow, 100);
        setTimeout(removePaddingFromShadow, 500);
        setTimeout(removePaddingFromShadow, 1000);

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

      if (editorContainerRef.current && (editorContainerRef.current as any)._handlers) {
        const h = (editorContainerRef.current as any)._handlers;
        if (h.handleInsertText) {
          window.removeEventListener('blocksuite-insert-text', h.handleInsertText);
        }
        if (editorRef.current && h.handleWikiLinkClick) {
          editorRef.current.removeEventListener('click', h.handleWikiLinkClick, true);
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
      const editor = editorRef.current;

      // Update mode
      editor.mode = mode;
      editor.setAttribute('data-mode', mode);

      // Update sizing for edgeless mode
      editor.style.height = mode === 'edgeless' ? '100%' : 'auto';
      editor.style.minHeight = mode === 'edgeless' ? '600px' : '100%';

      // Toggle edgeless class
      if (mode === 'edgeless') {
        editor.classList.add('blocksuite-edgeless-mode');
      } else {
        editor.classList.remove('blocksuite-edgeless-mode');
      }

      editor.requestUpdate();
    }
  }, [mode]);

  // Re-apply theme when theme prop changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setAttribute('data-theme', theme);
      applyThemeToElement(editorRef.current, theme);
    }

    document.body.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
  }, [theme]);

  // CRITICAL: Use #0A0A0A for dark mode (matches brand palette)
  const bgColor = theme === 'light' ? '#ffffff' : '#000000';
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

  return (
    <>
      <div
        ref={containerRef}
        className="h-full w-full relative"
        data-theme={theme}
        data-mode={mode}
        style={{
          background: bgColor,
          minHeight: mode === 'edgeless' ? '600px' : '100%',
          height: mode === 'edgeless' ? '100%' : 'auto',
        }}
      >
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
        <div
          ref={editorContainerRef}
          className="h-full w-full"
          style={{
            display: isLoading ? 'none' : 'block',
            height: mode === 'edgeless' ? '100%' : 'auto',
            minHeight: mode === 'edgeless' ? '600px' : 'auto',
          }}
        />
        {/* Canvas toolbar - only show in edgeless mode */}
        {mode === 'edgeless' && !isLoading && (
          <NoteCanvasToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            onShapeCreate={handleShapeCreate}
            onImageUpload={handleImageUpload}
            zoom={zoom}
            onZoomChange={handleZoomChange}
            selectedColor={selectedColor}
            onColorChange={handleColorChange}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />
        )}
      </div>
    </>
  );
}

export default BlockSuiteDocEditor;
