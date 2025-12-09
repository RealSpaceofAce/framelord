// =============================================================================
// WANT BOARD VIEW — DnD-kit kanban board for Wants
// =============================================================================

import React, { useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Target, Calendar, GripVertical, MoreHorizontal, Trash2, Image, Sparkles, Edit2, Check, X } from 'lucide-react';
import {
  getAllWants,
  updateWant,
  deleteWant,
  getStepCompletionPercentage,
  subscribe,
  getSnapshot,
  getAllStages,
  addStage,
  updateStage,
  subscribeToStages,
  getStagesSnapshot,
  type Want,
  type WantStatus,
  type WantStage,
} from '../../services/wantStore';
import { getCongruencyScore } from '../../services/wantScopeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CongruencyBadge } from '../ui/CongruencyBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { cn } from '@/lib/utils';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

interface WantBoardViewProps {
  onSelectWant?: (wantId: string) => void;
  /** Callback for New Want - opens Little Lord for validation (NEVER direct create) */
  onNewWant?: () => void;
}

// COLUMNS are now dynamic - loaded from store via getAllStages()
// The old ColumnConfig is replaced by WantStage from the store

// =============================================================================
// SORTABLE WANT CARD
// =============================================================================

interface SortableWantCardProps {
  want: Want;
  onClick: () => void;
  onStatusChange: (status: WantStatus) => void;
  onDelete: () => void;
}

