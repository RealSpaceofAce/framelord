// =============================================================================
// SUCCESS TRACKING — Notion-style metrics logging table for Wants
// =============================================================================
// Features:
// - Date-based entries (add daily progress)
// - Custom columns: Hours Worked, Income, Sleep, Workout, Nutrition, etc.
// - AVERAGE/SUM calculations at bottom
// - Inline editing
// - Chart visualization for selected metrics
// =============================================================================

import React, { useState, useMemo } from 'react';
import { Plus, Calendar, TrendingUp, Check, X, MoreHorizontal, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

type ColumnType = 'date' | 'day' | 'number' | 'currency' | 'checkbox' | 'text';

interface TrackingColumn {
  id: string;
  label: string;
  type: ColumnType;
  unit?: string;
  aggregation?: 'sum' | 'average' | 'count' | 'none';
  width?: number;
}

interface TrackingEntry {
  id: string;
  date: string; // ISO date string
  values: Record<string, number | boolean | string>;
}

interface SuccessTrackingProps {
  /** Optional Want ID to scope tracking to */
  wantId?: string;
  /** Title for the tracking table */
  title?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
}

// =============================================================================
// DEFAULT COLUMNS
// =============================================================================

const DEFAULT_COLUMNS: TrackingColumn[] = [
  { id: 'date', label: 'Date', type: 'date', aggregation: 'none', width: 120 },
  { id: 'day', label: 'Day', type: 'day', aggregation: 'none', width: 60 },
  { id: 'hours_worked', label: 'Hours Worked', type: 'number', unit: 'hrs', aggregation: 'average', width: 100 },
  { id: 'income', label: 'Income', type: 'currency', unit: '$', aggregation: 'sum', width: 100 },
  { id: 'hours_sleep', label: 'Hours of Sleep', type: 'number', unit: 'hrs', aggregation: 'average', width: 100 },
  { id: 'workout', label: 'Workout', type: 'checkbox', aggregation: 'count', width: 80 },
  { id: 'calories', label: 'Calories', type: 'number', aggregation: 'average', width: 80 },
  { id: 'weight', label: 'Weight', type: 'number', unit: 'lbs', aggregation: 'average', width: 80 },
];

// =============================================================================
// DEMO DATA
// =============================================================================

const generateDemoData = (): TrackingEntry[] => {
  const entries: TrackingEntry[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    entries.push({
      id: `entry-${i}`,
      date: date.toISOString().split('T')[0],
      values: {
        hours_worked: Math.floor(Math.random() * 6) + 4,
        income: Math.floor(Math.random() * 500) + 100,
        hours_sleep: Math.floor(Math.random() * 4) + 5,
        workout: Math.random() > 0.4,
        calories: Math.floor(Math.random() * 800) + 1600,
        weight: Math.floor(Math.random() * 10) + 175,
      },
    });
  }

  return entries;
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getDayOfWeek = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const formatValue = (value: number | boolean | string | undefined, column: TrackingColumn): string => {
  if (value === undefined || value === null) return '-';

  if (column.type === 'checkbox') {
    return ''; // Handled by checkbox render
  }

  if (column.type === 'currency') {
    return `$${Number(value).toFixed(2)}`;
  }

  if (column.type === 'number') {
    return String(value);
  }

  return String(value);
};

const calculateAggregation = (
  entries: TrackingEntry[],
  columnId: string,
  aggregation: 'sum' | 'average' | 'count' | 'none'
): string => {
  if (aggregation === 'none') return '';

  const values = entries
    .map(e => e.values[columnId])
    .filter(v => v !== undefined && v !== null);

  if (values.length === 0) return '-';

  if (aggregation === 'count') {
    const count = values.filter(v => v === true).length;
    return `${count}/${values.length}`;
  }

  const numericValues = values.filter(v => typeof v === 'number') as number[];
  if (numericValues.length === 0) return '-';

  const sum = numericValues.reduce((a, b) => a + b, 0);

  if (aggregation === 'sum') {
    return sum.toFixed(2);
  }

  if (aggregation === 'average') {
    return (sum / numericValues.length).toFixed(2);
  }

  return '-';
};

// =============================================================================
// COMPONENT
// =============================================================================

export const SuccessTracking: React.FC<SuccessTrackingProps> = ({
  wantId,
  title = 'Success Tracking',
  compact = false,
}) => {
  const [columns] = useState<TrackingColumn[]>(DEFAULT_COLUMNS);
  const [entries, setEntries] = useState<TrackingEntry[]>(() => generateDemoData());
  const [editingCell, setEditingCell] = useState<{ entryId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Add new entry for today
  const handleAddEntry = () => {
    const today = new Date().toISOString().split('T')[0];

    // Check if entry for today already exists
    if (entries.some(e => e.date === today)) {
      return; // Already have entry for today
    }

    const newEntry: TrackingEntry = {
      id: `entry-${Date.now()}`,
      date: today,
      values: {},
    };

    setEntries([...entries, newEntry]);
  };

  // Start editing a cell
  const handleCellClick = (entryId: string, columnId: string, currentValue: any) => {
    const column = columns.find(c => c.id === columnId);
    if (!column || column.type === 'date' || column.type === 'day') return;

    if (column.type === 'checkbox') {
      // Toggle checkbox immediately
      setEntries(entries.map(e => {
        if (e.id === entryId) {
          return {
            ...e,
            values: {
              ...e.values,
              [columnId]: !e.values[columnId],
            },
          };
        }
        return e;
      }));
      return;
    }

    setEditingCell({ entryId, columnId });
    setEditValue(currentValue?.toString() || '');
  };

  // Save edited value
  const handleSaveEdit = () => {
    if (!editingCell) return;

    const column = columns.find(c => c.id === editingCell.columnId);
    if (!column) return;

    let parsedValue: number | string = editValue;
    if (column.type === 'number' || column.type === 'currency') {
      parsedValue = parseFloat(editValue) || 0;
    }

    setEntries(entries.map(e => {
      if (e.id === editingCell.entryId) {
        return {
          ...e,
          values: {
            ...e.values,
            [editingCell.columnId]: parsedValue,
          },
        };
      }
      return e;
    }));

    setEditingCell(null);
    setEditValue('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Sort entries by date (newest first)
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries]);

  return (
    <div className={cn(
      "flex flex-col bg-[#0A0A0F] rounded-lg border border-[#0043ff]/20",
      compact ? "max-h-[400px]" : "flex-1"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#0043ff]/20">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-[#0043ff]" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddEntry}
          className="gap-1.5 text-[#0043ff] hover:bg-[#0043ff]/10"
        >
          <Plus size={14} />
          New Entry
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          {/* Column Headers */}
          <thead className="sticky top-0 bg-[#0E0E16] z-10">
            <tr>
              {columns.map(column => (
                <th
                  key={column.id}
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground border-b border-[#0043ff]/10"
                  style={{ minWidth: column.width }}
                >
                  <div className="flex items-center gap-1">
                    {column.type === 'date' && <Calendar size={12} />}
                    {column.label}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 w-10 border-b border-[#0043ff]/10">
                <MoreHorizontal size={14} className="text-muted-foreground" />
              </th>
            </tr>
          </thead>

          {/* Data Rows */}
          <tbody>
            {sortedEntries.map(entry => (
              <tr key={entry.id} className="hover:bg-[#0043ff]/5 border-b border-[#0043ff]/5">
                {columns.map(column => {
                  const isEditing = editingCell?.entryId === entry.id && editingCell?.columnId === column.id;
                  let cellValue: any;

                  if (column.id === 'date') {
                    cellValue = formatDate(entry.date);
                  } else if (column.id === 'day') {
                    cellValue = getDayOfWeek(entry.date);
                  } else {
                    cellValue = entry.values[column.id];
                  }

                  return (
                    <td
                      key={column.id}
                      className={cn(
                        "px-3 py-2 text-foreground/80",
                        column.type !== 'date' && column.type !== 'day' && "cursor-pointer hover:bg-[#0043ff]/10"
                      )}
                      onClick={() => handleCellClick(entry.id, column.id, cellValue)}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type={column.type === 'number' || column.type === 'currency' ? 'number' : 'text'}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="w-full px-2 py-1 bg-[#0E0E16] border border-[#0043ff]/30 rounded text-foreground text-sm focus:outline-none focus:border-[#0043ff]"
                            autoFocus
                          />
                          <button onClick={handleSaveEdit} className="p-1 hover:bg-green-500/20 rounded">
                            <Check size={12} className="text-green-500" />
                          </button>
                          <button onClick={handleCancelEdit} className="p-1 hover:bg-red-500/20 rounded">
                            <X size={12} className="text-red-500" />
                          </button>
                        </div>
                      ) : column.type === 'checkbox' ? (
                        <div className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center",
                          cellValue ? "bg-[#0043ff] border-[#0043ff]" : "border-muted-foreground/30"
                        )}>
                          {cellValue && <Check size={12} className="text-white" />}
                        </div>
                      ) : (
                        <span>
                          {column.type === 'currency' && cellValue !== undefined ? '$' : ''}
                          {formatValue(cellValue, column)}
                          {column.unit && cellValue !== undefined ? ` ${column.unit}` : ''}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2">
                  <button className="p-1 hover:bg-[#0043ff]/10 rounded">
                    <MoreHorizontal size={14} className="text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Aggregation Row */}
          <tfoot className="sticky bottom-0 bg-[#0E0E16]">
            <tr className="border-t border-[#0043ff]/20">
              {columns.map(column => (
                <td
                  key={column.id}
                  className="px-3 py-2 text-xs font-medium text-muted-foreground"
                >
                  {column.aggregation && column.aggregation !== 'none' ? (
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-muted-foreground/60">
                        {column.aggregation === 'count' ? 'CHECK' : column.aggregation.toUpperCase()}
                      </span>
                      <span className="text-foreground/80">
                        {column.type === 'currency' ? '$' : ''}
                        {calculateAggregation(entries, column.id, column.aggregation)}
                      </span>
                    </div>
                  ) : null}
                </td>
              ))}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Entries Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start tracking your daily progress</p>
            <Button variant="brand" size="sm" onClick={handleAddEntry}>
              <Plus size={14} className="mr-1.5" />
              Add First Entry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessTracking;
