// =============================================================================
// BLOCKSUITE SLASH MENU TEST — Minimal official example to verify slash menu
// =============================================================================
// This is a near-verbatim implementation of the official BlockSuite example
// to determine if the slash menu works AT ALL in this environment.
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { DocCollection, Schema } from '@blocksuite/store';
import { AffineSchemas, PageEditorBlockSpecs } from '@blocksuite/blocks';
import { AffineEditorContainer } from '@blocksuite/presets';
import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import { effects as presetsEffects } from '@blocksuite/presets/effects';

// =============================================================================
// EFFECTS INITIALIZATION — Must happen once before any BlockSuite usage
// =============================================================================
let effectsInitialized = false;

function initEffects() {
  if (effectsInitialized) return;
  try {
    console.log('[BS_TEST] Initializing BlockSuite effects...');
    blocksEffects();
    presetsEffects();
    effectsInitialized = true;
    console.log('[BS_TEST] Effects initialized successfully');
  } catch (err) {
    if (err instanceof Error && err.message.includes('custom elements')) {
      console.log('[BS_TEST] Custom elements already registered (OK)');
      effectsInitialized = true;
    } else {
      throw err;
    }
  }
}

// =============================================================================
// SLASH MENU OBSERVER — Detect when slash menu appears in DOM
// =============================================================================
function observeSlashMenu(): () => void {
  console.log('[BS_TEST] Setting up slash menu observer...');

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          // Check for slash menu popup
          if (node.tagName?.toLowerCase().includes('slash') ||
              node.className?.includes('slash') ||
              node.className?.includes('Slash')) {
            console.log('[BS_TEST] ====================================');
            console.log('[BS_TEST] SLASH MENU DETECTED IN DOM!');
            console.log('[BS_TEST] Element:', node);
            console.log('[BS_TEST] Tag:', node.tagName);
            console.log('[BS_TEST] Classes:', node.className);
            console.log('[BS_TEST] ====================================');
          }

          // Also check children for slash menu
          const slashEls = node.querySelectorAll('[class*="slash"], [class*="Slash"], affine-slash-menu');
          if (slashEls.length > 0) {
            console.log('[BS_TEST] ====================================');
            console.log('[BS_TEST] SLASH MENU CHILDREN DETECTED!');
            console.log('[BS_TEST] Elements:', slashEls);
            console.log('[BS_TEST] ====================================');
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}

// =============================================================================
// MAIN TEST COMPONENT
// =============================================================================
export function BlockSuiteSlashTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    let cleanupObserver: (() => void) | null = null;

    const setup = async () => {
      try {
        // Step 1: Initialize effects (registers web components)
        initEffects();
        setStatus('Effects initialized');

        // Step 2: Create schema and register AffineSchemas
        console.log('[BS_TEST] Creating schema...');
        const schema = new Schema();
        schema.register(AffineSchemas);
        setStatus('Schema created');

        // Step 3: Create DocCollection (the official way)
        console.log('[BS_TEST] Creating DocCollection...');
        const collection = new DocCollection({
          schema,
          id: 'bs-test-collection',
        });
        collection.meta.initialize();

        // IMPORTANT: Start the collection (from official example)
        collection.start();
        setStatus('Collection started');

        // Step 4: Create a document
        console.log('[BS_TEST] Creating document...');
        const doc = collection.createDoc({ id: 'bs-test-doc' });
        doc.load(() => {
          // Initialize document structure: page > note > paragraph
          const pageBlockId = doc.addBlock('affine:page', {});
          const noteBlockId = doc.addBlock('affine:note', {}, pageBlockId);
          doc.addBlock('affine:paragraph', {}, noteBlockId);
        });
        await doc.whenReady;
        setStatus('Document ready');

        if (!mounted) return;

        // Step 5: Create editor container
        console.log('[BS_TEST] Creating AffineEditorContainer...');
        const editor = new AffineEditorContainer();

        // CRITICAL: Set pageSpecs BEFORE setting doc (contains slash menu widget)
        editor.pageSpecs = PageEditorBlockSpecs;
        console.log('[BS_TEST] PageEditorBlockSpecs applied, length:', PageEditorBlockSpecs.length);

        editor.doc = doc;
        editor.mode = 'page';

        // Enable autofocus - this triggers proper focus on the inline editor
        (editor as any).autofocus = true;

        // Expose for debugging
        (window as any).$bsTestEditor = editor;
        (window as any).$bsTestDoc = doc;
        (window as any).$bsTestCollection = collection;

        editorRef.current = editor;
        setStatus('Editor created');

        // Step 6: Mount to DOM
        console.log('[BS_TEST] Mounting editor to DOM...');
        containerRef.current!.innerHTML = '';
        containerRef.current!.appendChild(editor);

        // Step 7: Set up slash menu observer
        cleanupObserver = observeSlashMenu();

        // Step 8: Add keydown listener for / key with detailed dispatcher diagnostics
        const handleKeydown = (e: KeyboardEvent) => {
          if (e.key === '/') {
            console.log('[BS_TEST] ====================================');
            console.log('[BS_TEST] "/" KEY PRESSED - DIAGNOSING');
            console.log('[BS_TEST] ====================================');
            console.log('[BS_TEST] Event target:', e.target);
            console.log('[BS_TEST] Event target tagName:', (e.target as HTMLElement)?.tagName);
            console.log('[BS_TEST] Active element:', document.activeElement);
            console.log('[BS_TEST] Active element tagName:', document.activeElement?.tagName);

            // Check dispatcher state
            const std = (editor as any).std;
            const eventDispatcher = std?.event;
            console.log('[BS_TEST] Dispatcher:', eventDispatcher);
            console.log('[BS_TEST] Dispatcher.active:', eventDispatcher?.active);
            console.log('[BS_TEST] Dispatcher._active:', eventDispatcher?._active);

            // Check if host is correct
            const host = std?.host;
            console.log('[BS_TEST] Host (EditorHost):', host);
            console.log('[BS_TEST] Host connected:', host?.isConnected);

            // Check if target is inside host
            if (host && e.target instanceof Node) {
              console.log('[BS_TEST] Target is inside host:', host.contains(e.target));
            }

            // Check for slash menu widget
            const slashWidget = editor.querySelector('affine-slash-menu-widget');
            console.log('[BS_TEST] Slash widget exists:', !!slashWidget);

            // Check if slash widget is connected
            if (slashWidget) {
              console.log('[BS_TEST] Slash widget connected:', slashWidget.isConnected);
              console.log('[BS_TEST] Slash widget std:', (slashWidget as any).std);
              console.log('[BS_TEST] Slash widget host:', (slashWidget as any).host);
            }

            // Check for inline editor
            const inlineEditorEl = editor.querySelector('.inline-editor');
            console.log('[BS_TEST] .inline-editor found:', !!inlineEditorEl);
            if (inlineEditorEl) {
              console.log('[BS_TEST] .inline-editor has inlineEditor:', !!(inlineEditorEl as any).inlineEditor);
            }

            // Check after a delay if slash menu appeared
            setTimeout(() => {
              const slashMenus = document.querySelectorAll(
                'affine-slash-menu, [class*="slash-menu"], [class*="SlashMenu"]'
              );
              console.log('[BS_TEST] Slash menu elements in DOM:', slashMenus.length);
              if (slashMenus.length > 0) {
                console.log('[BS_TEST] SUCCESS: Slash menu found!');
              } else {
                console.log('[BS_TEST] FAILURE: No slash menu found');
              }
            }, 300);
            console.log('[BS_TEST] ====================================');
          }
        };
        document.addEventListener('keydown', handleKeydown, true);

        // Step 9: Log final diagnostics
        setTimeout(() => {
          if (mounted && editor) {
            console.log('[BS_TEST] ====================================');
            console.log('[BS_TEST] FINAL DIAGNOSTICS');
            console.log('[BS_TEST] ====================================');
            console.log('[BS_TEST] Editor mode:', editor.mode);
            console.log('[BS_TEST] Editor doc:', editor.doc);
            console.log('[BS_TEST] Active element:', document.activeElement);
            console.log('[BS_TEST] Editor host:', editor.host);

            // Check std and dispatcher
            const std = (editor as any).std;
            console.log('[BS_TEST] Editor std:', std);
            if (std) {
              console.log('[BS_TEST] std.host:', std.host);
              const eventDispatcher = std.event;
              console.log('[BS_TEST] Event dispatcher:', eventDispatcher);
              console.log('[BS_TEST] Dispatcher active:', eventDispatcher?.active);
            }

            // Check for inline-editor
            const inlineEditor = editor.querySelector('.inline-editor');
            console.log('[BS_TEST] .inline-editor found:', !!inlineEditor);
            if (inlineEditor) {
              console.log('[BS_TEST] Has inlineEditor prop:', !!(inlineEditor as any).inlineEditor);
            }

            // Check for slash widget
            const slashWidget = editor.querySelector('affine-slash-menu-widget');
            console.log('[BS_TEST] affine-slash-menu-widget found:', !!slashWidget);

            // Check for EditorHost
            const editorHost = editor.querySelector('editor-host');
            console.log('[BS_TEST] editor-host found:', !!editorHost);

            // Check for page-editor
            const pageEditor = editor.querySelector('page-editor');
            console.log('[BS_TEST] page-editor found:', !!pageEditor);

            console.log('[BS_TEST] ====================================');
            console.log('[BS_TEST] TEST READY - Click in editor and type "/" to test');
            console.log('[BS_TEST] ====================================');
          }
        }, 1000);

        setStatus('READY - Click in editor and type "/" to test');

        return () => {
          document.removeEventListener('keydown', handleKeydown, true);
        };

      } catch (err) {
        console.error('[BS_TEST] Setup error:', err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus('ERROR');
      }
    };

    setup();

    return () => {
      mounted = false;
      if (cleanupObserver) cleanupObserver();
      if (editorRef.current) {
        try {
          editorRef.current.remove();
        } catch {}
        editorRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#1a1a1e',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333',
        background: '#2a2a2e',
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>BlockSuite Slash Menu Test</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#888' }}>
          Status: <span style={{ color: error ? '#ff6b6b' : '#6bff6b' }}>{status}</span>
        </p>
        {error && (
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#ff6b6b' }}>
            Error: {error}
          </p>
        )}
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
          Instructions: Click in the editor area below and type "/" to test the slash menu.
          Check browser console for detailed logs prefixed with [BS_TEST].
        </p>
      </div>

      {/* Editor Container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#fff',
          color: '#000',
        }}
      />
    </div>
  );
}

export default BlockSuiteSlashTest;
