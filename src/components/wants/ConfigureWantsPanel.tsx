// =============================================================================
// CONFIGURE WANTS PANEL — Manage tracking metrics
// =============================================================================
// Settings panel for adding, editing, reordering, and deleting metrics.
// Supports the full WantMetric spec: name, type, unit, goalType, goalValue
// =============================================================================

import React, { useState, useSyncExternalStore } from 'react';
import {
  X,
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  Check,
  Target,
  Hash,
  ToggleLeft,
} from 'lucide-react';
import * as wantTrackingStore from '../../services/wantTrackingStore';
import { WantMetric, WantGoalType, WantMetricType } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

interface ConfigureWantsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'gray' | 'dark';
}

// =============================================================================
// THEME COLORS
// =============================================================================

const getColors = (theme: 'light' | 'gray' | 'dark') => {
  switch (theme) {
    case 'light':
      return {
        bg: '#ffffff',
        bgAlt: '#f9fafb',
        text: '#1f2937',
        textMuted: '#6b7280',
        border: '#e5e7eb',
        hover: '#f3f4f6',
        accent: '#6366f1',
        danger: '#ef4444',
      };
    case 'gray':
      return {
        bg: '#1f2023',
        bgAlt: '#17181c',
        text: '#e5e7eb',
        textMuted: '#9ca3af',
        border: '#2d2f36',
        hover: '#2d2f36',
        accent: '#6366f1',
        danger: '#ef4444',
      };
    case 'dark':
    default:
      return {
        bg: '#0f0f10',
        bgAlt: '#0a0a0b',
        text: '#f3f4f6',
        textMuted: '#9ca3af',
        border: '#1f2023',
        hover: '#1f2023',
        accent: '#6366f1',
        danger: '#ef4444',
      };
  }
};

// =============================================================================
// COLOR PALETTE
// =============================================================================

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

// =============================================================================
// GOAL TYPE OPTIONS
// =============================================================================

const GOAL_TYPE_OPTIONS: { value: WantGoalType; label: string; description: string }[] = [
  { value: 'at_least', label: 'At Least', description: 'Goal met when value ≥ target' },
  { value: 'at_most', label: 'At Most', description: 'Goal met when value ≤ target' },
  { value: 'exact', label: 'Exact', description: 'Goal met when value = target' },
  { value: 'boolean_days_per_week', label: 'Days/Week', description: 'Track days per week (for boolean metrics)' },
];

// =============================================================================
// METRIC ITEM COMPONENT
// =============================================================================

interface MetricItemProps {
  metric: WantMetric;
  colors: ReturnType<typeof getColors>;
  onUpdate: (updates: Partial<WantMetric>) => void;
  onDelete: () => void;
}

