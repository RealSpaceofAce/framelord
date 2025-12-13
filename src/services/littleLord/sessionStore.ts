// =============================================================================
// LITTLE LORD SESSION STORE — Conversation persistence and history
// =============================================================================
// Provides persistent storage for Little Lord conversation sessions.
// Sessions are saved to localStorage and synced between widget and fullscreen.
// =============================================================================

import { LittleLordMessage, LittleLordConversation } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'framelord_littlelord_sessions';
const CURRENT_SESSION_KEY = 'framelord_littlelord_current_session';
const MAX_SESSIONS = 50; // Keep last 50 sessions
const MAX_MESSAGES_PER_SESSION = 100; // Max messages per session

// =============================================================================
// INTERNAL STATE
// =============================================================================

let sessions: LittleLordConversation[] = [];
let currentSessionId: string | null = null;
let listeners: Set<() => void> = new Set();

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Load sessions from localStorage
 */
function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      sessions = JSON.parse(stored);
    }
    const currentId = localStorage.getItem(CURRENT_SESSION_KEY);
    if (currentId && sessions.some(s => s.id === currentId)) {
      currentSessionId = currentId;
    }
  } catch (e) {
    console.warn('[LittleLordSessionStore] Failed to load from storage:', e);
    sessions = [];
    currentSessionId = null;
  }
}

/**
 * Save sessions to localStorage
 */
function saveToStorage(): void {
  try {
    // Trim to max sessions
    if (sessions.length > MAX_SESSIONS) {
      sessions = sessions.slice(-MAX_SESSIONS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    if (currentSessionId) {
      localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  } catch (e) {
    console.warn('[LittleLordSessionStore] Failed to save to storage:', e);
  }
}

/**
 * Notify all listeners of state change
 */
function notifyListeners(): void {
  listeners.forEach(listener => listener());
}

// Initialize on module load
loadFromStorage();

// =============================================================================
// SESSION CRUD
// =============================================================================

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `ll-session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new conversation session
 */
export function createSession(tenantId: string, userId: string): LittleLordConversation {
  const now = new Date().toISOString();
  const session: LittleLordConversation = {
    id: generateSessionId(),
    tenantId,
    userId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  sessions.push(session);
  currentSessionId = session.id;
  saveToStorage();
  notifyListeners();
  return session;
}

/**
 * Get current active session, or create one if none exists
 */
export function getCurrentSession(tenantId: string, userId: string): LittleLordConversation {
  if (currentSessionId) {
    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
      return session;
    }
  }
  return createSession(tenantId, userId);
}

/**
 * Get session by ID
 */
export function getSessionById(sessionId: string): LittleLordConversation | undefined {
  return sessions.find(s => s.id === sessionId);
}

/**
 * Get all sessions for a user (most recent first)
 */
export function getAllSessions(tenantId: string, userId: string): LittleLordConversation[] {
  return sessions
    .filter(s => s.tenantId === tenantId && s.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Get sessions with at least one message (for history view)
 */
export function getSessionsWithMessages(tenantId: string, userId: string): LittleLordConversation[] {
  return getAllSessions(tenantId, userId).filter(s => s.messages.length > 0);
}

/**
 * Switch to an existing session
 */
export function switchToSession(sessionId: string): LittleLordConversation | null {
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    currentSessionId = sessionId;
    saveToStorage();
    notifyListeners();
    return session;
  }
  return null;
}

/**
 * Start a new chat (create new session and switch to it)
 */
export function startNewChat(tenantId: string, userId: string): LittleLordConversation {
  const session = createSession(tenantId, userId);
  return session;
}

/**
 * Get the current session ID
 */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

// =============================================================================
// MESSAGE MANAGEMENT
// =============================================================================

/**
 * Add a message to the current session
 */
export function addMessage(message: LittleLordMessage): void {
  if (!currentSessionId) {
    console.warn('[LittleLordSessionStore] No current session to add message to');
    return;
  }

  const session = sessions.find(s => s.id === currentSessionId);
  if (!session) {
    console.warn('[LittleLordSessionStore] Current session not found');
    return;
  }

  // Add timestamp if not present
  const messageWithTimestamp: LittleLordMessage = {
    ...message,
    timestamp: message.timestamp || new Date().toISOString(),
  };

  session.messages.push(messageWithTimestamp);
  session.updatedAt = new Date().toISOString();

  // Trim to max messages
  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
  }

  saveToStorage();
  notifyListeners();
}

/**
 * Add user message to current session
 */
export function addUserMessage(content: string): void {
  addMessage({ role: 'user', content });
}

/**
 * Add assistant message to current session
 */
export function addAssistantMessage(content: string): void {
  addMessage({ role: 'assistant', content });
}

/**
 * Get messages for current session
 */
export function getCurrentMessages(): LittleLordMessage[] {
  if (!currentSessionId) return [];
  const session = sessions.find(s => s.id === currentSessionId);
  return session?.messages || [];
}

/**
 * Clear messages for current session (but keep the session)
 */
export function clearCurrentMessages(): void {
  if (!currentSessionId) return;
  const session = sessions.find(s => s.id === currentSessionId);
  if (session) {
    session.messages = [];
    session.updatedAt = new Date().toISOString();
    saveToStorage();
    notifyListeners();
  }
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index === -1) return false;

  sessions.splice(index, 1);

  // If we deleted the current session, clear it
  if (currentSessionId === sessionId) {
    currentSessionId = null;
  }

  saveToStorage();
  notifyListeners();
  return true;
}

/**
 * Delete all sessions for a user
 */
export function clearAllSessions(tenantId: string, userId: string): void {
  sessions = sessions.filter(s => !(s.tenantId === tenantId && s.userId === userId));
  if (currentSessionId && !sessions.some(s => s.id === currentSessionId)) {
    currentSessionId = null;
  }
  saveToStorage();
  notifyListeners();
}

// =============================================================================
// SUBSCRIPTION
// =============================================================================

/**
 * Subscribe to session changes
 * Returns unsubscribe function
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// =============================================================================
// SESSION TITLE HELPERS
// =============================================================================

/**
 * Get a title for a session based on first user message
 */
export function getSessionTitle(session: LittleLordConversation): string {
  const firstUserMessage = session.messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content;
    // Truncate to 40 chars
    if (content.length > 40) {
      return content.slice(0, 40) + '...';
    }
    return content;
  }
  return 'New Conversation';
}

/**
 * Get formatted date for a session
 */
export function getSessionDate(session: LittleLordConversation): string {
  const date = new Date(session.updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
