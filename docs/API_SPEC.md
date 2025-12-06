# FrameLord API Specification

**Version:** 1.0
**Date:** 2025-12-05
**Status:** Planning Phase
**Protocol:** REST over HTTPS
**Format:** JSON

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Pagination](#pagination)
8. [Webhooks](#webhooks)

---

## Overview

The FrameLord API provides RESTful endpoints for managing contacts, notes, tasks, and all other entities in the Contact-centric CRM system. The API is designed to support offline-first clients with sync capabilities.

### Base URL

```
Production:  https://api.framelord.ai/v1
Staging:     https://api-staging.framelord.ai/v1
Development: http://localhost:3000/api/v1
```

### Design Principles

1. **RESTful:** Standard HTTP verbs (GET, POST, PUT, PATCH, DELETE)
2. **JSON:** All requests/responses use `application/json`
3. **Idempotent:** PUT/DELETE operations are safe to retry
4. **Stateless:** Each request contains all necessary authentication
5. **Versioned:** API version in URL path (`/v1/`)
6. **Paginated:** List endpoints return paginated results
7. **Filtered:** Support query parameters for filtering, sorting, searching

---

## Authentication

### JWT Bearer Token

All API requests (except `/auth/login` and `/auth/register`) require a JWT bearer token.

**Header:**
```http
Authorization: Bearer <jwt_token>
```

**Token Structure:**
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "contact_zero_id": "contact_uuid",
  "iat": 1701234567,
  "exp": 1701320967
}
```

**Token Lifetime:**
- Access token: 1 hour
- Refresh token: 30 days

### Authentication Endpoints

See [AUTH_DESIGN.md](./AUTH_DESIGN.md) for full authentication flow.

---

## Common Patterns

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
X-Client-Version: 1.2.3
X-Device-ID: <unique_device_id>
```

### Response Format

**Success (200 OK):**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-12-05T10:30:00Z"
  }
}
```

**Success with Pagination (200 OK):**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 234,
    "total_pages": 5
  },
  "links": {
    "first": "/api/v1/notes?page=1",
    "prev": null,
    "next": "/api/v1/notes?page=2",
    "last": "/api/v1/notes?page=5"
  }
}
```

**Error (4xx/5xx):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-12-05T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### Timestamps

All timestamps use **ISO 8601 format with timezone**:
```
2025-12-05T10:30:00Z
```

### Soft Deletes

Deleting resources sets `is_archived: true` instead of hard delete. Use query parameter `?include_archived=true` to fetch archived records.

---

## API Endpoints

### 1. Authentication

#### POST `/auth/register`

