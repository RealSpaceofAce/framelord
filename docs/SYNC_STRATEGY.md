# FrameLord Sync Strategy

**Version:** 1.0
**Date:** 2025-12-05
**Status:** Planning Phase
**Approach:** Offline-first with CRDT for documents, LWW for metadata

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Sync Architecture](#sync-architecture)
4. [Conflict Resolution](#conflict-resolution)
5. [Implementation Details](#implementation-details)
6. [Edge Cases](#edge-cases)
7. [Performance Optimization](#performance-optimization)
8. [Migration Path](#migration-path)

---

## Overview

FrameLord is designed as an **offline-first** application that works seamlessly without internet connectivity. The sync strategy ensures data consistency across devices while preserving the user's ability to work offline indefinitely.

### Core Requirements

- **Offline-first:** App works fully offline, no degraded experience
- **Multi-device:** Sync across desktop, mobile, web
- **Contact Zero preservation:** User identity remains local and canonical
- **No data loss:** Conflicts are detected and resolved gracefully
- **Low latency:** Sync operations complete in <500ms for typical changes
- **Bandwidth efficient:** Only sync changed entities, not full state

---

## Design Principles

### 1. Local-First Architecture

The client's in-memory stores are the **primary source of truth** for the user. The backend is a **sync peer**, not a master.

```
┌─────────────────┐
│   Client App    │  ← Primary source of truth
│  (In-Memory)    │
└────────┬────────┘
         │
         │ Sync (bidirectional)
         │
┌────────▼────────┐
│  Backend (DB)   │  ← Sync peer & multi-device coordinator
└─────────────────┘
```

### 2. Hybrid Sync Strategy

- **CRDT (Yjs) for BlockSuite documents:** Automatic merge, no conflicts
- **Last-Write-Wins (LWW) for metadata:** Simple, predictable, 99% correct
- **Manual resolution for edge cases:** Prompt user when LWW is ambiguous

### 3. Optimistic UI

- All user actions succeed immediately in local stores
- Sync happens in background
- Failed syncs show notification + retry

---

## Sync Architecture

### Sync Lifecycle

```
┌───────────────────────────────────────────────────────────┐
│                    USER ACTIONS                           │
└───────────────┬───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│  1. UPDATE LOCAL STORE (immediate, optimistic)            │
│     - contactStore.updateContact(...)                     │
│     - noteStore.updateNote(...)                           │
└───────────────┬───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│  2. QUEUE SYNC CHANGE (in SyncQueue)                      │
│     - Add change to pending queue                         │
│     - Debounce: wait 2s before syncing                    │
└───────────────┬───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│  3. PUSH TO SERVER (when online)                          │
│     POST /sync/push { changes: [...] }                    │
│     - Send batched changes                                │
│     - Include sync_version for conflict detection         │
└───────────────┬───────────────────────────────────────────┘
                │
      ┌─────────┴──────────┐
      │                    │
      ▼                    ▼
┌─────────────┐      ┌─────────────┐
│  SUCCESS    │      │   CONFLICT  │
│  (200 OK)   │      │  (409)      │
└──────┬──────┘      └──────┬──────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────────────┐
│ Clear queue │      │ Resolve conflict    │
│ Update      │      │ (CRDT merge or LWW) │
│ sync meta   │      │ Retry push          │
└─────────────┘      └─────────────────────┘
```

### Periodic Pull Sync

```
Every 30s (when online):
┌───────────────────────────────────────────────────────────┐
│  1. PULL FROM SERVER                                      │
│     POST /sync/pull { last_sync_timestamp }               │
└───────────────┬───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│  2. MERGE REMOTE CHANGES                                  │
│     - For each remote change:                             │
│       - Check if local version is newer                   │
│       - If remote is newer: apply to local store          │
│       - If conflict: resolve (CRDT or LWW)                │
└───────────────┬───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│  3. UPDATE UI                                             │
│     - Notify user of changes                              │
│     - Show sync status in header                          │
└───────────────────────────────────────────────────────────┘
```

---

## Conflict Resolution

### 1. BlockSuite Documents (Notes, Canvas)

**Strategy:** CRDT (Yjs) automatic merge

**How it works:**
- BlockSuite uses Yjs internally for collaborative editing
- Store Yjs updates as binary blobs in database
- On sync conflict:
  1. Fetch remote Yjs updates
  2. Apply to local Yjs document (automatic merge)
  3. No user intervention needed
  4. Push merged updates back to server

**Example:**
```typescript
// Device A: User types "Hello" in note
yDoc.getText('content').insert(0, 'Hello');
const updateA = Y.encodeStateAsUpdate(yDoc);

// Device B: User types "World" in same note
yDoc.getText('content').insert(0, 'World');
const updateB = Y.encodeStateAsUpdate(yDoc);

// Server receives both updates
// Yjs merges automatically: "WorldHello" or "HelloWorld" (deterministic)
// Both devices pull merged state → consistent
```

**Edge cases handled by Yjs:**
- Concurrent insertions at same position
- Concurrent deletions of same text
- Undo/redo across devices

**Advantages:**
- Zero conflicts for document content
- Automatic merge is always correct
- Users never see merge prompts

**Limitations:**
- Requires Yjs library client-side
- Slightly larger storage footprint
- Not suitable for metadata (use LWW)

---

### 2. Metadata (Contact, Task, Interaction, etc.)

**Strategy:** Last-Write-Wins (LWW) with vector clock

**How it works:**
1. Every entity has `sync_version` (integer) and `updated_at` (timestamp)
2. On update: increment `sync_version`, set `updated_at = now()`
3. On sync conflict:
   - Compare `sync_version`:
     - If `server_version > client_version`: accept server (client outdated)
     - If `client_version > server_version`: accept client (client is newer)
     - If `server_version == client_version` but `updated_at` differs: use `updated_at` as tie-breaker
   - Apply winning version to both client and server

**Example:**
```typescript
// Initial state (both devices)
contact = { id: 'cnt_123', name: 'Sarah', sync_version: 5, updated_at: '2025-12-05T10:00:00Z' }

// Device A (offline): Update name to "Sarah Chen"
contact.name = 'Sarah Chen';
contact.sync_version = 6;
contact.updated_at = '2025-12-05T10:30:00Z';

// Device B (online): Update name to "Sarah Williams"
contact.name = 'Sarah Williams';
contact.sync_version = 6;
contact.updated_at = '2025-12-05T10:35:00Z';

// Device A comes online, pushes change
// Server sees sync_version 6 from Device A

// Device B pushes change
// Server sees sync_version 6 from Device B
// Conflict! Both version 6, but different updated_at

// Resolution: Compare updated_at
// Device B wins (10:35 > 10:30)
// Server: name = 'Sarah Williams', sync_version = 7, updated_at = '2025-12-05T10:35:00Z'

// Next pull: Device A gets winning version
// Device A updates: name = 'Sarah Williams'
// User on Device A sees notification: "Contact updated on another device"
```

**Advantages:**
- Simple to implement
- Deterministic (same result every time)
- Works for 99% of cases (rare for users to edit same field on 2 devices simultaneously)

**Limitations:**
- Can lose data in rare concurrent edits
- User sees "last device wins" behavior
- Requires user to manually merge if needed

---

### 3. Manual Resolution (Rare Cases)

For critical conflicts that LWW cannot safely resolve, prompt the user.

**Trigger conditions:**
- User edited same contact on 2 devices within 60 seconds
- Both changes are substantive (not just timestamp updates)
- Conflict affects critical fields (email, phone, status)

**UI Flow:**
```
┌─────────────────────────────────────────────────┐
│  Conflict Detected                              │
│                                                 │
│  Contact "Sarah Chen" was edited on:           │
│  - This device: 2025-12-05 10:30 AM            │
│  - Another device: 2025-12-05 10:35 AM         │
│                                                 │
│  ┌──────────────┐   ┌──────────────┐           │
│  │ Keep Local   │   │ Use Remote   │           │
│  │ Sarah Chen   │   │ Sarah Williams│          │
│  └──────────────┘   └──────────────┘           │
│                                                 │
│  [ View Details ]  [ Merge Manually ]          │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Store conflicted versions in `sync_conflicts` table
- Show notification badge on sync icon
- Allow user to review and choose winning version
- After resolution, mark conflict as resolved

---

## Implementation Details

### Sync Queue (Client-Side)

**Purpose:** Batch and debounce local changes before syncing

```typescript
interface SyncChange {
  entityType: 'contact' | 'note' | 'task' | 'interaction' | 'folder' | 'group' | 'project' | 'pipeline';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  clientTimestamp: string; // ISO 8601
  syncVersion: number;
}

class SyncQueue {
  private queue: SyncChange[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;

  // Add change to queue
  enqueue(change: SyncChange) {
    // Remove duplicate changes for same entity
    this.queue = this.queue.filter(
      c => !(c.entityType === change.entityType && c.entityId === change.entityId)
    );

    this.queue.push(change);

    // Debounce: wait 2s before syncing
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), 2000);
  }

  // Flush queue to server
  async flush() {
    if (this.queue.length === 0) return;

    const changes = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch('/api/v1/sync/push', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: getDeviceId(),
          sync_timestamp: new Date().toISOString(),
          changes,
        }),
      });

      if (response.ok) {
        const { successful, failed, conflicts } = await response.json();

        // Handle conflicts
        for (const conflict of conflicts) {
          await this.resolveConflict(conflict);
        }

        // Retry failed changes
        for (const failedChange of failed) {
          this.enqueue(failedChange);
        }
      } else {
        // Network error - re-queue changes
        this.queue.unshift(...changes);
      }
    } catch (error) {
      // Offline - re-queue changes
      this.queue.unshift(...changes);
    }
  }

  async resolveConflict(conflict: any) {
    // Implement conflict resolution logic
    // For CRDT: merge Yjs updates
    // For LWW: compare versions and apply winner
  }
}
```

### Sync Metadata (Database)

Add to all entity tables:

```sql
-- Sync versioning
sync_version INTEGER NOT NULL DEFAULT 0,
last_synced_at TIMESTAMP WITH TIME ZONE,

-- Device tracking (optional, for debugging)
last_synced_device_id VARCHAR(255)
```

### Sync Status Indicator (UI)

```typescript
type SyncStatus =
  | 'synced'           // All changes pushed, all pulls applied
  | 'syncing'          // Push/pull in progress
  | 'pending'          // Changes queued, waiting to sync
  | 'offline'          // No network connection
  | 'error'            // Sync failed, will retry
  | 'conflict';        // Manual resolution needed

interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingChanges: number;
  conflicts: number;
}
```

**UI Display:**
```
┌─────────────────────────────────────────┐
│  FrameLord                    🟢 Synced │  ← Green dot = all synced
│                                         │
│  FrameLord                    🔵 Syncing│  ← Blue dot = in progress
│                                         │
│  FrameLord                    🟡 Offline│  ← Yellow dot = offline
│                                         │
│  FrameLord           ⚠️ 3 conflicts     │  ← Red badge = needs attention
└─────────────────────────────────────────┘
```

---

## Edge Cases

### 1. Contact Zero Sync

**Problem:** Contact Zero is special and should remain local

**Solution:** Never sync Contact Zero to server
- Contact Zero is created at signup and tied to `users` table
- Backend enforces: user can only have one Contact Zero
- Sync endpoints exclude Contact Zero from push/pull

**Implementation:**
```typescript
// SyncQueue: Filter out Contact Zero before push
const syncableChanges = changes.filter(
  c => !(c.entityType === 'contact' && c.entityId === CONTACT_ZERO.id)
);
```

### 2. Deleted Entity Sync

**Problem:** If Entity A is deleted on Device 1, but edited on Device 2, what happens?

**Solution:** Tombstone soft deletes
- Deletion sets `is_archived = true` and increments `sync_version`
- Sync propagates `is_archived` flag
- Device 2 receives deletion and marks local entity as archived
- User can restore from archive if needed

### 3. Offline for Days/Weeks

**Problem:** User works offline for weeks, then comes online with huge changeset

**Solution:** Batched sync with progress indicator
1. Pull remote changes first (detect if local is way behind)
2. Show progress: "Syncing 1,234 changes... 45% complete"
3. Push local changes in batches of 100
4. Merge conflicts incrementally
5. Final reconciliation pass

### 4. Network Intermittency

**Problem:** Sync push/pull fails mid-operation

**Solution:** Retry with exponential backoff
```typescript
async function syncWithRetry(maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await syncQueue.flush();
      await pullRemoteChanges();
      return; // Success
    } catch (error) {
      if (attempt === maxRetries) {
        showNotification('Sync failed. Will retry automatically.');
        return;
      }

      // Exponential backoff: 2s, 4s, 8s, 16s, 32s
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
    }
  }
}
```

### 5. Schema Version Mismatch

**Problem:** Client is on v1.2.3, server schema upgraded to v1.3.0

**Solution:** Include schema version in sync requests
```typescript
POST /sync/push
{
  client_version: "1.2.3",
  schema_version: "1",
  changes: [...]
}
```

**Server response:**
```json
{
  "error": {
    "code": "SCHEMA_MISMATCH",
    "message": "Please update FrameLord to the latest version",
    "required_version": "1.3.0"
  }
}
```

---

## Performance Optimization

### 1. Incremental Sync

Only sync changed entities since last sync timestamp.

**Pull request:**
```json
POST /sync/pull
{
  "last_sync_timestamp": "2025-12-05T10:00:00Z"
}
```

**Server response:**
```json
{
  "changes": [
    { "entity_type": "contact", "entity_id": "cnt_123", "operation": "update", ... }
  ],
  "sync_timestamp": "2025-12-05T11:00:00Z"
}
```

### 2. Delta Sync for BlockSuite

Instead of syncing full Yjs document, sync only the delta updates.

**How it works:**
1. Client stores last synced Yjs state vector
2. On sync, encode only updates since last state vector
3. Server applies updates to stored Yjs document
4. Server returns new state vector

**Example:**
```typescript
// Client: Get updates since last sync
const lastStateVector = localStorage.getItem('note_123_state_vector');
const updates = Y.encodeStateAsUpdate(yDoc, lastStateVector);

