// =============================================================================
// STEP COLUMN — Kanban column for a status in the Steps board
// =============================================================================
// Each column represents a status (Not Started, In Progress, Done) and
// contains droppable areas for drag-and-drop.
// Supports both dark mode (default) and light mode (Notion-style) styling.
// Features ReactBits-style micro-interactions.
// =============================================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Circle, Clock, CheckCircle, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WantStep, WantStatus } from '../../../services/wantStore';

const MotionDiv = motion.div as any;

interface StepColumnProps {
  status: WantStatus;
  steps: WantStep[];
  /** Whether to use light mode styling (Notion-style) */
  light?: boolean;
  /** Optional callback when "Add Step" is clicked */
  onAddStep?: (status: WantStatus) => void;
  /** Children (SortableStepCards) */
  children: React.ReactNode;
}

const columnConfig: Record<WantStatus, {
  label: string;
  icon: React.ElementType;
  darkColors: { bg: string; border: string; header: string; icon: string; count: string };
  lightColors: { bg: string; border: string; header: string; icon: string; count: string };
}> = {
  not_started: {
    label: 'Not Started',
    icon: Circle,
    darkColors: {
      bg: 'bg-gray-900/50',
      border: 'border-gray-700/50',
      header: 'text-gray-400',
      icon: 'text-gray-500',
      count: 'bg-gray-700/50 text-gray-400',
    },
    lightColors: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      header: 'text-gray-600',
      icon: 'text-gray-400',
      count: 'bg-gray-200 text-gray-600',
    },
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    darkColors: {
      bg: 'bg-amber-950/30',
      border: 'border-amber-900/30',
      header: 'text-amber-400',
      icon: 'text-amber-500',
      count: 'bg-amber-900/50 text-amber-400',
    },
    lightColors: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      header: 'text-amber-700',
      icon: 'text-amber-500',
      count: 'bg-amber-200 text-amber-700',
    },
  },
  done: {
    label: 'Done',
    icon: CheckCircle,
    darkColors: {
      bg: 'bg-green-950/30',
      border: 'border-green-900/30',
      header: 'text-green-400',
      icon: 'text-green-500',
      count: 'bg-green-900/50 text-green-400',
    },
    lightColors: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      header: 'text-green-700',
      icon: 'text-green-500',
      count: 'bg-green-200 text-green-700',
    },
  },
};

export const StepColumn: React.FC<StepColumnProps> = ({
  status,
  steps,
  light = false,
  onAddStep,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  const config = columnConfig[status];
  const colors = light ? config.lightColors : config.darkColors;
  const Icon = config.icon;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex flex-col rounded-xl border min-h-[200px] transition-all duration-200",
        colors.bg,
        colors.border,
        isOver && light && "ring-2 ring-blue-500/30 border-blue-300",
        isOver && !light && "ring-2 ring-[#4433FF]/30 border-[#4433FF]/50"
      )}
    >
      {/* Column Header */}
      <div className={cn(
        "px-3 py-2.5 border-b flex items-center justify-between",
        light ? "border-gray-200" : "border-gray-700/50"
      )}>
        <div className="flex items-center gap-2">
          <Icon size={14} className={colors.icon} />
          <span className={cn("text-sm font-medium", colors.header)}>
            {config.label}
          </span>
          <motion.span
            key={steps.length}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={cn(
              "text-xs px-1.5 py-0.5 rounded-full font-medium",
              colors.count
            )}
          >
            {steps.length}
          </motion.span>
        </div>
        {onAddStep && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddStep(status)}
            className={cn(
              "p-1 rounded-md transition-colors",
              light
                ? "hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                : "hover:bg-gray-700/50 text-gray-500 hover:text-gray-300"
            )}
          >
            <Plus size={14} />
          </motion.button>
        )}
      </div>

      {/* Column Content (droppable area) */}
      <SortableContext
        items={steps.map(s => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 p-2 space-y-2 overflow-y-auto transition-colors duration-200",
            isOver && (light ? "bg-blue-50/50" : "bg-[#4433FF]/5")
          )}
        >
          <AnimatePresence mode="popLayout">
            {children}
          </AnimatePresence>

          {/* Empty state */}
          {steps.length === 0 && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "py-8 text-center text-sm flex flex-col items-center gap-2",
                light ? "text-gray-400" : "text-gray-600"
              )}
            >
              {status === 'done' ? (
                <>
                  <Sparkles size={20} className={cn(light ? "text-green-400" : "text-green-600")} />
                  <span>Complete steps to see them here</span>
                </>
              ) : (
                <>
                  <span>Drop steps here</span>
                  {onAddStep && (
                    <button
                      onClick={() => onAddStep(status)}
                      className={cn(
                        "text-xs px-2 py-1 rounded transition-colors",
                        light
                          ? "text-blue-600 hover:bg-blue-50"
                          : "text-[#4433FF] hover:bg-[#4433FF]/10"
                      )}
                    >
                      or add one
                    </button>
                  )}
                </>
              )}
            </MotionDiv>
          )}
        </div>
      </SortableContext>
    </MotionDiv>
  );
};

export default StepColumn;
