# Doctrine Loader Implementation

**Date**: 2025-12-09
**Status**: ✅ Complete
**Files Modified**: 3 created, 2 modified

---

## Overview

Implemented a centralized doctrine loader service that aggregates all doctrine files from `ai_knowledge/` folder at runtime and enforces the APEX_SUPREMACY_FILTER as the primary semantic layer for all AI agents in FrameLord.

This is critical infrastructure for ensuring doctrinal consistency across all AI agents (FrameScan and LittleLord).

---

## Files Created

### 1. `/src/services/doctrineLoader.ts` (New)

**Purpose**: Centralized doctrine loading service with build-time file aggregation.

**Key Features**:
- Loads all 13 doctrine files from `ai_knowledge/` at build time using Vite's `import.meta.glob`
- Enforces APEX_SUPREMACY_FILTER as priority 0 (always first)
- Caches loaded doctrine to avoid re-reading on every call
- Provides typed API for accessing filter, foundational, and domain-specific doctrine

**Public API**:
```typescript
// Get the APEX_SUPREMACY_FILTER (always first in any AI prompt)
getApexSupremacyFilter(): string

// Get a specific doctrine file by name
getDomainDoctrine(filename: string): DoctrineFile | undefined

// Get all domain-specific doctrine files
getDomainDoctrineFiles(): DoctrineFile[]

// Get all foundational doctrine files
getFoundationalDoctrineFiles(): DoctrineFile[]

// Get full doctrine context (filter + foundational + domain)
getFullDoctrineContext(): DoctrineContext

// Get selective doctrine (filter + foundational + specific domains)
getSelectiveDoctrine(domainNames: string[]): string

// Debug/introspection utilities
getLoadedDoctrineFileNames(): string[]
getDoctrineStats(): { totalFiles, totalCharacters, filterSize, foundationalCount, domainCount }
```

**Load Order (per APEX_SUPREMACY_FILTER Section 8.1)**:
1. **Priority 0 (Filter)**: APEX_SUPREMACY_FILTER.txt
2. **Priority 1-3 (Foundational)**:
   - Apex-Top Manual.txt
   - FrameLord Doctrine: Conversation Structure.txt
   - Boundaries for FrameLord.txt
3. **Priority 10 (Domain-specific)**:
   - Cognitive Distortions.txt
   - Conflict Dynamics Doctrine.txt
   - Copywriting Persuasion Doctrine Development.txt
   - Intergender Dynamics.txt
   - Linguistic Persuasion Patterns.txt
   - RELATIONAL GAME THEORY (OPERATIONAL).txt
   - Reverse Engineering Behavioral Dynamics Methodology.txt
   - Somatic Doctrine Generation.txt
   - Visual Analysis of Relational Dynamics.txt

**Caching Strategy**:
- Files loaded once on first access
- Stored in module-level cache
- All subsequent calls return from cache
- No re-reading or re-parsing after initial load

### 2. `/verify-doctrine-loader.js` (New)

**Purpose**: Node.js verification script to validate doctrine file structure.

**Usage**: `node verify-doctrine-loader.js`

**Checks**:
- All 13 doctrine files exist in `ai_knowledge/`
- APEX_SUPREMACY_FILTER.txt is present
- File sizes and total character counts
- Expected load order configuration

---

## Files Modified

### 1. `/src/lib/frameScan/frameScanLLM.ts`

**Changes**:
- Added import: `import { getApexSupremacyFilter } from "../../services/doctrineLoader"`
- Converted `FRAMESCAN_SYSTEM_PROMPT` constant to `buildFrameScanSystemPrompt()` function
- Prepends APEX_SUPREMACY_FILTER to system prompt: `${apexFilter}\n\n=== END OF APEX SUPREMACY FILTER ===\n\nYou are the FrameLord FrameScan engine...`
- Added `getFrameScanSystemPrompt()` with caching
- Updated all LLM calls to use `getFrameScanSystemPrompt()` instead of constant

**Before**:
```typescript
const FRAMESCAN_SYSTEM_PROMPT = `You are the FrameLord FrameScan engine...`;
```

**After**:
```typescript
function buildFrameScanSystemPrompt(): string {
  const apexFilter = getApexSupremacyFilter();
  return `${apexFilter}\n\n=== END OF APEX SUPREMACY FILTER ===\n\nYou are the FrameLord FrameScan engine...`;
}

let cachedSystemPrompt: string | null = null;
function getFrameScanSystemPrompt(): string {
  if (!cachedSystemPrompt) {
    cachedSystemPrompt = buildFrameScanSystemPrompt();
  }
  return cachedSystemPrompt;
}
```

