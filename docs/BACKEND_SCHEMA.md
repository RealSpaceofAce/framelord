# FrameLord Backend Schema Design

**Version:** 1.0
**Date:** 2025-12-05
**Status:** Planning Phase
**Database:** PostgreSQL 15+

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Schema Design](#schema-design)
4. [Indexes Strategy](#indexes-strategy)
5. [Migration Path](#migration-path)
6. [Trade-offs & Decisions](#trade-offs--decisions)

---

## Overview

FrameLord uses a **Contact-centric architecture** where all data flows outward from Contact Zero (the user). The backend schema preserves this spine model while adding multi-user support, persistence, and sync capabilities.

### Core Requirements

- **Contact Zero Preservation:** The user's identity remains special and immutable
- **Contact Spine:** All entities attach to contacts via foreign keys
- **Soft Deletes:** Use `is_archived` instead of hard deletes
- **BlockSuite Storage:** Store Yjs CRDT documents as binary blobs
- **Bi-directional Links:** Efficient querying for note-to-note and topic links
- **Multi-tenant:** Support multiple users with isolated data
- **Offline-first:** Schema supports sync metadata (last_synced_at, sync_version)

---

## Design Principles

1. **Single Source of Truth:** Database is authoritative, client stores are projections
2. **Immutable User Identity:** Contact Zero is created at signup and never deleted
3. **Relational Integrity:** Foreign keys enforce the Contact spine
4. **CRDT-friendly:** Store Yjs documents as bytea, preserve update history
5. **Audit Trail:** Track created_at, updated_at, created_by for all entities
6. **Soft Deletes:** `is_archived` flag instead of DELETE operations
7. **Denormalization for Performance:** Strategic use of JSONB for flexible data

---

## Schema Design

### Core Tables

#### 1. `users`

User accounts and authentication. Maps to Contact Zero.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication
  email VARCHAR(255) NOT NULL UNIQUE,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  password_hash VARCHAR(255), -- bcrypt hash, nullable for social auth

  -- Profile (mirrors Contact Zero)
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT, -- Can be Data URL or external URL
  phone VARCHAR(50),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, deleted

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'deleted'))
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### 2. `contacts`

The canonical spine. Contact Zero is created automatically at signup.

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identity
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT, -- Data URL or external URL

  -- Contact Zero flag
  is_contact_zero BOOLEAN NOT NULL DEFAULT FALSE,

  -- Relationship metadata
  relationship_domain VARCHAR(50) NOT NULL, -- business, personal, hybrid
  relationship_role VARCHAR(100) NOT NULL, -- prospect, client, friend, manager, self
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, dormant, blocked, testing, archived

  -- Frame metrics (denormalized for performance)
  frame_score INTEGER CHECK (frame_score >= 0 AND frame_score <= 100),
  frame_trend VARCHAR(10) CHECK (frame_trend IN ('up', 'down', 'flat')),
  frame_last_scan_at TIMESTAMP WITH TIME ZONE,

  -- Activity timestamps
  last_contact_at TIMESTAMP WITH TIME ZONE,
  next_action_at TIMESTAMP WITH TIME ZONE,

  -- Tags (array for flexibility)
  tags TEXT[] DEFAULT '{}',

  -- Rich profile
  company VARCHAR(255),
  title VARCHAR(255),
  location VARCHAR(255),
  linkedin_url TEXT,
  x_handle VARCHAR(255),

  -- Soft delete
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, is_contact_zero) WHERE is_contact_zero = TRUE, -- Only one Contact Zero per user
  CONSTRAINT valid_relationship_domain CHECK (relationship_domain IN ('business', 'personal', 'hybrid')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'dormant', 'blocked', 'testing', 'archived'))
);

