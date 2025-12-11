<objective>
Enhance Notes with 3 improvements:
1. Allow users to create and save their own custom templates
2. Add drag-and-drop image embedding into notes
3. Add tweet/X post embedding capability
</objective>

<context>
Notes is a core feature using TipTap editor. Templates were just added but are read-only.
Users need more flexibility with templates and richer media embedding.

Key files:
- `src/components/notes/AffineNotes.tsx` - main notes component
- `src/components/notes/TemplatePickerModal.tsx` - template selection UI
- `src/services/noteTemplates.ts` - template definitions
- `src/services/noteStore.ts` - note storage
</context>

<requirements>
<feature_1>
**Custom Template Creation**
- Add "Create Template" or "+ New Template" button in TemplatePickerModal
- Modal/form to create template:
  - Template name (required)
  - Template content (rich text or markdown)
  - Optional: category/tag
- Save custom templates to localStorage or a store
- Custom templates appear alongside built-in templates
- Allow editing and deleting custom templates
- Use `{{date}}` variable support like built-in templates
</feature_1>

<feature_2>
**Drag-and-Drop Image Embedding**
- Location: Notes editor area (AffineNotes)
- Drop zone: entire note editor area
- On image drop:
  - Convert to Data URL
  - Insert image at cursor position (or end of note)
  - Show visual feedback during drag (border highlight)
- Supported formats: PNG, JPG, GIF, WebP
- Max size: Consider 5MB limit with warning
- Use TipTap's image extension capabilities
</feature_2>

<feature_3>
**Tweet/X Post Embedding**
- Add "Embed Tweet" button or slash command `/tweet`
- User pastes tweet URL
- Options for implementation:
  1. **Simple**: Store URL and render as styled link card
  2. **Rich**: Use Twitter oEmbed API to get embed HTML
  3. **Screenshot**: Use unfurl service to get preview image
- Recommended: Start with option 1 (styled link card) for MVP
- Display: Show tweet URL with X/Twitter icon, author if parseable
- Future: Can upgrade to full embed with Twitter widget.js
</feature_3>
</requirements>

<implementation>
For custom templates:
- Create `userTemplatesStore.ts` using Zustand with localStorage persist
- Add form in TemplatePickerModal with tabs: "Built-in" | "My Templates"

For drag-drop:
- Add onDrop handler to editor container
- Use FileReader to convert to Data URL
- Use TipTap's `editor.chain().focus().setImage({ src }).run()`

For tweet embed:
- Parse tweet URL to extract tweet ID
- Create TweetEmbed component that renders styled card
- Store as custom node in TipTap or as HTML block
</implementation>

<verification>
Before declaring complete:
- [ ] Can create a new template with name and content
- [ ] Custom template appears in picker and can be used
- [ ] Can edit and delete custom templates
- [ ] Dragging image onto note embeds it
- [ ] Image displays correctly in note
- [ ] Can paste tweet URL and see styled embed
- [ ] Run `npm run build` - must pass
</verification>

<success_criteria>
- Users have full control over their template library
- Images can be added via drag-drop (not just upload button)
- Tweet links render as recognizable embeds
- All features integrate smoothly with existing Notes UX
</success_criteria>
