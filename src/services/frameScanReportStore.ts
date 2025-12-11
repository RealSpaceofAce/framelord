// =============================================================================
// FRAME SCAN REPORT STORE — In-memory storage for Frame Scan reports
// =============================================================================
// Follows the same pattern as noteStore and taskStore.
// Every FrameScanReport has subjectContactIds (array) linking it to contacts.
// "contact_zero" is included for self-scans.
// Multi-contact scans are supported via the subjectContactIds array.
// =============================================================================

import type {
  FrameScore,
  FrameImageAnnotation,
  FrameDomainId,
  FrameScanResult,
  FrameScanContext
} from '../lib/frameScan/frameTypes';
import type { FrameScanUIReport } from '../lib/frameScan/frameReportUI';
import { CONTACT_ZERO } from './contactStore';

// =============================================================================
// TYPES
// =============================================================================

export type FrameScanSubjectType = 'self' | 'contact' | 'asset';

export interface FrameScanReport {
  id: string;
  createdAt: string;                    // ISO timestamp
  title: string;                        // REQUIRED - AI-generated title for the scan
  miniReportMarkdown: string;           // REQUIRED - Full markdown report with wikilinks
  subjectType: FrameScanSubjectType;
  subjectContactIds: string[];          // Array of contact IDs (includes "contact_zero" for self-scans)
  modality: 'text' | 'image' | 'mixed';
  domain: FrameDomainId;
  customDomainTags?: string[];          // Optional custom domain tags (IDs from customDomainStore)
  context?: FrameScanContext;           // Optional scan context (what, who, userConcern)
  sourceRef?: string;                   // Optional reference to source (note id, image url, etc.)
  rawResult: FrameScanResult;           // The full LLM response
  score: FrameScore;                    // The computed 0-100 score with breakdown
  imageAnnotations?: FrameImageAnnotation[];  // For image scans
  annotatedImageUrl?: string;           // For image scans
  uiReport?: FrameScanUIReport;         // Pre-built UI payload for rendering
}

// =============================================================================
// IN-MEMORY STORE
// =============================================================================

let REPORTS: FrameScanReport[] = [];

// =============================================================================
// SUBSCRIPTION (for useSyncExternalStore)
// =============================================================================

let listeners: Set<() => void> = new Set();

const emitChange = () => {
  listeners.forEach(listener => listener());
};

/**
 * Subscribe to store changes (for useSyncExternalStore).
 */
export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  console.log('[FrameScanStore] New subscriber, total listeners:', listeners.size);
  return () => {
    listeners.delete(listener);
    console.log('[FrameScanStore] Unsubscribed, remaining listeners:', listeners.size);
  };
};

/**
 * Get current snapshot (for useSyncExternalStore).
 */
export const getSnapshot = (): FrameScanReport[] => REPORTS;

// =============================================================================
// ID GENERATION
// =============================================================================

