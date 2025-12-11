<objective>
Design and implement a full Obsidian-style graph module for FrameLord using `react-force-graph`.

The graph module must:
- Live as a first-class view on the main CRM dashboard sidebar
- Render a global graph of Contacts, Notes, Topics, Tasks, Interactions, and FrameScan reports
- Center on the Contact spine architecture with Contact Zero as the origin

This matters because it provides users with a visual map of all their relationships and content, making the interconnected nature of their data discoverable and navigable.
</objective>

<context>
FrameLord is a local-first CRM OS organized around the Contact spine. Contact Zero represents the user, and all data flows outward from Contact Zero.

Key architectural constraints:
- Stores are the single source of truth - the graph is a READ-ONLY projection
- No backend, no external API calls - all data is in-memory and local
- Every entity attaches to a Contact
- Notes use markdown with `[[wikilinks]]`, `@mentions`, and `#hashtags`
- FrameScan reports must appear as explicit nodes, not invisible metadata

Tech stack: React 19, TypeScript, Vite, react-force-graph-2d (already in package.json)

@CLAUDE.md - Full project rules and architecture
@src/App.tsx - Main application router
@src/components/Dashboard.tsx - Dashboard shell and sidebar
@src/services/contactStore.ts - Contact data and Contact Zero
@src/services/noteStore.ts - Notes with PARA folders
@src/services/topicStore.ts - Topic graph and linking
@src/services/taskStore.ts - Tasks with contact attachment
@src/services/interactionStore.ts - Communication logs
@src/lib/frameScan/ - FrameScan implementation
@src/types.ts - Core type definitions
</context>

<research>
Before implementing, thoroughly examine:

1. **Store structures**: Read all store files in `src/services/` to understand:
   - How contacts are stored and what Contact Zero looks like
   - How notes store `targetContactId`, `authorContactId`, and links
   - How topics are stored and linked
   - How tasks and interactions attach to contacts
   - How FrameScan data is stored (check `src/lib/frameScan/` and any scan-related stores)

2. **Routing and selection state**: Find how `selectedContactId` is managed globally and how navigation between views works

3. **Existing patterns**: Understand how other dashboard views are structured and rendered

4. **FrameScan specifics**: Check `docs/FrameScanSpec.json` or any doctrine files to understand scan data structure
</research>

<requirements>
## Phase 1: Graph Data Model (View Level)

Create `src/services/graph/graphDataBuilder.ts` with strongly-typed interfaces:

```ts
export type GraphNodeType =
  | 'contact'
  | 'contact_zero'
  | 'note'
  | 'topic'
  | 'task'
  | 'interaction'
  | 'framescan';

export interface FrameGraphNode {
  id: string;                 // unique stable id
  type: GraphNodeType;
  label: string;
  subLabel?: string;
  contactId?: string;
  noteId?: string;
  topicSlug?: string;
  taskId?: string;
  interactionId?: string;
  frameScanId?: string;
  importance?: number;        // for node size and maxNodes trimming
  group?: string;             // for color grouping
}

export type GraphLinkType =
  | 'contact_note'
  | 'contact_task'
  | 'contact_interaction'
  | 'contact_topic'
  | 'contact_framescan'
  | 'note_topic'
  | 'note_note'
  | 'note_contact_mention'
  | 'note_framescan'
  | 'interaction_framescan'
  | 'contact_contact'
  | 'contact_zero_edge';

export interface FrameGraphLink {
  id: string;
  source: string;
  target: string;
  type: GraphLinkType;
}

export interface FrameGraphData {
  nodes: FrameGraphNode[];
  links: FrameGraphLink[];
}

export interface FrameGraphBuildOptions {
  focusContactId?: string;      // for local graph view
  maxNodes?: number;
  maxDepth?: number;            // hop depth from focus node
}
```

## Phase 2: Graph Data Builder Function

Implement `buildFrameGraphData()` that:

1. **Creates Contact Zero node** with `type: 'contact_zero'`, distinct label ("You" or user name)

