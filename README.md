# FrameLord CRM (MVP)

FrameLord is a single-user leadership CRM. One canonical **Contact Zero** represents the user. Every action in the system relates back to this spine.

This MVP runs entirely on the front-end. No backend. No accounts. All data stored in memory for now.

## Core Model

Everything attaches to a **Contact**.

* Notes
* Tasks
* Topics
* Interactions
* Cases (coming next)
* Pipelines (coming next)

Contact Zero is the owner and the author of all actions.

## Current Feature Set

### Contacts

* Create new contacts
* Edit profile fields
* Upload avatar via file chooser (stored as Data URL)
* Additional fields: company, title, location, LinkedIn, X handle
* Soft-archive contacts with confirmation
* Archived contacts hidden by default
* Contact Zero cannot be archived

### Notes

* Notes attach to a contact via `contactId`
* Notes have `authorContactId`
* Daily notes view groups by day and by contact
* @mentions create notes “about” a contact
* [[Topic]] syntax creates or links topics
* Notes link back to dossiers
* All Notes dashboard

### Topics

* Any note can contain topics via `[[Topic]]` syntax
* Topic pages show:

  * Contacts associated with the topic
  * Notes for the topic
* Topics appear on dossiers and on Contact Zero’s topic list

### Tasks

* Tasks attach to a contact
* Due date optional; if present, appears on Calendar
* Per-contact task list with add + complete
* Global Tasks dashboard
* Contact Zero shows “Your Open Tasks” and “Today & Upcoming” summary

### Calendar

* Monthly grid
* Tasks shown by date
* Selecting a date reveals its tasks
* Overdue highlighting
* Tasks link back to contacts

### Contact Dossier

* Full record for each contact
* Editable profile
* Sections:

  * Profile
  * Notes
  * Topics
  * Tasks
  * Activity (note authoring)
  * Upcoming tasks (if Contact Zero)

### Contact Management

* Contacts list with domain filters
* Add contact
* Archive contact with confirmation
* Show archived toggle
* Clicking a contact selects it globally via `selectedContactId`

## Next Layer (In Progress)

### Interactions + Timeline

Add explicit interactions like:

* Call
* Meeting
* Message
* Email
* DM
* Other

Timeline will merge:

* Interactions
* Notes
* Tasks with timestamps (optional)

Global Activity view will show all interactions across all contacts.

## Architecture

### Tech Stack

* React 19
* Vite
* TypeScript
* No backend
* No external UI libraries

### Data Layer

Everything is stored in service modules:

* `contactStore.ts`
* `noteStore.ts`
* `topicStore.ts`
* `taskStore.ts`
* `interactionStore.ts` (coming)

Each store exports:

* Array of objects
* CRUD helpers
* Query helpers

Later upgrade path:

* LocalStorage persistence
* Supabase or custom Node backend

### Navigation

Dashboard manages:

* selectedContactId
* currentView
* onNavigateToDossier
* onNavigateToTopic

Views include:

* Contacts
* Dossier
* Notes
* Tasks
* Calendar
* Topics
* Activity (coming)
* Pipelines (coming)
* Cases (coming)

## Build / Run

Install:

```
npm install
```

Run dev:

```
npm run dev
```

Build:

```
npm run build
```

## Project Philosophy

One spine. One owner.
Every object must attach to a contact.
Every interaction reflects real behavior.
No orphan objects.
No unstructured data.

The app must behave like a real leadership operating system.