// Push to server
POST /notes/note_123/sync
{
  "yjs_updates": base64(updates),
  "sync_version": 12
}

// Server: Apply updates, return new state vector
{
  "new_state_vector": base64(newStateVector),
  "sync_version": 13
}
```

**Bandwidth savings:** 95%+ for typical edits (only send changed blocks, not entire document)

### 3. Compression

Compress large payloads (BlockSuite documents) before syncing.

**Client:**
```typescript
import pako from 'pako';

const compressed = pako.gzip(blocksuiteDoc);
const base64 = btoa(String.fromCharCode(...compressed));
```

**Server:**
```python
import gzip
import base64

compressed = base64.b64decode(payload)
decompressed = gzip.decompress(compressed)
```

**Bandwidth savings:** 70-90% for text-heavy documents

### 4. Background Sync

Use Web Workers / Service Workers to sync in background without blocking UI.

**Implementation:**
```typescript
// Main thread: Enqueue change
syncQueue.enqueue(change);

// Web Worker: Flush queue
self.addEventListener('message', async (event) => {
  if (event.data.type === 'SYNC_FLUSH') {
    await flushSyncQueue();
    self.postMessage({ type: 'SYNC_COMPLETE' });
  }
});
```

---

## Migration Path

### Phase 1: Add Sync Infrastructure (No Backend Required)

1. Add `SyncQueue` to client
2. Add `sync_version`, `last_synced_at` to all in-memory stores
3. Increment `sync_version` on every local update
4. Test sync queue batching and debouncing
5. **No server needed yet** - just infrastructure

### Phase 2: Backend Setup

1. Deploy PostgreSQL schema (see `BACKEND_SCHEMA.md`)
2. Implement `/sync/push` and `/sync/pull` endpoints
3. Add JWT authentication (see `AUTH_DESIGN.md`)
4. Test with one user, one device

### Phase 3: Multi-Device Sync

1. Test with one user, two devices
2. Implement LWW conflict resolution
3. Test with concurrent edits
4. Add conflict resolution UI

### Phase 4: CRDT for Notes

1. Integrate Yjs for BlockSuite documents
2. Store Yjs updates in database
3. Implement delta sync
4. Test with large documents (10,000+ blocks)

### Phase 5: Production Hardening

1. Add retry logic and error handling
2. Implement exponential backoff
3. Add progress indicators for large syncs
4. Monitor sync performance and latency

---

## Open Questions for Product Decisions

1. **Conflict Notification Strategy:**
   - Silent merge (Yjs): No notification, just merge
   - LWW with notification: "Contact updated on another device"
   - Manual resolution: Show conflict dialog
   - **Recommendation:** Silent merge for notes, LWW with notification for metadata

2. **Sync Frequency:**
   - Pull every 30s? 60s? 5min?
   - Push immediately after change? Debounce 2s? 5s?
   - **Recommendation:** Pull every 30s, push debounce 2s

3. **Offline Limit:**
   - How long can user work offline before forced sync?
   - Unlimited? 30 days? 90 days?
   - **Recommendation:** Unlimited offline, but warn if >7 days out of sync

4. **Bandwidth Budget:**
   - How much data can user sync per month on mobile?
   - Unlimited on WiFi, limited on cellular?
   - **Recommendation:** Compress all syncs, warn if >100MB/month on cellular

5. **Contact Zero Portability:**
   - Should user be able to export/import Contact Zero to new account?
   - What happens if user creates new account but wants old Contact Zero?
   - **Recommendation:** One Contact Zero per account, but allow manual merge during migration

---

## Next Steps

1. **Prototype CRDT Sync:** Test Yjs with real BlockSuite documents
2. **Benchmark LWW:** Measure conflict rate in simulated multi-device usage
3. **Design Conflict UI:** Mockups for manual resolution flow
4. **Implement Sync Queue:** Build client-side batching and debouncing
5. **Backend Endpoints:** Implement `/sync/push` and `/sync/pull` (see `API_SPEC.md`)

---

**End of Sync Strategy Document**
