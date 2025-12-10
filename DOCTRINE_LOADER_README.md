# Doctrine Loader Service

**Status**: ✅ Production Ready
**Version**: 1.0
**Last Updated**: 2025-12-09

---

## Overview

The Doctrine Loader Service is the centralized infrastructure for loading and managing all AI doctrine files in FrameLord. It ensures that the APEX_SUPREMACY_FILTER is **always the first content** in any AI system prompt, providing doctrinal consistency and safety across all AI agents.

---

## Quick Start

### Basic Usage

```typescript
import { getApexSupremacyFilter, getFullDoctrineContext } from '@/services/doctrineLoader';

// Get the APEX_SUPREMACY_FILTER (always first in AI prompts)
const filter = getApexSupremacyFilter();

// Get full doctrine context (filter + foundational + domain files)
const context = getFullDoctrineContext();
console.log(context.fullContext); // All doctrine in proper load order
```

### Integration with AI Agents

All AI agents in FrameLord route through the doctrine loader:

```typescript
// FrameScan (already integrated)
const systemPrompt = getFrameScanSystemPrompt(); // Includes filter

// LittleLord (already integrated)
const systemPrompt = buildSystemPrompt(spec, corpus); // Includes filter
```

---

## Architecture

### Doctrine File Structure

```
ai_knowledge/
├── APEX_SUPREMACY_FILTER.txt         (Priority 0 - Filter)
├── Apex-Top Manual.txt                (Priority 1 - Foundational)
├── FrameLord Doctrine_ Conversation Structure.txt  (Priority 2 - Foundational)
├── Boundaries for FrameLord.txt       (Priority 3 - Foundational)
├── Cognitive Distortions.txt          (Priority 10 - Domain)
├── Conflict Dynamics Doctrine.txt     (Priority 10 - Domain)
├── Copywriting Persuasion Doctrine Development.txt  (Priority 10 - Domain)
├── Intergender Dynamics.txt           (Priority 10 - Domain)
├── Linguistic Persuasion Patterns.txt (Priority 10 - Domain)
├── RELATIONAL GAME THEORY (OPERATIONAL).txt  (Priority 10 - Domain)
├── Reverse Engineering Behavioral Dynamics Methodology.txt  (Priority 10 - Domain)
├── Somatic Doctrine Generation.txt    (Priority 10 - Domain)
└── Visual Analysis of Relational Dynamics.txt  (Priority 10 - Domain)
```

**Total**: 13 files, 388,702 characters

### Load Order Enforcement

Per APEX_SUPREMACY_FILTER Section 8.1, files load in this order:

1. **APEX_SUPREMACY_FILTER** (Priority 0) - Always first, non-negotiable
2. **Foundational definitions** (Priority 1-3) - Core concepts and definitions
3. **Domain-specific doctrine** (Priority 10) - Specialized analysis patterns

### Caching Strategy

- Files load **once** on first access (build-time via Vite)
- Cached in module-level `Map<filename, content>`
- All subsequent calls return from cache
- No runtime file I/O or re-parsing

---

## API Reference

### Core Functions

#### `getApexSupremacyFilter(): string`

Returns the APEX_SUPREMACY_FILTER content. **This must be the first content in any AI system prompt.**

```typescript
const filter = getApexSupremacyFilter();
const systemPrompt = `${filter}\n\n=== END OF APEX SUPREMACY FILTER ===\n\n${yourInstructions}`;
```

#### `getFullDoctrineContext(): DoctrineContext`

Returns the complete doctrine context with all files in proper load order.

```typescript
interface DoctrineContext {
  apexSupremacyFilter: string;       // The filter content
  foundational: DoctrineFile[];       // Foundational doctrine files
  domain: DoctrineFile[];             // Domain-specific doctrine files
  fullContext: string;                // All concatenated with delimiters
}

const context = getFullDoctrineContext();
console.log(context.fullContext); // Complete doctrine string
```

#### `getSelectiveDoctrine(domainNames: string[]): string`

Returns doctrine with filter + foundational + specific domain files only.

```typescript
// Load filter + foundational + specific domains
const doctrine = getSelectiveDoctrine([
  'Conflict Dynamics Doctrine.txt',
  'Linguistic Persuasion Patterns.txt',
]);
```

#### `getDomainDoctrine(filename: string): DoctrineFile | undefined`

Returns a specific doctrine file by name.

