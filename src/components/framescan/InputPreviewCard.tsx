// =============================================================================
// INPUT PREVIEW CARD — Shows what was scanned
// =============================================================================
// Displays a preview of the input text or image that was analyzed.
// Includes a "View full input" button for text that exceeds the preview limit.
// =============================================================================

import React, { useState } from 'react';
import type { FrameScanReport } from '../../services/frameScanReportStore';

export interface InputPreviewCardProps {
  report: FrameScanReport;
}

const MAX_PREVIEW_LENGTH = 240;

/**
 * Extract input preview from report context or raw result
 */
function getInputPreview(report: FrameScanReport): string | null {
  // Try context.what first
  if (report.context?.what) {
    return report.context.what;
  }
  // Try sourceRef
  if (report.sourceRef) {
    return report.sourceRef;
  }
  return null;
}

/**
 * Get full input if available (for modal)
 */
function getFullInput(report: FrameScanReport): string | null {
  // For now, same as preview - could be extended to store full text
  return getInputPreview(report);
}

export const InputPreviewCard: React.FC<InputPreviewCardProps> = ({ report }) => {
  const [showModal, setShowModal] = useState(false);

  const inputPreview = getInputPreview(report);
  const fullInput = getFullInput(report);
  const isImage = report.modality === 'image';

  // If no input preview available, don't render the card
  if (!inputPreview && !isImage) {
    return null;
  }

  // Truncate preview if needed
  const needsTruncation = inputPreview && inputPreview.length > MAX_PREVIEW_LENGTH;
  const displayText = needsTruncation
    ? inputPreview.slice(0, MAX_PREVIEW_LENGTH) + '…'
    : inputPreview;

  // Get who context if available
  const whoContext = report.context?.who?.length
    ? report.context.who.join(', ')
    : null;

  return (
    <>
      <div className="framescan-input-preview-card">
        <h3 className="framescan-input-preview-title">SCAN INPUT PREVIEW</h3>

        <div className="framescan-input-preview-body">
          {isImage ? (
            <div className="framescan-input-preview-image">
              {report.annotatedImageUrl ? (
                <img
                  src={report.annotatedImageUrl}
                  alt="Scanned input"
                  className="framescan-input-preview-thumbnail"
                />
              ) : (
                <div className="framescan-input-preview-placeholder">
                  Image scan – visual analysis complete
                </div>
              )}
              {inputPreview && (
                <p className="framescan-input-preview-context">{inputPreview}</p>
              )}
            </div>
          ) : (
            <p className="framescan-input-preview-text">{displayText}</p>
          )}

          {whoContext && (
            <div className="framescan-input-preview-who">
              <span className="framescan-input-preview-who-label">Who:</span>
              <span className="framescan-input-preview-who-value">{whoContext}</span>
            </div>
          )}
        </div>

        {needsTruncation && fullInput && (
          <div className="framescan-input-preview-actions">
            <button
              className="framescan-view-full-btn"
              onClick={() => setShowModal(true)}
            >
              View full input
            </button>
          </div>
        )}
      </div>

      {/* Full input modal */}
      {showModal && fullInput && (
        <div className="framescan-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="framescan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="framescan-modal-header">
              <h3 className="framescan-modal-title">FULL SCAN INPUT</h3>
              <button
                className="framescan-modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className="framescan-modal-body">
              <p className="framescan-modal-text">{fullInput}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InputPreviewCard;