const MetricItem: React.FC<MetricItemProps> = ({
  metric,
  colors,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(metric.name);
  const [editType, setEditType] = useState<WantMetricType>(metric.type);
  const [editGoalType, setEditGoalType] = useState<WantGoalType>(metric.goalType);
  const [editGoalValue, setEditGoalValue] = useState(metric.goalValue.toString());
  const [editUnit, setEditUnit] = useState(metric.unit || '');
  const [editColor, setEditColor] = useState(metric.color || colors.accent);

  const handleSave = () => {
    wantTrackingStore.upsertMetric({
      id: metric.id,
      name: editName,
      type: editType,
      goalType: editType === 'boolean' ? 'boolean_days_per_week' : editGoalType,
      goalValue: parseFloat(editGoalValue) || 0,
      unit: editUnit || undefined,
      color: editColor,
      isActive: metric.isActive,
      sortOrder: metric.sortOrder,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(metric.name);
    setEditType(metric.type);
    setEditGoalType(metric.goalType);
    setEditGoalValue(metric.goalValue.toString());
    setEditUnit(metric.unit || '');
    setEditColor(metric.color || colors.accent);
    setIsEditing(false);
  };

  // Get goal type display text
  const getGoalDisplay = () => {
    if (metric.type === 'boolean') {
      return `${metric.goalValue} days/week`;
    }
    const goalOption = GOAL_TYPE_OPTIONS.find(g => g.value === metric.goalType);
    return `${goalOption?.label || metric.goalType}: ${metric.goalValue}${metric.unit ? ' ' + metric.unit : ''}`;
  };

  if (isEditing) {
    return (
      <div
        className="p-3 rounded-lg mb-2"
        style={{ background: colors.bgAlt, border: `1px solid ${colors.border}` }}
      >
        {/* Name Input */}
        <div className="mb-3">
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
            Metric Name
          </label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
            }}
            placeholder="e.g., Hours Worked"
          />
        </div>

        {/* Type Selection */}
        <div className="mb-3">
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
            Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setEditType('number')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm flex-1 transition-colors"
              style={{
                background: editType === 'number' ? colors.accent : colors.bg,
                color: editType === 'number' ? '#fff' : colors.text,
                border: `1px solid ${editType === 'number' ? colors.accent : colors.border}`,
              }}
            >
              <Hash size={14} />
              Number
            </button>
            <button
              onClick={() => {
                setEditType('boolean');
                setEditGoalType('boolean_days_per_week');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm flex-1 transition-colors"
              style={{
                background: editType === 'boolean' ? colors.accent : colors.bg,
                color: editType === 'boolean' ? '#fff' : colors.text,
                border: `1px solid ${editType === 'boolean' ? colors.accent : colors.border}`,
              }}
            >
              <ToggleLeft size={14} />
              Checkbox
            </button>
          </div>
        </div>

        {/* Goal Type & Value */}
        <div className="flex gap-2 mb-3">
          {editType === 'number' && (
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                Goal Type
              </label>
              <select
                value={editGoalType}
                onChange={(e) => setEditGoalType(e.target.value as WantGoalType)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {GOAL_TYPE_OPTIONS.filter(g => g.value !== 'boolean_days_per_week').map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className={editType === 'number' ? 'flex-1' : 'flex-1'}>
            <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
              {editType === 'boolean' ? 'Days per Week Goal' : 'Goal Value'}
            </label>
            <input
              type="number"
              min="0"
              max={editType === 'boolean' ? 7 : undefined}
              value={editGoalValue}
              onChange={(e) => setEditGoalValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
              }}
              placeholder={editType === 'boolean' ? '5' : '8'}
            />
          </div>
          {editType === 'number' && (
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                Unit
              </label>
              <input
                type="text"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                }}
                placeholder="hrs, $, lbs"
              />
            </div>
          )}
        </div>

        {/* Color Picker */}
        <div className="mb-3">
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setEditColor(color)}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                style={{
                  background: color,
                  border: editColor === color ? '2px solid white' : 'none',
                  boxShadow: editColor === color ? `0 0 0 2px ${color}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
            style={{ color: colors.textMuted }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: colors.accent, color: '#fff' }}
          >
            <Check size={14} />
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg mb-2 group"
      style={{
        background: colors.bgAlt,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Drag Handle */}
      <div
        className="cursor-grab opacity-30 group-hover:opacity-100 transition-opacity"
        style={{ color: colors.textMuted }}
      >
        <GripVertical size={16} />
      </div>

      {/* Color Indicator */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ background: metric.color || colors.accent }}
      />

      {/* Label & Goal Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate" style={{ color: colors.text }}>
            {metric.name}
          </span>
          {/* Type badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: colors.border, color: colors.textMuted }}
          >
            {metric.type === 'boolean' ? '✓' : '#'}
          </span>
          {!metric.isActive && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: colors.border, color: colors.textMuted }}
            >
              Hidden
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: colors.textMuted }}>
          {getGoalDisplay()}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => wantTrackingStore.toggleMetricActive(metric.id)}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: metric.isActive ? colors.accent : colors.textMuted }}
          title={metric.isActive ? 'Hide metric' : 'Show metric'}
        >
          <Target size={14} />
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: colors.textMuted }}
          title="Edit metric"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: colors.danger }}
          title="Delete metric"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ConfigureWantsPanel: React.FC<ConfigureWantsPanelProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const colors = getColors(theme);

  // Subscribe to store
  useSyncExternalStore(
    wantTrackingStore.subscribe,
    wantTrackingStore.getSnapshot
  );

  const metrics = wantTrackingStore.getMetrics();

  // New metric form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WantMetricType>('number');
  const [newGoalType, setNewGoalType] = useState<WantGoalType>('at_least');
  const [newGoalValue, setNewGoalValue] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const handleAddMetric = () => {
    if (!newName.trim()) return;

    wantTrackingStore.upsertMetric({
      name: newName.trim(),
      type: newType,
      goalType: newType === 'boolean' ? 'boolean_days_per_week' : newGoalType,
      goalValue: parseFloat(newGoalValue) || (newType === 'boolean' ? 5 : 0),
      unit: newUnit || undefined,
      color: newColor,
    });

    // Reset form
    setNewName('');
    setNewType('number');
    setNewGoalType('at_least');
    setNewGoalValue('');
    setNewUnit('');
    setNewColor(PRESET_COLORS[0]);
    setShowAddForm(false);
  };

  const handleDeleteMetric = (metricId: string) => {
    if (confirm('Delete this metric and all its data? This cannot be undone.')) {
      wantTrackingStore.deleteMetric(metricId);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="w-full max-w-md max-h-[80vh] flex flex-col rounded-xl shadow-2xl"
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: colors.border }}
        >
          <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
            Configure Metrics
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: colors.textMuted }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Metrics List */}
          {metrics.length > 0 ? (
            <div className="mb-4">
              {metrics.map((metric) => (
                <MetricItem
                  key={metric.id}
                  metric={metric}
                  colors={colors}
                  onUpdate={() => {}} // Updates handled internally via upsertMetric
                  onDelete={() => handleDeleteMetric(metric.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target size={40} style={{ color: colors.textMuted }} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm" style={{ color: colors.textMuted }}>
                No metrics yet. Add your first one below.
              </p>
            </div>
          )}

          {/* Add New Metric */}
          {showAddForm ? (
            <div
              className="p-3 rounded-lg"
              style={{ background: colors.bgAlt, border: `1px solid ${colors.accent}` }}
            >
              <div className="mb-3">
                <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                  Metric Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                  }}
                  placeholder="e.g., Hours Worked, Workout"
                  autoFocus
                />
              </div>

              {/* Type Selection */}
              <div className="mb-3">
                <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                  Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewType('number')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm flex-1 transition-colors"
                    style={{
                      background: newType === 'number' ? colors.accent : colors.bg,
                      color: newType === 'number' ? '#fff' : colors.text,
                      border: `1px solid ${newType === 'number' ? colors.accent : colors.border}`,
                    }}
                  >
                    <Hash size={14} />
                    Number
                  </button>
                  <button
                    onClick={() => {
                      setNewType('boolean');
                      setNewGoalType('boolean_days_per_week');
                      setNewGoalValue('5');
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm flex-1 transition-colors"
                    style={{
                      background: newType === 'boolean' ? colors.accent : colors.bg,
                      color: newType === 'boolean' ? '#fff' : colors.text,
                      border: `1px solid ${newType === 'boolean' ? colors.accent : colors.border}`,
                    }}
                  >
                    <ToggleLeft size={14} />
                    Checkbox
                  </button>
                </div>
              </div>

              {/* Goal Settings */}
              <div className="flex gap-2 mb-3">
                {newType === 'number' && (
                  <div className="flex-1">
                    <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                      Goal Type
                    </label>
                    <select
                      value={newGoalType}
                      onChange={(e) => setNewGoalType(e.target.value as WantGoalType)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        background: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {GOAL_TYPE_OPTIONS.filter(g => g.value !== 'boolean_days_per_week').map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={newType === 'number' ? 'flex-1' : 'flex-1'}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                    {newType === 'boolean' ? 'Days per Week Goal' : 'Goal Value'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={newType === 'boolean' ? 7 : undefined}
                    value={newGoalValue}
                    onChange={(e) => setNewGoalValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                    placeholder={newType === 'boolean' ? '5' : '8'}
                  />
                </div>
                {newType === 'number' && (
                  <div className="flex-1">
                    <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                      Unit
                    </label>
                    <input
                      type="text"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        background: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      }}
                      placeholder="hrs, $, lbs"
                    />
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: color,
                        border: newColor === color ? '2px solid white' : 'none',
                        boxShadow: newColor === color ? `0 0 0 2px ${color}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
                  style={{ color: colors.textMuted }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMetric}
                  disabled={!newName.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: colors.accent, color: '#fff' }}
                >
                  <Plus size={14} />
                  Add Metric
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
              style={{
                background: '#0043ff',
                color: '#fff',
              }}
            >
              <Plus size={16} />
              Add New Metric
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: colors.border }}
        >
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
            style={{ background: colors.bgAlt, color: colors.text, border: `1px solid ${colors.border}` }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigureWantsPanel;
