// =============================================================================
// IMAGE PANEL — Display input image for image scans
// =============================================================================
// Shows the scanned image in an ElectricBorder-wrapped panel.
// Only renders when the report contains an image (modality is 'image').
// =============================================================================

import React from 'react';
import ElectricBorder from '../ElectricBorder';
import type { FrameScanReport } from '../../services/frameScanReportStore';

export interface ImagePanelProps {
  report: FrameScanReport;
}

/**
 * Check if the report has a displayable image
 */
function getImageUrl(report: FrameScanReport): string | null {
  // Check for annotated image first (preferred)
  if (report.annotatedImageUrl) {
    return report.annotatedImageUrl;
  }

  // Check sourceRef for data URLs or image URLs
  if (report.sourceRef) {
    const ref = report.sourceRef;
    // Check if it's a data URL or looks like an image URL
    if (
      ref.startsWith('data:image/') ||
      ref.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i) ||
      ref.startsWith('http')
    ) {
      return ref;
    }
  }

  return null;
}

export const ImagePanel: React.FC<ImagePanelProps> = ({ report }) => {
  // Only show for image scans
  if (report.modality !== 'image') {
    return null;
  }

  const imageUrl = getImageUrl(report);

  // Don't render if no image available
  if (!imageUrl) {
    return null;
  }

  return (
    <div className="framescan-image-section">
      <ElectricBorder
        color="#0043FF"
        speed={1}
        chaos={0.5}
        thickness={2}
        className="framescan-image-electric-wrapper"
      >
        <div className="framescan-panel framescan-image-panel">
          <h3 className="framescan-card-title">INPUT IMAGE</h3>
          <div className="framescan-image-wrapper">
            <img
              src={imageUrl}
              alt="FrameScan input"
              className="framescan-image"
            />
          </div>
        </div>
      </ElectricBorder>
    </div>
  );
};

export default ImagePanel;
