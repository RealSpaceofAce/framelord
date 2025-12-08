// =============================================================================
// STEP CARD — Card component for a Want step in the kanban board
// =============================================================================
// Supports both dark mode (default) and light mode (Notion-style) styling.
// Features ReactBits-style micro-interactions (hover elevation, scale effects).
// Shows: title, description, due date, overdue indicator, completion timestamp,
// status badge, and drag handles.
// =============================================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, MoreHorizontal, Pencil, Trash2, GripVertical, CheckCircle2, AlertTriangle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../../ui/Badge';
import type { WantStep, WantStatus } from '../../../services/wantStore';

const MotionDiv = motion.div as any;

interface StepCardProps {
  step: WantStep;
  wantTitle?: string;
  onEdit?: (step: WantStep) => void;
  onDelete?: (stepId: string) => void;
  onStatusChange?: (stepId: string, status: WantStatus) => void;
  /** Whether to use light mode styling (Notion-style) */
  light?: boolean;
  /** Whether this card is being dragged */
  isDragging?: boolean;
  /** Whether to show drag handle */
  showDragHandle?: boolean;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  wantTitle,
  onEdit,
  onDelete,
  onStatusChange,
  light = false,
  isDragging = false,
  showDragHandle = true,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const statusConfig: Record<WantStatus, {
    label: string;
    icon: React.ElementType;
    dark: { bg: string; text: string; border: string };
    light: { bg: string; text: string; border: string };
  }> = {
    not_started: {
      label: 'To Do',
      icon: Circle,
      dark: { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-700' },
      light: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
    },
    in_progress: {
      label: 'In Progress',
      icon: Clock,
      dark: { bg: 'bg-amber-900/50', text: 'text-amber-400', border: 'border-amber-700' },
      light: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    },
    done: {
      label: 'Done',
      icon: CheckCircle2,
      dark: { bg: 'bg-green-900/50', text: 'text-green-400', border: 'border-green-700' },
      light: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    },
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', color: light ? '#DC2626' : '#EF4444', isOverdue: true };
    if (diffDays === 0) return { text: 'Today', color: light ? '#D97706' : '#F59E0B', isOverdue: false };
    if (diffDays === 1) return { text: 'Tomorrow', color: light ? '#D97706' : '#F59E0B', isOverdue: false };
    if (diffDays <= 7) return { text: `${diffDays}d`, color: light ? '#6B7280' : '#888', isOverdue: false };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: light ? '#6B7280' : '#666', isOverdue: false };
  };

  const formatCompletedAt = (completedAt: string | null | undefined) => {
    if (!completedAt) return null;
    const date = new Date(completedAt);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const deadline = formatDeadline(step.deadline);
  const completedTime = formatCompletedAt(step.completedAt);
  const config = statusConfig[step.status];
  const colors = light ? config.light : config.dark;

  const StatusIcon = config.icon;

  return (
    <MotionDiv
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging
          ? (light ? '0 8px 24px rgba(0,0,0,0.15)' : '0 8px 24px rgba(0,0,0,0.5)')
          : 'none'
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{
        scale: 1.01,
        boxShadow: light
          ? '0 4px 12px rgba(0,0,0,0.08)'
          : '0 4px 16px rgba(0,0,0,0.3)',
      }}
      transition={{ duration: 0.15 }}
      className={cn(
        "rounded-lg p-3 transition-colors relative cursor-grab active:cursor-grabbing group",
        light
          ? "bg-white border border-gray-200 hover:border-gray-300"
          : "bg-[#1A1A1A] border border-[#333] hover:border-[#444]",
        isDragging && "ring-2",
        isDragging && light && "ring-blue-500/40",
        isDragging && !light && "ring-[#4433FF]/40"
      )}
    >
      {/* Drag Handle */}
      {showDragHandle && (
        <div className={cn(
          "absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab",
          light ? "text-gray-400" : "text-gray-600"
        )}>
          <GripVertical size={14} />
        </div>
      )}

      {/* Content wrapper with left padding for drag handle */}
      <div className={cn(showDragHandle && "pl-3")}>
        {/* Want title (if provided, for global board) */}
        {wantTitle && (
          <div className={cn(
            "text-[10px] mb-1.5 truncate font-medium",
            light ? "text-blue-600" : "text-[#4433FF]"
          )}>
            {wantTitle}
          </div>
        )}

        {/* Top row: Status badge + title */}
        <div className="flex items-start gap-2 pr-6">
          {/* Status Badge */}
          <Badge
            variant="muted"
            className={cn(
              "shrink-0 text-[9px] px-1.5 py-0.5 gap-1 font-medium border",
              colors.bg, colors.text, colors.border,
              step.status === 'in_progress' && "animate-pulse"
            )}
          >
            <StatusIcon size={10} />
            {config.label}
          </Badge>
        </div>

        {/* Step title */}
        <div className={cn(
          "text-sm leading-snug mt-2",
          light ? "text-gray-900" : "text-gray-200",
          step.status === 'done' && "line-through opacity-60"
        )}>
          {step.title}
        </div>

        {/* Description (if exists) */}
        {step.description && (
          <div className={cn(
            "text-xs mt-1.5 line-clamp-2",
            light ? "text-gray-500" : "text-gray-500"
          )}>
            {step.description}
          </div>
        )}

        {/* Bottom row: deadline/completed + overdue indicator */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Deadline (for non-done steps) */}
            {deadline && step.status !== 'done' && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  deadline.isOverdue && "font-semibold"
                )}
                style={{ color: deadline.color }}
              >
                {deadline.isOverdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
                {deadline.text}
              </motion.div>
            )}

            {/* Completion timestamp (for done steps) */}
            {step.status === 'done' && completedTime && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  light ? "text-green-600" : "text-green-400"
                )}
              >
                <CheckCircle2 size={10} />
                {completedTime}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className={cn(
          "absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-all",
          light
            ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            : "text-gray-500 hover:text-gray-300 hover:bg-[#333]",
          "hover:!opacity-100"
        )}
        style={{ opacity: showMenu ? 1 : undefined }}
      >
        <MoreHorizontal size={14} />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.1 }}
              className={cn(
                "absolute top-8 right-2 z-50 rounded-lg shadow-lg py-1 min-w-[140px]",
                light
                  ? "bg-white border border-gray-200"
                  : "bg-[#1A1A1A] border border-[#333]"
              )}
            >
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit(step);
                    setShowMenu(false);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors",
                    light
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-gray-300 hover:bg-[#333]"
                  )}
                >
                  <Pencil size={12} />
                  Edit
                </button>
              )}
              {step.status !== 'done' && onStatusChange && (
                <button
                  onClick={() => {
                    onStatusChange(step.id, 'done');
                    setShowMenu(false);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors",
                    light
                      ? "text-green-600 hover:bg-gray-100"
                      : "text-green-400 hover:bg-[#333]"
                  )}
                >
                  <Check size={12} />
                  Mark Done
                </button>
              )}
              {step.status === 'done' && onStatusChange && (
                <button
                  onClick={() => {
                    onStatusChange(step.id, 'not_started');
                    setShowMenu(false);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors",
                    light
                      ? "text-gray-600 hover:bg-gray-100"
                      : "text-gray-400 hover:bg-[#333]"
                  )}
                >
                  <Clock size={12} />
                  Reopen
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(step.id);
                    setShowMenu(false);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors",
                    light
                      ? "text-red-600 hover:bg-gray-100"
                      : "text-red-400 hover:bg-[#333]"
                  )}
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              )}
            </MotionDiv>
          </>
        )}
      </AnimatePresence>
    </MotionDiv>
  );
};

export default StepCard;
