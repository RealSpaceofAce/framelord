// =============================================================================
// FRAME SCAN PAGE — Global list of all FrameScan reports
// =============================================================================
// Shows all FrameScan reports with aurora header, segment menu, and filtering.
// Supports: All Contacts, Domains, Folders, and Cases (coming soon) views.
// =============================================================================

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan, Filter, User, FileText, Image, Folder, Grid3x3,
  ChevronRight, Calendar, X, FlaskConical, Plus, Briefcase,
  MoreHorizontal, Edit2, Trash2, FolderPlus
} from 'lucide-react';
import { seedDemoFrameScans } from '../../dev/seedFrameScans';
import {
  getFrameScanReports,
  getReportsForContact,
  subscribe,
  getSnapshot,
  type FrameScanReport
} from '../../services/frameScanReportStore';
import { getContactById, getAllContacts, CONTACT_ZERO } from '../../services/contactStore';
import { formatProfileDate } from '../../lib/frameScan/frameProfile';
import type { FrameDomainId } from '../../lib/frameScan/frameTypes';
import { Aurora } from '../ui/Aurora';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { useFrameScanFolderStore } from '../../services/frameScanFolderStore';
import { cn } from '@/lib/utils';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

type FrameScanReportViewMode = 'allContacts' | 'domains' | 'folders' | 'cases';

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
  // View mode state
  const [viewMode, setViewMode] = useState<FrameScanReportViewMode>('allContacts');

  // Filter state
  const [selectedContactId, setSelectedContactId] = useState<string | 'all'>('all');
  const [selectedDomain, setSelectedDomain] = useState<FrameDomainId | 'all'>('all');
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);

  // Cases modal state
  const [isCasesModalOpen, setIsCasesModalOpen] = useState(false);

  // Subscribe to store changes for automatic updates
  const storeReports = useSyncExternalStore(subscribe, getSnapshot);

  // Folder store
  const {
    folders,
    selectedFolderId,
    createFolder,
    addReportToFolder,
    removeReportFromFolder,
    deleteFolder,
    selectFolder,
  } = useFrameScanFolderStore();

  // Get all reports sorted (most recent first) and contacts
  const allReports = useMemo(() =>
    [...storeReports].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [storeReports]
  );
  const allContacts = useMemo(() => getAllContacts(), []);

  // Filter reports
  const filteredReports = useMemo(() => {
    let reports = allReports;

    if (selectedContactId !== 'all') {
      reports = reports.filter(r => r.subjectContactIds.includes(selectedContactId));
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
    <div className="h-full flex flex-col bg-background">
      {/* Aurora Header */}
      <Aurora
        colorStops={['#2B1AFF', '#4433FF', '#3322EE']}
        amplitude={1.5}
        blend={0.8}
        speed={0.6}
        className="min-h-[250px] bg-gradient-to-b from-[#050508] via-[#080810] to-[#0A0A0F] border-b border-border/50"
      >
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 pt-12 pb-8">
          <h1 className="text-4xl font-bold text-white tracking-wide mb-3 text-center">
            FRAMESCAN REPORTS
          </h1>
          <p className="text-muted-foreground text-center max-w-2xl">
            Review, group, and case-build your FrameScans.
          </p>
        </div>

        {/* Gradient overlay for smooth blending */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
      </Aurora>

      {/* Segment Menu + Actions Bar */}
      <div className="px-6 py-3 border-b border-[#0043ff]/20 bg-[#0A0A0F] flex items-center justify-between">
        {/* Left: Segment tabs */}
        <div className="flex items-center gap-1 bg-[#0E0E16] rounded-lg p-1 border border-[#0043ff]/20">
          <button
            onClick={() => setViewMode('allContacts')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              viewMode === 'allContacts'
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <User size={14} />
            <span className="hidden sm:inline">All contacts</span>
          </button>
          <button
            onClick={() => setViewMode('domains')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              viewMode === 'domains'
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Grid3x3 size={14} />
            <span className="hidden sm:inline">Domains</span>
          </button>
          <button
            onClick={() => setViewMode('folders')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              viewMode === 'folders'
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Folder size={14} />
            <span className="hidden sm:inline">Folders</span>
          </button>
          <button
            onClick={() => setViewMode('cases')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              viewMode === 'cases'
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Briefcase size={14} />
            <span className="hidden sm:inline">Cases</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* DEV ONLY: Load Demo Data */}
          {import.meta.env.DEV && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem('framelord_framescan_demo_seeded');
                const seeded = seedDemoFrameScans();
                if (!seeded) {
                  alert('Demo data already exists. Refresh the page to clear in-memory state, then try again.');
                }
              }}
              className="gap-2 text-purple-400 border-purple-600/30 hover:bg-purple-600/10"
            >
              <FlaskConical size={14} />
              Load Demo Data
            </Button>
          )}

          {/* Add Case Button */}
          <Button
            variant="brand"
            size="sm"
            onClick={() => setIsCasesModalOpen(true)}
            className="gap-1.5"
          >
            <Plus size={14} />
            Add case
          </Button>
        </div>
      </div>

      {/* Content Area - View Mode Switcher */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'allContacts' && (
          <AllContactsView
            reports={filteredReports}
            onViewReport={onViewReport}
            onNavigateToContact={onNavigateToContact}
            getContactName={getContactName}
            getContactAvatar={getContactAvatar}
          />
        )}

        {viewMode === 'domains' && (
          <DomainsView
            reports={allReports}
            uniqueDomains={uniqueDomains}
            onViewReport={onViewReport}
            onNavigateToContact={onNavigateToContact}
            getContactName={getContactName}
            getContactAvatar={getContactAvatar}
          />
        )}

        {viewMode === 'folders' && (
          <FoldersView
            reports={allReports}
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={selectFolder}
            onCreateFolder={createFolder}
            onAddReportToFolder={addReportToFolder}
            onRemoveReportFromFolder={removeReportFromFolder}
            onDeleteFolder={deleteFolder}
            onViewReport={onViewReport}
            onNavigateToContact={onNavigateToContact}
            getContactName={getContactName}
            getContactAvatar={getContactAvatar}
          />
        )}

        {viewMode === 'cases' && (
          <CasesView />
        )}
      </div>

      {/* Cases Coming Soon Modal */}
      <Dialog open={isCasesModalOpen} onOpenChange={setIsCasesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cases – coming soon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cases will let you turn FrameScans into living dossiers. You will attach messages, notes, and scans to a single case and receive ongoing frame and behavioral analysis inside that context.
            </p>
            <p className="text-xs text-muted-foreground italic">
              You will be able to update a case over time and see how the frame shifts, rather than scanning isolated messages.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// =============================================================================
// VIEW COMPONENTS
// =============================================================================

// All Contacts View - Grouped list of reports by contact
interface AllContactsViewProps {
  reports: FrameScanReport[];
  onViewReport: (reportId: string) => void;
  onNavigateToContact?: (contactId: string) => void;
  getContactName: (contactId: string) => string;
  getContactAvatar: (contactId: string) => string | undefined;
}

const AllContactsView: React.FC<AllContactsViewProps> = ({
  reports,
  onViewReport,
  onNavigateToContact,
  getContactName,
  getContactAvatar,
}) => {
  if (reports.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <Scan size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-lg font-medium text-foreground mb-2">No frame scans yet</p>
          <p className="text-sm text-muted-foreground">Run a frame scan from a contact's profile or the scanner tool.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4 text-sm text-muted-foreground">
        {reports.length} report{reports.length !== 1 ? 's' : ''}
      </div>
      <div className="space-y-3">
        {reports.map((report, index) => (
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
    </div>
  );
};

// Domains View - Reports grouped by domain
interface DomainsViewProps {
  reports: FrameScanReport[];
  uniqueDomains: FrameDomainId[];
  onViewReport: (reportId: string) => void;
  onNavigateToContact?: (contactId: string) => void;
  getContactName: (contactId: string) => string;
  getContactAvatar: (contactId: string) => string | undefined;
}

const DomainsView: React.FC<DomainsViewProps> = ({
  reports,
  uniqueDomains,
  onViewReport,
  onNavigateToContact,
  getContactName,
  getContactAvatar,
}) => {
  const reportsByDomain = useMemo(() => {
    const grouped: Record<FrameDomainId, FrameScanReport[]> = {} as any;
    uniqueDomains.forEach(domain => {
      grouped[domain] = reports.filter(r => r.domain === domain);
    });
    return grouped;
  }, [reports, uniqueDomains]);

  if (uniqueDomains.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <Grid3x3 size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-lg font-medium text-foreground mb-2">No domain data</p>
          <p className="text-sm text-muted-foreground">Reports will be grouped by domain type once you have scans.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {uniqueDomains.map(domain => (
        <div key={domain}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-foreground">{DOMAIN_LABELS[domain]}</h3>
            <Badge variant="muted" className="text-xs">
              {reportsByDomain[domain].length}
            </Badge>
          </div>
          <div className="space-y-3">
            {reportsByDomain[domain].map((report, index) => (
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
        </div>
      ))}
    </div>
  );
};

// Folders View - Two-column layout with folder list and reports
interface FoldersViewProps {
  reports: FrameScanReport[];
  folders: any[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onAddReportToFolder: (folderId: string, reportId: string) => void;
  onRemoveReportFromFolder: (folderId: string, reportId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onViewReport: (reportId: string) => void;
  onNavigateToContact?: (contactId: string) => void;
  getContactName: (contactId: string) => string;
  getContactAvatar: (contactId: string) => string | undefined;
}

const FoldersView: React.FC<FoldersViewProps> = ({
  reports,
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onAddReportToFolder,
  onRemoveReportFromFolder,
  onDeleteFolder,
  onViewReport,
  onNavigateToContact,
  getContactName,
  getContactAvatar,
}) => {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const reportsInFolder = selectedFolder
    ? reports.filter(r => selectedFolder.reportIds.includes(r.id))
    : [];

  return (
    <div className="h-full flex">
      {/* Left: Folder list */}
      <div className="w-64 border-r border-[#0043ff]/20 bg-[#0A0A0F] flex flex-col">
        <div className="p-4 border-b border-[#0043ff]/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingFolder(true)}
            className="w-full gap-2"
          >
            <FolderPlus size={14} />
            New folder
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isCreatingFolder && (
            <div className="mb-2 p-2 bg-muted/30 rounded border border-[#0043ff]/20">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setIsCreatingFolder(false);
                }}
                placeholder="Folder name..."
                className="w-full bg-transparent text-sm text-foreground outline-none mb-2"
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={handleCreateFolder} className="flex-1">
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsCreatingFolder(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder.id === selectedFolderId ? null : folder.id)}
              className={cn(
                "p-2 mb-1 rounded cursor-pointer transition-colors group",
                folder.id === selectedFolderId
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted/50 text-foreground"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Folder size={14} />
                  <span className="text-sm truncate">{folder.name}</span>
                </div>
                <Badge variant="muted" className="text-[10px] shrink-0">
                  {folder.reportIds.length}
                </Badge>
              </div>
            </div>
          ))}

          {folders.length === 0 && !isCreatingFolder && (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No folders yet
            </div>
          )}
        </div>
      </div>

      {/* Right: Reports in selected folder */}
      <div className="flex-1 overflow-y-auto">
        {!selectedFolderId ? (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <Folder size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">Select a folder to view its reports</p>
            </div>
          </div>
        ) : reportsInFolder.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <Folder size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No reports in this folder yet</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {reportsInFolder.map((report, index) => (
              <div key={report.id} className="relative">
                <ReportCard
                  report={report}
                  index={index}
                  onView={() => onViewReport(report.id)}
                  onNavigateToContact={onNavigateToContact}
                  getContactName={getContactName}
                  getContactAvatar={getContactAvatar}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveReportFromFolder(selectedFolderId!, report.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Cases View - Coming soon placeholder
const CasesView: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <Briefcase size={64} className="mx-auto mb-6 text-primary opacity-50" />
        <h2 className="text-2xl font-bold text-foreground mb-4">Cases – coming soon</h2>
        <p className="text-muted-foreground mb-4">
          Cases will let you turn FrameScans into living dossiers. You will attach messages, notes, and scans to a single case and receive ongoing frame and behavioral analysis inside that context.
        </p>
        <p className="text-sm text-muted-foreground italic">
          You will be able to update a case over time and see how the frame shifts, rather than scanning isolated messages.
        </p>
      </div>
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
  // For multi-contact scans, show the first contact's avatar (primary subject)
  const primaryContactId = report.subjectContactIds[0];
  const avatarUrl = getContactAvatar(primaryContactId);

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onView}
      className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 hover:border-[#4433FF]/50 hover:bg-[#111] transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#4433FF]/50"
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToContact?.(primaryContactId);
          }}
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
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToContact?.(primaryContactId);
              }}
            >
              {getContactName(primaryContactId)}
              {report.subjectContactIds.length > 1 && (
                <span className="text-gray-500 ml-1">+{report.subjectContactIds.length - 1}</span>
              )}
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

        {/* View Report Link */}
        <div className="flex items-center gap-2 text-[#4433FF] group-hover:text-[#5544FF] transition-colors">
          <span className="text-sm">View Report</span>
          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </MotionDiv>
  );
};

export default FrameScanPage;







