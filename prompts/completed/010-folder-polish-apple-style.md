<objective>
Implement Apple-style intuitive folder management for FrameScan reports:
- Drag reports on top of each other to create folders
- Drag reports into existing folders
- Visual folder icons that expand on hover/click
- Smooth animations for folder operations
</objective>

<context>
Apple's iOS/macOS folder system is the gold standard for intuitive organization:
- Drag one item onto another to create a folder
- Folders show preview of contents
- Drag to reorder and organize
- Smooth spring animations

Current state: FrameScanPage has basic folder list but lacks intuitive interaction.

Key files:
- `src/components/crm/FrameScanPage.tsx` - main dashboard
- `src/services/frameScanFolderStore.ts` - folder state
- Package: `@dnd-kit/core`, `@dnd-kit/sortable` (already installed)
</context>

<requirements>
<interaction_1>
**Drag-to-Create Folders**
- In "All contacts" view, show reports as draggable cards/tiles
- Dragging report A onto report B creates new folder containing both
- Prompt for folder name (or auto-generate: "New Folder")
- Visual indicator when hovering over droppable target
</interaction_1>

<interaction_2>
**Drag into Existing Folders**
- Folders appear as larger tiles/icons in the grid
- Dragging report onto folder icon adds it to folder
- Folder icon shows count badge (e.g., "3 scans")
- Optional: folder icon shows mini-previews of first 2-4 items
</interaction_2>

<interaction_3>
**Folder Expansion**
- Clicking folder expands to show contents inline or in modal
- Can drag items out of folder back to main view
- Empty folder auto-deletes (or prompts to delete)
</interaction_3>

<interaction_4>
**Visual Polish**
- Use Framer Motion for smooth drag animations
- Spring physics for satisfying drop feel
- Hover states show drop zones clearly
- Loading states for any async operations
- Match FrameLord's dark neon aesthetic
</interaction_4>
</requirements>

<implementation>
Use @dnd-kit for drag-and-drop:
```typescript
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
```

Key components to create:
1. `DraggableReportCard` - individual report that can be dragged
2. `DroppableFolder` - folder that accepts drops
3. `ReportGrid` - grid layout with DndContext

Folder creation logic:
```typescript
function handleDragEnd(event) {
  const { active, over } = event;
  if (!over) return;

  if (over.data.current?.type === 'report') {
    // Dragged report onto another report = create folder
    createFolderWithReports([active.id, over.id]);
  } else if (over.data.current?.type === 'folder') {
    // Dragged report onto folder = add to folder
    addReportToFolder(over.id, active.id);
  }
}
```
</implementation>

<verification>
Before declaring complete:
- [ ] Can drag one report onto another to create folder
- [ ] Folder creation prompts for or auto-assigns name
- [ ] Can drag reports into existing folders
- [ ] Folders show item count or preview
- [ ] Can expand folder to see contents
- [ ] Can drag items out of folders
- [ ] Animations are smooth (Framer Motion)
- [ ] Styling matches FrameLord dark theme
- [ ] Run `npm run build` - must pass
</verification>

<success_criteria>
- Folder management feels as intuitive as iOS home screen
- Users can organize scans without reading instructions
- Visual feedback makes actions discoverable
- Smooth, polished animations enhance UX
</success_criteria>
