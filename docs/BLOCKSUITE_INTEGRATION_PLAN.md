# BlockSuite Integration Plan for FrameLord

**Created:** 2025-12-04
**Status:** Planning Phase
**Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Integration Architecture](#integration-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Technical Specifications](#technical-specifications)
6. [Risk Assessment](#risk-assessment)
7. [Testing Strategy](#testing-strategy)
8. [Migration Path](#migration-path)

---

## Executive Summary

### Goal
Replace FrameLord's current canvas and note editing systems with BlockSuite while preserving:
- Contact-centric data architecture
- Local-first storage model
- Dark neon/cyberpunk branding
- All existing features and workflows

### Scope
- **In Scope:**
  - Frame Canvas → BlockSuite Edgeless Canvas
  - Notes Module → BlockSuite Page Editor
  - Canvas Note Nodes → BlockSuite Note Blocks
  - Dark theme customization
  - Data migration from existing formats

- **Out of Scope:**
  - Pricing, credits, Little Lord features
  - Admin panels and usage analytics
  - Backend API development
  - Real-time collaboration (Y.js setup)
  - Multi-user authentication

### Success Criteria
- ✅ `npm run dev` works without errors
- ✅ `npm run build` succeeds with zero TypeScript errors
- ✅ All canvas features functional (draw, connect, scan)
- ✅ All note features functional (edit, link, attach)
- ✅ Dark theme matches existing branding
- ✅ Data persists correctly via localStorage
- ✅ Contact spine remains intact

---

## Current State Analysis

### Existing Canvas Implementation

**Technology Stack:**
- **React-Konva** for drawing layer (shapes, arrows, lines)
- **DOM overlay** for rich-text note cards
- **Hybrid rendering** with synchronized transforms

**Data Model:**
```typescript
// canvasStore.ts
CanvasThread {
  id, title, nodeIds[], connectionIds[], view: {zoom, offsetX, offsetY}
}

CanvasNode {
  id, canvasId, title, x, y, width, height,
  affineDocId?, affineSerialized?,  // ← BlockSuite integration
  body?,                             // ← Plain text fallback
  contactId?, noteId?
}

CanvasConnection {
  id, canvasId, sourceNodeId, targetNodeId
}
```

**Current BlockSuite Usage:**
- `AffineEditor.tsx` (206 lines) - BlockSuite wrapper for canvas nodes
- Uses `@blocksuite/store` v0.19.5
- Editor mode: `'page'` (NOT edgeless)
- Serialization: `node.affineSerialized`

**Limitations:**
- ⚠️ Using outdated BlockSuite APIs
- ⚠️ No proper CSS imports (relying on defaults)
- ⚠️ Error handling shows fallback textarea
- ⚠️ Limited text insertion for voice transcription

### Existing Notes Implementation

**Technology Stack:**
- Plain `<textarea>` for editing
- Custom markdown renderer
- Obsidian-style `[[wikilinks]]`
- Bullet-based entries with attachments

**Data Model:**
```typescript
// types.ts
Note {
  id, contactId, authorContactId,
  title?, content,                  // ← Markdown string
  entries: NoteEntry[],
  attachments: NoteAttachment[],
  isPinned, createdAt, updatedAt,
  tags?
}

NoteEntry {
  id, text, attachments, createdAt
}
```

**Features:**
- Wikilink autocomplete (`WikilinkAutocomplete.tsx`)
- Topic extraction from `[[Topic]]` syntax
- Backlink graph (forward + backward links)
- Contact mentions via `@contactName`
- Voice recording with transcription
- Image/audio/file attachments

**Storage:**
- In-memory only (NOT persisted to localStorage)
- Mock data for development

### Contact Spine Architecture

**Philosophy:**
> "All data attaches to Contacts. No orphan content."

**Key Patterns:**
- Every note has `contactId` (about) and `authorContactId` (CONTACT_ZERO)
- Canvas nodes optionally link to contacts
- Tasks, interactions, projects all reference contacts
- No entity exists in isolation

**Critical Constraint:**
> BlockSuite integration MUST preserve contact relationships

---

## Integration Architecture

### Three-Layer Approach

```
┌─────────────────────────────────────────────┐
│  UI Layer (React Components)                │
│  - FrameCanvasPage                          │
│  - NotesView, NoteDocumentView              │
│  - BlockSuite editor components             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  BlockSuite Integration Layer               │
│  lib/blocksuite/                            │
│  - blockSuiteManager.ts                     │
│  - documentSerializer.ts                    │
│  - themeProvider.ts                         │
│  - types.ts                                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Data Layer (Stores)                        │
│  - canvasStore.ts                           │
│  - noteStore.ts                             │
│  - dailyNoteStore.ts                        │
│  - localStorage persistence                 │
└─────────────────────────────────────────────┘
```

### BlockSuite Integration Layer API

**Core Module:** `lib/blocksuite/blockSuiteManager.ts`

```typescript
// Document lifecycle
export function createOrLoadDoc(
  kind: 'note' | 'canvas' | 'daily-note',
  id: string,
  serialized?: SerializedBlockSuiteDoc
): Doc;

export function saveDoc(doc: Doc): SerializedBlockSuiteDoc;

export function deleteDoc(docId: string): void;

// Content migration
export function migrateMarkdownToBlockSuite(
  markdown: string
): SerializedBlockSuiteDoc;

export function migratePlainTextToBlockSuite(
  text: string
): SerializedBlockSuiteDoc;

// Schema management
export function getEditorSchema(): Schema;

export function initializeCollection(): DocCollection;
```

**Serialization Module:** `lib/blocksuite/documentSerializer.ts`

```typescript
export interface SerializedBlockSuiteDoc {
  version: string;           // BlockSuite version
  blocks: any[];             // Block tree
  meta: {
    id: string;
    kind: 'note' | 'canvas' | 'daily-note';
    createdAt: string;
    updatedAt: string;
  };
}

export function serialize(doc: Doc): SerializedBlockSuiteDoc;

export function deserialize(
  data: SerializedBlockSuiteDoc,
  collection: DocCollection
): Doc;
```

**Theme Module:** `lib/blocksuite/themeProvider.ts`

```typescript
export function applyFrameLordTheme(
  editorContainer: AffineEditorContainer
): void;

export const FRAMELORD_BLOCKSUITE_CSS: string;
```

### Unified Data Model

**Enhanced CanvasNode:**
```typescript
interface CanvasNode {
  // Existing fields
  id: string;
  canvasId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // BlockSuite content (NEW - canonical)
  blockSuiteDoc: SerializedBlockSuiteDoc;

  // Legacy fallback (deprecated)
  body?: string;
  affineDocId?: string;
  affineSerialized?: any;

  // Contact spine
  contactId?: string;
  noteId?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

**Enhanced Note:**
```typescript
interface Note {
  // Existing fields
  id: string;
  contactId: string;
  authorContactId: string;
  title?: string;
  tags?: string[];
  isPinned: boolean;

  // BlockSuite content (NEW - canonical)
  blockSuiteDoc: SerializedBlockSuiteDoc;

  // Legacy content (deprecated, for migration)
  content?: string;
  entries?: NoteEntry[];

  // Attachments (preserved)
  attachments: NoteAttachment[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

**Canvas Thread (for Edgeless):**
```typescript
interface CanvasThread {
  id: string;
  title: string;

  // BlockSuite Edgeless doc (NEW)
  blockSuiteDoc: SerializedBlockSuiteDoc;

  // Legacy Konva data (deprecated)
  nodeIds?: string[];
  connectionIds?: string[];

  // View state
  view: {
    zoom: number;
    offsetX: number;
    offsetY: number;
  };

  // Contact spine
  contactId?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

---

## Implementation Phases

### Phase 0: Preparation & Validation (Week 1)

**Objectives:**
- Audit current BlockSuite installation
- Identify breaking changes in latest version
- Set up testing infrastructure

**Tasks:**

1. **Package Audit**
   ```bash
   npm outdated @blocksuite/*
   npm info @blocksuite/presets versions
   ```
   - Check for security vulnerabilities
   - Review changelog for breaking changes
   - Decide on version upgrade path

2. **Vite Configuration Review**
   - Read [components/canvas/FrameCanvas.tsx:1-100](components/canvas/FrameCanvas.tsx#L1-L100)
   - Identify CSS import issues
   - Fix Vite optimizeDeps configuration

3. **Test Current Integration**
   ```bash
   npm run dev
   # Create canvas node, test editor
   npm run build
   # Check for errors
   ```

4. **Documentation Setup**
   - Create `docs/BLOCKSUITE_MIGRATION.md`
   - Create `docs/BLOCKSUITE_TROUBLESHOOTING.md`

**Deliverables:**
- ✅ Clean dev server startup
- ✅ Clean production build
- ✅ Documented current state

---

### Phase 1: BlockSuite Integration Layer (Week 2)

**Objectives:**
- Create reusable BlockSuite abstraction
- Implement serialization/deserialization
- Build theme customization

**Tasks:**

1. **Create Integration Module Structure**
   ```bash
   mkdir -p lib/blocksuite
   ```

   Files to create:
   - `lib/blocksuite/index.ts` - Public API exports
   - `lib/blocksuite/blockSuiteManager.ts` - Core lifecycle
   - `lib/blocksuite/documentSerializer.ts` - Persistence
   - `lib/blocksuite/themeProvider.ts` - Dark theme
   - `lib/blocksuite/types.ts` - TypeScript definitions
   - `lib/blocksuite/constants.ts` - Configuration

2. **Implement Document Manager**

   ```typescript
   // lib/blocksuite/blockSuiteManager.ts

   import { DocCollection, Schema, Doc } from '@blocksuite/store';
   import { AffineSchemas } from '@blocksuite/blocks';

   let globalCollection: DocCollection | null = null;

   export function initializeCollection(): DocCollection {
     if (globalCollection) return globalCollection;

     const schema = new Schema();
     schema.register(AffineSchemas);

     globalCollection = new DocCollection({ schema });
     return globalCollection;
   }

   export function createOrLoadDoc(
     kind: 'note' | 'canvas' | 'daily-note',
     id: string,
     serialized?: SerializedBlockSuiteDoc
   ): Doc {
     const collection = initializeCollection();

     // Check if doc already exists
     let doc = collection.getDoc(id);
     if (doc) return doc;

     // Create new doc
     doc = collection.createDoc({ id });

     if (serialized) {
       // Deserialize existing content
       deserializeIntoDoc(doc, serialized);
     } else {
       // Initialize empty doc
       initializeEmptyDoc(doc, kind);
     }

     return doc;
   }

   function initializeEmptyDoc(doc: Doc, kind: string): void {
     const pageBlockId = doc.addBlock('affine:page', {
       title: new doc.Text('')
     });

     if (kind === 'canvas') {
       // Edgeless mode needs surface
       doc.addBlock('affine:surface', {}, pageBlockId);
     }

     // Add default note block
     const noteBlockId = doc.addBlock('affine:note', {}, pageBlockId);

     // Add empty paragraph
     doc.addBlock('affine:paragraph', {
       text: new doc.Text('')
     }, noteBlockId);
   }
   ```

3. **Implement Serialization**

   ```typescript
   // lib/blocksuite/documentSerializer.ts

   export interface SerializedBlockSuiteDoc {
     version: string;
     blocks: any[];
     meta: {
       id: string;
       kind: 'note' | 'canvas' | 'daily-note';
       createdAt: string;
       updatedAt: string;
     };
   }

   export function serialize(doc: Doc): SerializedBlockSuiteDoc {
     return {
       version: '0.19.5', // Current BlockSuite version
       blocks: doc.toJSON(),
       meta: {
         id: doc.id,
         kind: extractKindFromDoc(doc),
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
       }
     };
   }

   export function deserialize(
     data: SerializedBlockSuiteDoc,
     collection: DocCollection
   ): Doc {
     const doc = collection.createDoc({ id: data.meta.id });

     // Reconstruct block tree from serialized data
     doc.fromJSON(data.blocks);

     return doc;
   }

   // Content migration helpers
   export function migrateMarkdownToBlockSuite(
     markdown: string
   ): SerializedBlockSuiteDoc {
     // Parse markdown and convert to BlockSuite blocks
     const lines = markdown.split('\n');
     const blocks = lines.map(line => {
       if (line.startsWith('#')) {
         return createHeadingBlock(line);
       } else if (line.startsWith('- ') || line.startsWith('* ')) {
         return createListBlock(line);
       } else {
         return createParagraphBlock(line);
       }
     });

     return {
       version: '0.19.5',
       blocks,
       meta: {
         id: crypto.randomUUID(),
         kind: 'note',
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
       }
     };
   }
   ```

4. **Implement Dark Theme**

   ```typescript
   // lib/blocksuite/themeProvider.ts

   export const FRAMELORD_BLOCKSUITE_CSS = `
     /* BlockSuite Dark Theme Overrides */

     .affine-editor-container {
       --affine-background-primary: #191B20;
       --affine-background-secondary: #1E2028;
       --affine-background-tertiary: #12141A;

       --affine-text-primary: #e7f3ff;
       --affine-text-secondary: #7fa6d1;
       --affine-text-tertiary: #4a5a6f;

       --affine-border-color: #2A2D35;
       --affine-divider-color: #1f2f45;

       --affine-primary-color: #6366f1;    /* Indigo */
       --affine-secondary-color: #7a5dff;  /* Purple */
       --affine-brand-color: #1cf1ff;      /* Cyan */

       --affine-selection-color: rgba(99, 102, 241, 0.3);

       background: var(--affine-background-primary);
       color: var(--affine-text-primary);
     }

     .affine-block-children-container {
       background: transparent;
     }

     .affine-paragraph-block-container {
       color: var(--affine-text-primary);
     }

     .affine-page-title {
       color: var(--affine-text-primary);
       font-weight: 600;
     }

     /* Edgeless canvas customization */
     .affine-edgeless-surface-block-container {
       background: #191B20;
     }

     /* Note blocks on canvas */
     .affine-note-block-container {
       background: rgba(30, 32, 40, 0.9);
       border: 1px solid #2A2D35;
       border-radius: 8px;
       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
     }

     /* Toolbar customization */
     .affine-toolbar {
       background: rgba(18, 20, 26, 0.95);
       border: 1px solid #2A2D35;
       border-radius: 6px;
       backdrop-filter: blur(10px);
     }

     .affine-toolbar-button:hover {
       background: rgba(99, 102, 241, 0.2);
     }
   `;

   export function applyFrameLordTheme(
     container: HTMLElement
   ): void {
     // Inject custom CSS
     const styleId = 'framelord-blocksuite-theme';
     if (!document.getElementById(styleId)) {
       const style = document.createElement('style');
       style.id = styleId;
       style.textContent = FRAMELORD_BLOCKSUITE_CSS;
       document.head.appendChild(style);
     }

     // Add theme class to container
     container.classList.add('framelord-dark-theme');
   }
   ```

5. **Type Definitions**

   ```typescript
   // lib/blocksuite/types.ts

   import type { Doc, DocCollection } from '@blocksuite/store';

   export type DocumentKind = 'note' | 'canvas' | 'daily-note';

   export interface BlockSuiteDocument {
     doc: Doc;
     kind: DocumentKind;
     serialize: () => SerializedBlockSuiteDoc;
   }

   export interface EditorOptions {
     mode: 'page' | 'edgeless';
     readOnly?: boolean;
     theme?: 'light' | 'dark';
   }

   export interface SerializedBlockSuiteDoc {
     version: string;
     blocks: any[];
     meta: {
       id: string;
       kind: DocumentKind;
       createdAt: string;
       updatedAt: string;
     };
   }
   ```

**Deliverables:**
- ✅ `lib/blocksuite/` module with full API
- ✅ Unit tests for serialization
- ✅ Dark theme CSS validated visually
- ✅ TypeScript types exported

---

### Phase 2: Notes Module Migration (Week 3)

**Objectives:**
- Replace `<textarea>` with BlockSuite page editor
- Migrate existing markdown notes
- Preserve wikilinks and attachments

**Tasks:**

1. **Create BlockSuite Note Editor Component**

   ```typescript
   // components/notes/BlockSuiteNoteEditor.tsx

   import { useEffect, useRef } from 'react';
   import { AffineEditorContainer } from '@blocksuite/presets';
   import {
     createOrLoadDoc,
     saveDoc,
     applyFrameLordTheme
   } from '@/lib/blocksuite';
   import type { Note } from '@/types';

   interface Props {
     note: Note;
     onUpdate: (updatedNote: Note) => void;
     readOnly?: boolean;
   }

   export function BlockSuiteNoteEditor({ note, onUpdate, readOnly }: Props) {
     const containerRef = useRef<HTMLDivElement>(null);
     const editorRef = useRef<AffineEditorContainer | null>(null);

     useEffect(() => {
       if (!containerRef.current) return;

       // Load or create BlockSuite doc
       const doc = createOrLoadDoc(
         'note',
         note.id,
         note.blockSuiteDoc
       );

       // Create editor
       const editor = new AffineEditorContainer();
       editor.doc = doc;
       editor.mode = 'page';

       if (readOnly) {
         editor.readonly = true;
       }

       // Apply theme
       applyFrameLordTheme(containerRef.current);

       // Mount
       containerRef.current.appendChild(editor);
       editorRef.current = editor;

       // Listen for changes
       const unsubscribe = doc.slots.blockUpdated.on(() => {
         const serialized = saveDoc(doc);
         onUpdate({
           ...note,
           blockSuiteDoc: serialized,
           updatedAt: new Date().toISOString()
         });
       });

       return () => {
         unsubscribe.dispose();
         editor.remove();
       };
     }, [note.id]);

     return (
       <div
         ref={containerRef}
         className="blocksuite-note-editor"
         style={{
           minHeight: '400px',
           background: '#191B20',
           borderRadius: '8px',
           padding: '16px'
         }}
       />
     );
   }
   ```

2. **Update noteStore for BlockSuite**

   ```typescript
   // services/noteStore.ts (modifications)

   import { migrateMarkdownToBlockSuite } from '@/lib/blocksuite';

   export function createNote(
     contactId: string,
     content?: string,
     entries?: NoteEntry[]
   ): Note {
     const id = `note_${Date.now()}`;

     // Migrate legacy content to BlockSuite
     let blockSuiteDoc: SerializedBlockSuiteDoc;
     if (content) {
       blockSuiteDoc = migrateMarkdownToBlockSuite(content);
     } else if (entries && entries.length > 0) {
       const markdown = entries.map(e => `- ${e.text}`).join('\n');
       blockSuiteDoc = migrateMarkdownToBlockSuite(markdown);
     } else {
       blockSuiteDoc = createEmptyBlockSuiteDoc();
     }

     const note: Note = {
       id,
       contactId,
       authorContactId: CONTACT_ZERO.id,
       blockSuiteDoc,           // NEW - canonical content
       content,                 // DEPRECATED - keep for migration
       entries: entries || [],  // DEPRECATED
       attachments: [],
       isPinned: false,
       createdAt: new Date().toISOString(),
       updatedAt: null,
       tags: []
     };

     MOCK_NOTES.push(note);
     persist();
     return note;
   }

   // Migration helper for existing notes
   export function migrateNotesToBlockSuite(): void {
     MOCK_NOTES.forEach(note => {
       if (!note.blockSuiteDoc && note.content) {
         note.blockSuiteDoc = migrateMarkdownToBlockSuite(note.content);
         note.updatedAt = new Date().toISOString();
       }
     });
     persist();
   }
   ```

3. **Replace NotesView Editor**

   Edit [components/crm/NotesView.tsx](components/crm/NotesView.tsx):

   - Remove `<textarea>`
   - Import `BlockSuiteNoteEditor`
   - Replace editor section:

   ```tsx
   {/* OLD:
   <textarea
     className="..."
     value={dailyNote?.content || ''}
     onChange={(e) => handleUpdateContent(e.target.value)}
   />
   */}

   {/* NEW: */}
   {dailyNote && (
     <BlockSuiteNoteEditor
       note={dailyNote}
       onUpdate={(updated) => {
         // Sync to dailyNoteStore
         updateDailyNote(selectedDate, updated.blockSuiteDoc);
       }}
     />
   )}
   ```

4. **Preserve Wikilinks & Autocomplete**

   Options:

   A) **Extract wikilinks from BlockSuite content**
      - Add post-processing step after doc update
      - Parse block text for `[[...]]` patterns
      - Maintain existing `extractNoteLinkLabelsFromContent()`

   B) **Implement BlockSuite extension for wikilinks**
      - Create custom block type or inline format
      - Register with schema
      - Render as links with autocomplete

   **Recommended:** Start with (A) for quick migration, upgrade to (B) later

5. **Test Migration**

   ```typescript
   // Test script: scripts/testNoteMigration.ts

   import { migrateMarkdownToBlockSuite } from '@/lib/blocksuite';

   const testCases = [
     '# Meeting Notes\n\nDiscussed [[Project Alpha]]',
     '- Task 1\n- Task 2\n- [[Follow up]]',
     'Simple paragraph with @contact mention'
   ];

   testCases.forEach(markdown => {
     const doc = migrateMarkdownToBlockSuite(markdown);
     console.log('Migrated:', doc);
   });
   ```

**Deliverables:**
- ✅ BlockSuiteNoteEditor component working
- ✅ NotesView using new editor
- ✅ NoteDocumentView using new editor
- ✅ Daily notes using new editor
- ✅ Wikilink extraction still works
- ✅ Attachments still render
- ✅ All tests pass

---

### Phase 3: Frame Canvas Migration (Week 4-5)

**Objectives:**
- Replace Konva canvas with BlockSuite Edgeless
- Migrate existing canvas nodes
- Preserve Scan Canvas functionality

**Decision Point:**

Two approaches:

**Option A: Full Edgeless Mode**
- Replace entire Konva stack with BlockSuite Edgeless
- Use BlockSuite's native shapes, connectors, notes
- Simpler architecture, fewer dependencies
- ⚠️ May lose custom drawing features (pen tool, etc.)

**Option B: Hybrid Approach**
- Keep Konva for drawing primitives
- Embed BlockSuite editors in note cards (current state)
- More control, preserves all features
- ⚠️ More complex synchronization

**Recommended:** Start with **Option A** (full Edgeless), fall back to **Option B** if blockers.

#### Approach A: Full BlockSuite Edgeless

**Tasks:**

1. **Create Edgeless Canvas Component**

   ```typescript
   // components/canvas/BlockSuiteFrameCanvas.tsx

   import { useEffect, useRef } from 'react';
   import { AffineEditorContainer } from '@blocksuite/presets';
   import { createOrLoadDoc, applyFrameLordTheme } from '@/lib/blocksuite';
   import type { CanvasThread } from '@/types';

   interface Props {
     canvas: CanvasThread;
     onUpdate: (updated: CanvasThread) => void;
   }

   export function BlockSuiteFrameCanvas({ canvas, onUpdate }: Props) {
     const containerRef = useRef<HTMLDivElement>(null);
     const editorRef = useRef<AffineEditorContainer | null>(null);

     useEffect(() => {
       if (!containerRef.current) return;

       // Load canvas document
       const doc = createOrLoadDoc(
         'canvas',
         canvas.id,
         canvas.blockSuiteDoc
       );

       // Create Edgeless editor
       const editor = new AffineEditorContainer();
       editor.doc = doc;
       editor.mode = 'edgeless';  // ← Key difference

       // Apply theme
       applyFrameLordTheme(containerRef.current);

       // Mount
       containerRef.current.appendChild(editor);
       editorRef.current = editor;

       // Listen for changes
       const unsubscribe = doc.slots.blockUpdated.on(() => {
         const serialized = saveDoc(doc);
         onUpdate({
           ...canvas,
           blockSuiteDoc: serialized,
           updatedAt: new Date().toISOString()
         });
       });

       return () => {
         unsubscribe.dispose();
         editor.remove();
       };
     }, [canvas.id]);

     return (
       <div
         ref={containerRef}
         className="blocksuite-edgeless-canvas"
         style={{
           width: '100%',
           height: '100%',
           background: '#191B20',
           position: 'relative'
         }}
       />
     );
   }
   ```

2. **Replace FrameCanvasPage Content**

   Edit [components/canvas/FrameCanvasPage.tsx](components/canvas/FrameCanvasPage.tsx):

   ```tsx
   import { BlockSuiteFrameCanvas } from './BlockSuiteFrameCanvas';

   // Keep existing:
   // - Header with title, scan button
   // - Toolbar (if compatible)
   // - Fullscreen mode

   // Replace canvas section:
   <div className="flex-1 relative">
     {canvas && (
       <BlockSuiteFrameCanvas
         canvas={canvas}
         onUpdate={(updated) => {
           updateCanvasThread(updated);
         }}
       />
     )}
   </div>
   ```

3. **Implement Scan Canvas Integration**

   ```typescript
   // lib/canvas/scanCanvasBlockSuite.ts

   import { saveDoc } from '@/lib/blocksuite';
   import type { Doc } from '@blocksuite/store';

   export async function scanCanvasBlockSuite(
     doc: Doc
   ): Promise<FrameScanResult> {
     // Serialize entire canvas state
     const serialized = saveDoc(doc);

     // Extract text content from all blocks
     const textContent = extractTextFromBlocks(serialized.blocks);

     // Optional: Generate screenshot
     const screenshot = await captureEdgelessScreenshot(doc);

     // Send to Frame Scan API
     const result = await fetch('/api/canvas/scan', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         canvasId: serialized.meta.id,
         textContent,
         screenshot,
         timestamp: new Date().toISOString()
       })
     });

     return result.json();
   }

   function extractTextFromBlocks(blocks: any[]): string {
     // Recursively extract text from block tree
     return blocks
       .map(block => {
         if (block.type === 'paragraph' || block.type === 'heading') {
           return block.text || '';
         }
         if (block.children) {
           return extractTextFromBlocks(block.children);
         }
         return '';
       })
       .filter(Boolean)
       .join('\n');
   }
   ```

4. **Migrate Existing Canvas Data**

   ```typescript
   // lib/canvas/migrateCanvasToBlockSuite.ts

   import { createOrLoadDoc } from '@/lib/blocksuite';
   import type { CanvasThread, CanvasNode, CanvasConnection } from '@/types';

   export function migrateCanvasThreadToBlockSuite(
     thread: CanvasThread,
     nodes: CanvasNode[],
     connections: CanvasConnection[]
   ): SerializedBlockSuiteDoc {
     const doc = createOrLoadDoc('canvas', thread.id);

     const pageBlockId = doc.addBlock('affine:page', {
       title: new doc.Text(thread.title)
     });

     const surfaceBlockId = doc.addBlock('affine:surface', {}, pageBlockId);

     // Migrate each node to a note block on the surface
     nodes.forEach(node => {
       const noteBlockId = doc.addBlock('affine:note', {
         xywh: `[${node.x},${node.y},${node.width},${node.height}]`
       }, surfaceBlockId);

       // Add paragraph with content
       doc.addBlock('affine:paragraph', {
         text: new doc.Text(node.body || node.title)
       }, noteBlockId);
     });

     // Migrate connections to connectors
     connections.forEach(conn => {
       doc.addBlock('affine:connector', {
         source: { id: conn.sourceNodeId },
         target: { id: conn.targetNodeId }
       }, surfaceBlockId);
     });

     return saveDoc(doc);
   }

   // Run migration on app startup
   export function migrateAllCanvasThreads(): void {
     const threads = getAllCanvasThreads();
     threads.forEach(thread => {
       if (!thread.blockSuiteDoc) {
         const nodes = getNodesForCanvas(thread.id);
         const connections = getConnectionsForCanvas(thread.id);
         thread.blockSuiteDoc = migrateCanvasThreadToBlockSuite(
           thread,
           nodes,
           connections
         );
         updateCanvasThread(thread);
       }
     });
   }
   ```

5. **Update canvasStore**

   ```typescript
   // stores/canvasStore.ts (modifications)

   interface CanvasThread {
     // ... existing fields

     // NEW - canonical BlockSuite doc
     blockSuiteDoc?: SerializedBlockSuiteDoc;

     // DEPRECATED - legacy Konva data
     nodeIds?: string[];
     connectionIds?: string[];
   }

   export function createCanvasThread(title: string): CanvasThread {
     const id = `canvas_${Date.now()}`;

     const thread: CanvasThread = {
       id,
       title,
       blockSuiteDoc: createEmptyEdgelessDoc(id),
       view: { zoom: 1, offsetX: 0, offsetY: 0 },
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     CANVAS_THREADS.push(thread);
     persist();
     return thread;
   }
   ```

**Deliverables:**
- ✅ Edgeless canvas rendering correctly
- ✅ Can create shapes, notes, connectors
- ✅ Dark theme applied
- ✅ Scan Canvas works with new format
- ✅ Legacy canvas data migrated
- ✅ Fullscreen mode preserved

---

### Phase 4: Theme Customization & Polish (Week 6)

**Objectives:**
- Perfect dark theme alignment
- Ensure consistent branding
- Optimize performance

**Tasks:**

1. **CSS Refinement**

   Audit all BlockSuite UI elements:
   - Toolbars
   - Context menus
   - Selection handles
   - Resize handles
   - Format panels
   - Link previews

   Override with FrameLord styles:

   ```css
   /* lib/blocksuite/theme.css */

   /* Selection handles */
   .affine-edgeless-selected-rect {
     border: 2px solid #6366f1 !important;
     box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.3) !important;
   }

   /* Toolbar */
   .affine-edgeless-toolbar {
     background: rgba(18, 20, 26, 0.95) !important;
     border: 1px solid #2A2D35 !important;
     backdrop-filter: blur(10px) !important;
   }

   /* Format panel */
   .affine-format-bar-widget {
     background: rgba(30, 32, 40, 0.98) !important;
     border: 1px solid #2A2D35 !important;
     color: #e7f3ff !important;
   }

   /* Buttons */
   .affine-button {
     background: transparent !important;
     color: #7fa6d1 !important;
   }

   .affine-button:hover {
     background: rgba(99, 102, 241, 0.2) !important;
     color: #e7f3ff !important;
   }

   /* Input fields */
   .affine-input {
     background: #12141A !important;
     border: 1px solid #2A2D35 !important;
     color: #e7f3ff !important;
   }

   /* Links */
   .affine-link {
     color: #1cf1ff !important;  /* Cyan brand color */
   }

   /* Note blocks on canvas */
   .affine-edgeless-note {
     background: rgba(30, 32, 40, 0.9) !important;
     border: 1px solid #2A2D35 !important;
     box-shadow:
       0 4px 12px rgba(0, 0, 0, 0.3),
       0 0 20px rgba(31, 226, 255, 0.1) !important;  /* Subtle cyan glow */
   }
   ```

2. **Typography Alignment**

   Match existing FrameLord fonts:

   ```css
   .affine-editor-container {
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
                  'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
                  sans-serif !important;
   }

   .affine-page-title {
     font-size: 1.875rem !important;  /* 30px */
     font-weight: 600 !important;
     letter-spacing: -0.02em !important;
   }

   .affine-heading-1 {
     font-size: 1.5rem !important;    /* 24px */
     font-weight: 600 !important;
   }

   .affine-paragraph {
     font-size: 0.9375rem !important; /* 15px */
     line-height: 1.6 !important;
   }
   ```

3. **Performance Optimization**

   - Throttle document saves (max 1 per second)
   - Lazy load BlockSuite editors (IntersectionObserver)
   - Virtualize note lists with many BlockSuite editors
   - Use React.memo for editor wrappers

   ```typescript
   // lib/blocksuite/throttle.ts

   export function createThrottledSave(
     doc: Doc,
     onSave: (serialized: SerializedBlockSuiteDoc) => void,
     delay = 1000
   ) {
     let timeout: NodeJS.Timeout | null = null;
     let pending = false;

     return doc.slots.blockUpdated.on(() => {
       if (timeout) {
         pending = true;
         return;
       }

       timeout = setTimeout(() => {
         const serialized = saveDoc(doc);
         onSave(serialized);
         timeout = null;

         if (pending) {
           pending = false;
           // Trigger again if there were pending updates
           doc.slots.blockUpdated.emit();
         }
       }, delay);
     });
   }
   ```

4. **Accessibility**

   - Ensure keyboard navigation works
   - Test screen reader compatibility
   - Add ARIA labels where missing
   - Verify focus states match design

**Deliverables:**
- ✅ Pixel-perfect theme matching
- ✅ Smooth performance (60fps)
- ✅ Accessibility audit passed
- ✅ Browser compatibility tested (Chrome, Firefox, Safari, Edge)

---

### Phase 5: Testing & Migration (Week 7)

**Objectives:**
- Comprehensive testing
- Data migration scripts
- Rollback plan

**Tasks:**

1. **Unit Tests**

   ```typescript
   // lib/blocksuite/__tests__/serialization.test.ts

   import { describe, it, expect } from 'vitest';
   import {
     serialize,
     deserialize,
     migrateMarkdownToBlockSuite
   } from '../documentSerializer';

   describe('BlockSuite Serialization', () => {
     it('should serialize and deserialize a document', () => {
       const original = createTestDoc();
       const serialized = serialize(original);
       const deserialized = deserialize(serialized, collection);

       expect(deserialized.id).toBe(original.id);
       expect(deserialized.toJSON()).toEqual(original.toJSON());
     });

     it('should migrate markdown to BlockSuite', () => {
       const markdown = '# Test\n\nParagraph with [[link]]';
       const doc = migrateMarkdownToBlockSuite(markdown);

       expect(doc.blocks).toHaveLength(2); // heading + paragraph
       expect(doc.blocks[0].type).toBe('heading');
       expect(doc.blocks[1].text).toContain('[[link]]');
     });
   });
   ```

2. **Integration Tests**

   ```typescript
   // e2e/canvas.spec.ts (Playwright)

   import { test, expect } from '@playwright/test';

   test.describe('BlockSuite Canvas', () => {
     test('should create and edit canvas', async ({ page }) => {
       await page.goto('/canvas');

       // Create new canvas
       await page.click('text=New Canvas');
       await page.fill('input[placeholder="Canvas title"]', 'Test Canvas');

       // Wait for Edgeless editor to load
       await page.waitForSelector('.affine-edgeless-surface-block-container');

       // Create note block
       await page.click('button[aria-label="Add note"]');
       await page.click('.affine-edgeless-surface-block-container');

       // Type in note
       await page.keyboard.type('Test note content');

       // Verify content saved
       await page.reload();
       await expect(page.locator('text=Test note content')).toBeVisible();
     });
   });
   ```

3. **Migration Script**

   ```typescript
   // scripts/migrateToBlockSuite.ts

   import {
     migrateAllCanvasThreads
   } from '@/lib/canvas/migrateCanvasToBlockSuite';
   import { migrateNotesToBlockSuite } from '@/services/noteStore';

   async function runMigration() {
     console.log('Starting BlockSuite migration...');

     // Backup existing data
     const backup = {
       canvases: localStorage.getItem('framelord_canvas_threads'),
       notes: localStorage.getItem('framelord_notes'),
       timestamp: new Date().toISOString()
     };
     localStorage.setItem('framelord_pre_migration_backup', JSON.stringify(backup));

     try {
       // Migrate canvases
       console.log('Migrating canvas threads...');
       migrateAllCanvasThreads();
       console.log('✓ Canvas migration complete');

       // Migrate notes
       console.log('Migrating notes...');
       migrateNotesToBlockSuite();
       console.log('✓ Note migration complete');

       console.log('Migration successful!');
     } catch (error) {
       console.error('Migration failed:', error);
       console.log('Restoring from backup...');

       // Restore backup
       localStorage.setItem('framelord_canvas_threads', backup.canvases!);
       localStorage.setItem('framelord_notes', backup.notes!);

       console.log('Backup restored. Please report this error.');
     }
   }

   runMigration();
   ```

4. **User Acceptance Testing**

   Test workflows:
   - Create new note → edit → save → reload
   - Create canvas → add shapes → connect → scan
   - Create note with wikilinks → verify backlinks
   - Attach image to note → verify displays
   - Record voice note → verify transcription inserts
   - Switch between multiple canvases
   - Export/import data

**Deliverables:**
- ✅ 80%+ test coverage
- ✅ All critical workflows tested
- ✅ Migration script validated
- ✅ Rollback plan documented

---

### Phase 6: Cleanup & Documentation (Week 8)

**Objectives:**
- Remove legacy code
- Comprehensive documentation
- Handoff preparation

**Tasks:**

1. **Legacy Code Removal**

   Move to `_legacy/` folder:
   - Old canvas components (Konva-based)
   - Old note editor (textarea-based)
   - Unused dependencies

   ```bash
   mkdir -p _legacy/components/canvas
   mkdir -p _legacy/components/notes

   git mv components/canvas/FrameCanvas.tsx _legacy/components/canvas/
   git mv components/canvas/CanvasNodeCard.tsx _legacy/components/canvas/

   # Remove from imports
   # Update references
   ```

2. **Dependency Cleanup**

   ```bash
   # Remove if no longer needed:
   npm uninstall react-konva konva roughjs

   # Update package.json
   # Run npm dedupe
   ```

3. **Documentation**

   Create comprehensive docs:

   ```markdown
   # docs/BLOCKSUITE_NOTES_AND_CANVAS.md

   ## Overview

   FrameLord uses BlockSuite as the canonical editor for:
   - Notes (daily notes, contact notes, topic notes)
   - Canvas (Frame Canvas with Edgeless mode)
   - Canvas note blocks (embedded notes on canvas)

   ## Architecture

   ### Integration Layer

   Located in `lib/blocksuite/`:
   - `blockSuiteManager.ts` - Document lifecycle management
   - `documentSerializer.ts` - Persistence and migration
   - `themeProvider.ts` - FrameLord dark theme
   - `types.ts` - TypeScript definitions

   ### Data Storage

   BlockSuite documents are stored as serialized JSON in:
   - `CanvasThread.blockSuiteDoc` (for canvas)
   - `Note.blockSuiteDoc` (for notes)

   Format:
   ```json
   {
     "version": "0.19.5",
     "blocks": [...],
     "meta": {
       "id": "...",
       "kind": "note|canvas",
       "createdAt": "...",
       "updatedAt": "..."
     }
   }
   ```

   ### Component Usage

   **For Notes:**
   ```tsx
   import { BlockSuiteNoteEditor } from '@/components/notes';

   <BlockSuiteNoteEditor
     note={note}
     onUpdate={(updated) => updateNote(updated)}
     readOnly={false}
   />
   ```

   **For Canvas:**
   ```tsx
   import { BlockSuiteFrameCanvas } from '@/components/canvas';

   <BlockSuiteFrameCanvas
     canvas={canvas}
     onUpdate={(updated) => updateCanvasThread(updated)}
   />
   ```

   ## Migration Guide

   ### Migrating from Legacy Notes

   ```typescript
   import { migrateMarkdownToBlockSuite } from '@/lib/blocksuite';

   const note = getLegacyNote();
   if (note.content && !note.blockSuiteDoc) {
     note.blockSuiteDoc = migrateMarkdownToBlockSuite(note.content);
     updateNote(note);
   }
   ```

   ### Migrating from Legacy Canvas

   ```typescript
   import { migrateCanvasThreadToBlockSuite } from '@/lib/canvas';

   const canvas = getLegacyCanvas();
   if (!canvas.blockSuiteDoc) {
     const nodes = getNodesForCanvas(canvas.id);
     const connections = getConnectionsForCanvas(canvas.id);
     canvas.blockSuiteDoc = migrateCanvasThreadToBlockSuite(
       canvas, nodes, connections
     );
     updateCanvasThread(canvas);
   }
   ```

   ## Customization

   ### Theme

   To modify the dark theme, edit `lib/blocksuite/themeProvider.ts`:

   ```typescript
   export const FRAMELORD_BLOCKSUITE_CSS = `
     .affine-editor-container {
       --affine-background-primary: #191B20;
       /* Add overrides */
     }
   `;
   ```

   ### Extensions

   To add custom block types:

   1. Define schema extension
   2. Register with `getEditorSchema()`
   3. Add UI components
   4. Update serialization if needed

   ## Troubleshooting

   ### Editor not loading

   - Check browser console for errors
   - Verify BlockSuite CSS is imported
   - Ensure DocCollection is initialized

   ### Content not saving

   - Verify `blockUpdated` slot listener is connected
   - Check localStorage quota
   - Ensure serialization doesn't throw errors

   ### Theme not applied

   - Verify `applyFrameLordTheme()` is called
   - Check CSS specificity
   - Inspect element to see applied styles

   ## Future Enhancements

   - [ ] Real-time collaboration via Y.js
   - [ ] Custom wikilink block type
   - [ ] Voice note insertion API
   - [ ] Canvas templates
   - [ ] Export to PDF/PNG
   ```

4. **Code Comments**

   Add JSDoc comments to all public APIs:

   ```typescript
   /**
    * Creates or loads a BlockSuite document.
    *
    * @param kind - Type of document (note, canvas, daily-note)
    * @param id - Unique document identifier
    * @param serialized - Optional serialized document to restore
    * @returns BlockSuite Doc instance
    *
    * @example
    * ```typescript
    * const doc = createOrLoadDoc('note', 'note_123', existingData);
    * ```
    */
   export function createOrLoadDoc(
     kind: DocumentKind,
     id: string,
     serialized?: SerializedBlockSuiteDoc
   ): Doc {
     // ...
   }
   ```

5. **Changelog**

   ```markdown
   # CHANGELOG.md

   ## [2.0.0] - 2025-12-XX - BlockSuite Integration

   ### Added
   - BlockSuite-powered note editor with rich formatting
   - BlockSuite Edgeless canvas for infinite canvas
   - Dark theme customization for all BlockSuite UI
   - Migration tools for legacy notes and canvases
   - Comprehensive BlockSuite documentation

   ### Changed
   - **BREAKING:** Note content now stored as BlockSuite documents
   - **BREAKING:** Canvas structure now uses Edgeless format
   - Improved performance with throttled saves
   - Enhanced text editing experience

   ### Deprecated
   - Legacy textarea note editor
   - Legacy Konva canvas implementation

   ### Removed
   - react-konva dependency
   - roughjs dependency

   ### Fixed
   - Canvas zoom/pan synchronization
   - Note autosave reliability
   - Dark theme consistency
   ```

**Deliverables:**
- ✅ Legacy code archived
- ✅ Dependencies cleaned up
- ✅ Complete documentation published
- ✅ Changelog updated
- ✅ Handoff ready

---

## Technical Specifications

### Package Dependencies

**Install:**
```json
{
  "@blocksuite/blocks": "^0.19.5",
  "@blocksuite/editor": "^0.19.5",
  "@blocksuite/inline": "^0.19.5",
  "@blocksuite/presets": "^0.19.5",
  "@blocksuite/store": "^0.19.5"
}
```

**Remove (optional):**
```json
{
  "react-konva": "^19.2.1",
  "konva": "^10.0.12",
  "roughjs": "^4.6.6"
}
```

### Vite Configuration

```typescript
// vite.config.ts

export default defineConfig({
  // ... existing config

  optimizeDeps: {
    include: [
      '@blocksuite/store',
      '@blocksuite/blocks',
      '@blocksuite/presets',
      '@blocksuite/editor'
    ]
  },

  css: {
    preprocessorOptions: {
      scss: {
        // BlockSuite may use SCSS
      }
    }
  }
});
```

### Type Definitions

```typescript
// types.ts (additions)

import type { SerializedBlockSuiteDoc } from '@/lib/blocksuite/types';

interface Note {
  // ... existing fields

  // NEW
  blockSuiteDoc?: SerializedBlockSuiteDoc;

  // DEPRECATED (keep for migration)
  content?: string;
  entries?: NoteEntry[];
}

interface CanvasThread {
  // ... existing fields

  // NEW
  blockSuiteDoc?: SerializedBlockSuiteDoc;

  // DEPRECATED
  nodeIds?: string[];
  connectionIds?: string[];
}
```

---

## Risk Assessment

### High Risk

**Risk:** BlockSuite version incompatibility
**Impact:** Editor fails to load, data corruption
**Mitigation:**
- Pin exact versions in package.json
- Test thoroughly before upgrading
- Maintain serialization version field

**Risk:** Performance degradation with many editors
**Impact:** Slow UI, poor UX
**Mitigation:**
- Lazy load editors
- Virtualize lists
- Throttle saves
- Use React.memo

**Risk:** Data migration failures
**Impact:** Lost user data
**Mitigation:**
- Backup before migration
- Validate migration output
- Provide rollback mechanism
- Test with diverse data sets

### Medium Risk

**Risk:** Theme customization conflicts
**Impact:** Ugly UI, inconsistent branding
**Mitigation:**
- Use CSS specificity
- Test in all browsers
- Document override patterns

**Risk:** Wikilink functionality breaks
**Impact:** Lost linking features
**Mitigation:**
- Extract links from serialized content
- Add post-processing step
- Consider custom block type

**Risk:** Voice transcription insertion fails
**Impact:** Feature degradation
**Mitigation:**
- Implement text insertion API
- Test with various cursor positions
- Provide fallback UI

### Low Risk

**Risk:** Build size increase
**Impact:** Slower load times
**Mitigation:**
- Code splitting
- Tree shaking
- Bundle analysis

---

## Testing Strategy

### Unit Tests (Vitest)

- BlockSuite manager functions
- Serialization/deserialization
- Theme application
- Migration helpers

**Target:** 80% coverage

### Integration Tests (Playwright)

- Note editor workflows
- Canvas workflows
- Wikilink creation
- Attachment handling
- Voice recording

**Target:** All critical paths

### Visual Regression (Percy/Chromatic)

- Theme consistency
- Component snapshots
- Dark mode accuracy

### Performance Tests

- Editor load time < 500ms
- Save operation < 100ms (throttled)
- 60fps canvas interaction

---

## Migration Path

### Rollout Strategy

**Phase 1: Canary (Week 8)**
- Deploy to test environment
- Internal team testing
- Collect feedback

**Phase 2: Beta (Week 9)**
- Deploy to subset of users
- Monitor error rates
- Gather performance metrics

**Phase 3: General Availability (Week 10)**
- Full rollout
- Monitor closely
- Support migration issues

### Rollback Plan

If critical issues arise:

1. **Immediate:**
   - Revert to previous Git commit
   - Restore backup localStorage data
   - Communicate to users

2. **Post-Mortem:**
   - Document failure mode
   - Fix root cause
   - Enhance testing
   - Re-plan rollout

### Data Backup

```typescript
// Automatic backup on app start
export function backupBeforeMigration() {
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      canvases: localStorage.getItem('framelord_canvas_threads'),
      nodes: localStorage.getItem('framelord_canvas_nodes'),
      connections: localStorage.getItem('framelord_canvas_connections'),
      notes: localStorage.getItem('framelord_notes'),
      dailyNotes: localStorage.getItem('framelord_daily_notes')
    }
  };

  localStorage.setItem(
    'framelord_pre_blocksuite_backup',
    JSON.stringify(backup)
  );
}
```

---

## Success Metrics

### Technical Metrics

- ✅ Zero TypeScript errors
- ✅ Zero runtime errors in production
- ✅ < 2s initial page load
- ✅ < 500ms editor mount time
- ✅ 80%+ test coverage

### User Experience Metrics

- ✅ All existing features work
- ✅ No data loss
- ✅ Theme matches branding
- ✅ Smooth 60fps interactions
- ✅ Positive user feedback

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Preparation | Clean build, documentation setup |
| 2 | Integration Layer | BlockSuite manager, serialization, theme |
| 3 | Notes Migration | BlockSuiteNoteEditor, wikilinks preserved |
| 4-5 | Canvas Migration | Edgeless canvas, node migration, scan integration |
| 6 | Polish | Theme perfection, performance optimization |
| 7 | Testing | Unit tests, e2e tests, migration validation |
| 8 | Cleanup | Legacy code removal, documentation, handoff |

**Total:** 8 weeks

---

## Next Steps

1. Review and approve this plan
2. Set up project board with tasks
3. Begin Phase 0 (Preparation)
4. Schedule weekly check-ins
5. Establish feedback loop

---

## Questions & Decisions

### Open Questions

1. **BlockSuite Version:**
   - Upgrade to latest (0.19.x → 0.20.x+)?
   - Or stay on current 0.19.5?

2. **Canvas Approach:**
   - Full Edgeless (Option A)?
   - Or hybrid Konva + BlockSuite (Option B)?

3. **Collaboration:**
   - Set up Y.js now or later?

4. **Persistence:**
   - Stay with localStorage?
   - Or migrate to IndexedDB?

### Decisions Needed

- [ ] Approve overall architecture
- [ ] Choose canvas migration approach
- [ ] Set BlockSuite version target
- [ ] Define deployment timeline
- [ ] Assign team members to phases

---

**Document Version:** 1.0
**Last Updated:** 2025-12-04
**Author:** Claude Code
**Status:** Awaiting Approval
