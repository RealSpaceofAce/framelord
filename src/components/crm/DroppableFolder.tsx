// =============================================================================
// DROPPABLE FOLDER — Folder tile that accepts dropped reports
// =============================================================================
// Apple-style folder tile with expand/collapse functionality.
// Shows count badge and preview icons of contained reports.
// =============================================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { Folder, FolderOpen, ChevronDown, ChevronRight, X, Edit2 } from 'lucide-react';
import type { FrameScanFolder } from '@/services/frameScanFolderStore';
import type { FrameScanReport } from '@/services/frameScanReportStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

const MotionDiv = motion.div as any;

interface DroppableFolderProps {
  folder: FrameScanFolder;
  reports: FrameScanReport[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemoveReport: (reportId: string) => void;
  onDeleteFolder: () => void;
  onRenameFolder: (newName: string) => void;
  onViewReport: (reportId: string) => void;
  getContactName: (contactId: string) => string;
  getContactAvatar: (contactId: string) => string | undefined;
  domainLabel: (domain: string) => string;
}

export const DroppableFolder: React.FC<DroppableFolderProps> = ({
  folder,
  reports,
  isExpanded,
  onToggleExpand,
  onRemoveReport,
  onDeleteFolder,
  onRenameFolder,
  onViewReport,
  getContactName,
  getContactAvatar,
  domainLabel,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);

  const { setNodeRef, isOver } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
      folder,
    },
  });

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) {
      onRenameFolder(newName.trim());
    }
    setIsRenaming(false);
  };

  // Show first 4 report avatars as preview
  const previewReports = reports.slice(0, 4);

  return (
    <MotionDiv
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: isOver ? 1.05 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className={cn(
        'bg-[#0E0E0E] border rounded-lg overflow-hidden transition-all',
        isOver
          ? 'border-primary shadow-lg shadow-primary/30 ring-2 ring-primary/20'
          : 'border-[#222] hover:border-[#4433FF]/50'
      )}
    >
      {/* Folder Header */}
      <div
        className={cn(
          'p-4 cursor-pointer group transition-colors',
          isOver ? 'bg-primary/10' : 'hover:bg-[#111]'
        )}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Icon */}
          <button
            className="p-1 rounded hover:bg-[#1A1A1A] transition-colors text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {/* Folder Icon */}
          <div className={cn(
            'p-2 rounded transition-colors',
            isOver ? 'bg-primary/20' : 'bg-[#1A1A1A]'
          )}>
            {isExpanded ? (
              <FolderOpen size={20} className="text-primary" />
            ) : (
              <Folder size={20} className="text-primary" />
            )}
          </div>

          {/* Folder Name */}
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') {
                    setIsRenaming(false);
                    setNewName(folder.name);
                  }
                }}
                onBlur={handleRename}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[#1A1A1A] border border-primary rounded px-2 py-1 text-sm text-white outline-none"
                autoFocus
              />
            ) : (
              <h3 className="text-sm font-medium text-white truncate">{folder.name}</h3>
            )}
          </div>

          {/* Count Badge */}
          <Badge variant="muted" className="text-xs">
            {reports.length}
          </Badge>

          {/* Actions (show on hover) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              className="p-1.5 rounded hover:bg-[#1A1A1A] transition-colors text-gray-400 hover:text-white"
              title="Rename folder"
            >
              <Edit2 size={14} />
            </button>
            {reports.length === 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder();
                }}
                className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-red-400 hover:text-red-300"
                title="Delete empty folder"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Preview Avatars (when collapsed) */}
        {!isExpanded && previewReports.length > 0 && (
          <div className="flex items-center gap-2 mt-3 ml-10">
            <div className="flex -space-x-2">
              {previewReports.map((report) => {
                const contactId = report.subjectContactIds[0];
                const avatarUrl = getContactAvatar(contactId);
                return (
                  <div
                    key={report.id}
                    className="w-8 h-8 rounded-full bg-[#1A1A1A] border-2 border-[#0E0E0E] flex items-center justify-center overflow-hidden"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                    )}
                  </div>
                );
              })}
            </div>
            {reports.length > 4 && (
              <span className="text-xs text-gray-500">+{reports.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Contents */}
      <AnimatePresence>
        {isExpanded && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="border-t border-[#222]"
          >
            <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
              {reports.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  <Folder size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Empty folder</p>
                  <p className="text-xs mt-1">Drag reports here to organize</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    className="group/item bg-[#1A1A1A] border border-[#222] rounded-lg p-3 hover:border-[#4433FF]/50 transition-colors relative"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => onViewReport(report.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-white truncate">
                          {report.title || domainLabel(report.domain)}
                        </span>
                        <div className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-semibold ml-auto',
                          report.score.frameScore >= 70
                            ? 'bg-green-500/10 text-green-400'
                            : report.score.frameScore >= 40
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-red-500/10 text-red-400'
                        )}>
                          {report.score.frameScore}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {getContactName(report.subjectContactIds[0])} • {domainLabel(report.domain)}
                      </div>
                    </div>

                    {/* Remove from folder button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveReport(report.id);
                      }}
                      className="absolute top-2 right-2 p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 opacity-0 group-hover/item:opacity-100 transition-opacity"
                      title="Remove from folder"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </MotionDiv>
  );
};
