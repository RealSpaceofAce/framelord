// =============================================================================
// STEP EDIT DIALOG — shadcn Dialog for editing/creating step details
// =============================================================================
// Replaces the old prompt() approach with a proper modal dialog.
// Uses shadcn Dialog + Input + Textarea + Button components.
// Supports both "edit" mode (existing step) and "create" mode (new step).
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Calendar, X, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Badge } from '../../ui/Badge';
import { cn } from '@/lib/utils';
import type { WantStep, WantStatus } from '../../../services/wantStore';

interface StepEditDialogProps {
  /** Existing step to edit, or null for create mode */
  step: WantStep | null;
  isOpen: boolean;
  onClose: () => void;
  /** For edit mode: save updates to existing step */
  onSave: (stepId: string, updates: {
    title: string;
    description?: string;
    deadline?: string | null;
    status?: WantStatus;
  }) => void;
  /** For create mode: create a new step */
  onCreate?: (data: {
    title: string;
    description?: string;
    deadline?: string | null;
    status?: WantStatus;
  }) => void;
  /** Mode indicator - if true and step is null, dialog is in create mode */
  createMode?: boolean;
}

export const StepEditDialog: React.FC<StepEditDialogProps> = ({
  step,
  isOpen,
  onClose,
  onSave,
  onCreate,
  createMode = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<WantStatus>('not_started');

  // Determine if we're in create mode
  const isCreateMode = createMode && !step;

  // Reset form when step changes or dialog opens in create mode
  useEffect(() => {
    if (step) {
      setTitle(step.title);
      setDescription(step.description || '');
      setDeadline(step.deadline || '');
      setStatus(step.status);
    } else if (isOpen && isCreateMode) {
      // Reset to defaults for create mode
      setTitle('');
      setDescription('');
      setDeadline('');
      setStatus('not_started');
    }
  }, [step, isOpen, isCreateMode]);

  const handleSave = () => {
    if (!title.trim()) return;

    if (isCreateMode && onCreate) {
      // Create mode - call onCreate
      onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline || null,
        status,
      });
    } else if (step) {
      // Edit mode - call onSave
      onSave(step.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline || null,
        status,
      });
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    }
  };

  const statusOptions: Array<{ value: WantStatus; label: string; color: string }> = [
    { value: 'not_started', label: 'Not Started', color: 'bg-muted text-muted-foreground' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-amber-500/20 text-amber-500' },
    { value: 'done', label: 'Done', color: 'bg-green-500/20 text-green-500' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCreateMode ? (
              <>
                <Plus size={18} className="text-primary" />
                Add Step
              </>
            ) : (
              'Edit Step'
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="step-title" className="text-sm font-medium text-foreground">
              Title
            </label>
            <Input
              id="step-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="step-description" className="text-sm font-medium text-foreground">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="step-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this step..."
              rows={3}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <label htmlFor="step-deadline" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar size={14} className="text-muted-foreground" />
              Deadline <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="step-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="flex-1"
              />
              {deadline && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeadline('')}
                  className="shrink-0"
                >
                  <X size={14} />
                </Button>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Status
            </label>
            <div className="flex items-center gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all border",
                    status === option.value
                      ? cn(option.color, "border-current ring-1 ring-current")
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="brand" onClick={handleSave} disabled={!title.trim()}>
            {isCreateMode ? 'Add Step' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StepEditDialog;