const generateReportId = (): string => {
  return `fsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get all FrameScan reports sorted by createdAt descending (most recent first).
 */
export const getFrameScanReports = (): FrameScanReport[] => {
  return [...REPORTS].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/**
 * Get all reports for a specific contact.
 * Use "contact_zero" for self-scans.
 * Returns reports where the contact is ANY of the subjects.
 */
export const getReportsForContact = (contactId: string): FrameScanReport[] => {
  return REPORTS
    .filter(r => r.subjectContactIds.includes(contactId))
    .sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

/**
 * Get a single report by ID.
 */
export const getReportById = (id: string): FrameScanReport | undefined => {
  return REPORTS.find(r => r.id === id);
};

/**
 * Add a new FrameScan report to the store.
 * Optionally accepts createdAt for seeding demo data with historical dates.
 * Safe defaults are applied for title and miniReportMarkdown if not provided.
 */
export const addFrameScanReport = (
  report: Omit<FrameScanReport, 'id' | 'createdAt'> & { createdAt?: string; title?: string; miniReportMarkdown?: string }
): FrameScanReport => {
  const newReport: FrameScanReport = {
    ...report,
    id: generateReportId(),
    createdAt: report.createdAt || new Date().toISOString(),
    // Apply safe defaults for new required fields
    title: report.title || 'Untitled FrameScan',
    miniReportMarkdown: report.miniReportMarkdown || '',
  };

  REPORTS = [newReport, ...REPORTS];
  console.log('[FrameScanStore] Added report, total count:', REPORTS.length, 'listeners:', listeners.size);
  emitChange();
  return newReport;
};

/**
 * Update an existing FrameScan report (e.g., to patch in title and miniReportMarkdown after AI generation).
 * Returns the updated report or null if not found.
 */
export const updateFrameScanReport = (
  id: string,
  updates: Partial<Omit<FrameScanReport, 'id' | 'createdAt'>>
): FrameScanReport | null => {
  const index = REPORTS.findIndex(r => r.id === id);
  if (index === -1) return null;

  REPORTS[index] = {
    ...REPORTS[index],
    ...updates,
  };

  console.log('[FrameScanStore] Updated report:', id);
  emitChange();
  return REPORTS[index];
};

/**
 * Delete a report by ID.
 */
export const deleteFrameScanReport = (id: string): boolean => {
  const initialLength = REPORTS.length;
  REPORTS = REPORTS.filter(r => r.id !== id);
  if (REPORTS.length < initialLength) {
    emitChange();
    return true;
  }
  return false;
};

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get reports filtered by modality.
 */
export const getReportsByModality = (modality: 'text' | 'image' | 'mixed'): FrameScanReport[] => {
  return getFrameScanReports().filter(r => r.modality === modality);
};

/**
 * Get reports filtered by domain.
 */
export const getReportsByDomain = (domain: FrameDomainId): FrameScanReport[] => {
  return getFrameScanReports().filter(r => r.domain === domain);
};

/**
 * Get the most recent report for a contact.
 */
export const getLatestReportForContact = (contactId: string): FrameScanReport | undefined => {
  const reports = getReportsForContact(contactId);
  return reports.length > 0 ? reports[0] : undefined;
};

/**
 * Get the most recent report (any contact).
 * Useful for retrieving results immediately after a scan.
 */
export const getLatestReport = (): FrameScanReport | undefined => {
  const reports = getFrameScanReports();
  return reports.length > 0 ? reports[0] : undefined;
};

/**
 * Get report count for a contact.
 * Counts reports where the contact is ANY of the subjects.
 */
export const getReportCountForContact = (contactId: string): number => {
  return REPORTS.filter(r => r.subjectContactIds.includes(contactId)).length;
};

/**
 * Get reports for Contact Zero (self-scans).
 */
export const getContactZeroReports = (): FrameScanReport[] => {
  return getReportsForContact(CONTACT_ZERO.id);
};

/**
 * Get all unique contact IDs that have reports.
 * Returns all contact IDs from all reports (including multi-contact scans).
 */
export const getContactsWithReports = (): string[] => {
  const contactIds = new Set(REPORTS.flatMap(r => r.subjectContactIds));
  return Array.from(contactIds);
};

/**
 * Get average frame score for a contact across all their reports.
 */
export const getAverageScoreForContact = (contactId: string): number | null => {
  const reports = getReportsForContact(contactId);
  if (reports.length === 0) return null;
  
  const total = reports.reduce((sum, r) => sum + r.score.frameScore, 0);
  return Math.round(total / reports.length);
};

// =============================================================================
// PERSISTENCE HELPERS (for future localStorage/server sync)
// =============================================================================

/**
 * Export all reports as JSON string for backup/export.
 */
export const exportReportsToJSON = (): string => {
  return JSON.stringify(REPORTS, null, 2);
};

/**
 * Import reports from JSON string (replaces current data).
 * Use with caution.
 */
export const importReportsFromJSON = (json: string): void => {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      REPORTS = parsed;
      emitChange();
    }
  } catch (err) {
    console.error('Failed to import FrameScan reports:', err);
  }
};

/**
 * Clear all reports (use for testing/reset).
 */
export const clearAllReports = (): void => {
  REPORTS = [];
  emitChange();
};

// =============================================================================
// CUSTOM DOMAIN TAG OPERATIONS
// =============================================================================

/**
 * Add a custom domain tag to a report.
 * @param reportId - The report to tag
 * @param customDomainId - The custom domain ID to add
 */
export const addCustomDomainTag = (reportId: string, customDomainId: string): void => {
  const report = getReportById(reportId);
  if (!report) return;

  const tags = report.customDomainTags || [];
  if (tags.includes(customDomainId)) return; // Already tagged

  updateFrameScanReport(reportId, {
    customDomainTags: [...tags, customDomainId],
  });
};

/**
 * Remove a custom domain tag from a report.
 * @param reportId - The report to untag
 * @param customDomainId - The custom domain ID to remove
 */
export const removeCustomDomainTag = (reportId: string, customDomainId: string): void => {
  const report = getReportById(reportId);
  if (!report) return;

  const tags = report.customDomainTags || [];
  updateFrameScanReport(reportId, {
    customDomainTags: tags.filter(id => id !== customDomainId),
  });
};

/**
 * Get all reports tagged with a specific custom domain.
 * @param customDomainId - The custom domain ID to filter by
 */
export const getReportsByCustomDomain = (customDomainId: string): FrameScanReport[] => {
  return REPORTS
    .filter(r => r.customDomainTags?.includes(customDomainId))
    .sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

