// =============================================================================
// BLOCKSUITE EDGELESS CANVAS — Infinite canvas for visual note editing
// =============================================================================
// Uses AffineEditorContainer in edgeless mode for canvas editing.
// Styled to match FrameLord's dark cyberpunk theme.
// =============================================================================

import { useEffect, useRef } from 'react';
import { Doc, DocCollection, Schema } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks';
import { AffineEditorContainer } from '@blocksuite/presets';
import { initializeBlockSuite } from '@/lib/blocksuite/init';

// Import theme CSS
import '@/lib/blocksuite/theme.css';

interface Props {
  canvasId: string;
}

export function BlockSuiteEdgelessCanvas({ canvasId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);
  const collectionRef = useRef<DocCollection | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    const container = containerRef.current;

    const initEditor = async () => {
      try {
        console.log('[BlockSuiteCanvas] Initializing for canvas:', canvasId);

        // Wait a bit for container to have dimensions
        await new Promise(resolve => setTimeout(resolve, 50));

        const { offsetWidth, offsetHeight } = container;
        console.log('[BlockSuiteCanvas] Container dimensions:', offsetWidth, 'x', offsetHeight);

        if (offsetWidth === 0 || offsetHeight === 0) {
          console.warn('[BlockSuiteCanvas] Container has zero dimensions, waiting more...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Initialize BlockSuite effects (shared, only runs once globally)
        initializeBlockSuite();

        // Create schema with all Affine block types
        const schema = new Schema();
        schema.register(AffineSchemas);

        // Create document collection
        const collection = new DocCollection({ schema });
        collection.meta.initialize(); // Required before creating docs
        collectionRef.current = collection;

        // Create or retrieve document
        const docId = `canvas_${canvasId}`;
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

        // Apply dark theme styles directly to editor
        applyDarkThemeStyles(editor);

        console.log('[BlockSuiteCanvas] ✓ Initialized successfully');
      } catch (error) {
        console.error('[BlockSuiteCanvas] Error:', error);
        if (mounted && container) {
          container.innerHTML = `
            <div class="canvas-error">
              <div class="canvas-error-icon">🎨</div>
              <p class="canvas-error-title">Canvas Loading</p>
              <p class="canvas-error-message">${error instanceof Error ? error.message : String(error)}</p>
              <p class="canvas-error-hint">Try refreshing the page or switching views</p>
            </div>
          `;
        }
      }
    };

    initEditor();

    return () => {
      mounted = false;
      if (editorRef.current) {
        try {
          editorRef.current.remove();
        } catch (e) {
          console.warn('[BlockSuiteCanvas] Cleanup warning:', e);
        }
        editorRef.current = null;
      }
      collectionRef.current = null;
    };
  }, [canvasId]);

  return (
    <div
      ref={containerRef}
      className="blocksuite-canvas-editor"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        background: '#000000',
        backgroundImage: 'radial-gradient(circle, rgba(0, 67, 255, 0.15) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }}
    />
  );
}

/**
 * Apply dark theme styles directly to the editor element.
 * Uses FrameLord brand palette: Pure black #000000, blue #0043ff
 */
function applyDarkThemeStyles(editor: AffineEditorContainer) {
  const style = editor.style;

  // Background colors - PURE BLACK (brand palette)
  style.setProperty('--affine-background-primary-color', '#000000');
  style.setProperty('--affine-background-secondary-color', '#000000');
  style.setProperty('--affine-background-tertiary-color', '#0a0a0a');
  style.setProperty('--affine-background-overlay-panel-color', 'rgba(0, 0, 0, 0.98)');
  style.setProperty('--affine-background-modal-color', '#000000');

  // Text colors - high contrast
  style.setProperty('--affine-text-primary-color', '#ffffff');
  style.setProperty('--affine-text-secondary-color', '#a1a1aa');
  style.setProperty('--affine-edgeless-text-color', '#ffffff');
  style.setProperty('--affine-placeholder-color', '#52525b');

  // Border colors - brand palette
  style.setProperty('--affine-border-color', '#1c1c1c');
  style.setProperty('--affine-divider-color', '#1c1c1c');

  // Brand colors - blue #0043ff
  style.setProperty('--affine-primary-color', '#0043ff');
  style.setProperty('--affine-brand-color', '#0043ff');

  // Grid - blue tint
  style.setProperty('--affine-edgeless-grid-color', 'rgba(0, 67, 255, 0.15)');

  // Direct styling
  style.background = '#000000';
  style.color = '#ffffff';
}

// Add component styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  /* BlockSuite Canvas Editor Styles - FrameLord brand palette */
  .blocksuite-canvas-editor {
    --affine-background-primary-color: #000000;
    --affine-text-primary-color: #ffffff;
    --affine-primary-color: #0043ff;
    --affine-edgeless-grid-color: rgba(0, 67, 255, 0.15);
  }

  .blocksuite-canvas-editor affine-editor-container {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 400px !important;
    background: #000000 !important;
  }

  /* Error state styling */
  .canvas-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 300px;
    padding: 32px;
    text-align: center;
    color: #a1a1aa;
  }

  .canvas-error-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .canvas-error-title {
    font-size: 18px;
    font-weight: 600;
    color: #fafafa;
    margin-bottom: 8px;
  }

  .canvas-error-message {
    font-size: 14px;
    color: #71717a;
    max-width: 400px;
    margin-bottom: 8px;
  }

  .canvas-error-hint {
    font-size: 12px;
    color: #52525b;
  }
`;

// Inject styles if not already present
if (!document.querySelector('#blocksuite-canvas-editor-styles')) {
  styleSheet.id = 'blocksuite-canvas-editor-styles';
  document.head.appendChild(styleSheet);
}

export default BlockSuiteEdgelessCanvas;
