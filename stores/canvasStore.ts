// =============================================================================
// CANVAS STORE — Frame Canvas data storage (Card-based nodes, NOT drawing)
// =============================================================================
// Manages canvas threads with Frame nodes (card blocks) and connections.
// NO Excalidraw elements - this is for FrameLord Frame nodes only.
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export interface CanvasThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  nodeIds: string[];
  connectionIds: string[];
  view: {
    zoom: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface CanvasNode {
  id: string;
  canvasId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;

  // Affine editor content (BlockSuite)
  affineDocId?: string;
  affineSerialized?: any; // BlockSuite doc JSON

  // Optional plain text fallback (for backwards compat or export)
  body?: string;

  // Optional links to contacts/notes
  contactId?: string;
  noteId?: string;
}

export interface CanvasConnection {
  id: string;
  canvasId: string;
  sourceNodeId: string;
  targetNodeId: string;
  createdAt: string;
}

// =============================================================================
// STORAGE
// =============================================================================

const THREADS_STORAGE_KEY = 'framelord_canvas_threads';
const NODES_STORAGE_KEY = 'framelord_canvas_nodes';
const CONNECTIONS_STORAGE_KEY = 'framelord_canvas_connections';

interface CanvasData {
  threads: CanvasThread[];
  nodes: CanvasNode[];
  connections: CanvasConnection[];
}

let data: CanvasData = {
  threads: [],
  nodes: [],
  connections: [],
};

let initialized = false;

// =============================================================================
// INITIALIZATION
// =============================================================================

function init(): void {
  if (initialized) return;

  try {
    // Load threads
    const storedThreads = localStorage.getItem(THREADS_STORAGE_KEY);
    if (storedThreads) {
      const parsed = JSON.parse(storedThreads);
      if (Array.isArray(parsed)) {
        data.threads = parsed;
      }
    }

    // Load nodes
    const storedNodes = localStorage.getItem(NODES_STORAGE_KEY);
    if (storedNodes) {
      const parsed = JSON.parse(storedNodes);
      if (Array.isArray(parsed)) {
        data.nodes = parsed;
      }
    }

    // Load connections
    const storedConnections = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
    if (storedConnections) {
      const parsed = JSON.parse(storedConnections);
      if (Array.isArray(parsed)) {
        data.connections = parsed;
      }
    }
  } catch (err) {
    console.warn('[CanvasStore] Failed to load from localStorage:', err);
  }

  initialized = true;
}

function persistThreads(): void {
  try {
    localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(data.threads));
  } catch (err) {
    console.warn('[CanvasStore] Failed to persist threads:', err);
  }
}

function persistNodes(): void {
  try {
    localStorage.setItem(NODES_STORAGE_KEY, JSON.stringify(data.nodes));
  } catch (err) {
    console.warn('[CanvasStore] Failed to persist nodes:', err);
  }
}

function persistConnections(): void {
  try {
    localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(data.connections));
  } catch (err) {
    console.warn('[CanvasStore] Failed to persist connections:', err);
  }
}

// =============================================================================
// ID GENERATION
// =============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// THREAD OPERATIONS
// =============================================================================

export function getThreads(): CanvasThread[] {
  init();
  return [...data.threads];
}

export function getThreadById(threadId: string): CanvasThread | null {
  init();
  return data.threads.find(t => t.id === threadId) ?? null;
}

export function getThreadCount(): number {
  init();
  return data.threads.length;
}

export function createThread(title: string): CanvasThread {
  init();

  const now = new Date().toISOString();

  const thread: CanvasThread = {
    id: generateId('canvas'),
    title,
    createdAt: now,
    updatedAt: now,
    nodeIds: [],
    connectionIds: [],
    view: {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    },
  };

  data.threads = [thread, ...data.threads];
  persistThreads();

  return thread;
}

export function updateThreadTitle(threadId: string, title: string): CanvasThread | null {
  init();

  const index = data.threads.findIndex(t => t.id === threadId);
  if (index < 0) return null;

  data.threads[index] = {
    ...data.threads[index],
    title,
    updatedAt: new Date().toISOString(),
  };

  persistThreads();
  return data.threads[index];
}

export function updateThreadView(
  threadId: string,
  view: { zoom: number; offsetX: number; offsetY: number }
): void {
  init();

  const index = data.threads.findIndex(t => t.id === threadId);
  if (index < 0) return;

  data.threads[index] = {
    ...data.threads[index],
    view,
    updatedAt: new Date().toISOString(),
  };

  persistThreads();
}

export function deleteThread(threadId: string): boolean {
  init();

  // Remove all nodes for this canvas
  data.nodes = data.nodes.filter(n => n.canvasId !== threadId);

  // Remove all connections for this canvas
  data.connections = data.connections.filter(c => c.canvasId !== threadId);

  // Remove thread
  data.threads = data.threads.filter(t => t.id !== threadId);

  persistThreads();
  persistNodes();
  persistConnections();

  return true;
}

