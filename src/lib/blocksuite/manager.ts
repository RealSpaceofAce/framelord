import { Doc, DocCollection, Schema } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks';

// Store collections and docs per ID
const collections = new Map<string, { collection: DocCollection; doc: Doc }>();

export function getOrCreateDoc(id: string): Doc {
  // Check if we already have this doc
  const existing = collections.get(id);
  if (existing) {
    console.log('[BlockSuite Manager] Found existing doc:', id);
    return existing.doc;
  }

  console.log('[BlockSuite Manager] Creating new collection and doc:', id);

  // Create schema (exactly like AffineEditor)
  const schema = new Schema();
  schema.register(AffineSchemas);

  // Create collection (exactly like AffineEditor)
  const collection = new DocCollection({ schema });

  // Create doc (exactly like AffineEditor does)
  const docId = id || `doc_${Date.now()}`;
  let doc = collection.getDoc(docId);

  if (!doc) {
    doc = collection.createDoc({ id: docId });
  }

  if (!doc) {
    console.error('[BlockSuite Manager] createDoc returned null/undefined');
    console.error('[BlockSuite Manager] Collection:', collection);
    console.error('[BlockSuite Manager] Schema:', schema);
    throw new Error(`Failed to create document with id: ${docId}`);
  }

  console.log('[BlockSuite Manager] Doc created:', doc.id);

  // Store for reuse
  collections.set(id, { collection, doc });

  return doc;
}

export function initEdgelessDoc(doc: Doc): void {
  if (doc.isEmpty) {
    try {
      const pageBlockId = doc.addBlock('affine:page' as never);
      doc.addBlock('affine:surface' as never, {}, pageBlockId);
    } catch (e) {
      console.warn('Error initializing edgeless doc:', e);
    }
  }
}

export function initPageDoc(doc: Doc): void {
  if (doc.isEmpty) {
    try {
      const pageBlockId = doc.addBlock('affine:page' as never);
      const noteBlockId = doc.addBlock('affine:note' as never, {}, pageBlockId);
      doc.addBlock('affine:paragraph' as never, {}, noteBlockId);
    } catch (e) {
      console.warn('Error initializing page doc:', e);
    }
  }
}