2. **Creates nodes for**:
   - All active contacts (respect archive flags)
   - Notes with `targetContactId`, `authorContactId`, topic links, wikilinks, or FrameScan reports
   - Topics from `topicStore` and `#hashtags`
   - Tasks with contact links
   - Interactions with primary contacts
   - FrameScan reports as explicit nodes with `frameScanId`, label, and optional FrameScore subLabel

3. **Creates edges from structured fields**:
   - `contact_note`: targetContactId/authorContactId → note
   - `note_topic`: note → topics it references
   - `contact_task`: contact → tasks
   - `contact_interaction`: contact → interactions
   - `contact_topic`: contacts → topics via notes/interactions
   - `contact_framescan`: contact → FrameScan reports
   - `note_framescan`: note → FrameScan when scan was on that note
   - `interaction_framescan`: interaction → FrameScan
   - `contact_zero_edge`: Contact Zero → contacts with any relationship

4. **Creates edges from Obsidian-style links**:
   - `note_note`: For `[[wikilinks]]` between notes
   - `note_contact_mention`: For `@mentions` of contacts in notes

5. **Supports local vs global view**:
   - With `focusContactId`: center on that contact, include neighbors up to `maxDepth`
   - Without: build global graph with `maxNodes` limit

6. **Computes importance** based on: recent activity, connection count, special status

7. **Never mutates stores** - pure function returning new FrameGraphData

## Phase 3: Graph View Component

Create `src/components/graph/FrameGraphView.tsx`:

1. **Data flow**:
   - Consume stores through existing hooks/context
   - Call `buildFrameGraphData()` with current stores and `selectedContactId`
   - Pass reasonable defaults for `maxNodes` (500) and `maxDepth` (3)

2. **Render ForceGraph2D**:
   ```tsx
   <ForceGraph2D
     graphData={graphData}
     onNodeHover={handleNodeHover}
     onNodeClick={handleNodeClick}
     nodeCanvasObject={renderNode}
     cooldownTicks={100}
   />
   ```

3. **Obsidian-style interactions**:
   - Zoom and pan enabled
   - Neighbor highlight on hover (fade non-neighbors)
   - Local vs global focus toggle
   - Node styling by type (different colors/sizes)
   - FrameScan nodes visually distinct (ring/diamond shape, color by FrameScore)
   - Contact Zero prominent and central

4. **Control panel** ("boom boom boom" principle):
   - Static explanation:
     - "What this is: A live map of your contacts, notes, topics, tasks, interactions, and FrameScan reports."
     - "Why it exists: To show how everything in FrameLord connects around you as Contact Zero."
     - "How to use it: Hover to explore, click nodes to open their detail views, and use filters to focus."
   - Search input (filter by label)
   - Type filters (checkboxes for each node type)
   - Focus controls: "Center on Contact Zero", "Center on Selected Contact", Global/Local toggle

5. **Node click navigation** (use existing router/selection state):
   - Contact → set selectedContactId, navigate to dossier
   - Contact Zero → navigate to dashboard home
   - Note → navigate to Notes with that note opened
   - Topic → navigate to Topic view or filter notes by topic
   - Task → navigate to Tasks/Calendar filtered to that task
   - Interaction → navigate to contact timeline scrolled to interaction
   - FrameScan → navigate to FrameScan view or note with scan in view

6. **Expose callback**: `onGraphSelectionChange(node: FrameGraphNode | null)` for future AI panels

## Phase 4: Sidebar Integration

1. Add "Graph" entry to the left-hand sidebar with appropriate icon
2. **Placement**: Position the Graph item BELOW "Wants" and ABOVE "Contacts" in the sidebar order
3. Wire routing so selecting "Graph" displays `FrameGraphView` in main content area
4. Respect tenant isolation - graph only shows current tenant data
5. Handle empty states gracefully with helpful message instead of error

## Phase 5: Dev Fixtures

