// =============================================================================
// KANBAN COLUMN — Droppable column for DnD kanban board
// =============================================================================

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: React.ReactNode;
  itemIds: string[];
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  color,
  count,
  children,
  itemIds,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full bg-[#111] rounded-lg border transition-colors ${
        isOver ? 'border-[#4433FF] bg-[#4433FF]/5' : 'border-[#222]'
      }`}
    >
      {/* Column Header */}
      <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-gray-200">{title}</span>
        </div>
        <span className="text-xs text-gray-500 bg-[#222] px-1.5 py-0.5 rounded">
          {count}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-2 overflow-y-auto min-h-[200px]">
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">{children}</div>
        </SortableContext>
      </div>
    </div>
  );
};

export default KanbanColumn;