-- Indexes
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_is_contact_zero ON contacts(user_id, is_contact_zero) WHERE is_contact_zero = TRUE;
CREATE INDEX idx_contacts_status ON contacts(status) WHERE is_archived = FALSE;
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_next_action_at ON contacts(next_action_at) WHERE next_action_at IS NOT NULL AND is_archived = FALSE;
CREATE INDEX idx_contacts_relationship_domain ON contacts(relationship_domain);
```

#### 3. `notes`

Notes with BlockSuite document storage. Supports both page and edgeless modes.

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Core fields
  title VARCHAR(500), -- NULL for untitled
  icon VARCHAR(10), -- Emoji icon

  -- BlockSuite document storage
  -- Store Yjs CRDT document as binary blob for efficiency
  blocksuite_doc_id VARCHAR(255) NOT NULL UNIQUE,
  blocksuite_doc BYTEA, -- Yjs binary update (compressed)
  blocksuite_snapshot JSONB, -- Optional JSON snapshot for backup/search

  -- Authorship (Contact spine)
  author_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Contact associations (many-to-many via target_contact_ids)
  -- We'll use a separate junction table for better querying

  -- Classification
  kind VARCHAR(50) NOT NULL DEFAULT 'note', -- log, note, system
  date_key DATE, -- YYYY-MM-DD for daily log entries

  -- Organization
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  is_inbox BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',

  -- Display preferences
  preferred_view VARCHAR(20) NOT NULL DEFAULT 'doc', -- doc, canvas
  is_pinned_home BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

  -- Soft delete
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Sync metadata (for conflict resolution)
  sync_version INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_kind CHECK (kind IN ('log', 'note', 'system')),
  CONSTRAINT valid_preferred_view CHECK (preferred_view IN ('doc', 'canvas')),
  CONSTRAINT log_must_have_date CHECK (kind != 'log' OR date_key IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_author_contact_id ON notes(author_contact_id);
CREATE INDEX idx_notes_kind ON notes(kind) WHERE is_archived = FALSE;
CREATE INDEX idx_notes_date_key ON notes(date_key) WHERE date_key IS NOT NULL;
CREATE INDEX idx_notes_folder_id ON notes(folder_id) WHERE folder_id IS NOT NULL AND is_archived = FALSE;
CREATE INDEX idx_notes_is_inbox ON notes(user_id, is_inbox) WHERE is_inbox = TRUE AND is_archived = FALSE;
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX idx_notes_blocksuite_doc_id ON notes(blocksuite_doc_id);

-- Full-text search on title and snapshot content
CREATE INDEX idx_notes_title_fts ON notes USING GIN(to_tsvector('english', COALESCE(title, '')));
CREATE INDEX idx_notes_snapshot_fts ON notes USING GIN(to_tsvector('english', COALESCE(blocksuite_snapshot::text, '')));
```

#### 4. `note_target_contacts`

Junction table for note-to-contact many-to-many relationships.

```sql
CREATE TABLE note_target_contacts (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  PRIMARY KEY (note_id, contact_id)
);

-- Indexes
CREATE INDEX idx_note_target_contacts_contact_id ON note_target_contacts(contact_id);
CREATE INDEX idx_note_target_contacts_note_id ON note_target_contacts(note_id);
```

#### 5. `note_links`

Bi-directional note-to-note links (for [[Note Title]] syntax).

```sql
CREATE TABLE note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Prevent duplicate links
  UNIQUE(source_note_id, target_note_id)
);

-- Indexes for bi-directional queries
CREATE INDEX idx_note_links_source ON note_links(source_note_id);
CREATE INDEX idx_note_links_target ON note_links(target_note_id);
```

#### 6. `topics`

Topics extracted from [[Topic]] syntax in notes.

```sql
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identity
  label VARCHAR(255) NOT NULL, -- Human-facing name
  slug VARCHAR(255) NOT NULL, -- Normalized, URL-safe

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- One topic per label per user
  UNIQUE(user_id, slug)
);

-- Indexes
CREATE INDEX idx_topics_user_id ON topics(user_id);
CREATE INDEX idx_topics_slug ON topics(user_id, slug);
```

#### 7. `note_topics`

Junction table for note-to-topic many-to-many relationships.

