// =============================================================================
// FRAME SCAN REPORT STORE — In-memory storage for Frame Scan reports
// =============================================================================
// Follows the same pattern as noteStore and taskStore.
// Every FrameScanReport has a subjectContactId linking it to a contact.
// "contact_zero" is used for self-scans.
// =============================================================================

import type { 
  FrameScore, 
  FrameImageAnnotation, 
  FrameDomainId,
  FrameScanResult 
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
  subjectType: FrameScanSubjectType;
  subjectContactId: string;             // "contact_zero" or contact id
  modality: 'text' | 'image' | 'mixed';
  domain: FrameDomainId;
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
 */
export const getReportsForContact = (contactId: string): FrameScanReport[] => {
  return REPORTS
    .filter(r => r.subjectContactId === contactId)
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
 */
export const addFrameScanReport = (
  report: Omit<FrameScanReport, 'id' | 'createdAt'>
): FrameScanReport => {
  const newReport: FrameScanReport = {
    ...report,
    id: generateReportId(),
    createdAt: new Date().toISOString(),
  };
  
  REPORTS = [newReport, ...REPORTS];
  return newReport;
};

/**
 * Delete a report by ID.
 */
export const deleteFrameScanReport = (id: string): boolean => {
  const initialLength = REPORTS.length;
  REPORTS = REPORTS.filter(r => r.id !== id);
  return REPORTS.length < initialLength;
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
 * Get report count for a contact.
 */
export const getReportCountForContact = (contactId: string): number => {
  return REPORTS.filter(r => r.subjectContactId === contactId).length;
};

/**
 * Get reports for Contact Zero (self-scans).
 */
export const getContactZeroReports = (): FrameScanReport[] => {
  return getReportsForContact(CONTACT_ZERO.id);
};

/**
 * Get all unique contact IDs that have reports.
 */
export const getContactsWithReports = (): string[] => {
  const contactIds = new Set(REPORTS.map(r => r.subjectContactId));
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
};