Create a new user account and Contact Zero.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "avatar_url": "data:image/png;base64,..."
}
```

**Response (201 Created):**
```json
{
  "data": {
    "user": {
      "id": "usr_123",
      "email": "user@example.com",
      "full_name": "John Doe",
      "created_at": "2025-12-05T10:30:00Z"
    },
    "contact_zero": {
      "id": "cnt_zero_123",
      "full_name": "John Doe",
      "is_contact_zero": true,
      "relationship_role": "self"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

#### POST `/auth/login`

Authenticate with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "user": { ... },
    "contact_zero": { ... },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

#### POST `/auth/refresh`

Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

#### POST `/auth/logout`

Invalidate current session.

**Request:** (no body, uses Authorization header)

**Response (204 No Content)**

#### GET `/auth/me`

Get current user info and Contact Zero.

**Response (200 OK):**
```json
{
  "data": {
    "user": {
      "id": "usr_123",
      "email": "user@example.com",
      "full_name": "John Doe"
    },
    "contact_zero": {
      "id": "cnt_zero_123",
      "full_name": "John Doe",
      "is_contact_zero": true,
      "avatar_url": "data:image/png;base64,...",
      "frame": {
        "current_score": 85,
        "trend": "up"
      }
    }
  }
}
```

---

### 2. Contacts

#### GET `/contacts`

List all contacts for the authenticated user.

**Query Parameters:**
- `status` (string): Filter by status (active, dormant, blocked, testing, archived)
- `domain` (string): Filter by relationship domain (business, personal, hybrid)
- `tags` (string[]): Filter by tags (comma-separated)
- `search` (string): Full-text search on name, email, company
- `include_archived` (boolean): Include archived contacts (default: false)
- `page` (integer): Page number (default: 1)
- `per_page` (integer): Items per page (default: 50, max: 100)
- `sort` (string): Sort field (name, created_at, last_contact_at, next_action_at)
- `order` (string): Sort order (asc, desc)

**Example Request:**
```http
GET /contacts?status=active&domain=business&page=1&per_page=50
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "cnt_456",
      "full_name": "Sarah Chen",
      "email": "sarah@example.com",
      "phone": "+1 555 0192",
      "avatar_url": "https://...",
      "relationship_domain": "business",
      "relationship_role": "prospect",
      "status": "active",
      "frame": {
        "current_score": 72,
        "trend": "up",
        "last_scan_at": "2025-11-28T10:30:00Z"
      },
      "last_contact_at": "2025-11-30T14:00:00Z",
      "next_action_at": "2025-12-05T09:00:00Z",
      "tags": ["enterprise", "vp-engineering", "hot-lead"],
      "company": "TechCorp",
      "title": "VP of Engineering",
      "location": "New York, NY",
      "linkedin_url": "https://linkedin.com/in/sarahchen",
      "is_archived": false,
      "created_at": "2025-11-20T10:00:00Z",
      "updated_at": "2025-12-01T15:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 134,
    "total_pages": 3
  }
}
```

#### POST `/contacts`

Create a new contact.

**Request:**
```json
{
  "full_name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1 555 1234",
  "avatar_url": "data:image/png;base64,...",
  "relationship_domain": "business",
  "relationship_role": "client",
  "status": "active",
  "tags": ["consulting", "Q4-2025"],
  "company": "Acme Inc",
  "title": "CTO",
  "location": "San Francisco, CA"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "cnt_789",
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "relationship_domain": "business",
    "relationship_role": "client",
    "status": "active",
    "frame": {
      "current_score": null,
      "trend": "flat",
      "last_scan_at": null
    },
    "tags": ["consulting", "Q4-2025"],
    "company": "Acme Inc",
    "title": "CTO",
    "is_archived": false,
    "created_at": "2025-12-05T10:30:00Z",
    "updated_at": "2025-12-05T10:30:00Z"
  }
}
```

#### GET `/contacts/:id`

Get a single contact by ID.

**Response (200 OK):**
```json
{
  "data": {
    "id": "cnt_456",
    "full_name": "Sarah Chen",
    ...
  }
}
```

#### PUT `/contacts/:id`

Update a contact (full replacement).

**Request:**
```json
{
  "full_name": "Sarah Chen-Williams",
  "email": "sarah.williams@example.com",
  "phone": "+1 555 0192",
  "relationship_domain": "business",
  "relationship_role": "client",
  "status": "active",
  "tags": ["enterprise", "champion"],
  "company": "TechCorp",
  "title": "SVP of Engineering"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "cnt_456",
    "full_name": "Sarah Chen-Williams",
    "email": "sarah.williams@example.com",
    "updated_at": "2025-12-05T11:00:00Z",
    ...
  }
}
```

#### PATCH `/contacts/:id`

Partially update a contact.

**Request:**
```json
{
  "title": "Chief Technology Officer",
  "tags": ["enterprise", "champion", "strategic"]
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "cnt_456",
    "title": "Chief Technology Officer",
    "tags": ["enterprise", "champion", "strategic"],
    "updated_at": "2025-12-05T11:05:00Z",
    ...
  }
}
```

#### DELETE `/contacts/:id`

Soft delete (archive) a contact.

**Response (204 No Content)**

**Note:** Contact Zero cannot be deleted. Returns 403 Forbidden.

---

### 3. Notes

#### GET `/notes`

List all notes for the authenticated user.

**Query Parameters:**
- `kind` (string): Filter by kind (log, note, system)
- `folder_id` (string): Filter by folder
- `is_inbox` (boolean): Filter inbox notes
- `is_pinned` (boolean): Filter pinned notes
- `date_key` (string): Filter by date (YYYY-MM-DD) for daily logs
- `contact_ids` (string[]): Filter by target contacts (comma-separated)
- `tags` (string[]): Filter by tags
- `search` (string): Full-text search on title and content
- `include_archived` (boolean): Include archived notes
- `page`, `per_page`, `sort`, `order`

**Example Request:**
```http
GET /notes?kind=note&folder_id=folder-projects&page=1&per_page=50
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "note_123",
      "title": "Product roadmap brainstorm",
      "icon": "💡",
      "blocksuite_doc_id": "bs_doc_abc123",
      "author_contact_id": "cnt_zero_123",
      "target_contact_ids": ["cnt_456", "cnt_789"],
      "kind": "note",
      "date_key": null,
      "folder_id": "folder-projects",
      "is_inbox": false,
      "tags": ["planning", "Q1-2026"],
      "preferred_view": "doc",
      "is_pinned": true,
      "is_pinned_home": false,
      "is_archived": false,
      "created_at": "2025-12-01T09:00:00Z",
      "updated_at": "2025-12-05T10:30:00Z",
      "sync_version": 12,
      "last_synced_at": "2025-12-05T10:30:00Z"
    }
  ],
  "meta": { ... }
}
```

#### POST `/notes`

Create a new note.

**Request:**
```json
{
  "title": "Meeting notes with Sarah",
  "icon": "📝",
  "kind": "note",
  "target_contact_ids": ["cnt_456"],
  "folder_id": "folder-projects",
  "tags": ["meeting", "Q4-2025"],
  "preferred_view": "doc",
  "blocksuite_doc_id": "bs_doc_new_123"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "note_456",
    "title": "Meeting notes with Sarah",
    "blocksuite_doc_id": "bs_doc_new_123",
    "author_contact_id": "cnt_zero_123",
    "kind": "note",
    "is_inbox": false,
    "is_archived": false,
    "sync_version": 0,
    "created_at": "2025-12-05T11:00:00Z",
    "updated_at": "2025-12-05T11:00:00Z",
    ...
  }
}
```

#### GET `/notes/:id`

Get a single note with BlockSuite document.

**Response (200 OK):**
```json
{
  "data": {
    "id": "note_123",
    "title": "Product roadmap brainstorm",
    "blocksuite_doc_id": "bs_doc_abc123",
    "blocksuite_doc": "<base64_encoded_yjs_binary>",
    "blocksuite_snapshot": {
      "blocks": [ ... ],
      "text": "Plain text version for search"
    },
    ...
  }
}
```

#### PUT `/notes/:id`

Update note metadata and sync BlockSuite document.

**Request:**
```json
{
  "title": "Updated title",
  "tags": ["planning", "Q1-2026", "approved"],
  "blocksuite_doc": "<base64_encoded_yjs_update>",
  "sync_version": 13
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "note_123",
    "title": "Updated title",
    "tags": ["planning", "Q1-2026", "approved"],
    "sync_version": 13,
    "updated_at": "2025-12-05T11:30:00Z",
    ...
  }
}
```

**Conflict (409 Conflict):**
```json
{
  "error": {
    "code": "SYNC_CONFLICT",
    "message": "Note was updated on another device",
    "details": {
      "server_version": 15,
      "client_version": 13,
      "server_updated_at": "2025-12-05T11:25:00Z"
    }
  }
}
```

#### DELETE `/notes/:id`

Soft delete (archive) a note.

**Response (204 No Content)**

---

### 4. Tasks

#### GET `/tasks`

List all tasks for the authenticated user.

**Query Parameters:**
- `contact_id` (string): Filter by contact
- `status` (string): Filter by status (open, done, blocked)
- `due_after` (string): Filter tasks due after date (ISO 8601)
- `due_before` (string): Filter tasks due before date
- `include_archived` (boolean)
- `page`, `per_page`, `sort`, `order`

**Example Request:**
```http
GET /tasks?status=open&due_after=2025-12-05T00:00:00Z&sort=due_at&order=asc
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "task_001",
      "contact_id": "cnt_456",
      "title": "Send technical whitepaper follow-up email",
      "description": null,
      "status": "open",
      "due_at": "2025-12-05T10:00:00Z",
      "is_archived": false,
      "created_at": "2025-11-30T16:30:00Z",
      "updated_at": "2025-11-30T16:30:00Z",
      "created_by": "cnt_zero_123"
    }
  ],
  "meta": { ... }
}
```

#### POST `/tasks`

Create a new task.

**Request:**
```json
{
  "contact_id": "cnt_456",
  "title": "Schedule follow-up call",
  "description": "Discuss pricing and timeline",
  "status": "open",
  "due_at": "2025-12-10T14:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "task_789",
    "contact_id": "cnt_456",
    "title": "Schedule follow-up call",
    "status": "open",
    "due_at": "2025-12-10T14:00:00Z",
    "created_at": "2025-12-05T11:00:00Z",
    "created_by": "cnt_zero_123",
    ...
  }
}
```

#### PATCH `/tasks/:id`

Update task status or details.

**Request:**
```json
{
  "status": "done"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "task_001",
    "status": "done",
    "updated_at": "2025-12-05T12:00:00Z",
    ...
  }
}
```

#### DELETE `/tasks/:id`

Soft delete (archive) a task.

**Response (204 No Content)**

---

### 5. Interactions

#### GET `/interactions`

List all interactions for the authenticated user.

**Query Parameters:**
- `contact_id` (string): Filter by contact
- `type` (string): Filter by type (call, meeting, message, email, dm, other)
- `occurred_after` (string): Filter interactions after date
- `occurred_before` (string): Filter interactions before date
- `page`, `per_page`, `sort`, `order`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "int_001",
      "contact_id": "cnt_456",
      "author_contact_id": "cnt_zero_123",
      "type": "call",
      "summary": "Discussed product requirements and timeline",
      "occurred_at": "2025-12-04T15:30:00Z",
      "attachments": [],
      "created_at": "2025-12-04T16:00:00Z",
      "updated_at": "2025-12-04T16:00:00Z"
    }
  ],
  "meta": { ... }
}
```

#### POST `/interactions`

Log a new interaction.

**Request:**
```json
{
  "contact_id": "cnt_456",
  "type": "meeting",
  "summary": "Initial discovery call - discussed pain points",
  "occurred_at": "2025-12-05T10:00:00Z",
  "attachments": [
    {
      "file_name": "meeting_notes.pdf",
      "mime_type": "application/pdf",
      "data_url": "data:application/pdf;base64,..."
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "int_123",
    "contact_id": "cnt_456",
    "type": "meeting",
    "summary": "Initial discovery call - discussed pain points",
    "occurred_at": "2025-12-05T10:00:00Z",
    "attachments": [
      {
        "id": "att_001",
        "file_name": "meeting_notes.pdf",
        "mime_type": "application/pdf",
        "data_url": "data:application/pdf;base64,...",
        "created_at": "2025-12-05T11:00:00Z"
      }
    ],
    "created_at": "2025-12-05T11:00:00Z"
  }
}
```

---

### 6. Topics

#### GET `/topics`

List all topics for the authenticated user.

**Query Parameters:**
- `search` (string): Search by label
- `page`, `per_page`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "topic_001",
      "label": "Product Strategy",
      "slug": "product-strategy",
      "created_at": "2025-11-15T10:00:00Z",
      "note_count": 12
    }
  ],
  "meta": { ... }
}
```

#### GET `/topics/:id`

Get topic details with linked notes.

**Response (200 OK):**
```json
{
  "data": {
    "id": "topic_001",
    "label": "Product Strategy",
    "slug": "product-strategy",
    "created_at": "2025-11-15T10:00:00Z",
    "linked_notes": [
      {
        "note_id": "note_123",
        "title": "Product roadmap brainstorm",
        "created_at": "2025-12-01T09:00:00Z"
      }
    ]
  }
}
```

---

### 7. Folders

#### GET `/folders`

List all folders (PARA hierarchy).

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "folder-projects",
      "name": "Projects",
      "parent_id": null,
      "icon": "📁",
      "color": "#4433ff",
      "sort_order": 0,
      "is_default": true,
      "created_at": "2025-11-01T00:00:00Z"
    }
  ]
}
```

#### POST `/folders`

Create a custom folder.

**Request:**
```json
{
  "name": "Client Work",
  "parent_id": "folder-projects",
  "icon": "💼",
  "color": "#2ecc71"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "folder_custom_001",
    "name": "Client Work",
    "parent_id": "folder-projects",
    "icon": "💼",
    "color": "#2ecc71",
    "sort_order": 10,
    "is_default": false,
    "created_at": "2025-12-05T11:00:00Z"
  }
}
```

---

### 8. Groups

#### GET `/groups`

List all groups.

#### POST `/groups`

Create a new group.

#### POST `/groups/:id/members`

Add contacts to a group.

**Request:**
```json
{
  "contact_ids": ["cnt_456", "cnt_789"]
}
```

**Response (200 OK):**
```json
{
  "data": {
    "group_id": "grp_001",
    "members": [
      { "contact_id": "cnt_456", "joined_at": "2025-12-05T11:00:00Z" },
      { "contact_id": "cnt_789", "joined_at": "2025-12-05T11:00:00Z" }
    ]
  }
}
```

---

### 9. Projects

#### GET `/projects`

List all projects.

**Query Parameters:**
- `status` (string): active, on_hold, completed, archived
- `primary_contact_id` (string)
- `priority` (string): low, medium, high, critical

#### POST `/projects`

Create a new project.

**Request:**
```json
{
  "name": "Q1 Marketing Campaign",
  "description": "Launch new product campaign",
  "primary_contact_id": "cnt_456",
  "related_contact_ids": ["cnt_789"],
  "status": "active",
  "priority": "high",
  "start_date": "2026-01-01",
  "due_date": "2026-03-31"
}
```

#### POST `/projects/:id/sections`

Create a project section.

**Request:**
```json
{
  "name": "In Progress",
  "sort_order": 1
}
```

#### POST `/projects/:id/tasks`

Link a task to a project section.

**Request:**
```json
{
  "section_id": "sec_001",
  "task_id": "task_123",
  "sort_order": 0
}
```

---

### 10. Pipelines

#### GET `/pipelines/templates`

List all pipeline templates.

#### POST `/pipelines/templates`

Create a pipeline template.

#### POST `/pipelines/items`

Add a contact to a pipeline.

**Request:**
```json
{
  "template_id": "pipe_tmpl_001",
  "contact_id": "cnt_456",
  "label": "Enterprise deal - TechCorp",
  "value": 50000,
  "current_stage_id": "stage_001"
}
```

#### PATCH `/pipelines/items/:id`

Move pipeline item to new stage.

**Request:**
```json
{
  "current_stage_id": "stage_002"
}
```

---

### 11. Sync

#### POST `/sync/push`

Push local changes to server (batch operation).

**Request:**
```json
{
  "device_id": "device_abc123",
  "sync_timestamp": "2025-12-05T11:00:00Z",
  "changes": [
    {
      "entity_type": "note",
      "entity_id": "note_123",
      "operation": "update",
      "data": {
        "title": "Updated title",
        "blocksuite_doc": "<base64>",
        "sync_version": 13
      }
    },
    {
      "entity_type": "task",
      "entity_id": "task_456",
      "operation": "create",
      "data": {
        "contact_id": "cnt_789",
        "title": "New task",
        "status": "open"
      }
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "data": {
    "successful": ["note_123", "task_456"],
    "failed": [],
    "conflicts": []
  }
}
```

#### POST `/sync/pull`

Pull remote changes since last sync.

**Request:**
```json
{
  "device_id": "device_abc123",
  "last_sync_timestamp": "2025-12-05T10:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "changes": [
      {
        "entity_type": "contact",
        "entity_id": "cnt_999",
        "operation": "create",
        "data": { ... },
        "updated_at": "2025-12-05T10:30:00Z"
      }
    ],
    "sync_timestamp": "2025-12-05T11:00:00Z"
  }
}
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (sync, duplicate) |
| `SYNC_CONFLICT` | 409 | Document was updated elsewhere |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary outage |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-12-05T11:00:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## Rate Limiting

### Limits

- **Standard tier:** 1000 requests/hour per user
- **Premium tier:** 5000 requests/hour per user

### Headers

**Response headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1701320967
```

**Rate limit exceeded (429):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 45 minutes.",
    "retry_after": 2700
  }
}
```

---

## Pagination

### Query Parameters

- `page` (integer, default: 1)
- `per_page` (integer, default: 50, max: 100)

### Response

```json
{
  "data": [ ... ],
  "meta": {
    "page": 2,
    "per_page": 50,
    "total": 234,
    "total_pages": 5
  },
  "links": {
    "first": "/api/v1/notes?page=1",
    "prev": "/api/v1/notes?page=1",
    "next": "/api/v1/notes?page=3",
    "last": "/api/v1/notes?page=5"
  }
}
```

---

## Webhooks

**Future feature:** Allow users to subscribe to events (contact.created, task.completed, etc.)

---

**End of API Specification Document**