```sql
CREATE TABLE note_topics (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  PRIMARY KEY (note_id, topic_id)
);

-- Indexes
CREATE INDEX idx_note_topics_topic_id ON note_topics(topic_id);
CREATE INDEX idx_note_topics_note_id ON note_topics(note_id);
```

#### 8. `tasks`

Tasks attached to contacts with due dates.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contact spine
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Content
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, done, blocked

  -- Due date (drives calendar)
  due_at TIMESTAMP WITH TIME ZONE,

  -- Soft delete
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES contacts(id), -- Who created it (usually Contact Zero)

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('open', 'done', 'blocked'))
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_contact_id ON tasks(contact_id) WHERE is_archived = FALSE;
CREATE INDEX idx_tasks_status ON tasks(status) WHERE is_archived = FALSE;
CREATE INDEX idx_tasks_due_at ON tasks(due_at) WHERE due_at IS NOT NULL AND is_archived = FALSE;
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
```

#### 9. `interactions`

Logged communication events with contacts.

```sql
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contact spine
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  author_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Content
  type VARCHAR(50) NOT NULL, -- call, meeting, message, email, dm, other
  summary TEXT NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_type CHECK (type IN ('call', 'meeting', 'message', 'email', 'dm', 'other'))
);

-- Indexes
CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX idx_interactions_occurred_at ON interactions(occurred_at DESC);
CREATE INDEX idx_interactions_type ON interactions(type);
```

#### 10. `interaction_attachments`

Attachments for interactions (stored as Data URLs or references).

```sql
CREATE TABLE interaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,

  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  data_url TEXT NOT NULL, -- Data URL: data:image/png;base64,...

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_interaction_attachments_interaction_id ON interaction_attachments(interaction_id);
```

#### 11. `folders`

PARA-style folder hierarchy for notes.

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Hierarchy
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,

  -- Content
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(10), -- Emoji icon
  color VARCHAR(50), -- Hex color or preset name

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Default folders flag
  is_default BOOLEAN NOT NULL DEFAULT FALSE, -- Projects, Areas, Resources, Archive

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_is_default ON folders(user_id, is_default) WHERE is_default = TRUE;
```

#### 12. `groups`

Contact grouping with banners.

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  name VARCHAR(255) NOT NULL,
  description TEXT,
  banner_url TEXT, -- Data URL or external URL

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_groups_user_id ON groups(user_id);
```

#### 13. `group_memberships`

Junction table for group-to-contact many-to-many relationships.

```sql
CREATE TABLE group_memberships (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  PRIMARY KEY (group_id, contact_id)
);

-- Indexes
CREATE INDEX idx_group_memberships_contact_id ON group_memberships(contact_id);
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
```

#### 14. `projects`

Asana-style projects with task sections.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  name VARCHAR(255) NOT NULL,
  description TEXT,
  banner_url TEXT, -- Data URL or external URL

  -- Contact spine
  primary_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, on_hold, completed, archived
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical

  -- Dates
  start_date DATE,
  due_date DATE,

  -- Group project flag
  is_group_project BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_primary_contact_id ON projects(primary_contact_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_due_date ON projects(due_date) WHERE due_date IS NOT NULL;
```

#### 15. `project_related_contacts`

Additional contacts involved in a project.

```sql
CREATE TABLE project_related_contacts (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  PRIMARY KEY (project_id, contact_id)
);

-- Indexes
CREATE INDEX idx_project_related_contacts_contact_id ON project_related_contacts(contact_id);
```

#### 16. `project_sections`

Vertical sections within projects (Backlog, In Progress, Done).

```sql
CREATE TABLE project_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_sections_project_id ON project_sections(project_id);
```

#### 17. `project_task_links`

Links tasks to project sections (no task duplication).

```sql
CREATE TABLE project_task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES project_sections(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- One task per section per project
  UNIQUE(project_id, section_id, task_id)
);

-- Indexes
CREATE INDEX idx_project_task_links_project_id ON project_task_links(project_id);
CREATE INDEX idx_project_task_links_section_id ON project_task_links(section_id);
CREATE INDEX idx_project_task_links_task_id ON project_task_links(task_id);
```