const SortableWantCard: React.FC<SortableWantCardProps> = ({
  want,
  onClick,
  onStatusChange,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: want.id });

  const [showMenu, setShowMenu] = useState(false);
  const completionPct = getStepCompletionPercentage(want.id);
  const congruency = getCongruencyScore(want.id);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <MotionDiv
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: isDragging ? 0.7 : 1,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : 'none'
      }}
      whileHover={{ scale: 1.01, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
      transition={{ duration: 0.15 }}
      className={cn(
        "bg-[#0A0A0F] border border-[#0043ff]/20 rounded-xl overflow-hidden cursor-pointer hover:border-[#0043ff]/50 group relative",
        isDragging && "ring-2 ring-[#0043ff]/40"
      )}
      onClick={onClick}
    >
      {/* Cover Image Preview */}
      {want.coverImageUrl && (
        <div className="h-16 w-full overflow-hidden">
          <img
            src={want.coverImageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Card Content */}
      <div className="p-3">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} className="text-muted-foreground" />
        </div>

        {/* Menu button */}
        <div className="absolute right-2 top-2 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-sm"
          >
            <MoreHorizontal size={14} className="text-muted-foreground" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
              />
              <MotionDiv
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 top-6 bg-[#0E0E16] border border-[#0043ff]/30 rounded-lg shadow-xl z-50 py-1 min-w-[120px]"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onStatusChange('not_started'); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-foreground/80 hover:bg-[#0043ff]/20 flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Not Started
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onStatusChange('in_progress'); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-foreground/80 hover:bg-[#0043ff]/20 flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  In Progress
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onStatusChange('done'); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-foreground/80 hover:bg-[#0043ff]/20 flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Done
                </button>
                <div className="border-t border-[#0043ff]/20 my-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </MotionDiv>
            </>
          )}
        </div>

        {/* Content */}
        <div className="pl-4">
          {/* Title row with congruency badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-foreground pr-4 leading-snug">{want.title}</h4>
            <CongruencyBadge score={congruency} size="sm" />
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{want.reason}</p>

          {/* Progress bar */}
          {want.steps.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{completionPct}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-2">
              {want.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date(want.deadline).toLocaleDateString()}
                </span>
              )}
            </div>
            <span>{want.steps.length} steps</span>
          </div>
        </div>
      </div>
    </MotionDiv>
  );
};

// =============================================================================
// WANT CARD (FOR DRAG OVERLAY)
// =============================================================================

const WantCard: React.FC<{ want: Want }> = ({ want }) => {
  const completionPct = getStepCompletionPercentage(want.id);

  return (
    <div className="bg-[#0A0A0F] border border-[#0043ff]/40 rounded-lg p-3 shadow-xl w-[300px]">
      <div className="pl-4">
        <h4 className="text-sm font-medium text-foreground mb-1">{want.title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{want.reason}</p>
        {want.steps.length > 0 && (
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// DROPPABLE COLUMN
// =============================================================================

interface DroppableColumnProps {
  stage: WantStage;
  wants: Want[];
  onSelectWant: (wantId: string) => void;
  onStatusChange: (wantId: string, status: WantStatus) => void;
  onDeleteWant: (wantId: string) => void;
  /** Opens Little Lord for new Want creation (doctrine: no direct creates) */
  onNewWant?: () => void;
  onRenameStage?: (stageId: string, newLabel: string) => void;
  isOver?: boolean;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
  stage,
  wants,
  onSelectWant,
  onStatusChange,
  onDeleteWant,
  onNewWant,
  onRenameStage,
  isOver,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(stage.label);

  // Make the column itself a droppable target using the stage ID
  const { setNodeRef, isOver: isDropOver } = useDroppable({
    id: `column-${stage.mappedStatus}`,
    data: { type: 'column', status: stage.mappedStatus, stageId: stage.id },
  });

  const columnIsOver = isOver || isDropOver;

  const handleSaveRename = () => {
    if (editLabel.trim() && editLabel !== stage.label) {
      onRenameStage?.(stage.id, editLabel.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[280px] max-w-[350px] rounded-lg transition-colors",
        columnIsOver && "bg-primary/10 ring-2 ring-primary/30"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-[#0E0E16] border border-[#0043ff]/20 group">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="flex-1 bg-background border border-[#0043ff]/30 rounded px-2 py-0.5 text-sm text-foreground focus:outline-none focus:border-[#0043ff]"
                autoFocus
              />
              <button onClick={handleSaveRename} className="p-0.5 hover:bg-muted rounded">
                <Check size={12} className="text-green-500" />
              </button>
              <button onClick={() => setIsEditing(false)} className="p-0.5 hover:bg-muted rounded">
                <X size={12} className="text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-medium text-foreground truncate">{stage.label}</h3>
              <span className="text-xs text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded shrink-0">
                {wants.length}
              </span>
              {/* Edit button - only show on hover and for non-default stages or all stages */}
              <button
                onClick={() => { setEditLabel(stage.label); setIsEditing(true); }}
                className="p-0.5 hover:bg-muted/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Rename stage"
              >
                <Edit2 size={10} className="text-muted-foreground" />
              </button>
            </>
          )}
        </div>
        {/* New Want button - opens Little Lord for validation */}
        {onNewWant && !isEditing && (
          <button
            onClick={onNewWant}
            className="p-1 hover:bg-muted/80 rounded transition-colors"
            title="New Want (via Little Lord)"
          >
            <Plus size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Cards */}
      <SortableContext
        items={wants.map(w => w.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[200px] p-1">
          {wants.map(want => (
            <SortableWantCard
              key={want.id}
              want={want}
              onClick={() => onSelectWant(want.id)}
              onStatusChange={(status) => onStatusChange(want.id, status)}
              onDelete={() => onDeleteWant(want.id)}
            />
          ))}

          {wants.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-[#0043ff]/20 rounded-lg">
              Drag wants here or click + to add
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
// DOCTRINE: New Wants MUST go through Little Lord for validation.
// The WantBoardView no longer has direct create capability.
// Instead, it receives an onNewWant callback from parent that opens Little Lord.
// =============================================================================

export const WantBoardView: React.FC<WantBoardViewProps> = ({ onSelectWant, onNewWant }) => {
  // Subscribe to store changes for reactivity
  const wants = useSyncExternalStore(subscribe, getSnapshot);
  // Subscribe to stages for dynamic columns
  useSyncExternalStore(subscribeToStages, getStagesSnapshot);
  const stages = getAllStages();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // DOCTRINE: New Wants MUST go through Little Lord for validation
  // No direct createWant calls from UI are allowed

  const handleStatusChange = (wantId: string, status: WantStatus) => {
    updateWant(wantId, { status });
  };

  const handleDeleteWant = (wantId: string) => {
    if (window.confirm('Are you sure you want to delete this Want?')) {
      deleteWant(wantId);
    }
  };

  const handleSelectWant = (wantId: string) => {
    onSelectWant?.(wantId);
  };

  const handleRenameStage = (stageId: string, newLabel: string) => {
    updateStage(stageId, { label: newLabel });
  };

  const handleAddStage = () => {
    if (newStageName.trim()) {
      addStage({ label: newStageName.trim(), color: '#8B5CF6' });
      setNewStageName('');
      setShowAddStage(false);
    }
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // Determine which column we're over
      const overId = String(over.id);

      // Check if over a column droppable zone
      if (overId.startsWith('column-')) {
        setOverColumnId(overId.replace('column-', '') as WantStatus);
      } else {
        // Check if over a stage by ID
        const stage = stages.find(s => s.id === overId || s.mappedStatus === overId);
        if (stage) {
          setOverColumnId(stage.mappedStatus);
        } else {
          // Check if over a want in a specific column
          const overWant = wants.find(w => w.id === overId);
          if (overWant) {
            setOverColumnId(overWant.status);
          }
        }
      }
    } else {
      setOverColumnId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const activeWant = wants.find(w => w.id === active.id);
      if (!activeWant) return;

      // Determine target status
      let targetStatus: WantStatus | null = null;

      const overId = String(over.id);

      // Check if dropped on a column (droppable zone)
      if (overId.startsWith('column-')) {
        targetStatus = overId.replace('column-', '') as WantStatus;
      } else {
        // Check if dropped on a stage by ID
        const stage = stages.find(s => s.id === overId || s.mappedStatus === overId);
        if (stage) {
          targetStatus = stage.mappedStatus;
        } else {
          // Check if dropped on another want
          const overWant = wants.find(w => w.id === overId);
          if (overWant) {
            targetStatus = overWant.status;
          }
        }
      }

      // Update status if changed
      if (targetStatus && targetStatus !== activeWant.status) {
        updateWant(activeWant.id, { status: targetStatus });
      }
    }

    setActiveId(null);
    setOverColumnId(null);
  };

  const activeWant = activeId ? wants.find(w => w.id === activeId) : null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Board - Header now in WantsBanner */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-h-full">
            {stages.map(stage => (
              <DroppableColumn
                key={stage.id}
                stage={stage}
                wants={wants.filter(w => w.status === stage.mappedStatus)}
                onSelectWant={handleSelectWant}
                onStatusChange={handleStatusChange}
                onDeleteWant={handleDeleteWant}
                onNewWant={onNewWant}
                onRenameStage={handleRenameStage}
                isOver={overColumnId === stage.mappedStatus}
              />
            ))}

            {/* Add Stage Column */}
            <div className="min-w-[200px] shrink-0">
              {showAddStage ? (
                <div className="bg-[#0E0E16] border border-dashed border-[#0043ff]/20 rounded-lg p-3">
                  <input
                    type="text"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddStage();
                      if (e.key === 'Escape') { setShowAddStage(false); setNewStageName(''); }
                    }}
                    placeholder="Stage name"
                    className="w-full bg-background border border-[#0043ff]/30 rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-[#0043ff] mb-2"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleAddStage}
                      className="flex-1 px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setShowAddStage(false); setNewStageName(''); }}
                      className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddStage(true)}
                  className="w-full h-12 border border-dashed border-[#0043ff]/20 rounded-lg flex items-center justify-center gap-2 text-muted-foreground text-sm hover:bg-muted/30 hover:border-[#0043ff]/40 transition-colors"
                >
                  <Plus size={14} />
                  Add Stage
                </button>
              )}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeWant ? <WantCard want={activeWant} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

    </div>
  );
};

export default WantBoardView;
