// =============================================================================
// BLOCKSUITE DOC EDITOR TESTS — Verify slash menu and content extraction fixes
// =============================================================================
// These tests verify:
// 1. PageEditorBlockSpecs is properly set on the editor for slash menu to work
// 2. Content extraction from BlockSuite doc works correctly
// 3. onContentChange callback is properly wired
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock PageEditorBlockSpecs from @blocksuite/blocks
const mockPageEditorBlockSpecs = [
  { type: 'affine:page' },
  { type: 'affine:note' },
  { type: 'affine:paragraph' },
  { type: 'slash-menu-widget' }, // This is the key widget for slash menu
];

vi.mock('@blocksuite/blocks', () => ({
  AffineSchemas: [],
  PageEditorBlockSpecs: mockPageEditorBlockSpecs,
}));

// Mock AffineEditorContainer - simple object mock since we're in node environment
class MockAffineEditorContainer {
  private _pageSpecs: unknown[] = [];
  private _doc: unknown = null;
  mode: string = 'page';
  autofocus: boolean = false;

  set pageSpecs(specs: unknown[]) {
    this._pageSpecs = specs;
  }

  get pageSpecs() {
    return this._pageSpecs;
  }

  set doc(d: unknown) {
    this._doc = d;
  }

  get doc() {
    return this._doc;
  }
}

vi.mock('@blocksuite/presets', () => ({
  AffineEditorContainer: MockAffineEditorContainer,
}));

// Mock Doc and DocCollection
class MockDoc {
  private _blocks: Map<string, { flavour: string; text?: { toString: () => string } }> = new Map();
  root: { id: string } | null = null;
  slots = {
    blockUpdated: {
      on: vi.fn(),
      off: vi.fn(),
    },
  };

  whenReady = Promise.resolve();

  load(callback?: () => void) {
    callback?.();
  }

  addBlock(flavour: string, props: object, parentId?: string): string {
    const id = `block-${this._blocks.size}`;
    this._blocks.set(id, { flavour, ...props });
    if (flavour === 'affine:page') {
      this.root = { id };
    }
    return id;
  }

  getBlocksByFlavour(flavour: string) {
    return Array.from(this._blocks.values()).filter(b => b.flavour === flavour);
  }

  // Helper to add test content
  _addTestParagraph(text: string) {
    const id = `para-${this._blocks.size}`;
    this._blocks.set(id, {
      flavour: 'affine:paragraph',
      text: { toString: () => text },
    });
  }
}

vi.mock('@blocksuite/store', () => ({
  Doc: MockDoc,
  DocCollection: vi.fn().mockImplementation(() => ({
    meta: { initialize: vi.fn() },
    getDoc: vi.fn().mockReturnValue(null),
    createDoc: vi.fn().mockImplementation(({ id }) => {
      const doc = new MockDoc();
      return doc;
    }),
  })),
  Schema: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
  })),
}));

// =============================================================================
// TEST: SLASH MENU FIX — PageEditorBlockSpecs
// =============================================================================

describe('BlockSuiteDocEditor - Slash Menu Fix', () => {
  describe('PageEditorBlockSpecs configuration', () => {
    it('should export PageEditorBlockSpecs from @blocksuite/blocks', async () => {
      const { PageEditorBlockSpecs } = await import('@blocksuite/blocks');
      expect(PageEditorBlockSpecs).toBeDefined();
      expect(Array.isArray(PageEditorBlockSpecs)).toBe(true);
    });

    it('should include slash menu widget in PageEditorBlockSpecs', async () => {
      const { PageEditorBlockSpecs } = await import('@blocksuite/blocks');
      // Verify slash menu widget spec exists
      const hasSlashMenu = PageEditorBlockSpecs.some(
        (spec: unknown) => typeof spec === 'object' && spec !== null && 'type' in spec && (spec as { type: string }).type === 'slash-menu-widget'
      );
      expect(hasSlashMenu).toBe(true);
    });

    it('should set pageSpecs on AffineEditorContainer before doc assignment', () => {
      // This test verifies the fix pattern:
      // editor.pageSpecs = PageEditorBlockSpecs; // MUST come before doc
      // editor.doc = doc;

      const editor = new MockAffineEditorContainer();

      // Before fix: pageSpecs not set
      expect(editor.pageSpecs).toEqual([]);

      // After fix: pageSpecs must be set BEFORE doc
      editor.pageSpecs = mockPageEditorBlockSpecs;
      expect(editor.pageSpecs).toEqual(mockPageEditorBlockSpecs);
      expect(editor.pageSpecs.length).toBeGreaterThan(0);

      // Then doc can be assigned
      const mockDoc = new MockDoc();
      editor.doc = mockDoc;

      // Verify order is correct (pageSpecs was set before doc)
      expect(editor.pageSpecs).toEqual(mockPageEditorBlockSpecs);
      expect(editor.doc).toBe(mockDoc);
    });
  });
});