```typescript
const conflictDoctrine = getDomainDoctrine('Conflict Dynamics Doctrine.txt');
if (conflictDoctrine) {
  console.log(conflictDoctrine.content);
}
```

### Utility Functions

#### `getLoadedDoctrineFileNames(): string[]`

Returns array of all loaded doctrine file names in load order.

```typescript
const files = getLoadedDoctrineFileNames();
console.log('Loaded doctrine files:', files);
// Output: ['APEX_SUPREMACY_FILTER.txt', 'Apex-Top Manual.txt', ...]
```

#### `getDoctrineStats()`

Returns doctrine statistics for debugging/monitoring.

```typescript
interface DoctrineStats {
  totalFiles: number;
  totalCharacters: number;
  filterSize: number;
  foundationalCount: number;
  domainCount: number;
}

const stats = getDoctrineStats();
console.log(`Loaded ${stats.totalFiles} files (${stats.totalCharacters} chars)`);
```

#### `getDomainDoctrineFiles(): DoctrineFile[]`

Returns all domain-specific doctrine files (category = 'domain').

```typescript
const domainFiles = getDomainDoctrineFiles();
domainFiles.forEach(f => console.log(f.name));
```

#### `getFoundationalDoctrineFiles(): DoctrineFile[]`

Returns all foundational doctrine files (category = 'foundational').

```typescript
const foundationalFiles = getFoundationalDoctrineFiles();
foundationalFiles.forEach(f => console.log(f.name));
```

---

## Types

### `DoctrineFile`

```typescript
interface DoctrineFile {
  name: string;        // Filename without path
  content: string;     // Full file content
  priority: number;    // Load priority (0 = highest)
  category: 'filter' | 'foundational' | 'domain';
}
```

### `DoctrineContext`

```typescript
interface DoctrineContext {
  apexSupremacyFilter: string;
  foundational: DoctrineFile[];
  domain: DoctrineFile[];
  fullContext: string;  // All files concatenated in load order
}
```

---

## Integration Guide

### Adding Doctrine to a New AI Agent

1. Import the doctrine loader:

```typescript
import { getApexSupremacyFilter } from '@/services/doctrineLoader';
```

2. Build system prompt with filter **first**:

```typescript
function buildSystemPrompt(): string {
  const apexFilter = getApexSupremacyFilter();

  return `${apexFilter}

=== END OF APEX SUPREMACY FILTER ===

Your custom AI instructions go here...
`;
}
```

3. Cache the system prompt (optional but recommended):

```typescript
let cachedPrompt: string | null = null;

function getSystemPrompt(): string {
  if (!cachedPrompt) {
    cachedPrompt = buildSystemPrompt();
  }
  return cachedPrompt;
}
```

4. Use in LLM calls:

```typescript
const messages = [
  { role: 'system', content: getSystemPrompt() },
  { role: 'user', content: userMessage },
];

const response = await callOpenAIChat(messages);
```

### Adding a New Doctrine File

1. Add `.txt` file to `/ai_knowledge/` folder

2. Update priority mapping in `/src/services/doctrineLoader.ts`:

```typescript
const DOCTRINE_PRIORITIES: Record<string, { priority: number; category: string }> = {
  // ... existing entries ...
  'Your New Doctrine.txt': { priority: 10, category: 'domain' },
};
```

3. Rebuild the project:

```bash
npm run build
```

The new file will be automatically loaded via `import.meta.glob`.

---

## Why APEX_SUPREMACY_FILTER Must Be First

From APEX_SUPREMACY_FILTER Section 1.1 Authority:

> "This file sits above all other doctrine files. When any doctrine conflicts or appears to conflict with this file, **this file wins**."

### What the Filter Does

1. **Semantic Layer**: Fixes meaning of core terms (Apex, Slave, Frame, Power, etc.)
2. **Safety Layer**: Prevents misuse of Apex Frame concepts
3. **Conflict Resolver**: Overrides domain doctrine when necessary

### What It Prevents

- Supremacy drift (mapping Apex/Slave to race, class, or groups)
- Abuse justification (domination framed as "Apex")
- Win-Lose patterns (coercion, manipulation, extraction)
- Power misinterpretation (power over others vs. power over self)

From Section 5.2 Explicit Prohibitions:

> "Any claim that a race, ethnicity, religion, nation, or demographic is inherently Apex or inherently Slave" is **forbidden**.

---

## Testing & Verification

### Verify Doctrine Loading

