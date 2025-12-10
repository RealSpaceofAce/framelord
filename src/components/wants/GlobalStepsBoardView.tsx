// =============================================================================
// GLOBAL STEPS BOARD VIEW — Horizontal Wants with Vertical Steps Stacks
// =============================================================================
// REFACTORED: No longer a status-based Kanban. Instead:
// - Each COLUMN is a Want
// - Under each Want, a VERTICAL stack of all its Steps
// - Status is shown as a badge on each Step, NOT as separate lanes
// - Horizontal scroll for many Wants
// - No cross-Want drag-and-drop (Steps belong to their parent Want)
// =============================================================================

import React, { useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Layers, CheckCircle2, Clock, Circle, Calendar, AlertCircle, MoreHorizontal, Trash2, Edit2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ScrollArea } from '../ui/ScrollArea';
import { CongruencyBadge } from '../ui/CongruencyBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { StepEditDialog } from './ui/StepEditDialog';
import {
  getAllWants,
  updateStep,
  deleteStep,
  addStep,
  subscribe,
  getSnapshot,
  type Want,
  type WantStep,
  type WantStatus,
} from '../../services/wantStore';
import { getCongruencyScore } from '../../services/wantScopeStore';

const MotionDiv = motion.div as any;

interface GlobalStepsBoardViewProps {
  /** Callback when clicking on a Want title to navigate to detail */
  onNavigateToWant?: (wantId: string) => void;
}

// =============================================================================
// STEP CARD — Individual step within a Want column
// =============================================================================

interface StepCardProps {
  step: WantStep;
  wantId: string;
  onEdit: (step: WantStep) => void;
  onDelete: (stepId: string) => void;
  onStatusChange: (stepId: string, status: WantStatus) => void;
}

