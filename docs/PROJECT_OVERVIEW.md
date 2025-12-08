# FrameLord Project Overview

## Platform Summary

FrameLord is an AI-powered authority diagnostics platform and local-first CRM OS built with React 19, TypeScript, and Vite. The platform helps users identify and fix weaknesses in their communication through AI-driven "FrameScan" analysis, while providing a comprehensive personal CRM for managing contacts, notes, tasks, and goals.

---

## Core Modules

### CRM OS
- Contact management with Contact Zero (user identity)
- Notes with Tiptap markdown editor, [[wikilinks]], @mentions, #hashtags
- Tasks with contact attachment and calendar integration
- Pipelines, Projects, Groups, Topics

### FrameScan
- AI-powered text analysis for authority signals
- Returns FrameScore (0-100) with diagnostic feedback

### Little Lord
- Context-aware AI assistant
- Pattern detection and coaching
- Guided Want creation with guardrails
- Dossier generation for Wants

### Wants System
- Goal/desire tracking with steps, metrics, and iterations
- Scope management with congruency scoring
- AI dossier generation via Little Lord
- Board, Progress, and Detail views

---

## Architecture Principles

1. **Contact Spine**: Every entity attaches to a Contact. Contact Zero is the user.
2. **Single Source of Truth**: Services/stores are authoritative - never bypass them.
3. **No Backend**: All data is in-memory, no server calls.
4. **Data URLs**: Attachments stored as Data URLs, no external file storage.
5. **PARA Organization**: Notes use Inbox, Projects, Areas, Resources, Archive folders.

---

## Tech Stack

| Package | Purpose |
|---------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tiptap | Rich text editing (notes) |
| OGL | WebGL for CircularGallery |
| Framer Motion | Animations |
| shadcn/ui | Component primitives |
| Tailwind CSS | Styling |

---

## Development Milestones

### Wants Module Completion – December 2025

#### 1. Complete Wants UX Refactor
- Board DnD correctly implemented with custom stages
- All-Wants view replaces All-Steps; now horizontal wants with vertical steps
- Inline step creation replaced with shadcn Dialog
- GlobalStepsBoardView rewritten to Want-based columns
- Step text color fixed for dark mode
- Step editor unified (prompt removal; now using StepEditDialog everywhere)

#### 2. Banner Redesign
- Banner height increased by one-third
- Aurora now fades to black
- Blue hue aligned with FrameLord primary brand blue
- Banner is now consistent across ALL Wants views
- Compact banner variant removed

#### 3. Want Detail Page
- Added Dossier section under cover image
- Dossier populated by Little Lord on want creation/update
- Fake dossier added to demo seed data
- Scope embedded cleanly into detail page; old want-scope route removed
- White buttons fixed to theme-aware shadcn variants
- Scroll-to-top enforced on open

#### 4. Scope List Fanning Gallery
- OGL CircularGallery fully integrated
- Gallery renders cover images for all wants (grayscale in gallery, color in detail)
- Gallery added above scope list for visual navigation
- Placeholder images added for wants without covers
- Image preloading ensures all images load together
- Gallery starts centered with images on both left and right sides

#### 5. WantsPage Router Refinement
- View modes simplified and cleaned
- Detail view always uses full banner
- Scope tab cleaned and narrowed
- Full-width responsive layout for scope & detail restored

#### 6. Little Lord Integration
- "New Want" always triggers Little Lord with wantCreation:true
- Dossier writing path wired through wantScopeStore
- Dossier fields saved and rendered read-only
- Guardrails and coaching preserved

#### 7. shadcn / ReactBits Integration
- Cards, Buttons, Badges, Dialog, Input, Textarea, ScrollArea everywhere
- Aurora header stabilized with ResizeObserver
- CoverImage component refined (21:9 ratio)
- CircularGallery from ReactBits with OGL WebGL rendering

#### 8. Demo Data Expansion
- Seed wants now include:
  * 6 demo Wants with unique cover images
  * AI-generated dossiers for each Want
  * Realistic steps with varying deadlines and statuses
  * Metrics across 30+ days
  * Iteration entries and doctrine notes

**Status: WANTS MODULE COMPLETE. No further changes unless a new milestone is opened.**

---

<!-- NOTE: Claude should always load this file automatically at the start of any future FrameLord coding session. -->