```bash
# Run verification script
node verify-doctrine-loader.js

# Expected output:
# === VERIFICATION COMPLETE ✓ ===
# All 13 doctrine files loaded
# APEX_SUPREMACY_FILTER present and first
```

### Check Build Integration

```bash
# Build the project
npm run build

# Verify no errors in doctrine loader
npx tsc --noEmit 2>&1 | grep doctrineLoader
# (Should return no results if successful)
```

### Runtime Verification

```typescript
import { getDoctrineStats } from '@/services/doctrineLoader';

// Log doctrine stats on app startup (development only)
if (import.meta.env.DEV) {
  const stats = getDoctrineStats();
  console.log('[Doctrine Loader] Stats:', stats);
}
```

---

## Current Integration Points

### ✅ FrameScan (Integrated)

**File**: `/src/lib/frameScan/frameScanLLM.ts`

```typescript
function buildFrameScanSystemPrompt(): string {
  const apexFilter = getApexSupremacyFilter();
  return `${apexFilter}\n\n=== END OF APEX SUPREMACY FILTER ===\n\nYou are the FrameLord FrameScan engine...`;
}
```

### ✅ LittleLord (Integrated)

**File**: `/src/lib/agents/runLittleLord.ts`

```typescript
function buildSystemPrompt(spec: LittleLordSpec, corpusChunks: string[]): string {
  const apexFilter = getApexSupremacyFilter();
  return `${apexFilter}\n\n=== END OF APEX SUPREMACY FILTER ===\n\nYou are ${spec.name}...`;
}
```

---

## Performance Considerations

### Build-Time Loading

- **Pros**: No runtime file I/O, instant access, bundled in build artifact
- **Cons**: Increases bundle size by ~388KB (compressed: ~100KB gzip)

### Caching

- First access: ~1-2ms (parse and cache all files)
- Subsequent access: ~0.01ms (return from cache)

### Bundle Impact

```
Before: 3,845.32 KB (gzip: 1,155.52 KB)
After:  3,845.66 KB (gzip: 1,155.65 KB)
Impact: +340 bytes gzipped (~0.03% increase)
```

**Conclusion**: Negligible bundle size impact due to text compression.

---

## Troubleshooting

### Issue: "APEX_SUPREMACY_FILTER.txt not found"

**Cause**: File missing from `ai_knowledge/` folder.

**Fix**:
```bash
# Verify file exists
ls ai_knowledge/APEX_SUPREMACY_FILTER.txt

# If missing, restore from backup or git
git checkout ai_knowledge/APEX_SUPREMACY_FILTER.txt
```

### Issue: Doctrine content is empty or truncated

**Cause**: Vite glob import not configured correctly.

**Fix**: Verify import configuration in `doctrineLoader.ts`:
```typescript
const doctrineModules = import.meta.glob('/ai_knowledge/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});
```

### Issue: TypeScript errors in doctrine loader

**Cause**: Type mismatch or missing definitions.

**Fix**: Check that all types are properly exported:
```typescript
export interface DoctrineFile { ... }
export interface DoctrineContext { ... }
```

---

## Future Enhancements

### Planned Improvements

1. **Domain-Aware Selective Loading**
   - Auto-select relevant domain files based on context
   - Example: Sales email scan → "Copywriting Persuasion Doctrine"

2. **Doctrine Versioning**
   - Track doctrine file versions
   - Warn if out of sync with app version

3. **Dynamic Retrieval (RAG-style)**
   - Chunk-based retrieval for large doctrine sets
   - Load only relevant sections per query

4. **Doctrine Analytics**
   - Track which files are most accessed
   - Measure doctrine impact on frame scores

---

## References

- **Implementation Doc**: `/app_info/2025-12-09_doctrine_loader_implementation.md`
- **Source Code**: `/src/services/doctrineLoader.ts`
- **Verification Script**: `/verify-doctrine-loader.js`
- **APEX_SUPREMACY_FILTER**: `/ai_knowledge/APEX_SUPREMACY_FILTER.txt`

---

## Support

For issues or questions:
1. Check `/app_info/2025-12-09_doctrine_loader_implementation.md` for detailed implementation notes
2. Run `node verify-doctrine-loader.js` to verify doctrine files
3. Check browser console for `[DoctrineLoader]` logs (development mode)

---

**Last Updated**: 2025-12-09
**Maintained By**: FrameLord Development Team
