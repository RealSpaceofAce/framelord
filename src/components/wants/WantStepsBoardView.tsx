// =============================================================================
// WANT STEPS BOARD VIEW — Per-Want Kanban board for steps
// =============================================================================
// THE MAIN INTERACTION ZONE for each Want.
// Displays steps in a 3-column Kanban layout: Not Started | In Progress | Done
// Features:
// - Drag-and-drop between columns
// - Step editing via Dialog (not prompt)
// - Add steps to any column
// - Step descriptions, deadlines, overdue indicators
// - Theme-aware (dark/light mode)
// Uses shadcn components: Card, Button, Input, Dialog, ScrollArea
// =============================================================================

import React, { useState, useSyncExternalStore } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Plus, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepColumn } from './ui/StepColumn';
import { StepCard } from './ui/StepCard';
import { SortableStepCard } from './ui/SortableStepCard';
import { StepEditDialog } from './ui/StepEditDialog';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ScrollArea } from '../ui/ScrollArea';
import {
  getWantById,
  addStep,
  updateStep,
  deleteStep,
  subscribe,
  getSnapshot,
  type Want,
  type WantStep,
  type WantStatus,
} from '../../services/wantStore';

// =============================================================================
// TYPES
// =============================================================================

interface WantStepsBoardViewProps {
  wantId: string;
  /** Whether to use light mode styling (Notion-style) */
  light?: boolean;
  /** Optional callback when a step is clicked for detail view */
  onStepClick?: (step: WantStep) => void;
}

// =============================================================================
// ADD STEP FORM — Inline form for adding new steps
// =============================================================================

interface AddStepFormProps {
  onAdd: (title: string, description?: string, deadline?: string) => void;
  onCancel: () => void;
  light?: boolean;
}

