// =============================================================================
// FRAME SCAN PAGE — Global list of all FrameScan reports
// =============================================================================
// Shows all FrameScan reports with filtering by contact and domain.
// Allows navigation to individual report details.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Scan, Filter, User, FileText, Image, 
  ChevronRight, Calendar, Target, TrendingUp, TrendingDown, Minus,
  X
} from 'lucide-react';
import { 
  getFrameScanReports, 
  getReportsForContact,
  type FrameScanReport 
} from '../../services/frameScanReportStore';
import { getContactById, getAllContacts, CONTACT_ZERO } from '../../services/contactStore';
import { 
  getFrameScoreLabel, 
  getFrameScoreColorClass,
  formatProfileDate 
} from '../../lib/frameScan/frameProfile';
import type { FrameDomainId } from '../../lib/frameScan/frameTypes';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

interface FrameScanPageProps {
  onViewReport: (reportId: string) => void;
  onNavigateToContact?: (contactId: string) => void;
}

// =============================================================================
// DOMAIN LABELS
// =============================================================================

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

export const FrameScanPage: React.FC<FrameScanPageProps> = ({
  onViewReport,
  onNavigateToContact,
}) => {
  // Filter state
  const [selectedContactId, setSelectedContactId] = useState<string | 'all'>('all');
  const [selectedDomain, setSelectedDomain] = useState<FrameDomainId | 'all'>('all');
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);

  // Get all reports and contacts
  const allReports = useMemo(() => getFrameScanReports(), []);
  const allContacts = useMemo(() => getAllContacts(), []);

  // Filter reports
  const filteredReports = useMemo(() => {
    let reports = allReports;

    if (selectedContactId !== 'all') {
      reports = reports.filter(r => r.subjectContactId === selectedContactId);
    }

    if (selectedDomain !== 'all') {
      reports = reports.filter(r => r.domain === selectedDomain);
    }

    return reports;
  }, [allReports, selectedContactId, selectedDomain]);

  // Get unique domains from reports
  const uniqueDomains = useMemo(() => {
    const domains = new Set(allReports.map(r => r.domain));
    return Array.from(domains) as FrameDomainId[];
  }, [allReports]);

  // Get contact name helper
  const getContactName = (contactId: string): string => {
    if (contactId === CONTACT_ZERO.id) return 'Contact Zero (Self)';
    const contact = getContactById(contactId);
    return contact?.fullName || 'Unknown Contact';
  };

  // Get contact avatar helper
  const getContactAvatar = (contactId: string): string | undefined => {
    const contact = getContactById(contactId);
    return contact?.avatarUrl;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#4433FF]/20 rounded-lg border border-[#4433FF]/30">
            <Scan size={24} className="text-[#4433FF]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Frame Scans</h1>
        </div>
        <p className="text-gray-400 text-sm">
          View and analyze all frame scan reports across contacts and domains.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Contact Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsContactDropdownOpen(!isContactDropdownOpen);
              setIsDomainDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#333] rounded-lg hover:border-[#4433FF]/50 transition-colors"
          >
            <User size={14} className="text-gray-400" />
            <span className="text-sm text-white">
              {selectedContactId === 'all' ? 'All Contacts' : getContactName(selectedContactId)}
            </span>
            <ChevronRight size={14} className={`text-gray-400 transition-transform ${isContactDropdownOpen ? 'rotate-90' : ''}`} />
          </button>

          {isContactDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-[#1A1A1A] border border-[#333] rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedContactId('all');
                  setIsContactDropdownOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-[#222] transition-colors ${
                  selectedContactId === 'all' ? 'text-[#4433FF]' : 'text-white'
                }`}
              >
                All Contacts
              </button>
              <div className="border-t border-[#333]" />
              {allContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => {
                    setSelectedContactId(contact.id);
                    setIsContactDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[#222] transition-colors flex items-center gap-2 ${
                    selectedContactId === contact.id ? 'text-[#4433FF]' : 'text-white'
                  }`}
                >
                  {contact.avatarUrl && (
                    <img src={contact.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span>{contact.id === CONTACT_ZERO.id ? 'Contact Zero (Self)' : contact.fullName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Domain Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsDomainDropdownOpen(!isDomainDropdownOpen);
              setIsContactDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#333] rounded-lg hover:border-[#4433FF]/50 transition-colors"
          >
            <Filter size={14} className="text-gray-400" />
            <span className="text-sm text-white">
              {selectedDomain === 'all' ? 'All Domains' : DOMAIN_LABELS[selectedDomain]}
            </span>
            <ChevronRight size={14} className={`text-gray-400 transition-transform ${isDomainDropdownOpen ? 'rotate-90' : ''}`} />
          </button>

          {isDomainDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#1A1A1A] border border-[#333] rounded-lg shadow-xl z-50">
              <button
                onClick={() => {
                  setSelectedDomain('all');
                  setIsDomainDropdownOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-[#222] transition-colors ${
                  selectedDomain === 'all' ? 'text-[#4433FF]' : 'text-white'
                }`}
              >
                All Domains
              </button>
              <div className="border-t border-[#333]" />
              {uniqueDomains.map(domain => (
                <button
                  key={domain}
                  onClick={() => {
                    setSelectedDomain(domain);
                    setIsDomainDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[#222] transition-colors ${
                    selectedDomain === domain ? 'text-[#4433FF]' : 'text-white'
                  }`}
                >
                  {DOMAIN_LABELS[domain]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {(selectedContactId !== 'all' || selectedDomain !== 'all') && (
          <button
            onClick={() => {
              setSelectedContactId('all');
              setSelectedDomain('all');
            }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>

      {/* Reports Count */}
      <div className="mb-4 text-sm text-gray-500">
        {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Scan size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg mb-2">No frame scans yet</p>
          <p className="text-sm">Run a frame scan from a contact's profile or the scanner tool.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report, index) => (
            <ReportCard 
              key={report.id} 
              report={report} 
              index={index}
              onView={() => onViewReport(report.id)}
              onNavigateToContact={onNavigateToContact}
              getContactName={getContactName}
              getContactAvatar={getContactAvatar}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// REPORT CARD COMPONENT
// =============================================================================

interface ReportCardProps {
  report: FrameScanReport;
  index: number;
  onView: () => void;
  onNavigateToContact?: (contactId: string) => void;
  getContactName: (contactId: string) => string;
  getContactAvatar: (contactId: string) => string | undefined;
}

const ReportCard: React.FC<ReportCardProps> = ({
  report,
  index,
  onView,
  onNavigateToContact,
  getContactName,
  getContactAvatar,
}) => {
  const scoreColorClass = getFrameScoreColorClass(report.score.frameScore);
  const scoreLabel = getFrameScoreLabel(report.score.frameScore);
  const avatarUrl = getContactAvatar(report.subjectContactId);

  // Get trend icon
  const TrendIcon = report.score.overallFrame === 'apex' 
    ? TrendingUp 
    : report.score.overallFrame === 'slave' 
      ? TrendingDown 
      : Minus;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 hover:border-[#333] transition-colors"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div 
          className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center overflow-hidden cursor-pointer"
          onClick={() => onNavigateToContact?.(report.subjectContactId)}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={18} className="text-gray-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="text-sm font-medium text-white cursor-pointer hover:text-[#4433FF] transition-colors"
              onClick={() => onNavigateToContact?.(report.subjectContactId)}
            >
              {getContactName(report.subjectContactId)}
            </span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-400">{DOMAIN_LABELS[report.domain]}</span>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {/* Modality */}
            <span className="flex items-center gap-1">
              {report.modality === 'image' ? (
                <Image size={12} />
              ) : (
                <FileText size={12} />
              )}
              {report.modality}
            </span>
            
            {/* Date */}
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatProfileDate(report.createdAt)}
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <div className={`text-2xl font-bold ${scoreColorClass}`}>
            {report.score.frameScore}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <TrendIcon size={12} className={scoreColorClass} />
            <span>{scoreLabel}</span>
          </div>
        </div>

        {/* View Button */}
        <button
          onClick={onView}
          className="px-4 py-2 bg-[#1A1A1A] border border-[#333] rounded-lg text-sm text-white hover:bg-[#222] hover:border-[#4433FF]/50 transition-colors flex items-center gap-2"
        >
          View <ChevronRight size={14} />
        </button>
      </div>
    </MotionDiv>
  );
};

export default FrameScanPage;




