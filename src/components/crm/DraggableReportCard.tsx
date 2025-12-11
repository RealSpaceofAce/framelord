// =============================================================================
// DRAGGABLE REPORT CARD — Individual FrameScan report that can be dragged
// =============================================================================
// Apple-style draggable card for FrameScan reports.
// Supports drag-to-create folders and drag-into-folders.
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { User, FileText, Image, Calendar } from 'lucide-react';
import type { FrameScanReport } from '@/services/frameScanReportStore';
import { formatProfileDate } from '@/lib/frameScan/frameProfile';
import { cn } from '@/lib/utils';

const MotionDiv = motion.div as any;

interface DraggableReportCardProps {
  report: FrameScanReport;
  index: number;
  onView: () => void;
  onNavigateToContact?: (contactId: string) => void;
  getContactName: (contactId: string) => string;
  getContactAvatar: (contactId: string) => string | undefined;
  domainLabel: string;
  isBeingDragged?: boolean;
}

export const DraggableReportCard: React.FC<DraggableReportCardProps> = ({
  report,
  index,
  onView,
  onNavigateToContact,
  getContactName,
  getContactAvatar,
  domainLabel,
  isBeingDragged = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: report.id,
    data: {
      type: 'report',
      report,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const primaryContactId = report.subjectContactIds[0];
  const avatarUrl = getContactAvatar(primaryContactId);

  return (
    <MotionDiv
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        scale: isDragging ? 1.05 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        delay: index * 0.03,
      }}
      className={cn(
        'bg-[#0E0E0E] border rounded-lg p-4 transition-all cursor-grab active:cursor-grabbing group',
        isDragging
          ? 'border-primary shadow-lg shadow-primary/20 z-50'
          : 'border-[#222] hover:border-[#4433FF]/50 hover:bg-[#111]'
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[#4433FF]/50"
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToContact?.(primaryContactId);
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={20} className="text-gray-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-white truncate">
              {report.title || domainLabel}
            </h3>
          </div>

          <div className="flex items-center gap-2 mb-2 text-xs">
            <span
              className="text-gray-400 cursor-pointer hover:text-[#4433FF] transition-colors truncate"
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
            <span className="text-gray-600">•</span>
            <span className="text-gray-400 truncate">{domainLabel}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              {report.modality === 'image' ? (
                <Image size={12} />
              ) : (
                <FileText size={12} />
              )}
              {report.modality}
            </span>

            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatProfileDate(report.createdAt)}
            </span>
          </div>
        </div>

        {/* Frame Score Badge */}
        <div className="flex-shrink-0">
          <div className={cn(
            'px-3 py-1.5 rounded-full text-sm font-semibold',
            report.score.frameScore >= 70
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : report.score.frameScore >= 40
              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          )}>
            {report.score.frameScore}
          </div>
        </div>
      </div>

      {/* View button on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onView();
        }}
        className="mt-3 w-full py-2 rounded bg-primary/10 border border-primary/20 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20"
      >
        View Report
      </button>
    </MotionDiv>
  );
};