// =============================================================================
// NODE OPERATIONS
// =============================================================================

export function getNodesForCanvas(canvasId: string): CanvasNode[] {
  init();
  return data.nodes.filter(n => n.canvasId === canvasId);
}

export function getNodeById(nodeId: string): CanvasNode | null {
  init();
  return data.nodes.find(n => n.id === nodeId) ?? null;
}

export function createNode(
  canvasId: string,
  x: number,
  y: number,
  title: string = 'New Frame',
  body: string = ''
): CanvasNode {
  init();

  const now = new Date().toISOString();

  // Generate unique Affine doc ID
  const affineDocId = `doc_${generateId('affine')}`;

  const node: CanvasNode = {
    id: generateId('node'),
    canvasId,
    title,
    x,
    y,
    width: 400,
    height: 280,
    createdAt: now,
    updatedAt: now,
    affineDocId,
    affineSerialized: null,
    body: body || '',
  };

  data.nodes.push(node);

  // Add to thread's nodeIds
  const thread = data.threads.find(t => t.id === canvasId);
  if (thread) {
    thread.nodeIds.push(node.id);
    thread.updatedAt = now;
    persistThreads();
  }

  persistNodes();
  return node;
}

// Update Affine content for a node
export function updateNodeAffineContent(
  nodeId: string,
  affineSerialized: any
): CanvasNode | null {
  init();

  const index = data.nodes.findIndex(n => n.id === nodeId);
  if (index < 0) return null;

  data.nodes[index] = {
    ...data.nodes[index],
    affineSerialized,
    updatedAt: new Date().toISOString(),
  };

  persistNodes();
  return data.nodes[index];
}

export function updateNode(nodeId: string, updates: Partial<CanvasNode>): CanvasNode | null {
  init();

  const index = data.nodes.findIndex(n => n.id === nodeId);
  if (index < 0) return null;

  data.nodes[index] = {
    ...data.nodes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  persistNodes();
  return data.nodes[index];
}

export function deleteNode(nodeId: string): boolean {
  init();

  const node = data.nodes.find(n => n.id === nodeId);
  if (!node) return false;

  // Remove from thread's nodeIds
  const thread = data.threads.find(t => t.id === node.canvasId);
  if (thread) {
    thread.nodeIds = thread.nodeIds.filter(id => id !== nodeId);
    thread.updatedAt = new Date().toISOString();
    persistThreads();
  }

  // Remove connections involving this node
  data.connections = data.connections.filter(
    c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
  );

  // Remove node
  data.nodes = data.nodes.filter(n => n.id !== nodeId);

  persistNodes();
  persistConnections();

  return true;
}

// =============================================================================
// CONNECTION OPERATIONS
// =============================================================================

export function getConnectionsForCanvas(canvasId: string): CanvasConnection[] {
  init();
  return data.connections.filter(c => c.canvasId === canvasId);
}

export function createConnection(
  canvasId: string,
  sourceNodeId: string,
  targetNodeId: string
): CanvasConnection {
  init();

  // Check if connection already exists
  const existing = data.connections.find(
    c =>
      c.canvasId === canvasId &&
      c.sourceNodeId === sourceNodeId &&
      c.targetNodeId === targetNodeId
  );

  if (existing) return existing;

  const now = new Date().toISOString();

  const connection: CanvasConnection = {
    id: generateId('conn'),
    canvasId,
    sourceNodeId,
    targetNodeId,
    createdAt: now,
  };

  data.connections.push(connection);

  // Add to thread's connectionIds
  const thread = data.threads.find(t => t.id === canvasId);
  if (thread) {
    thread.connectionIds.push(connection.id);
    thread.updatedAt = now;
    persistThreads();
  }

  persistConnections();
  return connection;
}

export function deleteConnection(connectionId: string): boolean {
  init();

  const connection = data.connections.find(c => c.id === connectionId);
  if (!connection) return false;

  // Remove from thread's connectionIds
  const thread = data.threads.find(t => t.id === connection.canvasId);
  if (thread) {
    thread.connectionIds = thread.connectionIds.filter(id => id !== connectionId);
    thread.updatedAt = new Date().toISOString();
    persistThreads();
  }

  // Remove connection
  data.connections = data.connections.filter(c => c.id !== connectionId);

  persistConnections();

  return true;
}

// =============================================================================
// UTILITY
// =============================================================================

export function resetCanvasStore(): void {
  data = { threads: [], nodes: [], connections: [] };
  initialized = false;
  localStorage.removeItem(THREADS_STORAGE_KEY);
  localStorage.removeItem(NODES_STORAGE_KEY);
  localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
}
