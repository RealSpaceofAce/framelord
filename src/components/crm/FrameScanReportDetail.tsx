// =============================================================================
// FRAME SCAN REPORT DETAIL — Detailed view of a single FrameScan report
// =============================================================================
// Renders reports using the uiReport schema when available, with fallback
// to legacy rendering for older reports without uiReport.
// =============================================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Target, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Lightbulb, User, Calendar,
  FileText, Image as ImageIcon, ExternalLink, Star, Zap, Lock, Sparkles, FileDown, BookOpen
} from 'lucide-react';
import { getReportById, type FrameScanReport } from '../../services/frameScanReportStore';
import { getContactById, CONTACT_ZERO } from '../../services/contactStore';
import {
  getFrameScoreLabel,
  getFrameScoreColorClass,
  getFrameScoreBgClass,
  formatProfileDate
} from '../../lib/frameScan/frameProfile';
import type { FrameAxisScore, FrameBand, FrameWinWinState } from '../../lib/frameScan/frameTypes';
import type { FrameScanUIReport, FrameScanUISection, FrameScanUICorrection } from '../../lib/frameScan/frameReportUI';
import { MarkdownRenderer } from './MarkdownRenderer';
import { createNoteFromFrameScan } from '../../services/noteStore';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

interface FrameScanReportDetailProps {
  reportId: string;
  onBack?: () => void;
  onNavigateToContact?: (contactId: string) => void;
  /** Optional callback to navigate to a note by ID */
  onNavigateToNote?: (noteId: string) => void;
  /** Optional: pass a demo report directly instead of fetching from store */
  demoReport?: FrameScanReport;
  /** Whether to show the report in paywalled mode (blur second half with upgrade CTA) */
  isPaywalled?: boolean;
  /** Callback when user clicks upgrade CTA */
  onUpgrade?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const BAND_LABELS: Record<FrameBand, string> = {
  strong_slave: 'Strong Slave',
  mild_slave: 'Mild Slave',
  neutral: 'Neutral',
  mild_apex: 'Mild Apex',
  strong_apex: 'Strong Apex',
};

const BAND_COLORS: Record<FrameBand, string> = {
  strong_slave: 'text-red-400 bg-red-500/10 border-red-500/30',
  mild_slave: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  neutral: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  mild_apex: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  strong_apex: 'text-green-400 bg-green-500/10 border-green-500/30',
};

const AXIS_LABELS: Record<string, string> = {
  assumptive_state: 'Assumptive State',
  buyer_seller_position: 'Buyer/Seller Position',
  identity_vs_tactic: 'Identity vs Tactic',
  internal_sale: 'Internal Sale',
  win_win_integrity: 'Win-Win Integrity',
  persuasion_style: 'Persuasion Style',
  pedestalization: 'Pedestalization',
  self_trust_vs_permission: 'Self Trust vs Permission',
  field_strength: 'Field Strength',
};

// Section icon mapping
const SECTION_ICONS: Record<string, React.ReactNode> = {
  summary: <Target size={18} className="text-[#4433FF]" />,
  strengths: <Star size={18} className="text-green-400" />,
  weaknesses: <AlertTriangle size={18} className="text-orange-400" />,
  corrections: <Lightbulb size={18} className="text-yellow-400" />,
};

// =============================================================================
// PAYWALL OVERLAY COMPONENT
// =============================================================================

interface PaywallOverlayProps {
  onUpgrade?: () => void;
}

const PaywallOverlay: React.FC<PaywallOverlayProps> = ({ onUpgrade }) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent">
    <div className="text-center max-w-md px-6">
      {/* Lock Icon */}
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#4433FF]/20 border border-[#4433FF]/30 flex items-center justify-center">
        <Lock size={28} className="text-[#4433FF]" />
      </div>

      {/* Heading */}
      <h3 className="text-xl font-bold text-white mb-3">
        Unlock Full Report
      </h3>

      {/* Description */}
      <p className="text-gray-400 mb-6 text-sm leading-relaxed">
        See detailed corrections, axis breakdowns, and actionable coaching recommendations.
        Upgrade to access the complete analysis.
      </p>