Create `src/services/graph/graphDevFixtures.ts`:
- Function that creates synthetic FrameGraphData (20-50 contacts, 40-100 notes, 10-20 topics, tasks, interactions, FrameScans)
- Clear labels showing relationships
- In `FrameGraphView`, use dev flag to fall back to fixtures when stores are empty
- DO NOT persist to real stores - purely for rendering demos

## Phase 6: Tests

Add unit tests for `buildFrameGraphData`:
- Contacts without notes link correctly to Contact Zero
- Notes with topics create `note_topic` links
- Notes with wikilinks create `note_note` links
- Notes with `@mentions` create `note_contact_mention` links
- FrameScan nodes connect to correct contacts/notes/interactions
- Local vs global mode respects `focusContactId` and `maxDepth`
</requirements>

<constraints>
- **Read-only projection**: The graph is a VIEW of stores, not a separate data model. Never persist graph data.
- **No backend calls**: All data comes from in-memory stores
- **Contact spine**: Every node must relate to a contact somehow
- **Existing patterns**: Reuse existing routing, selection state, and styling patterns
- **Performance**: Use `maxNodes` and importance trimming to keep graph responsive
- **2D only**: No 3D or VR in v1
- **No new routing**: Use existing router and state patterns for navigation
- **Strict TypeScript**: No `any` except where absolutely necessary with documentation
- **Match existing theme**: Use same colors, fonts, border radii as dashboard
</constraints>

<implementation>
For maximum efficiency, explore the codebase in parallel to understand:
1. Store structures and data shapes
2. Routing and navigation patterns
3. Existing component patterns and styling

After research, implement in this order:
1. `graphDataBuilder.ts` - data model and builder function
2. `FrameGraphView.tsx` - main graph component
3. `graphDevFixtures.ts` - dev sample data
4. Sidebar integration in Dashboard.tsx
5. Unit tests

Use the existing sidebar and view switching pattern. Do not create a parallel routing system.
</implementation>

<output>
Create/modify files with relative paths:
- `./src/services/graph/graphDataBuilder.ts` - Graph data model and builder function
- `./src/components/graph/FrameGraphView.tsx` - Main graph view component
- `./src/components/graph/GraphControlPanel.tsx` - Control panel component (optional separation)
- `./src/services/graph/graphDevFixtures.ts` - Dev sample data generator
- `./src/components/Dashboard.tsx` - Add Graph sidebar entry and routing
- `./src/services/graph/index.ts` - Barrel export
- `./src/components/graph/index.ts` - Barrel export
- Test files in appropriate location following existing patterns

After implementation, verify:
- `npm run build` succeeds
- Dev server starts without errors
- Graph view is accessible from sidebar
- Nodes render and are clickable
- Empty state shows helpful message
</output>

<verification>
Before declaring complete, verify:

1. **Build passes**: Run `npm run build` - no TypeScript errors
2. **Dev server works**: Run `npm run dev` - no console errors on graph view
3. **Graph renders**: Navigate to Graph view, see nodes and links
4. **Interactions work**: Hover highlights neighbors, click navigates correctly
5. **Controls work**: Search filters, type toggles show/hide nodes, focus buttons work
6. **Empty state**: With no data, shows helpful message not error
7. **Dev fixtures**: In dev mode with empty stores, sample graph displays
8. **Types are strict**: No `any` types without documentation

Run through this checklist and report results.
</verification>

<success_criteria>
- Graph view appears in left-hand sidebar, positioned below Wants and above Contacts
- All entity types render as distinct, styled nodes (contacts, notes, topics, tasks, interactions, FrameScans)
- Contact Zero is visually prominent and central
- Edges correctly represent relationships from stores
- Wikilinks and @mentions create appropriate edges
- FrameScan nodes are explicit and visually distinct
- Hover highlights work (Obsidian-style)
- Click navigation works for all node types
- Local/Global view toggle works
- Search and type filters work
- Performance is acceptable with 500+ nodes
- All TypeScript strict, no build errors
- Tests pass for graph data builder
</success_criteria>
