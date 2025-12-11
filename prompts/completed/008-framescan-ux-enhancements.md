<objective>
Enhance FrameScan UX with 4 improvements:
1. Add microphone button to FrameScan CRM module (next to upload files button)
2. AI auto-generates titles for FrameScan reports
3. Add ability to organize scans into folders from folder view and all-contacts view
4. Allow users to add custom domain classifications
</objective>

<context>
FrameScan is the core analysis feature. Users scan text/images for frame analysis.
Currently titles are generic, folder organization is incomplete, and there's no mic input in CRM.

Key files:
- `src/components/crm/FrameScanContactTab.tsx` - CRM FrameScan interface
- `src/lib/frameScan/frameScanLLM.ts` - AI analysis pipeline
- `src/services/frameScanReportStore.ts` - report storage
- `src/services/frameScanFolderStore.ts` - folder management
- `src/components/crm/FrameScanPage.tsx` - dashboard with folders view
</context>

<requirements>
<feature_1>
**Microphone Button in CRM FrameScan**
- Location: `FrameScanContactTab.tsx`
- Add mic button next to the "Upload Files" or image upload button
- Use existing `useAudioRecorder` hook
- Use existing `transcriptionService` for Whisper
- On recording complete: transcribe and populate text input
- Match styling of other mic buttons (Scanner, LittleLord)
</feature_1>

<feature_2>
**Auto-Generate Scan Titles**
- Location: `frameScanLLM.ts` (AI prompt) and `frameScanReportStore.ts`
- AI should generate a descriptive title during analysis
- Title should be 3-8 words summarizing the scan subject
- Examples: "Sales Email to Enterprise Lead", "Cold DM on Twitter", "Client Meeting Follow-up"
- Add `title` field to AI prompt output requirements
- Store title in FrameScanReport
- Display title in report list (FrameScanPage) instead of generic "FrameScan Report"
</feature_2>

<feature_3>
**Folder Management from All Views**
When viewing "All contacts" on FrameScanPage:
- Each report row should have a folder action (dropdown or icon)
- Options: Add to existing folder, Create new folder
- Drag-and-drop reports into folders (if feasible)

When viewing "Folders":
- Each folder should show "Add Scan" button
- Clicking opens modal to select from unorganized scans
- Or allow drag-drop from a scan picker

Use `frameScanFolderStore.ts` functions:
- `addReportToFolder(folderId, reportId)`
- `createFolder(name)`
</feature_3>

<feature_4>
**Custom Domain Classifications**
- Location: FrameScanPage segment menu shows "Domains"
- Users should be able to add their own domain tags
- Add "+ Add Domain" button in domains view
- Store custom domains in a store (new or extend existing)
- Allow tagging reports with domains
- Domains are like categories: "Sales Emails", "Social Media DMs", "Meeting Notes"
</feature_4>
</requirements>

<implementation>
1. Start with mic button (simplest, uses existing hooks)
2. Update AI prompt for title generation
3. Add folder actions to report rows
4. Create domain management system

For drag-and-drop: Use @dnd-kit/core (already in package.json)
For modals: Use existing Dialog component patterns
</implementation>

<verification>
Before declaring complete:
- [ ] Mic button visible in FrameScanContactTab, works like other mic buttons
- [ ] New scans have AI-generated titles
- [ ] Can add reports to folders from All Contacts view
- [ ] Can add reports to folders from within Folders view
- [ ] Can create custom domains and tag reports
- [ ] Run `npm run build` - must pass
</verification>

<success_criteria>
- FrameScan has full audio input capability in CRM
- Reports have meaningful, AI-generated titles
- Folder organization is intuitive from any view
- Custom domains allow personalized categorization
</success_criteria>