#### 18. `project_attachments`

File attachments for projects.

```sql
CREATE TABLE project_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  data_url TEXT NOT NULL, -- Data URL
  uploaded_by UUID NOT NULL REFERENCES contacts(id),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_attachments_project_id ON project_attachments(project_id);
```

#### 19. `pipeline_templates`

Pipeline stage configurations (sales, recruiting, onboarding).

```sql
CREATE TABLE pipeline_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  name VARCHAR(255) NOT NULL,
  description TEXT,
  domain VARCHAR(50) NOT NULL, -- business, personal, hybrid
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_domain CHECK (domain IN ('business', 'personal', 'hybrid'))
);

-- Indexes
CREATE INDEX idx_pipeline_templates_user_id ON pipeline_templates(user_id);
CREATE INDEX idx_pipeline_templates_domain ON pipeline_templates(domain);
```

#### 20. `pipeline_stage_templates`

Stages within pipeline templates.

```sql
CREATE TABLE pipeline_stage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  template_id UUID NOT NULL REFERENCES pipeline_templates(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL,
  color VARCHAR(50),

  -- Auto-task creation
  auto_task_title VARCHAR(500),
  auto_task_due_in_days INTEGER,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pipeline_stage_templates_template_id ON pipeline_stage_templates(template_id);
```

#### 21. `pipeline_items`

Contact progression through pipeline stages.

```sql
CREATE TABLE pipeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Pipeline
  template_id UUID NOT NULL REFERENCES pipeline_templates(id) ON DELETE CASCADE,
  current_stage_id UUID NOT NULL REFERENCES pipeline_stage_templates(id),

  -- Contact spine
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Content
  label VARCHAR(255), -- Deal name, case name, etc.
  value NUMERIC(12, 2), -- Deal value

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, won, lost, archived

  -- Dates
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('open', 'won', 'lost', 'archived'))
);

-- Indexes
CREATE INDEX idx_pipeline_items_user_id ON pipeline_items(user_id);
CREATE INDEX idx_pipeline_items_template_id ON pipeline_items(template_id);
CREATE INDEX idx_pipeline_items_contact_id ON pipeline_items(contact_id);
CREATE INDEX idx_pipeline_items_current_stage_id ON pipeline_items(current_stage_id);
CREATE INDEX idx_pipeline_items_status ON pipeline_items(status);
```

---

## Indexes Strategy

### Performance Optimization

1. **Contact Queries:** Primary index on `user_id`, secondary on `status`, `next_action_at`
2. **Note Queries:** Indexes on `user_id`, `folder_id`, `date_key`, `is_inbox`, plus full-text search
3. **Task Queries:** Indexes on `contact_id`, `due_at`, `status` for calendar and list views
4. **Bi-directional Links:** Dual indexes on `note_links` for both source→target and target→source lookups
5. **Topic Graph:** GIN index on `note_topics` for fast graph traversal
6. **Full-Text Search:** GIN indexes on note titles and content snapshots

### Partial Indexes

Use `WHERE` clauses to reduce index size:
- Only index active records: `WHERE is_archived = FALSE`
- Only index records with values: `WHERE due_at IS NOT NULL`
- Only index special flags: `WHERE is_contact_zero = TRUE`

---

## Migration Path

### From In-Memory to Database

1. **Phase 1: Schema Creation**
   - Run all CREATE TABLE statements
   - Create indexes
   - Set up foreign key constraints

2. **Phase 2: Data Migration**
   - Export in-memory stores to JSON
   - Transform to match schema
   - Import via batch INSERT statements
   - Validate Contact Zero creation

3. **Phase 3: BlockSuite Documents**
   - For each note with legacy `content` field:
     - Create BlockSuite Yjs document
     - Migrate content to BlockSuite
     - Store binary update in `blocksuite_doc`
     - Generate JSON snapshot for search

4. **Phase 4: Sync Layer**
   - Add sync metadata to all tables
   - Implement conflict resolution
   - Test offline→online sync

