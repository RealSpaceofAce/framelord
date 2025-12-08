// =============================================================================
// SORTABLE STEP CARD — Draggable wrapper for StepCard
// =============================================================================
// Uses dnd-kit's useSortable hook to make StepCard draggable within the board.
// =============================================================================

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StepCard } from './StepCard';
import type { WantStep, WantStatus } from '../../../services/wantStore';

interface SortableStepCardProps {
  step: WantStep;
  wantTitle?: string;
  onEdit?: (step: WantStep) => void;
  onDelete?: (stepId: string) => void;
  onStatusChange?: (stepId: string, status: WantStatus) => void;
  light?: boolean;
  showDragHandle?: boolean;
}

export const SortableStepCard: React.FC<SortableStepCardProps> = ({
  step,
  wantTitle,
  onEdit,
  onDelete,
  onStatusChange,
  light = false,
  showDragHandle = true,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.id,
    data: { step },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <StepCard
        step={step}
        wantTitle={wantTitle}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        light={light}
        isDragging={isDragging}
        showDragHandle={showDragHandle}
      />
    </div>
  );
};

export default SortableStepCard;