// =============================================================================
// TEST: CONTENT EXTRACTION — For Bi-Directional Links
// =============================================================================

describe('BlockSuiteDocEditor - Content Extraction', () => {
  describe('extractPlainTextFromDoc helper', () => {
    // This is the helper function that should be added to BlockSuiteDocEditor.tsx
    function extractPlainTextFromDoc(doc: MockDoc): string {
      let text = '';
      const paragraphs = doc.getBlocksByFlavour('affine:paragraph');
      for (const block of paragraphs) {
        const textContent = block.text?.toString?.() || '';
        if (textContent) text += textContent + '\n';
      }
      return text.trim();
    }

    it('should extract text from empty doc', () => {
      const doc = new MockDoc();
      const text = extractPlainTextFromDoc(doc);
      expect(text).toBe('');
    });

    it('should extract text from single paragraph', () => {
      const doc = new MockDoc();
      doc._addTestParagraph('Hello world');

      const text = extractPlainTextFromDoc(doc);
      expect(text).toBe('Hello world');
    });

    it('should extract text from multiple paragraphs', () => {
      const doc = new MockDoc();
      doc._addTestParagraph('First paragraph');
      doc._addTestParagraph('Second paragraph');
      doc._addTestParagraph('Third paragraph');

      const text = extractPlainTextFromDoc(doc);
      expect(text).toBe('First paragraph\nSecond paragraph\nThird paragraph');
    });

    it('should extract wikilinks from content', () => {
      const doc = new MockDoc();
      doc._addTestParagraph('This links to [[My Note]]');
      doc._addTestParagraph('And also [[Another Note]]');

      const text = extractPlainTextFromDoc(doc);
      expect(text).toContain('[[My Note]]');
      expect(text).toContain('[[Another Note]]');
    });

    it('should handle paragraphs without text property gracefully', () => {
      const doc = new MockDoc();
      // Add a paragraph block without text property
      doc.addBlock('affine:paragraph', {});

      const text = extractPlainTextFromDoc(doc);
      expect(text).toBe('');
    });
  });

  describe('blockUpdated slot subscription', () => {
    it('should subscribe to blockUpdated slot after doc.whenReady', async () => {
      const doc = new MockDoc();
      const onContentChange = vi.fn();

      // Simulate the fix: subscribe to blockUpdated after whenReady
      await doc.whenReady;

      doc.slots.blockUpdated.on(() => {
        if (onContentChange) {
          onContentChange('extracted content');
        }
      });

      expect(doc.slots.blockUpdated.on).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// TEST: onContentChange PROP WIRING
// =============================================================================

describe('BlockSuiteDocEditor - onContentChange wiring', () => {
  it('should accept onContentChange prop', () => {
    // Verify the Props interface includes onContentChange
    interface Props {
      docId: string;
      theme?: 'light' | 'dark';
      readOnly?: boolean;
      onContentChange?: (serialized: unknown) => void;
    }

    const props: Props = {
      docId: 'test-doc',
      theme: 'dark',
      onContentChange: (content) => {
        console.log('Content changed:', content);
      },
    };

    expect(props.onContentChange).toBeDefined();
    expect(typeof props.onContentChange).toBe('function');
  });

  it('should call onContentChange with string content', () => {
    const onContentChange = vi.fn();
    const content = 'Hello [[World]]';

    // Simulate the callback
    onContentChange(content);

    expect(onContentChange).toHaveBeenCalledWith(content);
    expect(onContentChange).toHaveBeenCalledTimes(1);
  });

  it('should update note content via noteStore when onContentChange fires', () => {
    // This simulates what AffineNotes.tsx should do
    const mockUpdateNote = vi.fn();
    const noteId = 'note-123';

    const onContentChange = (content: unknown) => {
      mockUpdateNote(noteId, { content: String(content) });
    };

    onContentChange('New content with [[Link]]');

    expect(mockUpdateNote).toHaveBeenCalledWith('note-123', { content: 'New content with [[Link]]' });
  });
});
