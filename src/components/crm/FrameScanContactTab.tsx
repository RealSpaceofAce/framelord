// =============================================================================
// FRAME SCAN CONTACT TAB — Frame profile, scans, and Framelord assistant
// =============================================================================
// Shows cumulative frame profile, list of scans, and Framelord chat
// for a specific contact. Allows triggering new text and image scans.
// =============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Scan, TrendingUp, TrendingDown, Minus, FileText, Image as ImageIcon,
  Calendar, ChevronRight, Plus, Upload, Type, Loader2, Send, MessageSquare,
  Bot, User, Sparkles
} from 'lucide-react';
import { 
  getReportsForContact, 
  type FrameScanReport 
} from '../../services/frameScanReportStore';
import { 
  computeCumulativeFrameProfileForContact,
  computeFrameProfileTrend,
  getFrameScoreLabel,
  getFrameScoreColorClass,
  getFrameScoreBgClass,
  formatProfileDate,
} from '../../lib/frameScan/frameProfile';
import { runTextFrameScan, runImageFrameScan, type TextDomainId, type ImageDomainId } from '../../lib/frameScan/frameScanLLM';
import type { FrameDomainId } from '../../lib/frameScan/frameTypes';
import { CONTACT_ZERO } from '../../services/contactStore';
import { LittleLordChat } from '../littleLord';

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
  const trend = useMemo(() => computeFrameProfileTrend(reports), [reports]);

  const scoreColorClass = getFrameScoreColorClass(profile.currentFrameScore);
  const scoreBgClass = getFrameScoreBgClass(profile.currentFrameScore);
  const scoreLabel = getFrameScoreLabel(profile.currentFrameScore);

  const isContactZero = contactId === CONTACT_ZERO.id;

  // Handle text scan
  const handleTextScan = async () => {
    if (!textContent.trim()) {
      setScanError('Please enter some text to scan');
      return;
    }

    setScanLoading(true);
    setScanError(null);

    try {
      await runTextFrameScan({
        domain: textDomain,
        content: textContent.trim(),
        contactId,
      });
      setTextContent('');
      setIsTextScanOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setScanError(err?.message || 'Scan failed');
    } finally {
      setScanLoading(false);
    }
  };

  // Handle image scan
  const handleImageScan = async () => {
    if (!imageUrl.trim()) {
      setScanError('Please enter an image URL');
      return;
    }

    setScanLoading(true);
    setScanError(null);

    try {
      await runImageFrameScan({
        domain: imageDomain,
        imageIdOrUrl: imageUrl.trim(),
        description: imageDescription.trim() || undefined,
        contactId,
      });
      setImageUrl('');
      setImageDescription('');
      setIsImageScanOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setScanError(err?.message || 'Scan failed');
    } finally {
      setScanLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Profile + Scans + Framelord in stacked layout */}
      <div className="space-y-6">
        {/* Profile Summary */}
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border p-6 ${scoreBgClass}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Frame Score</div>
              <div className={`text-5xl font-bold ${scoreColorClass}`}>
                {profile.currentFrameScore}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {trend && (
                  <span className={`flex items-center gap-1 text-sm ${
                    trend.direction === 'up' ? 'text-green-400' :
                    trend.direction === 'down' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {trend.direction === 'up' ? <TrendingUp size={14} /> :
                     trend.direction === 'down' ? <TrendingDown size={14} /> :
                     <Minus size={14} />}
                    {trend.changeAmount > 0 && `${trend.changeAmount} pts`}
                  </span>
                )}
                <span className="text-sm text-gray-400">{scoreLabel}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">{profile.scansCount} scan{profile.scansCount !== 1 ? 's' : ''}</div>
              {profile.lastScanAt && (
                <div className="text-xs text-gray-500">
                  Last: {formatProfileDate(profile.lastScanAt)}
                </div>
              )}
            </div>
          </div>
        </MotionDiv>

        {/* Action Buttons */}
        <div className="flex gap-3">
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
        </div>

        {/* Text Scan Form */}
        {isTextScanOpen && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#0E0E0E] border border-[#333] rounded-lg p-4"
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
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste the text you want to analyze..."
                  rows={6}
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#4433FF] resize-none"
                />
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
            className="bg-[#0E0E0E] border border-[#333] rounded-lg p-4"
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
                <label className="block text-xs text-gray-400 mb-1">Context (optional)</label>
                <textarea
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  placeholder="Describe the context, e.g., 'LinkedIn profile photo for business coach'"
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#4433FF] resize-none"
                />
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
                    <div className="text-sm text-white">{DOMAIN_LABELS[report.domain]}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={10} />
                      {formatProfileDate(report.createdAt)}
                    </div>
                  </div>

                  <div className={`text-lg font-bold ${getFrameScoreColorClass(report.score.frameScore)}`}>
                    {report.score.frameScore}
                  </div>

                  <ChevronRight size={14} className="text-gray-500" />
                </MotionDiv>
              ))}
            </div>
          )}
        </div>

        {/* Little Lord Chat Section */}
        <LittleLordChat
          tenantId="default_tenant"
          userId={CONTACT_ZERO.id}
          context={{
            selectedContactId: contactId,
          }}
          height="300px"
          showHeader={true}
        />
      </div>
    </div>
  );
};

export default FrameScanContactTab;
