# TipTap Editor - Notion-Style Implementation

**Date:** 2025-12-10
**Status:** ✅ Implemented

## Overview

FrameLord's note editor uses TipTap (v3.12.1) with custom extensions to provide a Notion-like editing experience while preserving FrameLord's existing UI/theme.

## Features Implemented

### 1. Slash Command Menu (`/` trigger)
- Type `/` anywhere to open the command palette
- Keyboard navigation (↑↓ arrows, Enter to select, Escape to close)
- Filter commands by typing after `/`
- Available commands:
  - **Text** - Plain paragraph
  - **Heading 1/2/3** - Section headings
  - **Bullet List** - Unordered list
  - **Numbered List** - Ordered list
  - **Task List** - Checkboxes
  - **Quote** - Blockquote
  - **Code Block** - Code snippet
  - **Divider** - Horizontal rule
  - **Image** - Upload image (resizable)
  - **Tweet** - Embed Twitter/X post

### 2. Resizable Images
- Drag handles on corners and edges
- Maintains aspect ratio by default (Shift to override)
- Minimum size: 100px width, 50px height
- Maximum size: 800px width
- Size indicator during resize
- Selection highlight

### 3. Paste-to-Embed for Twitter/X
- Paste a tweet URL and it auto-converts to an embed card
- Supports both twitter.com and x.com URLs
- No modal required - just paste and it works!
- Manual embed via toolbar button still available

### 4. Existing Features Preserved
- **Wiki Links** - `[[Note Title]]` syntax
- **Contact Mentions** - `@Contact Name` syntax
- **Topic Hashtags** - `#Topic` syntax
- **Standard Formatting** - Bold, italic, strike, highlight
- **Lists** - Bullet, numbered, task
- **Code** - Inline code, code blocks
- **Links** - URL linking
- **Backlinks** - Shows notes that link to current note

## File Structure

```
src/
├── lib/
│   └── editor/
│       ├── tiptapConfig.ts      # Centralized TipTap configuration
│       ├── SlashCommandExtension.tsx  # "/" command menu
│       └── noteAdapter.ts       # Storage format adapter
│
├── components/
│   └── notes/
│       ├── MarkdownNoteEditor.tsx  # Main editor component
│       └── extensions/
│           ├── ResizableImageNode.tsx   # Drag-to-resize images
│           ├── TweetEmbedNode.tsx       # Tweet embeds
│           ├── WikiLinkNode.tsx         # [[wiki links]]
│           ├── ContactMentionNode.tsx   # @mentions
│           └── TopicMentionNode.tsx     # #hashtags
```

## Data Flow

```
┌─────────────┐     HTML string     ┌─────────────┐
│  noteStore  │ ─────────────────→  │   TipTap    │
│  (storage)  │                     │   Editor    │
└─────────────┘                     └─────────────┘
       ↑                                   │
       │         editor.getHTML()          │
       └───────────────────────────────────┘
```

- **Incoming**: HTML string from `note.content`
- **Editor Internal**: ProseMirror JSON document
- **Outgoing**: HTML string via `editor.getHTML()`

## Extensions Used

### Core (Open Source)
| Extension | Purpose |
|-----------|---------|
| `@tiptap/starter-kit` | Basic editing (bold, italic, headings, lists, etc.) |
| `@tiptap/extension-placeholder` | Empty editor placeholder text |
| `@tiptap/extension-link` | Hyperlinks |
| `@tiptap/extension-task-list` | Checkbox task lists |
| `@tiptap/extension-task-item` | Task list items |
| `@tiptap/extension-highlight` | Text highlighting |
| `@tiptap/suggestion` | Autocomplete/suggestion framework |

### Custom Extensions
| Extension | Purpose |
|-----------|---------|
| `SlashCommandExtension` | "/" menu for block insertion |
| `ResizableImageNode` | Images with drag handles |
| `TweetEmbedNode` | Twitter/X embeds |
| `WikiLinkNode` | [[wiki links]] |
| `ContactMentionNode` | @mentions |
| `TopicMentionNode` | #hashtags |

## No Pro/Cloud Features

This implementation uses **only open-source TipTap core**:
- ❌ No Collaboration extension (real-time sync)
- ❌ No AI extension
- ❌ No Cloud services
- ❌ No Pro-only extensions

All features are self-contained and work offline.

## Theme Integration

The editor respects FrameLord's theme system:

```typescript
const colors = getEditorThemeColors(theme); // 'light' | 'gray' | 'dark'
```

Colors used:
- `bg` - Editor background
- `text` - Primary text
- `textMuted` - Secondary text, placeholders
- `border` - Borders, dividers
- `hover` - Hover states
- `accent` - Links, active elements
- `toolbar` - Toolbar background
- `active` - Active button state

## Usage

```tsx
import { MarkdownNoteEditor } from '@/components/notes/MarkdownNoteEditor';

<MarkdownNoteEditor
  noteId={note.id}
  content={note.content}
  onContentChange={(html) => updateNote({ ...note, content: html })}
  theme="dark"
  placeholder="Type '/' for commands..."
  onNavigateToNote={(noteId) => navigate(`/notes/${noteId}`)}
  onNavigateToContact={(contactId) => navigate(`/contacts/${contactId}`)}
  showBacklinks={true}
/>
```

## Testing Checklist

- [ ] Type `/` to open slash command menu
- [ ] Filter commands by typing
- [ ] Navigate with arrow keys
- [ ] Select with Enter
- [ ] Close with Escape
- [ ] Insert all block types (headings, lists, code, etc.)
- [ ] Upload image via slash menu or toolbar
- [ ] Resize image with drag handles
- [ ] Paste tweet URL - auto embeds
- [ ] Embed tweet via toolbar button
- [ ] Create wiki link with `[[`
- [ ] Create contact mention with `@`
- [ ] Create topic tag with `#`
- [ ] All toolbar buttons work
- [ ] Content saves on change
- [ ] Theme colors apply correctly

## Future Enhancements

1. **Draggable Blocks** - Move paragraphs/blocks like Notion
2. **Table Support** - TipTap has a table extension
3. **Inline Comments** - Annotation support
4. **Export Options** - PDF, Markdown, plain text
5. **Collaborative Editing** - If/when real-time sync is needed
