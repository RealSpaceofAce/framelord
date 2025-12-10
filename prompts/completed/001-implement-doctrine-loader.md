<objective>
Create a centralized doctrine loader service that:
1. Aggregates all doctrine files from `ai_knowledge/` folder at runtime
2. Enforces APEX_SUPREMACY_FILTER as the primary filter that runs first
3. Wires into both FrameScan and LittleLord so all AI calls route through the doctrine system

This is critical infrastructure for ensuring doctrinal consistency across all AI agents in FrameLord.
</objective>

<context>
Project: FrameLord - AI-powered authority diagnostics platform
Tech stack: React 19 + TypeScript + Vite (no backend, in-memory stores)

Current doctrine landscape:
- `ai_knowledge/` contains 13 .txt doctrine files
- `ai_knowledge/APEX_SUPREMACY_FILTER.txt` is the master safety/semantic layer (MUST load first)
- `src/services/littleLord/doctrine.ts` has hardcoded LITTLE_LORD_DOCTRINE JSON
- `src/lib/corpus/apex_frame_corpus.txt` exists for Little Lord retrieval

Current AI integration points:
@src/lib/frameScan/frameScanLLM.ts - Text/image FrameScan using OpenAI
@src/lib/agents/runLittleLord.ts - Little Lord agent using OpenAI
@src/services/littleLord/doctrine.ts - Hardcoded Little Lord doctrine

Key insight from APEX_SUPREMACY_FILTER.txt Section 8:
- Load order: APEX_SUPREMACY_FILTER first, then foundational definitions, then domain-specific doctrine files
- When domain doctrine conflicts with the filter, the filter wins
</context>

<requirements>
1. Create `src/services/doctrineLoader.ts` with:
   - `loadAllDoctrine()` - Reads all .txt files from ai_knowledge/ folder
   - `getApexSupremacyFilter()` - Returns the filter content (cached)
   - `getDomainDoctrine(domain: string)` - Returns specific doctrine file content
   - `getFullDoctrineContext()` - Returns concatenated doctrine with filter first
   - Built-in caching to avoid re-reading files on every call

2. Define TypeScript types for doctrine loading:
   - `DoctrineFile` - Represents a single doctrine file (name, content, priority)
   - `DoctrineContext` - Full context object with filter + domain doctrines

3. Modify `src/lib/frameScan/frameScanLLM.ts`:
   - Import doctrine loader
   - Prepend APEX_SUPREMACY_FILTER to the system prompt
   - Include relevant domain doctrine based on scan domain

4. Modify `src/lib/agents/runLittleLord.ts`:
   - Import doctrine loader
   - Prepend APEX_SUPREMACY_FILTER to the system prompt
   - Replace hardcoded corpus with dynamically loaded doctrine

5. File loading strategy (since no backend):
   - Use Vite's import.meta.glob to load .txt files at build time
   - OR use fetch() for runtime loading from public folder
   - Prefer build-time for reliability
</requirements>

<implementation>
Use Vite's import.meta.glob pattern for loading doctrine files:

```typescript
// Example pattern for build-time loading
const doctrineModules = import.meta.glob('/ai_knowledge/*.txt', { as: 'raw', eager: true });
```

The APEX_SUPREMACY_FILTER must ALWAYS be the first content in any AI system prompt.
Other doctrine files should be loaded by relevance to the current context.

Doctrine loading order per APEX_SUPREMACY_FILTER Section 8.1:
1. APEX_SUPREMACY_FILTER (always first, non-negotiable)
2. Foundational definitions (Apex-Top Manual, FrameLord Doctrine)
3. Domain-specific files based on context

Caching strategy:
- Load all files once on first access
- Store in module-level Map<filename, content>
- Expose getter functions that return from cache
</implementation>

<constraints>
- No external file storage or server calls (per CLAUDE.md rules)
- Must work with Vite build system
- TypeScript strict mode compliance
- Doctrine files are .txt format (not markdown)
- APEX_SUPREMACY_FILTER must ALWAYS run first - this is non-negotiable
- Do not modify doctrine file contents, only load and inject them
</constraints>

<output>
Create/modify these files:
- `./src/services/doctrineLoader.ts` - New file: doctrine loading service
- `./src/lib/frameScan/frameScanLLM.ts` - Modified: inject doctrine into system prompt
- `./src/lib/agents/runLittleLord.ts` - Modified: inject doctrine into system prompt

Optionally update:
- `./src/services/littleLord/doctrine.ts` - If needed to integrate with loader
</output>

<verification>
Before declaring complete, verify:
1. Run `npm run build` - Build must succeed with no TypeScript errors
2. Run `npm run dev` and test FrameScan - Doctrine should appear in system prompt (add console.log temporarily)
3. Test LittleLord chat - APEX_SUPREMACY_FILTER content should be in system prompt
4. Verify caching works - Multiple calls should not re-read files
</verification>

<success_criteria>
- All 13 doctrine files from ai_knowledge/ are loadable
- APEX_SUPREMACY_FILTER is ALWAYS first in any AI system prompt
- Both FrameScan and LittleLord route through the doctrine loader
- No TypeScript errors, build succeeds
- Doctrine content properly injects into LLM calls
</success_criteria>
