// =============================================================================
// FRAME SCAN CONTACT TAB — Frame profile, scans, and Framelord assistant
// =============================================================================
// Shows cumulative frame profile, list of scans, and Framelord chat
// for a specific contact. Allows triggering new text and image scans.
// =============================================================================

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Scan, FileText, Image as ImageIcon,
  Calendar, ChevronRight, Type, Loader2, Mic, MicOff
} from 'lucide-react';
import {
  getReportsForContact,
  getLatestReport,
  type FrameScanReport
} from '../../services/frameScanReportStore';
import { useAudio } from '../../hooks/useAudio';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { transcribeAudioToText } from '../../services/transcriptionService';
import { showToast } from '../Toast';
import {
  computeCumulativeFrameProfileForContact,
  formatProfileDate,
} from '../../lib/frameScan/frameProfile';
import { runTextFrameScan, runImageFrameScan, type TextDomainId, type ImageDomainId, FrameScanRejectionError } from '../../lib/frameScan/frameScanLLM';
import type { FrameDomainId } from '../../lib/frameScan/frameTypes';
import { CONTACT_ZERO } from '../../services/contactStore';
import { FrameScanContextHelp } from '../FrameScanContextHelp';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

interface FrameScanContactTabProps {
  contactId: string;
  contactName: string;
  onViewReport: (reportId: string) => void;
}

// =============================================================================
// DOMAIN OPTIONS
// =============================================================================

const TEXT_DOMAINS: { id: TextDomainId; label: string }[] = [
  { id: 'generic', label: 'Generic' },
  { id: 'sales_email', label: 'Sales Email' },
  { id: 'dating_message', label: 'Dating Message' },
  { id: 'leadership_update', label: 'Leadership Update' },
  { id: 'social_post', label: 'Social Post' },
];

const IMAGE_DOMAINS: { id: ImageDomainId; label: string }[] = [
  { id: 'profile_photo', label: 'Profile Photo' },
  { id: 'team_photo', label: 'Team Photo' },
  { id: 'landing_page_hero', label: 'Landing Page Hero' },
  { id: 'social_post_image', label: 'Social Post Image' },
];