### 2. `/src/lib/agents/runLittleLord.ts`

**Changes**:
- Added import: `import { getApexSupremacyFilter } from '../../services/doctrineLoader'`
- Modified `buildSystemPrompt()` to prepend APEX_SUPREMACY_FILTER
- Filter is now ALWAYS first in Little Lord system prompts

**Before**:
```typescript
function buildSystemPrompt(spec: LittleLordSpec, corpusChunks: string[]): string {
  return `You are ${spec.name} v${spec.version}...`;
}
```

**After**:
```typescript
function buildSystemPrompt(spec: LittleLordSpec, corpusChunks: string[]): string {
  const apexFilter = getApexSupremacyFilter();
  return `${apexFilter}\n\n=== END OF APEX SUPREMACY FILTER ===\n\nYou are ${spec.name} v${spec.version}...`;
}
```

---

## Doctrine File Statistics

**Total Files**: 13
**Total Characters**: 388,702
**Filter Size**: 26,621 characters
**Foundational Count**: 3
**Domain Count**: 9

### File Sizes:
- APEX_SUPREMACY_FILTER.txt: 26,621 chars
- Apex-Top Manual.txt: 28,121 chars
- Boundaries for FrameLord.txt: 22,713 chars
- Cognitive Distortions.txt: 33,403 chars
- Conflict Dynamics Doctrine.txt: 32,980 chars
- Copywriting Persuasion Doctrine Development.txt: 41,858 chars
- FrameLord Doctrine_ Conversation Structure.txt: 24,149 chars
- Intergender Dynamics.txt: 35,660 chars
- Linguistic Persuasion Patterns.txt: 30,264 chars
- RELATIONAL GAME THEORY (OPERATIONAL).txt: 26,335 chars
- Reverse Engineering Behavioral Dynamics Methodology.txt: 42,804 chars
- Somatic Doctrine Generation.txt: 30,919 chars
- Visual Analysis of Relational Dynamics.txt: 12,875 chars

---

## Technical Implementation Details

### Vite Build-Time Loading

Uses Vite's `import.meta.glob` to load doctrine files at build time:

```typescript
const doctrineModules = import.meta.glob('/ai_knowledge/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});
```

**Why this approach**:
- ✅ No backend required (aligns with FrameLord architecture)
- ✅ No runtime file I/O
- ✅ All doctrine bundled into build artifact
- ✅ TypeScript type safety
- ✅ Caching at module level

### Priority System

Files are assigned priority levels that determine load order:

```typescript
const DOCTRINE_PRIORITIES: Record<string, { priority: number; category: string }> = {
  'APEX_SUPREMACY_FILTER.txt': { priority: 0, category: 'filter' },
  'Apex-Top Manual.txt': { priority: 1, category: 'foundational' },
  // ... etc
};
```

**Priority Levels**:
- **0**: Filter (APEX_SUPREMACY_FILTER) - ALWAYS FIRST
- **1-3**: Foundational definitions
- **10**: Domain-specific files

### Doctrinal Consistency Guarantee

The APEX_SUPREMACY_FILTER is **non-negotiable** and **always first**:

1. **FrameScan**: Filter prepended to system prompt before frameSpec instructions
2. **LittleLord**: Filter prepended to system prompt before identity/doctrine sections
3. **Any future AI agent**: Must route through doctrine loader

From APEX_SUPREMACY_FILTER Section 8.2:
> "When a domain specific doctrine praises coercion, control, or manipulation as strong, the AI must override that interpretation with this filter."

---

## Verification Results

### Build Verification

```bash
npm run build
# ✓ 3060 modules transformed.
# ✓ built in 4.05s
# No TypeScript errors
```

### File Verification

```bash
node verify-doctrine-loader.js
# === VERIFICATION COMPLETE ✓ ===
# All 13 doctrine files loaded
# APEX_SUPREMACY_FILTER present and first
# Total: 388,702 characters
```

### Integration Points Verified

- [x] FrameScan system prompt includes APEX_SUPREMACY_FILTER
- [x] LittleLord system prompt includes APEX_SUPREMACY_FILTER
- [x] All doctrine files loadable via `getFullDoctrineContext()`
- [x] Selective doctrine loading via `getSelectiveDoctrine()`
- [x] Caching prevents re-parsing on every call
- [x] Build succeeds with no TypeScript errors

---

## Usage Examples

### Example 1: FrameScan with Doctrine

