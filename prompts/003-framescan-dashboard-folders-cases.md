<objective>
Add an aurora header, segment menu, folder system, and "Add Case" teaser to the FrameScan reports dashboard, matching the Wants module pattern.
</objective>

<context>
The FrameScan reports index currently shows a simple vertical list. This feature upgrades it to match the Wants module with:
- Aurora header with title/subtitle
- Segment menu (All contacts / Domains / Folders / Cases)
- Folder system for organizing reports
- "Add Case" button with Coming Soon modal

@CLAUDE.md - Project conventions
@src/components/wants/ - Reference for aurora header and segment patterns
@src/pages/FrameScanReportsPage.tsx - Likely location of reports index (search for it)
@src/components/crm/FrameScanPage.tsx - May contain the reports list
</context>

<requirements>

## 2.1 Reuse Wants Aurora Header Pattern

1. Find the Wants module aurora header:
   - Search for `Wants` page component with aurora background
   - Look for files like `WantsPage.tsx` or `WantsHeader.tsx`
   - Note how aurora and segments are composed

2. Find the FrameScan reports index page:
   - Search for `FrameScan` and `Back to Reports`
   - Find the list view showing all reports
   - Use THAT file - do not create duplicates

3. Add aurora header to FrameScan reports page:
   - Wrap top in same aurora header pattern as Wants
   - Title: `FRAMESCAN REPORTS`
   - Subtitle: `Review, group, and case-build your FrameScans.`

## 2.2 Segment Menu

1. Add horizontal segment control under the header:
   ```tsx
   type FrameScanReportViewMode = 'allContacts' | 'domains' | 'folders' | 'cases';
   const [viewMode, setViewMode] = useState<FrameScanReportViewMode>('allContacts');
   ```

2. Four segment options:
   - `All contacts` - shows existing list view grouped by contact
   - `Domains` - groups reports by domain field (or shows "No domain metadata" message)
   - `Folders` - uses new folder model (see 2.3)
   - `Cases` - shows Coming Soon teaser panel

3. Reuse same segment component styling as Wants

## 2.3 FrameScan Folders Store

1. Create `src/services/frameScanFolderStore.ts`:

```typescript
import { create } from 'zustand';

export interface FrameScanFolder {
  id: string;
  name: string;
  createdAt: string;
  reportIds: string[];
}

interface FrameScanFolderState {
  folders: FrameScanFolder[];
  createFolder: (name: string) => FrameScanFolder;
  addReportToFolder: (folderId: string, reportId: string) => void;
  removeReportFromFolder: (folderId: string, reportId: string) => void;
  deleteFolder: (folderId: string) => void;
}

export const useFrameScanFolderStore = create<FrameScanFolderState>((set, get) => ({
  folders: [],

  createFolder: (name: string) => {
    const newFolder: FrameScanFolder = {
      id: `folder_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      reportIds: [],
    };
    set((state) => ({ folders: [...state.folders, newFolder] }));
    return newFolder;
  },

  addReportToFolder: (folderId: string, reportId: string) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === folderId && !f.reportIds.includes(reportId)
          ? { ...f, reportIds: [...f.reportIds, reportId] }
          : f
      ),
    }));
  },

  removeReportFromFolder: (folderId: string, reportId: string) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === folderId
          ? { ...f, reportIds: f.reportIds.filter((id) => id !== reportId) }
          : f
      ),
    }));
  },

  deleteFolder: (folderId: string) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== folderId),
    }));
  },
}));
```

2. Folders view UI (when `viewMode === 'folders'`):
   - Toolbar row with "New folder" button (opens prompt/modal for name)
   - Two-column layout:
     - Left: list of folder names (selected = highlighted)
     - Right: report cards in selected folder
   - On each report card: "Add to folder" dropdown listing all folders
   - Selecting a folder calls `addReportToFolder(folderId, reportId)`

## 2.4 Add Case CTA

1. Add button at right side of segment menu row:
   - Label: `Add case`
   - Style: primary/ghost CTA style matching app patterns

2. On click, open modal:
   - Title: `Cases – coming soon`
   - Body: `Cases will let you turn FrameScans into living dossiers. You will attach messages, notes, and scans to a single case and receive ongoing frame and behavioral analysis inside that context.`
   - Subtext: `You will be able to update a case over time and see how the frame shifts, rather than scanning isolated messages.`

3. When `viewMode === 'cases'`:
   - Main content area shows same Coming Soon panel
   - User understands the mode is not yet available

</requirements>

<verification>
1. FrameScan reports page has aurora header with title "FRAMESCAN REPORTS"
2. Segment menu shows 4 options, defaults to "All contacts"
3. Clicking segments switches the view mode
4. "Folders" view shows:
   - "New folder" button that creates folders
   - Two-column layout with folder list and report cards
   - Ability to add reports to folders
5. "Cases" view shows Coming Soon panel
6. "Add case" button opens Coming Soon modal
7. "Domains" view groups by domain or shows placeholder message

```bash
npm run build
```
</verification>

<success_criteria>
- Aurora header matches Wants pattern
- All 4 segment modes work
- Folder store created with Zustand
- Folders can be created, reports added/removed
- Cases teaser modal displays correctly
- No TypeScript errors
- Existing report list functionality preserved in "All contacts" mode
</success_criteria>