const DOMAIN_LABELS: Record<FrameDomainId, string> = {
  generic: 'Generic',
  sales_email: 'Sales Email',
  dating_message: 'Dating Message',
  leadership_update: 'Leadership Update',
  social_post: 'Social Post',
  profile_photo: 'Profile Photo',
  team_photo: 'Team Photo',
  landing_page_hero: 'Landing Page Hero',
  social_post_image: 'Social Post Image',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const FrameScanContactTab: React.FC<FrameScanContactTabProps> = ({
  contactId,
  contactName,
  onViewReport,
}) => {
  // Audio for scan sounds
  const { play, stop } = useAudio();

  // Audio recording
  const { isRecording, startRecording, stopRecording, error: recordError } = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Guard against double-clicks
  const scanInProgressRef = useRef(false);

  // State for new scan modal
  const [isTextScanOpen, setIsTextScanOpen] = useState(false);
  const [isImageScanOpen, setIsImageScanOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Text scan form state
  const [textContent, setTextContent] = useState('');
  const [textDomain, setTextDomain] = useState<TextDomainId>('generic');

  // Image scan form state
  const [imageUrl, setImageUrl] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [imageDomain, setImageDomain] = useState<ImageDomainId>('profile_photo');

  // Refresh key for re-fetching data
  const [refreshKey, setRefreshKey] = useState(0);

  // Get reports and compute profile
  const reports = useMemo(() => getReportsForContact(contactId), [contactId, refreshKey]);
  const profile = useMemo(() => computeCumulativeFrameProfileForContact(contactId, reports), [contactId, reports]);

  const isContactZero = contactId === CONTACT_ZERO.id;

  // Handle audio recording and transcription
  const handleAudioRecord = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      setIsTranscribing(true);
      const audioBlob = await stopRecording();

      if (!audioBlob) {
        showToast({ type: 'error', title: 'Recording Failed', message: 'No audio data captured' });
        setIsTranscribing(false);
        return;
      }

      // Transcribe the audio
      const result = await transcribeAudioToText(audioBlob);
      setIsTranscribing(false);

      if (result.success && result.text) {
        // Append transcribed text to current text content
        setTextContent(prev => {
          const separator = prev.trim() ? '\n\n' : '';
          return prev + separator + result.text;
        });
        showToast({ type: 'success', title: 'Transcription Complete', message: 'Text added to input' });
      } else {
        showToast({ type: 'error', title: 'Transcription Failed', message: result.error || 'Could not transcribe audio' });
      }
    } else {
      // Start recording
      await startRecording();
      if (!recordError) {
        showToast({ type: 'success', title: 'Recording Started', message: 'Speak now, click again to stop' });
      }
    }
  };

  // Show error toast for recording errors
  useEffect(() => {
    if (recordError) {
      showToast({ type: 'error', title: 'Recording Error', message: recordError });
    }
  }, [recordError]);

  // Handle text scan with audio and toast
  const handleTextScan = async () => {
    if (!textContent.trim()) {
      setScanError('Please enter some text to scan');
      return;
    }

    // Guard against double-clicks
    if (scanInProgressRef.current) return;
    scanInProgressRef.current = true;

    setScanLoading(true);
    setScanError(null);

    // Play start sound and begin hum
    await play('scan_start');
    play('scan_hum', { loop: true, volume: 0.2 });

    try {
      await runTextFrameScan({
        domain: textDomain,
        content: textContent.trim(),
        contactId,
      });

      // Stop hum and play success
      stop('scan_hum');
      await play('scan_complete');

      // Get the newly created report for navigation
      const latestReport = getLatestReport();

      // Show completion toast
      showToast({
        type: 'success',
        title: 'FrameScan complete',
        message: 'Click to view detailed report',
        onClick: latestReport ? () => onViewReport(latestReport.id) : undefined,
      });

      setTextContent('');
      setIsTextScanOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      // Stop hum and play error
      stop('scan_hum');
      await play('error');

      // Handle rejection errors differently
      if (err instanceof FrameScanRejectionError) {
        showToast({
          type: 'warning',
          title: 'Scan Rejected',
          message: err.rejectionReason,
        });
        setScanError(err.rejectionReason);
      } else {
        setScanError(err?.message || 'Scan failed');
      }
    } finally {
      setScanLoading(false);
      scanInProgressRef.current = false;
    }
  };

  // Handle image scan with audio and toast
  const handleImageScan = async () => {
    if (!imageUrl.trim()) {
      setScanError('Please enter an image URL');
      return;
    }

    // Guard against double-clicks
    if (scanInProgressRef.current) return;
    scanInProgressRef.current = true;

    setScanLoading(true);
    setScanError(null);

    // Play start sound and begin hum
    await play('scan_start');
    play('scan_hum', { loop: true, volume: 0.2 });

    try {
      await runImageFrameScan({
        domain: imageDomain,
        imageIdOrUrl: imageUrl.trim(),
        description: imageDescription.trim() || undefined,
        contactId,
      });

      // Stop hum and play success
      stop('scan_hum');
      await play('scan_complete');

      // Get the newly created report for navigation
      const latestReport = getLatestReport();

      // Show completion toast
      showToast({
        type: 'success',
        title: 'FrameScan complete',
        message: 'Click to view detailed report',
        onClick: latestReport ? () => onViewReport(latestReport.id) : undefined,
      });

      setImageUrl('');
      setImageDescription('');
      setIsImageScanOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      // Stop hum and play error
      stop('scan_hum');
      await play('error');

      // Handle rejection errors differently
      if (err instanceof FrameScanRejectionError) {
        showToast({
          type: 'warning',
          title: 'Scan Rejected',
          message: err.rejectionReason,
        });
        setScanError(err.rejectionReason);
      } else {
        setScanError(err?.message || 'Scan failed');
      }
    } finally {
      setScanLoading(false);
      scanInProgressRef.current = false;
    }
  };


  return (
    <div className="space-y-6">
      {/* Profile + Scans + Framelord in stacked layout */}
      <div className="space-y-6">
        {/* Scan Count Summary */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{profile.scansCount} scan{profile.scansCount !== 1 ? 's' : ''} on file</span>
          {profile.lastScanAt && (
            <span className="text-xs text-gray-500">
              Last: {formatProfileDate(profile.lastScanAt)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsTextScanOpen(true);
              setIsImageScanOpen(false);
              setScanError(null);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-lg text-sm text-white hover:bg-[#222] hover:border-[#4433FF]/50 transition-colors"
          >
            <Type size={16} />
            Run Text Scan
          </button>
          <button
            onClick={() => {
              setIsImageScanOpen(true);
              setIsTextScanOpen(false);
              setScanError(null);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-lg text-sm text-white hover:bg-[#222] hover:border-[#4433FF]/50 transition-colors"
          >
            <ImageIcon size={16} />
            Run Image Scan
          </button>
          <FrameScanContextHelp iconSize={16} />
        </div>

        {/* Text Scan Form */}
        {isTextScanOpen && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`bg-[#0E0E0E] border border-[#333] rounded-lg p-4 ${scanLoading ? 'framescan-wobble' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">New Text Scan</h3>
              <button
                onClick={() => setIsTextScanOpen(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Domain</label>
                <select
                  value={textDomain}
                  onChange={(e) => setTextDomain(e.target.value as TextDomainId)}
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4433FF]"
                >
                  {TEXT_DOMAINS.map(d => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Text to Scan</label>
                <div className="relative">
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Include context: who sent this, what type of communication, when, and why you want to analyze it..."
                    rows={6}
                    className="w-full bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#4433FF] resize-none"
                  />
                  <button
                    onClick={handleAudioRecord}
                    disabled={isTranscribing || scanLoading}
                    className={`absolute bottom-3 right-3 p-2 rounded transition-all ${
                      isRecording
                        ? 'bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse'
                        : isTranscribing
                        ? 'bg-[#4433FF]/10 border border-[#4433FF]/20 text-[#4433FF]/50 cursor-wait'
                        : 'bg-[#4433FF]/10 hover:bg-[#4433FF]/30 text-[#4433FF] hover:text-white border border-[#4433FF]/20 hover:border-[#4433FF]'
                    }`}
                    title={isRecording ? 'Stop Recording' : isTranscribing ? 'Transcribing...' : 'Record Audio'}
                  >
                    {isTranscribing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isRecording ? (
                      <MicOff size={16} />
                    ) : (
                      <Mic size={16} />
                    )}
                  </button>
                </div>

                {/* Guidance for best results */}
                <div className="mt-2 p-3 bg-[#4433FF]/5 border border-[#4433FF]/20 rounded">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    <span className="text-[#4433FF] font-semibold">For the sharpest FrameScan result:</span>
                    <br />
                    • Say who you are and who they are, plus the relationship and power setup.
                    <br />
                    • Say what the situation is and which channel you are using.
                    <br />
                    • Say what you want and what is at stake.
                    <br />
                    • Paste the exact message or transcript, not a summary.
                    <br />
                    • Keep it one coherent interaction, not ten mixed situations.
                  </p>
                </div>
              </div>

              {scanError && (
                <div className="text-sm text-red-400">{scanError}</div>
              )}

              <button
                onClick={handleTextScan}
                disabled={scanLoading || !textContent.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#4433FF] text-white rounded text-sm font-medium hover:bg-[#5544FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan size={16} />
                    Run Scan
                  </>
                )}
              </button>
            </div>
          </MotionDiv>
        )}

        {/* Image Scan Form */}
        {isImageScanOpen && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`bg-[#0E0E0E] border border-[#333] rounded-lg p-4 ${scanLoading ? 'framescan-wobble' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">New Image Scan</h3>
              <button
                onClick={() => setIsImageScanOpen(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Domain</label>
                <select
                  value={imageDomain}
                  onChange={(e) => setImageDomain(e.target.value as ImageDomainId)}
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4433FF]"
                >
                  {IMAGE_DOMAINS.map(d => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Image URL</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#4433FF]"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Context (recommended)</label>
                <textarea
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  placeholder="Describe who, what, when, why (e.g., 'My LinkedIn profile photo, want to check if it projects authority')..."
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#4433FF] resize-none"
                />

                {/* Guidance for best results */}
                <div className="mt-2 p-3 bg-[#4433FF]/5 border border-[#4433FF]/20 rounded">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    <span className="text-[#4433FF] font-semibold">For the sharpest FrameScan result:</span>
                    <br />
                    • Say who you are and who they are, plus the relationship and power setup.
                    <br />
                    • Say what the situation is and which channel you are using.
                    <br />
                    • Say what you want and what is at stake.
                    <br />
                    • Paste the exact message or transcript, not a summary.
                    <br />
                    • Keep it one coherent interaction, not ten mixed situations.
                  </p>
                </div>
              </div>

              {scanError && (
                <div className="text-sm text-red-400">{scanError}</div>
              )}

              <button
                onClick={handleImageScan}
                disabled={scanLoading || !imageUrl.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#4433FF] text-white rounded text-sm font-medium hover:bg-[#5544FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan size={16} />
                    Run Scan
                  </>
                )}
              </button>
            </div>
          </MotionDiv>
        )}

        {/* Reports List */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Scan History</h3>
          
          {reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Scan size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No scans yet for {contactName}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((report, index) => (
                <MotionDiv
                  key={report.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onViewReport(report.id)}
                  className="flex items-center gap-3 p-3 bg-[#0E0E0E] border border-[#222] rounded-lg hover:border-[#333] cursor-pointer transition-colors"
                >
                  <div className={`p-2 rounded ${
                    report.modality === 'image' ? 'bg-blue-500/10' : 'bg-purple-500/10'
                  }`}>
                    {report.modality === 'image' ? (
                      <ImageIcon size={14} className="text-blue-400" />
                    ) : (
                      <FileText size={14} className="text-purple-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{report.title || DOMAIN_LABELS[report.domain]}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={10} />
                      {formatProfileDate(report.createdAt)}
                    </div>
                  </div>

                  <span className="text-xs text-[#4433FF] hover:underline">
                    View Report
                  </span>

                  <ChevronRight size={14} className="text-[#4433FF]" />
                </MotionDiv>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default FrameScanContactTab;