const StepCardItem: React.FC<StepCardProps> = ({
  step,
  wantId,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const isOverdue = step.deadline && new Date(step.deadline) < new Date() && step.status !== 'done';

  const getStatusIcon = () => {
    switch (step.status) {
      case 'done':
        return <CheckCircle2 size={14} className="text-green-500" />;
      case 'in_progress':
        return <Clock size={14} className="text-amber-500" />;
      default:
        return <Circle size={14} className="text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (): 'muted' | 'info' | 'success' => {
    switch (step.status) {
      case 'done': return 'success';
      case 'in_progress': return 'info';
      default: return 'muted';
    }
  };

  const cycleStatus = () => {
    const statusOrder: WantStatus[] = ['not_started', 'in_progress', 'done'];
    const currentIndex = statusOrder.indexOf(step.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    onStatusChange(step.id, nextStatus);
  };

  return (
    <MotionDiv
      layout
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        "p-3 bg-card border border-[#0043ff]/20 rounded-lg group relative",
        step.status === 'done' && "opacity-60"
      )}
    >
      {/* Status toggle + content */}
      <div className="flex items-start gap-2">
        <button
          onClick={cycleStatus}
          className="shrink-0 mt-0.5 hover:scale-110 transition-transform"
          title="Click to cycle status"
        >
          {getStatusIcon()}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-sm font-medium text-foreground",
              step.status === 'done' && "line-through text-muted-foreground"
            )}>
              {step.title}
            </span>
            <Badge variant={getStatusBadgeVariant()} className="text-[10px] px-1.5 py-0">
              {step.status.replace('_', ' ')}
            </Badge>
          </div>

          {step.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
              {step.description}
            </p>
          )}

          {step.deadline && (
            <div className={cn(
              "flex items-center gap-1 text-[10px]",
              isOverdue ? "text-destructive" : "text-muted-foreground"
            )}>
              {isOverdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
              {new Date(step.deadline).toLocaleDateString()}
              {isOverdue && <span className="font-medium">Overdue</span>}
            </div>
          )}

          {step.completedAt && step.status === 'done' && (
            <div className="text-[10px] text-green-600 mt-1">
              Completed {new Date(step.completedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all"
          >
            <MoreHorizontal size={14} className="text-muted-foreground" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <MotionDiv
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-6 bg-popover border border-[#0043ff]/30 rounded-lg shadow-xl z-50 py-1 min-w-[100px]"
              >
                <button
                  onClick={() => { onEdit(step); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2"
                >
                  <Edit2 size={12} />
                  Edit
                </button>
                <button
                  onClick={() => { onDelete(step.id); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </MotionDiv>
            </>
          )}
        </div>
      </div>
    </MotionDiv>
  );
};

// =============================================================================
// WANT COLUMN — A single Want with its Steps stacked vertically
// =============================================================================

interface WantColumnProps {
  want: Want;
  onNavigateToWant?: (wantId: string) => void;
  onEditStep: (step: WantStep, wantId: string) => void;
  onDeleteStep: (stepId: string, wantId: string) => void;
  onStatusChange: (stepId: string, status: WantStatus, wantId: string) => void;
  onOpenAddStep: (wantId: string) => void;
}

const WantColumn: React.FC<WantColumnProps> = ({
  want,
  onNavigateToWant,
  onEditStep,
  onDeleteStep,
  onStatusChange,
  onOpenAddStep,
}) => {
  const congruency = getCongruencyScore(want.id);
  const completedSteps = want.steps.filter(s => s.status === 'done').length;
  const totalSteps = want.steps.length;

  return (
    <div className="w-72 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg border border-[#0043ff]/20">
      {/* Want Header */}
      <div
        className="p-3 border-b border-[#0043ff]/20 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onNavigateToWant?.(want.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-primary" />
            <h3 className="text-sm font-medium text-foreground truncate max-w-[180px]" title={want.title}>
              {want.title}
            </h3>
          </div>
          <CongruencyBadge score={congruency} size="sm" />
        </div>

        <div className="flex items-center justify-between">
          <StatusBadge status={want.status} size="sm" />
          <span className="text-[10px] text-muted-foreground">
            {completedSteps}/{totalSteps} steps
          </span>
        </div>

        {/* Progress bar */}
        {totalSteps > 0 && (
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Steps Stack */}
      <ScrollArea className="flex-1 max-h-[400px]">
        <div className="p-2 space-y-2">
          <AnimatePresence mode="popLayout">
            {want.steps.map(step => (
              <StepCardItem
                key={step.id}
                step={step}
                wantId={want.id}
                onEdit={(s) => onEditStep(s, want.id)}
                onDelete={(id) => onDeleteStep(id, want.id)}
                onStatusChange={(id, status) => onStatusChange(id, status, want.id)}
              />
            ))}
          </AnimatePresence>

          {want.steps.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-xs">
              No steps yet
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Step Button - Opens Dialog */}
      <div className="p-2 border-t border-[#0043ff]/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onOpenAddStep(want.id); }}
          className="w-full justify-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Plus size={14} />
          Add Step
        </Button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const GlobalStepsBoardView: React.FC<GlobalStepsBoardViewProps> = ({
  onNavigateToWant,
}) => {
  // Subscribe to store changes
  useSyncExternalStore(subscribe, getSnapshot);

  const wants = getAllWants();

  // Edit dialog state
  const [editingStep, setEditingStep] = useState<{ step: WantStep; wantId: string } | null>(null);

  // Create step dialog state
  const [creatingStepForWant, setCreatingStepForWant] = useState<string | null>(null);

  // Step management handlers
  const handleEditStep = (step: WantStep, wantId: string) => {
    setEditingStep({ step, wantId });
  };

  const handleSaveStepEdit = (
    stepId: string,
    updates: { title: string; description?: string; deadline?: string | null; status?: WantStatus }
  ) => {
    if (editingStep) {
      updateStep(editingStep.wantId, stepId, updates);
    }
  };

  const handleDeleteStep = (stepId: string, wantId: string) => {
    if (confirm('Delete this step?')) {
      deleteStep(wantId, stepId);
    }
  };

  const handleStatusChange = (stepId: string, status: WantStatus, wantId: string) => {
    updateStep(wantId, stepId, { status });
  };

  // Open add step dialog for a specific Want
  const handleOpenAddStep = (wantId: string) => {
    setCreatingStepForWant(wantId);
  };

  // Create a new step via dialog
  const handleCreateStep = (data: { title: string; description?: string; deadline?: string | null; status?: WantStatus }) => {
    if (creatingStepForWant) {
      addStep(creatingStepForWant, data);
      setCreatingStepForWant(null);
    }
  };

  // Calculate totals
  const totalSteps = wants.reduce((sum, w) => sum + w.steps.length, 0);
  const completedSteps = wants.reduce(
    (sum, w) => sum + w.steps.filter(s => s.status === 'done').length,
    0
  );

  if (wants.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-background">
        <div className="text-center">
          <Layers size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2 text-foreground">
            No Wants Yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Create Wants and add steps to see them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#0043ff]/20 shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            All Wants
          </h3>
          <Badge variant="muted" className="text-xs">
            {wants.length} wants • {totalSteps} steps
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            {completedSteps}/{totalSteps} steps completed
          </span>
        </div>
      </div>

      {/* Horizontal scroll container with Want columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-4 min-w-max h-full">
          {wants.map(want => (
            <WantColumn
              key={want.id}
              want={want}
              onNavigateToWant={onNavigateToWant}
              onEditStep={handleEditStep}
              onDeleteStep={handleDeleteStep}
              onStatusChange={handleStatusChange}
              onOpenAddStep={handleOpenAddStep}
            />
          ))}
        </div>
      </div>

      {/* Edit Step Dialog */}
      <StepEditDialog
        step={editingStep?.step || null}
        isOpen={!!editingStep}
        onClose={() => setEditingStep(null)}
        onSave={handleSaveStepEdit}
      />

      {/* Create Step Dialog */}
      <StepEditDialog
        step={null}
        isOpen={!!creatingStepForWant}
        onClose={() => setCreatingStepForWant(null)}
        onSave={() => {}}
        onCreate={handleCreateStep}
        createMode={true}
      />
    </div>
  );
};

export default GlobalStepsBoardView;