const AddStepForm: React.FC<AddStepFormProps> = ({ onAdd, onCancel, light }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [showMore, setShowMore] = useState(false);

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim(), description.trim() || undefined, deadline || undefined);
      setTitle('');
      setDescription('');
      setDeadline('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <Card className={cn(
      "border-dashed",
      light ? "bg-white border-gray-300" : "bg-muted/50 border-border"
    )}>
      <CardContent className="p-3 space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done?"
          autoFocus
          className="text-sm"
        />

        {showMore && (
          <>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details (optional)"
              rows={2}
              className="text-sm resize-none"
            />
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="text-sm"
            />
          </>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="brand" size="sm" onClick={handleSubmit} disabled={!title.trim()}>
              Add Step
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
          {!showMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMore(true)}
              className="text-xs text-muted-foreground"
            >
              + More options
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WantStepsBoardView: React.FC<WantStepsBoardViewProps> = ({
  wantId,
  light = false,
  onStepClick,
}) => {
  // Subscribe to store changes
  const wants = useSyncExternalStore(subscribe, getSnapshot);
  const want = wants.find(w => w.id === wantId);

  // DnD state
  const [activeStep, setActiveStep] = useState<WantStep | null>(null);

  // Add form state
  const [showAddForm, setShowAddForm] = useState<WantStatus | null>(null);

  // Edit dialog state
  const [editingStep, setEditingStep] = useState<WantStep | null>(null);

  // DnD sensors with activation distance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  if (!want) {
    return (
      <div className={cn(
        "p-8 text-center",
        light ? "text-gray-500" : "text-muted-foreground"
      )}>
        <Target size={32} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">Want not found</p>
      </div>
    );
  }

  // Group steps by status
  const stepsByStatus: Record<WantStatus, WantStep[]> = {
    not_started: want.steps.filter(s => s.status === 'not_started'),
    in_progress: want.steps.filter(s => s.status === 'in_progress'),
    done: want.steps.filter(s => s.status === 'done'),
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const step = event.active.data.current?.step as WantStep | undefined;
    if (step) {
      setActiveStep(step);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: preview status change during drag
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStep(null);

    const { active, over } = event;
    if (!over) return;

    const activeStepData = active.data.current?.step as WantStep | undefined;
    if (!activeStepData) return;

    // Check if dropped on a column
    const overId = over.id.toString();
    if (overId.startsWith('column-')) {
      const newStatus = overId.replace('column-', '') as WantStatus;
      if (activeStepData.status !== newStatus) {
        updateStep(wantId, activeStepData.id, { status: newStatus });
      }
    }

    // Check if dropped on another step (for reordering within column)
    const overStep = over.data.current?.step as WantStep | undefined;
    if (overStep && activeStepData.status !== overStep.status) {
      // Move to the same status as the target step
      updateStep(wantId, activeStepData.id, { status: overStep.status });
    }
  };

  // Step management handlers
  const handleAddStep = (status: WantStatus) => {
    setShowAddForm(status);
  };

  const handleSaveNewStep = (title: string, description?: string, deadline?: string) => {
    if (showAddForm) {
      addStep(wantId, {
        title,
        description,
        deadline: deadline || null,
        status: showAddForm,
      });
      setShowAddForm(null);
    }
  };

  const handleEditStep = (step: WantStep) => {
    setEditingStep(step);
  };

  const handleSaveStepEdit = (
    stepId: string,
    updates: { title: string; description?: string; deadline?: string | null; status?: WantStatus }
  ) => {
    updateStep(wantId, stepId, updates);
  };

  const handleDeleteStep = (stepId: string) => {
    if (confirm('Delete this step?')) {
      deleteStep(wantId, stepId);
    }
  };

  const handleStatusChange = (stepId: string, status: WantStatus) => {
    updateStep(wantId, stepId, { status });
  };

  const statuses: WantStatus[] = ['not_started', 'in_progress', 'done'];

  return (
    <>
      <div className={cn(
        "flex flex-col min-h-[300px]",
        light ? "bg-white" : "bg-transparent"
      )}>
        {/* Board Header */}
        <div className={cn(
          "flex items-center justify-between mb-4",
          light ? "text-gray-700" : "text-foreground"
        )}>
          <h3 className="text-sm font-medium">Steps</h3>
          <span className={cn(
            "text-xs",
            light ? "text-gray-500" : "text-muted-foreground"
          )}>
            {want.steps.filter(s => s.status === 'done').length}/{want.steps.length} completed
          </span>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-3 gap-4 flex-1">
            {statuses.map(status => (
              <StepColumn
                key={status}
                status={status}
                steps={stepsByStatus[status]}
                light={light}
                onAddStep={handleAddStep}
              >
                {/* Scrollable step list */}
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2 pr-2">
                    {/* Sortable steps */}
                    {stepsByStatus[status].map(step => (
                      <SortableStepCard
                        key={step.id}
                        step={step}
                        onEdit={handleEditStep}
                        onDelete={handleDeleteStep}
                        onStatusChange={handleStatusChange}
                        light={light}
                        showDragHandle
                      />
                    ))}
                  </div>
                </ScrollArea>

                {/* Add step form (inline) */}
                {showAddForm === status && (
                  <AddStepForm
                    onAdd={handleSaveNewStep}
                    onCancel={() => setShowAddForm(null)}
                    light={light}
                  />
                )}
              </StepColumn>
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeStep && (
              <StepCard
                step={activeStep}
                light={light}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>

        {/* Empty state */}
        {want.steps.length === 0 && (
          <div className={cn(
            "text-center py-12",
            light ? "text-gray-500" : "text-muted-foreground"
          )}>
            <Target size={40} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm mb-4">No steps defined yet. Break down your Want into actionable steps.</p>
            <Button
              variant="brand"
              onClick={() => handleAddStep('not_started')}
              className="gap-2"
            >
              <Plus size={16} />
              Add First Step
            </Button>
          </div>
        )}
      </div>

      {/* Edit Step Dialog */}
      <StepEditDialog
        step={editingStep}
        isOpen={!!editingStep}
        onClose={() => setEditingStep(null)}
        onSave={handleSaveStepEdit}
      />
    </>
  );
};

export default WantStepsBoardView;