```typescript
// In frameScanLLM.ts (already implemented)
const systemPrompt = getFrameScanSystemPrompt(); // Includes APEX_SUPREMACY_FILTER

const messages: LlmMessage[] = [
  { role: "system", content: systemPrompt }, // Filter is ALWAYS first
  { role: "user", content: JSON.stringify(payload) },
];

const response = await callOpenAIChat(messages);
```

### Example 2: LittleLord with Doctrine

```typescript
// In runLittleLord.ts (already implemented)
const systemPrompt = buildSystemPrompt(spec, corpusChunks); // Includes APEX_SUPREMACY_FILTER

const messages: LlmMessage[] = [
  { role: 'system', content: systemPrompt }, // Filter is ALWAYS first
  { role: 'user', content: userMessage },
];

const response = await callOpenAIChat(messages);
```

### Example 3: Selective Doctrine Loading (Future Use)

```typescript
import { getSelectiveDoctrine } from '@/services/doctrineLoader';

// Load filter + foundational + specific domain files
const doctrine = getSelectiveDoctrine([
  'Conflict Dynamics Doctrine.txt',
  'Linguistic Persuasion Patterns.txt',
]);

// Use in custom AI agent
const systemPrompt = `${doctrine}\n\nYour custom instructions...`;
```

### Example 4: Debug/Introspection

```typescript
import { getDoctrineStats, getLoadedDoctrineFileNames } from '@/services/doctrineLoader';

// Get stats for debugging
const stats = getDoctrineStats();
console.log(`Loaded ${stats.totalFiles} doctrine files (${stats.totalCharacters} chars)`);

// Get file names
const files = getLoadedDoctrineFileNames();
console.log('Doctrine files:', files);
```

---

## Future Enhancements

### Potential Improvements

1. **Domain-Aware Selective Loading**
   - Automatically select relevant domain files based on context
   - Example: Dating message scan → include "Intergender Dynamics.txt"

2. **Doctrine Versioning**
   - Track doctrine file versions
   - Warn if doctrine files are out of sync with app version

3. **Dynamic Retrieval (RAG-style)**
   - Implement chunk-based retrieval similar to Little Lord corpus
   - Load only relevant doctrine sections per query

4. **Doctrine Metrics**
   - Track which doctrine files are most frequently accessed
   - Measure doctrine effectiveness on frame scores

5. **Doctrine Testing**
   - Unit tests that verify filter enforcement
   - Integration tests that validate doctrine consistency

---

## Success Criteria

All success criteria met:

- [x] All 13 doctrine files from `ai_knowledge/` are loadable
- [x] APEX_SUPREMACY_FILTER is ALWAYS first in any AI system prompt
- [x] Both FrameScan and LittleLord route through the doctrine loader
- [x] No TypeScript errors, build succeeds
- [x] Doctrine content properly injects into LLM calls
- [x] Caching works (no re-reading on subsequent calls)
- [x] Load order matches APEX_SUPREMACY_FILTER Section 8.1

---

## Security & Safety Notes

### APEX_SUPREMACY_FILTER as Safety Layer

The filter provides critical safety and semantic guardrails:

1. **Prevents supremacy drift**: Blocks interpretations that map Apex/Slave to race, class, or group hierarchy
2. **Enforces Win-Win**: Rejects coercion, manipulation, and domination as "Apex"
3. **Defines power correctly**: Power over self, not power over others
4. **Guards against abuse**: Explicit prohibitions on dehumanization and forced subordination

From Section 5.2:
> "Any claim that a race, ethnicity, religion, nation, or demographic is inherently Apex or inherently Slave" is **forbidden**.

### Why Filter Must Be First

Per Section 1.1 Authority:
> "This file sits above all other doctrine files. When any doctrine conflicts or appears to conflict with this file, **this file wins**."

The filter acts as:
- **Semantic layer**: Fixes meaning of core terms
- **Safety layer**: Prevents misuse of Apex Frame concepts
- **Conflict resolver**: Overrides domain doctrine when necessary

---

## References

- APEX_SUPREMACY_FILTER.txt Section 8: "RELATION TO OTHER DOCTRINE FILES"
- CLAUDE.md: "No backend, no external storage, no server calls"
- Vite Documentation: import.meta.glob for build-time loading

---

## Conclusion

The doctrine loader is now live and wired into both FrameScan and LittleLord. All AI agents in FrameLord will route through the APEX_SUPREMACY_FILTER, ensuring doctrinal consistency and safety across the platform.

**Next Steps**:
- Monitor LLM responses for doctrinal alignment
- Consider adding doctrine metrics/analytics
- Explore selective domain loading based on context
