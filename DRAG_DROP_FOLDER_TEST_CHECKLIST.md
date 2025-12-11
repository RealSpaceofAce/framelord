# FrameScan Drag-and-Drop Folder Management - Test Checklist

## Testing Instructions

1. Navigate to http://localhost:3002/
2. Click "Dashboard (Dev)" in footer
3. Navigate to FrameScan Reports section
4. Click "Load Demo Data" button to populate reports
5. Ensure you're on the "All contacts" tab

---

## Feature Verification Checklist

### Visual Layout
- [ ] Reports appear as cards in a responsive grid (1-3 columns based on screen size)
- [ ] Each report card shows:
  - [ ] Contact avatar
  - [ ] Report title
  - [ ] Contact name
  - [ ] Domain label
  - [ ] Modality icon (text/image)
  - [ ] Created date
  - [ ] Frame score badge (colored by score)
- [ ] "View Report" button appears on hover
- [ ] Grid layout is clean and matches FrameLord dark theme

### Drag-to-Create Folder
- [ ] Can grab and drag a report card
- [ ] Visual feedback shows card is being dragged (opacity, scale changes)
- [ ] Hovering over another report shows drop indicator
- [ ] Dropping report A onto report B:
  - [ ] Opens folder creation dialog
  - [ ] Dialog pre-fills "New Folder" name
  - [ ] Can edit folder name
  - [ ] Press Enter or click "Create Folder" to confirm
  - [ ] Press Escape or click "Cancel" to abort
  - [ ] New folder appears in grid with both reports inside
  - [ ] Both reports removed from main grid

### Folder Display
- [ ] Folders appear as larger tiles in the grid
- [ ] Folder shows:
  - [ ] Folder icon (closed when collapsed)
  - [ ] Folder name
  - [ ] Count badge (number of reports)
  - [ ] Preview avatars when collapsed (first 4 reports)
  - [ ] "+X more" text if more than 4 reports
- [ ] Hover over folder shows rename and delete buttons
- [ ] Folder has visual drop indicator when dragging report over it

### Drag into Existing Folder
- [ ] Can drag a report from grid onto a folder
- [ ] Folder highlights when report hovers over it
- [ ] Dropping adds report to folder
- [ ] Report disappears from main grid
- [ ] Folder count badge updates
- [ ] Preview avatars update (if visible)

### Folder Expansion/Collapse
- [ ] Click folder to expand/collapse
- [ ] Click chevron icon to expand/collapse
- [ ] Expanding shows:
  - [ ] FolderOpen icon
  - [ ] Chevron points down
  - [ ] List of reports inside
  - [ ] Each report shows title, contact, domain, score
- [ ] Collapsing shows:
  - [ ] Folder icon
  - [ ] Chevron points right
  - [ ] Preview avatars
- [ ] Smooth animation on expand/collapse

### Drag out of Folder
- [ ] Expand folder to see reports inside
- [ ] Hover over report in folder shows "X" remove button
- [ ] Click "X" to remove report from folder
- [ ] Report appears back in main grid
- [ ] Folder count updates
- [ ] Empty folder shows "Empty folder" message

### Folder Rename
- [ ] Hover over folder shows edit icon
- [ ] Click edit icon to enter rename mode
- [ ] Input appears with current name selected
- [ ] Can type new name
- [ ] Press Enter to save
- [ ] Press Escape to cancel
- [ ] Click away to save
- [ ] Folder name updates immediately

### Folder Delete
- [ ] Empty folders show delete button (X) on hover
- [ ] Click delete button removes folder
- [ ] Non-empty folders do NOT show delete button
- [ ] Deleting folder with smooth animation

### Animations and Polish
- [ ] Drag has smooth spring physics
- [ ] Drop has satisfying "snap" feel
- [ ] Folder expand/collapse is smooth
- [ ] Report cards fade in on page load
- [ ] Drag overlay shows semi-transparent card preview
- [ ] All animations use Framer Motion
- [ ] Animations match FrameLord aesthetic

### View Report Functionality
- [ ] Click report card (not while dragging) opens report detail
- [ ] Click "View Report" button opens report detail
- [ ] Click report inside expanded folder opens detail
- [ ] Navigation to contact works (click avatar or name)

### Edge Cases
- [ ] Cannot drop report onto itself
- [ ] Cannot add same report to folder twice
- [ ] Dragging and releasing in empty space does nothing
- [ ] Folders sort correctly in grid
- [ ] Works with 1 report
- [ ] Works with 50+ reports
- [ ] Works with multiple folders
- [ ] Responsive on different screen sizes

### Persistence (Future)
- [ ] Folders persist on page reload (Note: Currently in-memory only)
- [ ] Report-folder associations persist

---

## Known Issues / Future Enhancements

### Current Limitations
1. Folders are in-memory only - will reset on page reload
2. No localStorage persistence yet
3. No drag-out-of-folder back to main grid (only remove button)

### Future Enhancements
1. Add localStorage persistence
2. Allow dragging reports out of folders back to grid
3. Nested folders support
4. Bulk operations (multi-select)
5. Folder color customization
6. Folder sorting options
7. Search within folders

---

## Success Criteria

All checkboxes above should be checked for feature to be considered complete.

The drag-and-drop system should feel as intuitive as:
- iOS home screen folder management
- macOS Finder
- Google Drive file organization

Users should be able to organize reports WITHOUT reading instructions.

---

## Testing Environment

- Dev server: http://localhost:3002/
- Branch: feature/framescan-drag-drop-folders
- Build status: PASSING ✓
- TypeScript: NO ERRORS ✓

---

## Developer Notes

### Architecture
- **DraggableReportCard**: Individual report tiles with useDraggable hook
- **DroppableFolder**: Folder tiles with useDroppable hook
- **ReportGrid**: DndContext orchestrator with collision detection
- **frameScanFolderStore**: Zustand store for folder state

### Key Dependencies
- @dnd-kit/core: Drag-and-drop core
- @dnd-kit/utilities: CSS transform utilities
- framer-motion: Smooth animations
- zustand: Reactive state management

### Files Modified
1. `/src/components/crm/DraggableReportCard.tsx` (NEW)
2. `/src/components/crm/DroppableFolder.tsx` (NEW)
3. `/src/components/crm/ReportGrid.tsx` (NEW)
4. `/src/services/frameScanFolderStore.ts` (MODIFIED - added reportIds param)
5. `/src/components/crm/FrameScanPage.tsx` (MODIFIED - integrated ReportGrid)
