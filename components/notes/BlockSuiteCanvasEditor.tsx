// =============================================================================
// BLOCKSUITE CANVAS EDITOR — Canvas editor with floating minimal toolbar
// =============================================================================
// Combines BlockSuite edgeless canvas with custom floating NoteCanvasToolbar.
// Supports light/dark theme. All custom FrameLord components.
// =============================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Doc, DocCollection, Schema } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks';
import { AffineEditorContainer } from '@blocksuite/presets';
import { initializeBlockSuite } from '@/lib/blocksuite/init';
import { applyThemeToElement } from '@/lib/blocksuite/themes';
import { NoteCanvasToolbar, type CanvasTool, type ShapeType } from './NoteCanvasToolbar';

// Import theme CSS
import '@/lib/blocksuite/theme.css';

interface Props {
  docId: string;
  theme?: 'light' | 'dark';
  onContentChange?: (serialized: unknown) => void;
}

export function BlockSuiteCanvasEditor({ docId, theme = 'dark', onContentChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);
  const collectionRef = useRef<DocCollection | null>(null);

  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [zoom, setZoom] = useState(100);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);

  // Initialize the BlockSuite editor
  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    const container = containerRef.current;

    const initEditor = async () => {
      try {
        console.log('[BlockSuiteCanvasEditor] Initializing for doc:', docId);

        // Initialize BlockSuite effects (shared, only runs once globally)
        initializeBlockSuite();

        // Create schema with all Affine block types
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

        // Load document and initialize edgeless structure if empty
        doc.load(() => {
          if (!doc) return;

          const rootId = doc.root?.id;
          if (!rootId) {
            // Initialize with page > surface structure for edgeless mode
            const pageBlockId = doc.addBlock('affine:page', {});
            doc.addBlock('affine:surface', {}, pageBlockId);
          }
        });

        // Wait for document to be ready
        await doc.whenReady;

        if (!mounted) return;

        // Create editor container in edgeless mode
        const editor = new AffineEditorContainer();
        editor.doc = doc;
        editor.mode = 'edgeless';

        editorRef.current = editor;

        // Clear and mount editor
        container.innerHTML = '';
        container.appendChild(editor);

        // Apply theme
        applyThemeToElement(editor, theme);

        // Make editor fill container
        editor.style.display = 'block';
        editor.style.width = '100%';
        editor.style.height = '100%';
        editor.style.minHeight = '100%';

        // Hide the default BlockSuite toolbar
        hideDefaultToolbar();

        // Set up selection change listener
        setupSelectionListener(editor);

        setIsReady(true);
        console.log('[BlockSuiteCanvasEditor] ✓ Initialized successfully');

      } catch (err) {
        console.error('[BlockSuiteCanvasEditor] Error:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    initEditor();

    return () => {
      mounted = false;
      if (editorRef.current) {
        try {
          editorRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
        editorRef.current = null;
      }
      collectionRef.current = null;
    };
  }, [docId]);

  // Re-apply theme when it changes
  useEffect(() => {
    if (editorRef.current) {
      applyThemeToElement(editorRef.current, theme);
    }
  }, [theme]);

  // Handle tool changes
  const handleToolChange = useCallback((tool: CanvasTool) => {
    setActiveTool(tool);

    if (!editorRef.current) return;

    try {
      // Access the edgeless root service
      const host = editorRef.current.host;
      if (!host || !host.std) {
        console.warn('[BlockSuiteCanvasEditor] Host or std not available');
        return;
      }

      const rootService = host.std.get('affine:page');
      if (!rootService) {
        console.warn('[BlockSuiteCanvasEditor] Root service not found');
        return;
      }

      // Access the tool controller
      const toolController = (rootService as any).tool;
      if (!toolController || !toolController.setTool) {
        console.warn('[BlockSuiteCanvasEditor] Tool controller not available');
        return;
      }

      console.log('[BlockSuiteCanvasEditor] Switching to tool:', tool);

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
      console.error('[BlockSuiteCanvasEditor] Error setting tool:', e);
    }
  }, []);

  // Handle shape creation with specific shape type
  const handleShapeCreate = useCallback((shapeType: ShapeType) => {
    if (!editorRef.current) return;

    try {
      const host = editorRef.current.host;
      if (!host || !host.std) return;

      const rootService = host.std.get('affine:page');
      const toolController = (rootService as any)?.tool;

      if (toolController && toolController.setTool) {
        console.log('[BlockSuiteCanvasEditor] Setting shape type:', shapeType);
        toolController.setTool({ type: 'shape', shapeType });
      }
    } catch (e) {
      console.error('[BlockSuiteCanvasEditor] Error setting shape type:', e);
    }
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!editorRef.current) return;

    try {
      // Convert file to data URL
      const dataUrl = await fileToDataURL(file);

      // Insert image into canvas
      const editor = editorRef.current;
      const doc = editor.doc;

      if (doc) {
        // Find the surface block
        const surfaces = doc.getBlocksByFlavour('affine:surface');
        if (surfaces.length > 0) {
          const surface = surfaces[0];

          // Create image block on canvas at center
          const viewport = getViewport();
          const centerX = viewport?.centerX || 0;
          const centerY = viewport?.centerY || 0;

          doc.addBlock('affine:image', {
            sourceId: dataUrl,
            xywh: `[${centerX - 100},${centerY - 100},200,200]`,
          }, surface.id);

          console.log('[BlockSuiteCanvasEditor] Image uploaded to canvas');
        }
      }
    } catch (e) {
      console.error('[BlockSuiteCanvasEditor] Failed to upload image:', e);
    }
  }, []);

  // Set up selection change listener
  const setupSelectionListener = useCallback((editor: AffineEditorContainer) => {
    try {
      const host = editor.host;
      if (!host || !host.std) return;

      const edgelessService = host.std.get('affine:page');
      if (!edgelessService) return;

      // Listen for selection changes
      const selectionManager = (edgelessService as any)?.selection;
      if (selectionManager) {
        selectionManager.slots?.changed?.on(() => {
          const selected = selectionManager.selectedIds || [];
          setSelectedElements(selected);
          console.log('[BlockSuiteCanvasEditor] Selection changed:', selected);
        });
      }
    } catch (e) {
      console.warn('[BlockSuiteCanvasEditor] Could not set up selection listener:', e);
    }
  }, []);

  // Get viewport helper
  const getViewport = useCallback(() => {
    if (!editorRef.current) return null;

    try {
      const host = editorRef.current.host;
      if (!host || !host.std) return null;

      const edgelessService = host.std.get('affine:page');
      return (edgelessService as any)?.viewport || null;
    } catch (e) {
      console.warn('[BlockSuiteCanvasEditor] Could not get viewport:', e);
      return null;
    }
  }, []);

  // Handle zoom change
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);

    const viewport = getViewport();
    if (viewport && viewport.setZoom) {
      // Convert percentage to zoom factor (100% = 1.0)
      const zoomFactor = newZoom / 100;
      viewport.setZoom(zoomFactor);
      console.log('[BlockSuiteCanvasEditor] Zoom set to:', zoomFactor);
    }
  }, [getViewport]);

  // Theme-based colors
  const bgColor = theme === 'light' ? '#f9fafb' : '#1f1f23';
  const textColor = theme === 'light' ? '#1f2937' : '#fafafa';
  const mutedColor = theme === 'light' ? '#6b7280' : '#71717a';

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ background: bgColor }}>
        <div className="text-center p-8">
          <div className="text-4xl mb-4 opacity-50">🎨</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>
            Canvas couldn't load
          </h3>
          <p className="text-sm max-w-md mb-4" style={{ color: mutedColor }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#5558e8] transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" style={{ background: bgColor }}>
      {/* Canvas container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ background: bgColor }}
      />

      {/* Floating Toolbar - always visible at bottom-left */}
      <NoteCanvasToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onShapeCreate={handleShapeCreate}
        onImageUpload={handleImageUpload}
        zoom={zoom}
        onZoomChange={handleZoomChange}
      />
    </div>
  );
}

/**
 * Hide the default BlockSuite toolbar.
 */
function hideDefaultToolbar() {
  const styleId = 'hide-blocksuite-default-toolbar';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Hide default BlockSuite toolbars - we use custom FrameLord toolbar */
      .affine-edgeless-toolbar,
      edgeless-toolbar,
      .edgeless-toolbar-container,
      affine-edgeless-zoom-toolbar,
      .affine-edgeless-zoom-toolbar,
      .edgeless-toolbar-widget-container {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* Keep format bar visible but themed */
      .affine-format-bar-widget,
      affine-format-bar-widget {
        background: var(--affine-background-modal-color, #1f1f23) !important;
        border: 1px solid var(--affine-border-color, #27272a) !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Convert a file to a data URL.
 */
async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default BlockSuiteCanvasEditor;
