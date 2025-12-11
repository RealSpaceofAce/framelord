// =============================================================================
// REPORT GRID — Grid layout with drag-and-drop for FrameScan reports
// =============================================================================
// Apple-style drag-and-drop interface for organizing FrameScan reports.
// Supports:
// - Drag report onto report → create folder
// - Drag report onto folder → add to folder
// - Drag report out of folder → remove from folder
// =============================================================================

import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import type { FrameScanReport } from '@/services/frameScanReportStore';
import type { FrameScanFolder } from '@/services/frameScanFolderStore';
import type { FrameDomainId } from '@/lib/frameScan/frameTypes';
import { DraggableReportCard } from './DraggableReportCard';
import { DroppableFolder } from './DroppableFolder';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

const MotionDiv = motion.div as any;

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

interface ReportGridProps {
  reports: FrameScanReport[];
  folders: FrameScanFolder[];
  onViewReport: (reportId: string) => void;
  onNavigateToContact?: (contactId: string) => void;
  getContactName: (contactId: string) => string;
  getContactAvatar: (contactId: string) => string | undefined;
  onCreateFolder: (name: string, reportIds: string[]) => void;
  onAddReportToFolder: (folderId: string, reportId: string) => void;
  onRemoveReportFromFolder: (folderId: string, reportId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
}

export const ReportGrid: React.FC<ReportGridProps> = ({
  reports,
  folders,
  onViewReport,
  onNavigateToContact,
  getContactName,
  getContactAvatar,
  onCreateFolder,
  onAddReportToFolder,
  onRemoveReportFromFolder,
  onDeleteFolder,
  onRenameFolder,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showFolderNameDialog, setShowFolderNameDialog] = useState(false);
  const [pendingFolderReports, setPendingFolderReports] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');

  // Get reports that are NOT in any folder
  const reportsInFolders = new Set(folders.flatMap(f => f.reportIds));
  const unorganizedReports = reports.filter(r => !reportsInFolders.has(r.id));

  // Get the active item being dragged
  const activeReport = reports.find(r => r.id === activeId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedReportId = active.id as string;
    const overData = over.data.current;

    // Case 1: Dragged report onto another report → Create folder
    if (overData?.type === 'report' && draggedReportId !== over.id) {
      const targetReportId = over.id as string;
      setPendingFolderReports([draggedReportId, targetReportId]);
      setNewFolderName('New Folder');
      setShowFolderNameDialog(true);
    }

    // Case 2: Dragged report onto folder → Add to folder
    if (overData?.type === 'folder') {
      const folderId = over.id as string;
      onAddReportToFolder(folderId, draggedReportId);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), pendingFolderReports);
      setShowFolderNameDialog(false);
      setNewFolderName('');
      setPendingFolderReports([]);
    }
  };

  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getDomainLabel = (domain: FrameDomainId): string => {
    return DOMAIN_LABELS[domain] || 'Unknown';
  };

  return (
    <>
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
        <div className="p-6 max-w-6xl mx-auto">
          <div className="mb-4 text-sm text-muted-foreground">
            {reports.length} report{reports.length !== 1 ? 's' : ''} •{' '}
            {folders.length} folder{folders.length !== 1 ? 's' : ''}
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Folders */}
            <AnimatePresence>
              {folders.map((folder) => {
                const folderReports = reports.filter(r => folder.reportIds.includes(r.id));
                return (
                  <DroppableFolder
                    key={folder.id}
                    folder={folder}
                    reports={folderReports}
                    isExpanded={expandedFolders.has(folder.id)}
                    onToggleExpand={() => toggleFolderExpansion(folder.id)}
                    onRemoveReport={(reportId) => onRemoveReportFromFolder(folder.id, reportId)}
                    onDeleteFolder={() => onDeleteFolder(folder.id)}
                    onRenameFolder={(newName) => onRenameFolder(folder.id, newName)}
                    onViewReport={onViewReport}
                    getContactName={getContactName}
                    getContactAvatar={getContactAvatar}
                    domainLabel={getDomainLabel}
                  />
                );
              })}
            </AnimatePresence>

            {/* Unorganized Reports */}
            <AnimatePresence>
              {unorganizedReports.map((report, index) => (
                <DraggableReportCard
                  key={report.id}
                  report={report}
                  index={index}
                  onView={() => onViewReport(report.id)}
                  onNavigateToContact={onNavigateToContact}
                  getContactName={getContactName}
                  getContactAvatar={getContactAvatar}
                  domainLabel={getDomainLabel(report.domain)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {reports.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No reports yet</p>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeReport && (
            <MotionDiv
              initial={{ scale: 1.05, opacity: 0.9 }}
              animate={{ scale: 1.1, opacity: 0.8 }}
              className="bg-[#0E0E0E] border-2 border-primary shadow-2xl shadow-primary/30 rounded-lg p-4 max-w-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {activeReport.title || getDomainLabel(activeReport.domain)}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {getContactName(activeReport.subjectContactIds[0])}
                  </div>
                </div>
              </div>
            </MotionDiv>
          )}
        </DragOverlay>
      </DndContext>

      {/* Create Folder Dialog */}
      <Dialog open={showFolderNameDialog} onOpenChange={setShowFolderNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Give this folder a name to organize your reports.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">Folder Name</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setShowFolderNameDialog(false);
                }}
                placeholder="e.g., Sales Prospects, Team Reviews..."
                className="w-full bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-white outline-none focus:border-primary"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateFolder} className="flex-1">
                Create Folder
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowFolderNameDialog(false);
                  setNewFolderName('');
                  setPendingFolderReports([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
