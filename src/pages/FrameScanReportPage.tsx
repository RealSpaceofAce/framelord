// =============================================================================
// FRAME SCAN REPORT PAGE — Route handler for individual report views
// =============================================================================
// Loads a FrameScan report by ID from the store and renders the full
// analysis dashboard. Handles loading and error states.
// =============================================================================

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FrameScanReportLayout } from '../components/framescan/FrameScanReportLayout';
import { getReportById } from '../services/frameScanReportStore';

export const FrameScanReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  // Load report from store
  const report = useMemo(() => {
    if (!reportId) return null;
    return getReportById(reportId);
  }, [reportId]);

  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  // Loading state (reportId missing)
  if (!reportId) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' }}>
            No report ID provided.
          </p>
        </div>
      </div>
    );
  }

  // Error state (report not found)
  if (!report) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#FF3344',
            marginBottom: 12,
          }}>
            Report Not Found
          </h2>
          <p style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: 24,
          }}>
            The requested FrameScan report could not be found.
          </p>
          <button
            onClick={handleBack}
            style={{
              padding: '10px 20px',
              background: '#00D4FF',
              color: '#000',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Success state - render full report
  return (
    <div style={{ position: 'relative' }}>
      {/* Back button */}
      <button
        onClick={handleBack}
        style={{
          position: 'fixed',
          top: 24,
          left: 24,
          zIndex: 1000,
          padding: '10px 16px',
          background: 'rgba(0, 212, 255, 0.2)',
          border: '1px solid rgba(0, 212, 255, 0.4)',
          borderRadius: 6,
          color: '#00D4FF',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 212, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
        }}
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* Main report layout */}
      <FrameScanReportLayout report={report} />
    </div>
  );
};

export default FrameScanReportPage;
