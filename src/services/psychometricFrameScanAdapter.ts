// =============================================================================
// PSYCHOMETRIC FRAMESCAN ADAPTER — Converts FrameScan reports to evidence
// =============================================================================
// Bridges the FrameScan system with the psychometric store.
// When a FrameScan report is created for a contact, this adapter
// extracts the narrative content and adds it as evidence for that contact.
//
// Evidence text is assembled from:
// - miniReportMarkdown (primary)
// - diagnostics.primaryPatterns (behavioral patterns)
// - diagnostics.supportingEvidence (concrete examples)
// - axis notes (per-axis explanations)
// =============================================================================

import { psychometricStore } from '@/services/psychometricStore';
import type { PsychometricEvidence } from '@/types/psychometrics';
import type { FrameScanReport } from '@/services/frameScanReportStore';

/**
 * Generate a unique ID for psychometric evidence entries.
 */
const generateEvidenceId = (): string => {
  return `psycho-evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Extract psychometric-relevant text from a FrameScan report.
 * Assembles narrative content from multiple report fields.
 */
const extractTextFromFrameScanReport = (report: FrameScanReport): string => {
  const parts: string[] = [];

  // Primary: the mini report markdown (richest narrative)
  if (report.miniReportMarkdown && report.miniReportMarkdown.trim().length > 0) {
    parts.push(report.miniReportMarkdown);
  }

  // Add context if available (what was scanned and why)
  if (report.context) {
    if (report.context.what) {
      parts.push(`Context: ${report.context.what}`);
    }
    if (report.context.userConcern) {
      parts.push(`User concern: ${report.context.userConcern}`);
    }
  }

  // Add diagnostics from rawResult
  if (report.rawResult && report.rawResult.status === 'ok') {
    const { diagnostics, axes } = report.rawResult;

    // Primary patterns (e.g., "chronic pedestalization", "seller posture")
    if (diagnostics.primaryPatterns && diagnostics.primaryPatterns.length > 0) {
      parts.push(`Primary patterns: ${diagnostics.primaryPatterns.join(', ')}`);
    }

    // Supporting evidence snippets
    if (diagnostics.supportingEvidence && diagnostics.supportingEvidence.length > 0) {
      parts.push(`Evidence: ${diagnostics.supportingEvidence.join(' | ')}`);
    }

    // Per-axis notes (behavioral explanations)
    if (axes && axes.length > 0) {
      const axisNotes = axes
        .filter(a => a.notes && a.notes.trim().length > 0)
        .map(a => `${a.axisId}: ${a.notes}`)
        .join('; ');
      if (axisNotes) {
        parts.push(`Axis observations: ${axisNotes}`);
      }
    }
  }

  return parts.join('\n\n');
};

/**
 * Add a FrameScan report as psychometric evidence for its subject contacts.
 *
 * This should be called when:
 * - A FrameScan report is created with subjectContactIds
 *
 * Reports that only target Contact Zero are skipped (we don't build
 * psychometric profiles for the user themselves via their own scans).
 *
 * @param report - The FrameScan report to process
 */
export function addFrameScanAsPsychometricEvidence(report: FrameScanReport): void {
  // Skip rejected scans
  if (report.rawResult?.status === 'rejected') {
    return;
  }

  // Get subject contacts
  const subjectIds = report.subjectContactIds || [];
  if (subjectIds.length === 0) {
    return;
  }

  // Extract text content
  const rawText = extractTextFromFrameScanReport(report);
  if (!rawText || rawText.trim().length === 0) {
    return; // No text content to add as evidence
  }

  // Add evidence for each subject contact (except Contact Zero)
  for (const contactId of subjectIds) {
    // Skip Contact Zero - we don't build psychometric profiles for self
    if (contactId === 'contact_zero') {
      continue;
    }

    const entry: PsychometricEvidence = {
      id: generateEvidenceId(),
      contactId,
      sourceType: 'framescan',
      originId: report.id,
      rawText,
      createdAt: new Date().toISOString(),
    };

    psychometricStore.addEvidence(entry);
  }
}

/**
 * Update psychometric evidence when a FrameScan report is modified.
 * Removes old evidence and adds new evidence with updated content.
 *
 * @param report - The updated FrameScan report
 */
export function updateFrameScanAsPsychometricEvidence(report: FrameScanReport): void {
  // First, remove existing evidence from this report
  removeFrameScanFromPsychometricEvidence(report.id);

  // Then add fresh evidence with updated content
  addFrameScanAsPsychometricEvidence(report);
}

/**
 * Remove psychometric evidence when a FrameScan report is deleted.
 *
 * @param reportId - The ID of the deleted FrameScan report
 */
export function removeFrameScanFromPsychometricEvidence(reportId: string): void {
  // Check all contacts since we don't know which contact
  // this report was targeting. The store handles this efficiently.
  const allProfiles = psychometricStore.getAllProfiles();

  for (const contactId of Object.keys(allProfiles)) {
    psychometricStore.removeEvidenceByOriginId(contactId, reportId);
  }
}