---

## Trade-offs & Decisions

### 1. BlockSuite Storage: Binary vs JSON

**Decision:** Store both `blocksuite_doc` (BYTEA) and `blocksuite_snapshot` (JSONB)

**Rationale:**
- Binary blob is efficient for Yjs CRDT updates (compact, fast)
- JSON snapshot enables full-text search and backup without Yjs parsing
- Minimal storage cost (~20-30% overhead) for significant flexibility

**Alternative Considered:** Binary-only storage
- Would require Yjs parsing for search
- Harder to debug and inspect
- No fallback if Yjs schema changes

### 2. Contact Zero: Special Flag vs Separate Table

**Decision:** Use `is_contact_zero` boolean flag in `contacts` table

**Rationale:**
- Simpler schema (one table for all contacts)
- Easier to query "all my contacts including me"
- Unique constraint prevents duplicates
- Foreign keys work seamlessly

**Alternative Considered:** Separate `users` table with profile fields
- Would duplicate fields (full_name, avatar_url, etc.)
- Harder to maintain consistency
- More complex joins

### 3. Attachments: Data URLs vs File Storage

**Decision:** Store Data URLs in TEXT columns (for now)

**Rationale:**
- Matches current in-memory model (no refactoring needed)
- Eliminates file upload/storage complexity
- Works offline seamlessly
- Simpler to backup (just database dumps)

**Limitations:**
- Database bloat for large files (>10MB)
- Slower queries when selecting attachments

**Future Migration Path:**
- Add S3/object storage layer
- Store URLs instead of Data URLs
- Migrate large attachments in background

### 4. Note-to-Contact: Junction Table vs Array

**Decision:** Use `note_target_contacts` junction table instead of `contact_ids ARRAY`

**Rationale:**
- Better relational integrity (foreign keys)
- Easier to query "all notes for contact X"
- Standard many-to-many pattern
- Supports additional metadata (e.g., mention_type)

**Alternative Considered:** ARRAY of UUIDs
- Simpler schema (one less table)
- But: harder to join, no foreign keys, poor query performance

### 5. Soft Deletes vs Hard Deletes

**Decision:** Soft deletes with `is_archived` flag everywhere

**Rationale:**
- Allows undo/restore functionality
- Preserves data integrity (no orphaned foreign keys)
- Audit trail for compliance
- Sync layer can distinguish delete vs archive

**Implementation:**
- Always filter `WHERE is_archived = FALSE` in queries
- Add partial indexes to exclude archived records
- Periodic cleanup job for truly deleted records (optional)

---

## Open Questions for Product Decisions

1. **Storage Limits:**
   - What's the max size for Data URL attachments? (Suggest: 10MB per file)
   - Should we warn users before hitting database bloat?

2. **Data Retention:**
   - How long to keep archived records before hard delete? (Suggest: 90 days)
   - Should Contact Zero ever be deletable? (Suggest: No, account closure deletes user)

3. **Multi-Device Sync:**
   - Conflict resolution: last-write-wins or CRDT merge? (Suggest: CRDT for notes, LWW for metadata)
   - How to handle schema version mismatches across devices?

4. **Search Performance:**
   - Should we use external search (Elasticsearch, Algolia) for full-text? (Suggest: Start with PostgreSQL FTS)
   - How to index BlockSuite canvas objects for search?

5. **Backup Strategy:**
   - How often to snapshot Yjs documents to JSON? (Suggest: On every save)
   - Should we version BlockSuite documents? (Suggest: Not in v1, add later)

---

## Next Steps

1. **Review & Approve:** Get product/engineering sign-off on schema
2. **Prototype:** Test Yjs binary storage with real BlockSuite documents
3. **Migration Script:** Write script to convert in-memory stores → PostgreSQL
4. **Sync Strategy:** Design conflict resolution (see `SYNC_STRATEGY.md`)
5. **API Design:** Map schema to REST/GraphQL endpoints (see `API_SPEC.md`)

---

**End of Schema Design Document**
