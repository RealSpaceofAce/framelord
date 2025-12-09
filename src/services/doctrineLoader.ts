// =============================================================================
// DOCTRINE LOADER SERVICE — Centralized doctrine file aggregation
// =============================================================================
// This service loads all doctrine files from ai_knowledge/ folder and enforces
// the APEX_SUPREMACY_FILTER as the primary semantic and safety layer.
//
// Load Order (per APEX_SUPREMACY_FILTER Section 8.1):
// 1. APEX_SUPREMACY_FILTER (always first, non-negotiable)
// 2. Foundational definitions (Apex-Top Manual, FrameLord Doctrine)
// 3. Domain-specific files based on context
//
// The filter ALWAYS runs first and governs interpretation of all other doctrine.
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

/**
 * Represents a single doctrine file with metadata.
 */
export interface DoctrineFile {
  /** File name without path (e.g., "APEX_SUPREMACY_FILTER.txt") */
  name: string;
  /** Full file content as string */
  content: string;
  /** Priority level (0 = highest priority, loaded first) */
  priority: number;
  /** Category for organization (filter, foundational, domain) */
  category: 'filter' | 'foundational' | 'domain';
}

/**
 * Full doctrine context for AI system prompts.
 */
export interface DoctrineContext {
  /** The APEX_SUPREMACY_FILTER content (always present) */
  apexSupremacyFilter: string;
  /** Foundational doctrine files (Apex-Top Manual, FrameLord Doctrine) */
  foundational: DoctrineFile[];
  /** Domain-specific doctrine files */
  domain: DoctrineFile[];
  /** All files concatenated in proper load order */
  fullContext: string;
}

// =============================================================================
// DOCTRINE FILE LOADING (Build-time via Vite)
// =============================================================================

/**
 * Load all .txt files from ai_knowledge/ folder at build time.
 * Uses Vite's import.meta.glob with query parameter to get file contents as strings.
 */