      {/* Feature List */}
      <ul className="text-left mb-6 space-y-2">
        {[
          'Detailed axis-by-axis breakdown',
          'Specific corrections with examples',
          'Personalized coaching recommendations',
          'Visual annotations (image scans)',
        ].map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
            <Sparkles size={14} className="text-[#4433FF] shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={onUpgrade}
        className="w-full py-3 px-6 bg-[#4433FF] hover:bg-[#5544FF] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Sparkles size={16} />
        Upgrade to Pro
      </button>

      {/* Pricing hint */}
      <p className="text-xs text-gray-500 mt-3">
        Starting at $79/month • Cancel anytime
      </p>
    </div>
  </div>
);

// =============================================================================
// COMPONENT
// =============================================================================

export const FrameScanReportDetail: React.FC<FrameScanReportDetailProps> = ({
  reportId,
  onBack,
  onNavigateToContact,
  onNavigateToNote,
  demoReport,
  isPaywalled = false,
  onUpgrade,
}) => {
  // Use demo report if provided, otherwise fetch from store
  const report = demoReport || getReportById(reportId);

  // State for Add to Notes functionality
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [noteCreatedMessage, setNoteCreatedMessage] = useState<string | null>(null);

  // Handler for Add to Notes button
  const handleAddToNotes = () => {
    if (!report.miniReportMarkdown || report.miniReportMarkdown.trim().length === 0) {
      return; // Button should be disabled anyway
    }

    setIsCreatingNote(true);
    setNoteCreatedMessage(null);

    try {
      const note = createNoteFromFrameScan(report.id);
      setNoteCreatedMessage(`Note created: ${note.title}`);

      // Navigate to note after a short delay
      if (onNavigateToNote) {
        setTimeout(() => {
          onNavigateToNote(note.id);
        }, 1500);
      }
    } catch (error) {
      console.error('[FrameScanReportDetail] Failed to create note:', error);
      setNoteCreatedMessage('Failed to create note. Please try again.');
    } finally {
      setIsCreatingNote(false);
    }
  };

  if (!report) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Report not found</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-[#1A1A1A] border border-[#333] rounded-lg text-sm text-white hover:bg-[#222] transition-colors"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  // For multi-contact scans, show the primary subject (first contact)
  const primaryContactId = report.subjectContactIds[0];
  const contact = getContactById(primaryContactId);
  const contactName = primaryContactId === CONTACT_ZERO.id
    ? 'Contact Zero (Self)'
    : contact?.fullName || 'Unknown Contact';
  const hasMultipleContacts = report.subjectContactIds.length > 1;

  const scoreColorClass = getFrameScoreColorClass(report.score.frameScore);
  const scoreBgClass = getFrameScoreBgClass(report.score.frameScore);

  // Determine if we have a uiReport to render
  const ui = report.uiReport;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        <span className="text-sm">Back to Frame Scans</span>
      </button>

      {ui ? (
        // =========================================================================
        // NEW UI REPORT RENDERING
        // =========================================================================
        <>
          {/* Header */}
          <MotionDiv
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-2">
                  {ui.header.title}
                </h1>
                
                {/* One-line verdict */}
                <p className="text-gray-300 mb-4">
                  {ui.header.oneLineVerdict}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {ui.header.badges.map((badge, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-[#4433FF]/20 border border-[#4433FF]/30 rounded text-xs text-[#4433FF] uppercase tracking-wider"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Contact & Date info */}
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
                  {contact?.avatarUrl && (
                    <img
                      src={contact.avatarUrl}
                      alt=""
                      className="w-6 h-6 rounded-full cursor-pointer"
                      onClick={() => onNavigateToContact?.(primaryContactId)}
                    />
                  )}
                  <span
                    className="cursor-pointer hover:text-[#4433FF] transition-colors"
                    onClick={() => onNavigateToContact?.(primaryContactId)}
                  >
                    {contactName}
                    {hasMultipleContacts && (
                      <span className="text-gray-500 ml-1">+{report.subjectContactIds.length - 1}</span>
                    )}
                  </span>
                  <span>•</span>
                  {report.modality === 'image' ? (
                    <ImageIcon size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                  <span className="capitalize">{report.modality}</span>
                  <span>•</span>
                  <span>{formatProfileDate(report.createdAt)}</span>
                </div>
              </div>

              {/* Score Badge */}
              <div className={`text-center p-6 rounded-lg border ${scoreBgClass} ml-6`}>
                <div className={`text-5xl font-bold ${scoreColorClass}`}>
                  {ui.header.highlightScore}
                </div>
                <div className="text-sm text-gray-400 mt-2">Frame Score</div>
              </div>
            </div>
          </MotionDiv>

          {/* Sections - Split for paywall */}
          {(() => {
            // Show first section (usually summary) in full, blur the rest if paywalled
            const sections = ui.sections ?? [];
            const visibleSections = isPaywalled ? sections.slice(0, 1) : sections;
            const paywalledSections = isPaywalled ? sections.slice(1) : [];

            return (
              <>
                {/* Visible Sections */}
                {visibleSections.map((section, index) => (
                  <MotionDiv
                    key={section.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-4"
                  >
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      {SECTION_ICONS[section.id] || <Zap size={18} className="text-gray-400" />}
                      {section.title}
                    </h2>

                    {/* Main paragraph */}
                    {section.mainParagraph && (
                      <p className="text-gray-300 mb-4 leading-relaxed">
                        {section.mainParagraph}
                      </p>
                    )}

                    {/* Bullets */}
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="space-y-2 mb-4">
                        {section.bullets.map((bullet, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                              section.id === 'strengths' ? 'bg-green-500' :
                              section.id === 'weaknesses' ? 'bg-orange-500' :
                              'bg-[#4433FF]'
                            }`} />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Corrections */}
                    {section.corrections && section.corrections.length > 0 && (
                      <div className="space-y-3">
                        {section.corrections.map((correction, i) => (
                          <div key={i} className="bg-[#1A1A1A] rounded-lg p-4">
                            <div className="font-medium text-white mb-1">{correction.label}</div>
                            <p className="text-sm text-gray-400 mb-2">{correction.description}</p>
                            <div className="flex items-start gap-2 text-sm text-emerald-400">
                              <CheckCircle size={14} className="mt-0.5 shrink-0" />
                              {correction.suggestedAction}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </MotionDiv>
                ))}

                {/* Paywalled Sections with Blur Overlay */}
                {paywalledSections.length > 0 && (
                  <div className="relative">
                    {/* Blurred content */}
                    <div className="blur-sm pointer-events-none select-none">
                      {paywalledSections.map((section, index) => (
                        <div
                          key={section.id}
                          className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-4"
                        >
                          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            {SECTION_ICONS[section.id] || <Zap size={18} className="text-gray-400" />}
                            {section.title}
                          </h2>

                          {section.mainParagraph && (
                            <p className="text-gray-300 mb-4 leading-relaxed">
                              {section.mainParagraph}
                            </p>
                          )}

                          {section.bullets && section.bullets.length > 0 && (
                            <ul className="space-y-2 mb-4">
                              {section.bullets.map((bullet, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0 bg-gray-500" />
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          )}

                          {section.corrections && section.corrections.length > 0 && (
                            <div className="space-y-3">
                              {section.corrections.map((correction, i) => (
                                <div key={i} className="bg-[#1A1A1A] rounded-lg p-4">
                                  <div className="font-medium text-white mb-1">{correction.label}</div>
                                  <p className="text-sm text-gray-400 mb-2">{correction.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Paywall Overlay */}
                    <PaywallOverlay onUpgrade={onUpgrade} />
                  </div>
                )}
              </>
            );
          })()}

          {/* Image Annotations (kept separate from UI schema) - Hidden when paywalled */}
          {!isPaywalled && report.modality === 'image' && report.imageAnnotations && report.imageAnnotations.length > 0 && (
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-4"
            >
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-400" />
                Visual Annotations
              </h2>

              {report.annotatedImageUrl && (
                <div className="mb-4">
                  <img
                    src={report.annotatedImageUrl}
                    alt="Annotated frame scan"
                    className="w-full max-w-lg rounded-lg border border-[#333]"
                  />
                </div>
              )}

              <div className="space-y-3">
                {report.imageAnnotations.map((annotation, i) => (
                  <div key={annotation.id || i} className="bg-[#1A1A1A] rounded-lg p-3 flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      annotation.severity === 'critical' ? 'bg-red-500' :
                      annotation.severity === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <div className="text-sm font-medium text-white">{annotation.label}</div>
                      <div className="text-xs text-gray-400">{annotation.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </MotionDiv>
          )}

          {/* Mini Report Section - Hidden when paywalled */}
          {!isPaywalled && report.miniReportMarkdown && report.miniReportMarkdown.trim().length > 0 && (
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-4"
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-[#4433FF]" />
              Analysis Report
            </h2>

            {/* Markdown content */}
            <div className="mb-4 text-gray-300">
              <MarkdownRenderer content={report.miniReportMarkdown} />
            </div>

            {/* Add to Notes button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddToNotes}
                disabled={isCreatingNote}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isCreatingNote
                    ? 'bg-[#4433FF]/50 text-white/50 cursor-not-allowed'
                    : 'bg-[#4433FF] hover:bg-[#5544FF] text-white'
                }`}
              >
                <FileDown size={16} />
                {isCreatingNote ? 'Creating...' : 'Add to Notes'}
              </button>

              {noteCreatedMessage && (
                <span className={`text-sm ${
                  noteCreatedMessage.includes('Failed') ? 'text-red-400' : 'text-green-400'
                }`}>
                  {noteCreatedMessage}
                </span>
              )}
            </div>
          </MotionDiv>
          )}

          {/* Not Ready State - Show when miniReportMarkdown is empty */}
          {!isPaywalled && (!report.miniReportMarkdown || report.miniReportMarkdown.trim().length === 0) && (
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-4"
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-[#4433FF]" />
              Analysis Report
            </h2>

            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span>Analysis in progress... The report will appear here once complete.</span>
            </div>

            <button
              disabled
              className="mt-4 px-4 py-2 rounded-lg font-medium bg-[#333]/50 text-gray-500 cursor-not-allowed flex items-center gap-2"
              title="Wait for analysis to finish before saving to Notes"
            >
              <FileDown size={16} />
              Add to Notes
            </button>
          </MotionDiv>
          )}

          {/* Axis Breakdown - Hidden when paywalled */}
          {!isPaywalled && (
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-4"
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target size={18} className="text-gray-400" />
              Detailed Axis Breakdown
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-[#333]">
                    <th className="text-left py-2 px-3">Axis</th>
                    <th className="text-center py-2 px-3">Score</th>
                    <th className="text-center py-2 px-3">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {report.score.axisScores.map((axis) => (
                    <tr key={axis.axisId} className="border-b border-[#222] hover:bg-[#1A1A1A] transition-colors">
                      <td className="py-3 px-3 text-sm text-white">
                        {AXIS_LABELS[axis.axisId] || axis.axisId}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono font-bold ${
                          axis.score > 0 ? 'text-green-400' : axis.score < 0 ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {axis.score > 0 ? '+' : ''}{axis.score}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs border ${BAND_COLORS[axis.band]}`}>
                          {BAND_LABELS[axis.band]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MotionDiv>
          )}
        </>
      ) : (
        // =========================================================================
        // LEGACY FALLBACK RENDERING (for reports without uiReport)
        // =========================================================================
        <LegacyReportView
          report={report}
          contact={contact}
          contactName={contactName}
          onNavigateToContact={onNavigateToContact}
          isPaywalled={isPaywalled}
          onUpgrade={onUpgrade}
        />
      )}

      {/* Source Reference */}
      {report.sourceRef && (
        <div className="text-xs text-gray-500 flex items-center gap-2 mt-4">
          <ExternalLink size={12} />
          Source: {report.sourceRef}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// LEGACY FALLBACK VIEW
// =============================================================================

interface LegacyReportViewProps {
  report: FrameScanReport;
  contact: ReturnType<typeof getContactById>;
  contactName: string;
  onNavigateToContact?: (contactId: string) => void;
  isPaywalled?: boolean;
  onUpgrade?: () => void;
}

const LegacyReportView: React.FC<LegacyReportViewProps> = ({
  report,
  contact,
  contactName,
  onNavigateToContact,
  isPaywalled = false,
  onUpgrade,
}) => {
  // For multi-contact scans, get primary contact ID and check if multiple
  const primaryContactId = report.subjectContactIds[0];
  const hasMultipleContacts = report.subjectContactIds.length > 1;

  const scoreColorClass = getFrameScoreColorClass(report.score.frameScore);
  const scoreBgClass = getFrameScoreBgClass(report.score.frameScore);
  const scoreLabel = getFrameScoreLabel(report.score.frameScore);

  const TrendIcon = report.score.overallFrame === 'apex' 
    ? TrendingUp 
    : report.score.overallFrame === 'slave' 
      ? TrendingDown 
      : Minus;

  const WIN_WIN_LABELS: Record<FrameWinWinState, string> = {
    win_win: 'Win-Win',
    win_lose: 'Win-Lose',
    lose_lose: 'Lose-Lose',
    neutral: 'Neutral',
  };

  const WIN_WIN_COLORS: Record<FrameWinWinState, string> = {
    win_win: 'text-green-400 bg-green-500/10 border-green-500/30',
    win_lose: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    lose_lose: 'text-red-400 bg-red-500/10 border-red-500/30',
    neutral: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  };

  return (
    <>
      {/* Legacy Header */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {contact?.avatarUrl && (
                <img
                  src={contact.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full cursor-pointer"
                  onClick={() => onNavigateToContact?.(primaryContactId)}
                />
              )}
              <div>
                <h1
                  className="text-xl font-bold text-white cursor-pointer hover:text-[#4433FF] transition-colors"
                  onClick={() => onNavigateToContact?.(primaryContactId)}
                >
                  {contactName}
                  {hasMultipleContacts && (
                    <span className="text-gray-400 text-base ml-2">+{report.subjectContactIds.length - 1}</span>
                  )}
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  {report.modality === 'image' ? (
                    <ImageIcon size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                  <span className="capitalize">{report.modality} Scan</span>
                  <span>•</span>
                  <span>{formatProfileDate(report.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`text-center p-4 rounded-lg border ${scoreBgClass}`}>
            <div className={`text-4xl font-bold ${scoreColorClass}`}>
              {report.score.frameScore}
            </div>
            <div className="flex items-center justify-center gap-1 text-sm text-gray-400 mt-1">
              <TrendIcon size={14} className={scoreColorClass} />
              <span>{scoreLabel}</span>
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Overall Frame</div>
          <div className={`text-lg font-bold capitalize ${scoreColorClass}`}>
            {report.score.overallFrame}
          </div>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Win-Win State</div>
          <span className={`inline-block px-2 py-1 rounded text-sm border ${WIN_WIN_COLORS[report.score.overallWinWinState]}`}>
            {WIN_WIN_LABELS[report.score.overallWinWinState]}
          </span>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Domain</div>
          <div className="text-lg font-medium text-white capitalize">
            {report.domain.replace(/_/g, ' ')}
          </div>
        </MotionDiv>
      </div>

      {/* Paywalled content wrapper for Legacy view */}
      {isPaywalled ? (
        <div className="relative">
          {/* Blurred content */}
          <div className="blur-sm pointer-events-none select-none">
            {/* Axis Breakdown */}
            <div className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-8">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target size={18} className="text-[#4433FF]" />
                Axis Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-[#333]">
                      <th className="text-left py-2 px-3">Axis</th>
                      <th className="text-center py-2 px-3">Score</th>
                      <th className="text-center py-2 px-3">Band</th>
                      <th className="text-left py-2 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.score?.axisScores ?? []).slice(0, 3).map((axis) => (
                      <tr key={axis.axisId} className="border-b border-[#222]">
                        <td className="py-3 px-3 text-sm text-white">{AXIS_LABELS[axis.axisId] || axis.axisId}</td>
                        <td className="py-3 px-3 text-center text-gray-400">—</td>
                        <td className="py-3 px-3 text-center text-gray-400">—</td>
                        <td className="py-3 px-3 text-sm text-gray-400">...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Placeholder diagnostics */}
            <div className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-8">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-400" />
                Diagnostics
              </h2>
              <div className="h-20 bg-[#1A1A1A] rounded animate-pulse" />
            </div>
            {/* Placeholder corrections */}
            <div className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-8">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Lightbulb size={18} className="text-yellow-400" />
                Corrections
              </h2>
              <div className="h-32 bg-[#1A1A1A] rounded animate-pulse" />
            </div>
          </div>
          {/* Paywall Overlay */}
          <PaywallOverlay onUpgrade={onUpgrade} />
        </div>
      ) : (
        <>
          {/* Axis Breakdown */}
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-8"
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target size={18} className="text-[#4433FF]" />
              Axis Breakdown
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-[#333]">
                    <th className="text-left py-2 px-3">Axis</th>
                    <th className="text-center py-2 px-3">Score</th>
                    <th className="text-center py-2 px-3">Band</th>
                    <th className="text-left py-2 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {report.score.axisScores.map((axis) => (
                    <tr key={axis.axisId} className="border-b border-[#222] hover:bg-[#1A1A1A] transition-colors">
                      <td className="py-3 px-3 text-sm text-white">
                        {AXIS_LABELS[axis.axisId] || axis.axisId}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono font-bold ${
                          axis.score > 0 ? 'text-green-400' : axis.score < 0 ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {axis.score > 0 ? '+' : ''}{axis.score}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs border ${BAND_COLORS[axis.band]}`}>
                          {BAND_LABELS[axis.band]}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-400 max-w-xs">
                        {axis.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MotionDiv>

      {/* Diagnostics */}
      {report.rawResult.diagnostics && (
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-8"
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-400" />
            Diagnostics
          </h2>

          {report.rawResult.diagnostics.primaryPatterns?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Primary Patterns</h3>
              <div className="flex flex-wrap gap-2">
                {report.rawResult.diagnostics.primaryPatterns.map((pattern: string, i: number) => (
                  <span 
                    key={i}
                    className="px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-400"
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.rawResult.diagnostics.supportingEvidence?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Supporting Evidence</h3>
              <ul className="space-y-2">
                {report.rawResult.diagnostics.supportingEvidence.map((evidence: string, i: number) => (
                  <li key={i} className="text-sm text-gray-300 pl-4 border-l-2 border-[#333]">
                    "{evidence}"
                  </li>
                ))}
              </ul>
            </div>
          )}
        </MotionDiv>
      )}

      {/* Corrections */}
      {report.rawResult.corrections?.topShifts?.length > 0 && (
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-8"
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Lightbulb size={18} className="text-yellow-400" />
            Corrections
          </h2>

          <div className="space-y-4">
            {report.rawResult.corrections.topShifts.map((shift: any, i: number) => (
              <div key={i} className="bg-[#1A1A1A] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 bg-[#4433FF]/20 border border-[#4433FF]/30 rounded text-[#4433FF]">
                    {AXIS_LABELS[shift.axisId] || shift.axisId}
                  </span>
                </div>
                <p className="text-sm text-white mb-3">{shift.shift}</p>
                {shift.protocolSteps?.length > 0 && (
                  <ul className="space-y-1">
                    {shift.protocolSteps.map((step: string, j: number) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-400">
                        <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                        {step}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </MotionDiv>
      )}

      {/* Image Annotations */}
      {report.modality === 'image' && report.imageAnnotations && report.imageAnnotations.length > 0 && (
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 mb-8"
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ImageIcon size={18} className="text-blue-400" />
            Image Annotations
          </h2>

          {report.annotatedImageUrl && (
            <div className="mb-4">
              <img 
                src={report.annotatedImageUrl} 
                alt="Annotated frame scan" 
                className="w-full max-w-lg rounded-lg border border-[#333]"
              />
            </div>
          )}

          <div className="space-y-3">
            {report.imageAnnotations.map((annotation, i) => (
              <div key={annotation.id || i} className="bg-[#1A1A1A] rounded-lg p-3 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  annotation.severity === 'critical' ? 'bg-red-500' :
                  annotation.severity === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                }`} />
                <div>
                  <div className="text-sm font-medium text-white">{annotation.label}</div>
                  <div className="text-xs text-gray-400">{annotation.description}</div>
                </div>
              </div>
            ))}
          </div>
        </MotionDiv>
      )}
        </>
      )}
    </>
  );
};

export default FrameScanReportDetail;