const doctrineModules = import.meta.glob('/ai_knowledge/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * Priority mapping for doctrine files.
 * Lower numbers = higher priority = loaded first.
 */
const DOCTRINE_PRIORITIES: Record<string, { priority: number; category: DoctrineFile['category'] }> = {
  'APEX_SUPREMACY_FILTER.txt': { priority: 0, category: 'filter' },
  'Apex-Top Manual.txt': { priority: 1, category: 'foundational' },
  'FrameLord Doctrine_ Conversation Structure.txt': { priority: 2, category: 'foundational' },
  'Boundaries for FrameLord.txt': { priority: 3, category: 'foundational' },
  'Cognitive Distortions.txt': { priority: 10, category: 'domain' },
  'Conflict Dynamics Doctrine.txt': { priority: 10, category: 'domain' },
  'Copywriting Persuasion Doctrine Development.txt': { priority: 10, category: 'domain' },
  'Intergender Dynamics.txt': { priority: 10, category: 'domain' },
  'Linguistic Persuasion Patterns.txt': { priority: 10, category: 'domain' },
  'RELATIONAL GAME THEORY (OPERATIONAL).txt': { priority: 10, category: 'domain' },
  'Reverse Engineering Behavioral Dynamics Methodology.txt': { priority: 10, category: 'domain' },
  'Somatic Doctrine Generation.txt': { priority: 10, category: 'domain' },
  'Visual Analysis of Relational Dynamics.txt': { priority: 10, category: 'domain' },
};

/**
 * In-memory cache for parsed doctrine files.
 * Populated on first access, then reused for all subsequent calls.
 */
let doctrineCache: DoctrineFile[] | null = null;

/**
 * Parse all doctrine modules into DoctrineFile objects.
 * Assigns priority and category based on DOCTRINE_PRIORITIES mapping.
 */
function parseDoctrineFiles(): DoctrineFile[] {
  const files: DoctrineFile[] = [];

  for (const [path, content] of Object.entries(doctrineModules)) {
    // Extract filename from path (e.g., "/ai_knowledge/APEX_SUPREMACY_FILTER.txt" -> "APEX_SUPREMACY_FILTER.txt")
    const name = path.split('/').pop() || path;

    // Get priority and category (default to priority 10, category 'domain' for unknown files)
    const { priority = 10, category = 'domain' } = DOCTRINE_PRIORITIES[name] || {};

    files.push({
      name,
      content: typeof content === 'string' ? content : '',
      priority,
      category,
    });
  }

  // Sort by priority (ascending: 0, 1, 2, ..., 10)
  return files.sort((a, b) => a.priority - b.priority);
}

/**
 * Get all doctrine files in priority order (cached).
 * Loads once on first call, then returns cached result.
 */
function getAllDoctrineFiles(): DoctrineFile[] {
  if (!doctrineCache) {
    doctrineCache = parseDoctrineFiles();
  }
  return doctrineCache;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get the APEX_SUPREMACY_FILTER content.
 * This filter MUST be the first content in any AI system prompt.
 *
 * @returns The full APEX_SUPREMACY_FILTER text
 * @throws Error if the filter file is not found
 */
export function getApexSupremacyFilter(): string {
  const files = getAllDoctrineFiles();
  const filter = files.find((f) => f.name === 'APEX_SUPREMACY_FILTER.txt');

  if (!filter) {
    throw new Error('APEX_SUPREMACY_FILTER.txt not found in doctrine files');
  }

  return filter.content;
}

/**
 * Get a specific doctrine file by name.
 *
 * @param filename - The name of the doctrine file (e.g., "Conflict Dynamics Doctrine.txt")
 * @returns The doctrine file object, or undefined if not found
 */
export function getDomainDoctrine(filename: string): DoctrineFile | undefined {
  const files = getAllDoctrineFiles();
  return files.find((f) => f.name === filename);
}

/**
 * Get all domain-specific doctrine files (category = 'domain').
 *
 * @returns Array of domain doctrine files
 */
export function getDomainDoctrineFiles(): DoctrineFile[] {
  const files = getAllDoctrineFiles();
  return files.filter((f) => f.category === 'domain');
}

/**
 * Get all foundational doctrine files (category = 'foundational').
 *
 * @returns Array of foundational doctrine files
 */
export function getFoundationalDoctrineFiles(): DoctrineFile[] {
  const files = getAllDoctrineFiles();
  return files.filter((f) => f.category === 'foundational');
}

/**
 * Get the full doctrine context with all files in proper load order.
 * The APEX_SUPREMACY_FILTER is always first, followed by foundational and domain files.
 *
 * @returns DoctrineContext object with filter, foundational, domain, and fullContext
 */
export function getFullDoctrineContext(): DoctrineContext {
  const files = getAllDoctrineFiles();

  const filter = files.find((f) => f.category === 'filter');
  const foundational = files.filter((f) => f.category === 'foundational');
  const domain = files.filter((f) => f.category === 'domain');

  if (!filter) {
    throw new Error('APEX_SUPREMACY_FILTER not found in doctrine files');
  }

  // Build full context string with delimiters
  const fullContext = [
    '=== APEX SUPREMACY FILTER (PRIMARY SEMANTIC LAYER) ===',
    '',
    filter.content,
    '',
    '=== FOUNDATIONAL DOCTRINE ===',
    '',
    ...foundational.map((f) => `--- ${f.name} ---\n\n${f.content}`),
    '',
    '=== DOMAIN-SPECIFIC DOCTRINE ===',
    '',
    ...domain.map((f) => `--- ${f.name} ---\n\n${f.content}`),
  ].join('\n');

  return {
    apexSupremacyFilter: filter.content,
    foundational,
    domain,
    fullContext,
  };
}

/**
 * Get selective doctrine context based on specific domains.
 * Always includes APEX_SUPREMACY_FILTER + foundational files + requested domain files.
 *
 * @param domainNames - Array of domain file names to include (e.g., ["Conflict Dynamics Doctrine.txt"])
 * @returns Concatenated doctrine string with filter first, foundational second, domains third
 */
export function getSelectiveDoctrine(domainNames: string[]): string {
  const files = getAllDoctrineFiles();

  const filter = files.find((f) => f.category === 'filter');
  const foundational = files.filter((f) => f.category === 'foundational');
  const selectedDomain = files.filter(
    (f) => f.category === 'domain' && domainNames.includes(f.name)
  );

  if (!filter) {
    throw new Error('APEX_SUPREMACY_FILTER not found in doctrine files');
  }

  // Build selective context string
  const parts = [
    '=== APEX SUPREMACY FILTER (PRIMARY SEMANTIC LAYER) ===',
    '',
    filter.content,
  ];

  if (foundational.length > 0) {
    parts.push('', '=== FOUNDATIONAL DOCTRINE ===', '');
    foundational.forEach((f) => {
      parts.push(`--- ${f.name} ---`, '', f.content, '');
    });
  }

  if (selectedDomain.length > 0) {
    parts.push('', '=== DOMAIN-SPECIFIC DOCTRINE ===', '');
    selectedDomain.forEach((f) => {
      parts.push(`--- ${f.name} ---`, '', f.content, '');
    });
  }

  return parts.join('\n');
}

/**
 * Get all loaded doctrine file names for debugging/introspection.
 *
 * @returns Array of doctrine file names in load order
 */
export function getLoadedDoctrineFileNames(): string[] {
  return getAllDoctrineFiles().map((f) => f.name);
}

/**
 * Get doctrine statistics (file count, total size, etc.) for debugging.
 *
 * @returns Object with doctrine statistics
 */
export function getDoctrineStats(): {
  totalFiles: number;
  totalCharacters: number;
  filterSize: number;
  foundationalCount: number;
  domainCount: number;
} {
  const files = getAllDoctrineFiles();
  const filter = files.find((f) => f.category === 'filter');
  const foundational = files.filter((f) => f.category === 'foundational');
  const domain = files.filter((f) => f.category === 'domain');

  return {
    totalFiles: files.length,
    totalCharacters: files.reduce((sum, f) => sum + f.content.length, 0),
    filterSize: filter?.content.length || 0,
    foundationalCount: foundational.length,
    domainCount: domain.length,
  };
}
