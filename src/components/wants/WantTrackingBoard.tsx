// =============================================================================
// WANT TRACKING BOARD — Daily metrics grid UI
// =============================================================================
// Displays a grid of metrics x dates with editable cells.
// - Number metrics: numeric inputs with inline editing
// - Boolean metrics: checkboxes for yes/no tracking
// - Summary row: computed stats (sum/avg, streak, completion rate)
// =============================================================================

import React, { useState, useCallback, useSyncExternalStore, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
  Target,
  Flame,
  TrendingUp,
  Check,
  Sigma,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import * as wantTrackingStore from '../../services/wantTrackingStore';
import { WantMetric, WantDayEntry } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

interface WantTrackingBoardProps {
  theme?: 'light' | 'gray' | 'dark';
  onConfigureMetrics?: () => void;
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
        success: '#22c55e',
        warning: '#f59e0b',
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
        success: '#22c55e',
        warning: '#f59e0b',
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
        success: '#22c55e',
        warning: '#f59e0b',
      };
  }
};

// =============================================================================
// EDITABLE NUMBER CELL
// =============================================================================

interface NumberCellProps {
  metric: WantMetric;
  date: string;
  value: number | null | undefined;
  colors: ReturnType<typeof getColors>;
}

const NumberCell: React.FC<NumberCellProps> = ({
  metric,
  date,
  value,
  colors,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() || '');

  const handleClick = () => {
    setInputValue(value?.toString() || '');
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      wantTrackingStore.setValue(date, metric.slug, numValue);
    } else if (inputValue === '' && value !== undefined && value !== null) {
      wantTrackingStore.clearValue(date, metric.slug);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // Determine cell styling based on value vs goal
  const isGoalMet = (() => {
    if (value === null || value === undefined) return false;
    switch (metric.goalType) {
      case 'at_least': return value >= metric.goalValue;
      case 'at_most': return value <= metric.goalValue;
      case 'exact': return value === metric.goalValue;
      default: return false;
    }
  })();

  const hasValue = value !== null && value !== undefined;
  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;
  const isFuture = date > today;

  return (
    <div
      onClick={handleClick}
      className="relative flex items-center justify-center transition-all cursor-pointer group"
      style={{
        minWidth: '44px',
        height: '32px',
        background: isGoalMet
          ? `${colors.success}15`
          : hasValue
          ? `${colors.accent}10`
          : isToday
          ? `${colors.accent}08`
          : 'transparent',
        borderRadius: '4px',
        border: isToday ? `1px solid ${colors.accent}40` : '1px solid transparent',
        opacity: isFuture ? 0.5 : 1,
      }}
    >
      {isEditing ? (
        <input
          type="number"
          min="0"
          step="any"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full h-full text-center bg-transparent outline-none"
          style={{
            color: colors.text,
            fontSize: '12px',
          }}
        />
      ) : (
        <>
          {hasValue ? (
            <span
              className="text-xs font-medium"
              style={{
                color: isGoalMet ? colors.success : colors.text,
              }}
            >
              {value}
            </span>
          ) : (
            <span
              className="text-xs opacity-0 group-hover:opacity-50 transition-opacity"
              style={{ color: colors.textMuted }}
            >
              +
            </span>
          )}
          {isGoalMet && (
            <div
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ background: colors.success }}
            />
          )}
        </>
      )}
    </div>
  );
};

// =============================================================================
// BOOLEAN (CHECKBOX) CELL
// =============================================================================

interface BooleanCellProps {
  metric: WantMetric;
  date: string;
  value: boolean | null | undefined;
  colors: ReturnType<typeof getColors>;
}

const BooleanCell: React.FC<BooleanCellProps> = ({
  metric,
  date,
  value,
  colors,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;
  const isFuture = date > today;
  const isChecked = value === true;

  const handleToggle = () => {
    if (isFuture) return;
    wantTrackingStore.setValue(date, metric.slug, !isChecked);
  };

  return (
    <div
      onClick={handleToggle}
      className="relative flex items-center justify-center transition-all cursor-pointer group"
      style={{
        minWidth: '44px',
        height: '32px',
        background: isChecked
          ? `${colors.success}20`
          : isToday
          ? `${colors.accent}08`
          : 'transparent',
        borderRadius: '4px',
        border: isToday ? `1px solid ${colors.accent}40` : '1px solid transparent',
        opacity: isFuture ? 0.5 : 1,
      }}
    >
      {isChecked ? (
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{ background: metric.color || colors.success }}
        >
          <Check size={12} className="text-white" />
        </div>
      ) : (
        <div
          className="w-5 h-5 rounded border-2 opacity-30 group-hover:opacity-60 transition-opacity"
          style={{ borderColor: colors.textMuted }}
        />
      )}
    </div>
  );
};

// =============================================================================
// METRIC ROW COMPONENT
// =============================================================================

interface MetricRowProps {
  metric: WantMetric;
  dates: string[];
  days: WantDayEntry[];
  colors: ReturnType<typeof getColors>;
}

const MetricRow: React.FC<MetricRowProps> = ({ metric, dates, days, colors }) => {
  const selectedMonth = wantTrackingStore.getSelectedMonth();
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const stats = wantTrackingStore.getMetricStats(metric.slug, startDate, endDate);
  const streak = wantTrackingStore.getStreak(metric.slug);

  // Build lookup for day values
  const valuesByDate: Record<string, number | boolean | null | undefined> = {};
  days.forEach(day => {
    valuesByDate[day.date] = day.values[metric.slug];
  });

  // Calculate completion rate
  const completionRate = (() => {
    if (stats.totalDays === 0) return 0;
    if (metric.type === 'boolean') {
      return Math.round((stats.checkedCount / stats.totalDays) * 100);
    }
    // For numbers, count days where goal was met
    let metGoalCount = 0;
    days.forEach(day => {
      const val = day.values[metric.slug];
      if (typeof val === 'number') {
        const met = metric.goalType === 'at_least' ? val >= metric.goalValue
          : metric.goalType === 'at_most' ? val <= metric.goalValue
          : metric.goalType === 'exact' ? val === metric.goalValue
          : false;
        if (met) metGoalCount++;
      }
    });
    return Math.round((metGoalCount / stats.totalDays) * 100);
  })();

  // Get display value for sum/avg column
  const getSumAvgDisplay = () => {
    if (metric.type === 'boolean') {
      return `${stats.checkedCount}d`;
    }
    return metric.goalType === 'exact'
      ? `Ø ${stats.avg.toFixed(1)}`
      : `Σ ${stats.sum.toFixed(stats.sum % 1 === 0 ? 0 : 1)}`;
  };

  return (
    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
      {/* Metric Label */}
      <td
        className="sticky left-0 z-10 px-3 py-2"
        style={{
          background: colors.bg,
          minWidth: '140px',
          maxWidth: '180px',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: metric.color || colors.accent }}
          />
          <div className="flex flex-col min-w-0">
            <span
              className="text-sm font-medium truncate"
              style={{ color: colors.text }}
            >
              {metric.name}
            </span>
            <span
              className="text-xs"
              style={{ color: colors.textMuted }}
            >
              {metric.type === 'boolean'
                ? `${metric.goalValue}d/week`
                : `${metric.goalType === 'at_least' ? '≥' : metric.goalType === 'at_most' ? '≤' : '='} ${metric.goalValue}${metric.unit ? ' ' + metric.unit : ''}`
              }
            </span>
          </div>
        </div>
      </td>

      {/* Day Cells */}
      {dates.map((date) => (
        <td key={date} className="px-0.5 py-1">
          {metric.type === 'boolean' ? (
            <BooleanCell
              metric={metric}
              date={date}
              value={valuesByDate[date] as boolean | null | undefined}
              colors={colors}
            />
          ) : (
            <NumberCell
              metric={metric}
              date={date}
              value={valuesByDate[date] as number | null | undefined}
              colors={colors}
            />
          )}
        </td>
      ))}

      {/* Stats Columns */}
      <td className="px-2 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <Flame size={12} style={{ color: streak > 0 ? colors.warning : colors.textMuted }} />
          <span
            className="text-xs font-medium"
            style={{ color: streak > 0 ? colors.warning : colors.textMuted }}
          >
            {streak}
          </span>
        </div>
      </td>
      <td className="px-2 py-2 text-center">
        <span className="text-xs font-medium" style={{ color: colors.text }}>
          {getSumAvgDisplay()}
        </span>
      </td>
      <td className="px-2 py-2 text-center">
        <span
          className="text-xs font-medium"
          style={{
            color: completionRate >= 80 ? colors.success : completionRate >= 50 ? colors.warning : colors.textMuted,
          }}
        >
          {completionRate}%
        </span>
      </td>
    </tr>
  );
};

// =============================================================================
// SUMMARY ROW COMPONENT
// =============================================================================

interface SummaryRowProps {
  metrics: WantMetric[];
  dates: string[];
  days: WantDayEntry[];
  colors: ReturnType<typeof getColors>;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ metrics, dates, days, colors }) => {
  const today = new Date().toISOString().slice(0, 10);

  // Build lookup for all days
  const daysByDate: Record<string, WantDayEntry> = {};
  days.forEach(day => {
    daysByDate[day.date] = day;
  });

  // Calculate daily completion for each date
  const getDailyCompletion = (date: string) => {
    if (date > today) return null;
    const day = daysByDate[date];
    if (!day) return 0;

    let completed = 0;
    metrics.forEach(metric => {
      const val = day.values[metric.slug];
      if (metric.type === 'boolean') {
        if (val === true) completed++;
      } else if (typeof val === 'number') {
        const met = metric.goalType === 'at_least' ? val >= metric.goalValue
          : metric.goalType === 'at_most' ? val <= metric.goalValue
          : metric.goalType === 'exact' ? val === metric.goalValue
          : false;
        if (met) completed++;
      }
    });
    return Math.round((completed / metrics.length) * 100);
  };

  // Calculate overall stats
  const totalStreak = metrics.reduce((sum, m) => sum + wantTrackingStore.getStreak(m.slug), 0);
  const avgStreak = metrics.length > 0 ? Math.round(totalStreak / metrics.length) : 0;

  // Overall completion rate
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  let totalGoalMet = 0;
  let totalPossible = 0;
  metrics.forEach(metric => {
    const stats = wantTrackingStore.getMetricStats(metric.slug, startDate, endDate);
    totalPossible += stats.totalDays;
    if (metric.type === 'boolean') {
      totalGoalMet += stats.checkedCount;
    } else {
      days.forEach(day => {
        if (day.date <= today) {
          const val = day.values[metric.slug];
          if (typeof val === 'number') {
            const met = metric.goalType === 'at_least' ? val >= metric.goalValue
              : metric.goalType === 'at_most' ? val <= metric.goalValue
              : metric.goalType === 'exact' ? val === metric.goalValue
              : false;
            if (met) totalGoalMet++;
          }
        }
      });
    }
  });
  const overallRate = totalPossible > 0 ? Math.round((totalGoalMet / totalPossible) * 100) : 0;

  return (
    <tr style={{ borderTop: `2px solid ${colors.border}`, background: colors.bgAlt }}>
      {/* Summary Label */}
      <td
        className="sticky left-0 z-10 px-3 py-2"
        style={{ background: colors.bgAlt }}
      >
        <div className="flex items-center gap-2">
          <Sigma size={14} style={{ color: colors.accent }} />
          <span className="text-sm font-semibold" style={{ color: colors.text }}>
            Daily Score
          </span>
        </div>
      </td>

      {/* Daily Completion Cells */}
      {dates.map((date) => {
        const completion = getDailyCompletion(date);
        const isFuture = date > today;

        return (
          <td key={date} className="px-0.5 py-1">
            <div
              className="flex items-center justify-center"
              style={{
                minWidth: '44px',
                height: '32px',
                borderRadius: '4px',
                background: completion === 100
                  ? `${colors.success}20`
                  : completion !== null && completion >= 50
                  ? `${colors.warning}15`
                  : 'transparent',
                opacity: isFuture ? 0.3 : 1,
              }}
            >
              {completion !== null && (
                <span
                  className="text-xs font-medium"
                  style={{
                    color: completion === 100
                      ? colors.success
                      : completion >= 50
                      ? colors.warning
                      : colors.textMuted,
                  }}
                >
                  {completion}%
                </span>
              )}
            </div>
          </td>
        );
      })}

      {/* Summary Stats */}
      <td className="px-2 py-2 text-center">
        <span className="text-xs font-medium" style={{ color: colors.warning }}>
          Ø {avgStreak}
        </span>
      </td>
      <td className="px-2 py-2 text-center">
        <span className="text-xs font-medium" style={{ color: colors.text }}>
          —
        </span>
      </td>
      <td className="px-2 py-2 text-center">
        <span
          className="text-xs font-bold"
          style={{
            color: overallRate >= 80 ? colors.success : overallRate >= 50 ? colors.warning : colors.textMuted,
          }}
        >
          {overallRate}%
        </span>
      </td>
    </tr>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WantTrackingBoard: React.FC<WantTrackingBoardProps> = ({
  theme = 'dark',
  onConfigureMetrics,
}) => {
  const colors = getColors(theme);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Subscribe to store
  useSyncExternalStore(
    wantTrackingStore.subscribe,
    wantTrackingStore.getSnapshot
  );

  // Seed default metrics on first render if empty
  useEffect(() => {
    wantTrackingStore.seedDefaultMetrics();
  }, []);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen]);

  const selectedMonth = wantTrackingStore.getSelectedMonth();
  const { dates, metrics, days } = wantTrackingStore.getBoardData();

  // Month navigation
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    wantTrackingStore.setSelectedMonth(
      `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`
    );
  }, [selectedMonth]);

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Format date header
  const formatDateHeader = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    const day = d.getDate();
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
    return { day, dayName };
  };

  const today = new Date().toISOString().slice(0, 10);

  // Board content - rendered either inline or in portal
  const boardContent = (
    <div
      className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}
      style={{ background: colors.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: colors.border }}
      >
        {/* Title + Month Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} style={{ color: colors.accent }} />
            <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
              Want Tracking
            </h2>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: colors.textMuted }}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium min-w-[140px] text-center" style={{ color: colors.textMuted }}>
              {formatMonth(selectedMonth)}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: colors.textMuted }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Actions - Configure button ALWAYS visible */}
        <div className="flex items-center gap-2">
          {onConfigureMetrics && (
            <button
              onClick={onConfigureMetrics}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
              style={{
                background: colors.bgAlt,
                color: colors.textMuted,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Settings size={14} />
              Configure Metrics
            </button>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: colors.textMuted }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Board */}
      {metrics.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Target size={48} style={{ color: colors.textMuted }} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2" style={{ color: colors.text }}>
              No metrics yet
            </p>
            <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
              Add metrics to start tracking your daily habits
            </p>
            {onConfigureMetrics && (
              <button
                onClick={onConfigureMetrics}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mx-auto transition-colors hover:opacity-90"
                style={{
                  background: '#0043ff',
                  color: '#fff',
                }}
              >
                <Plus size={16} />
                Add Your First Metric
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {/* Metric Column Header */}
                <th
                  className="sticky left-0 z-20 px-3 py-2 text-left"
                  style={{
                    background: colors.bgAlt,
                    minWidth: '140px',
                  }}
                >
                  <span className="text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>
                    Metric
                  </span>
                </th>

                {/* Date Headers */}
                {dates.map((date) => {
                  const { day, dayName } = formatDateHeader(date);
                  const isToday = date === today;
                  const d = new Date(date + 'T00:00:00');
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                  return (
                    <th
                      key={date}
                      className="px-0.5 py-2 text-center"
                      style={{
                        background: isToday ? `${colors.accent}15` : isWeekend ? `${colors.border}50` : colors.bgAlt,
                        minWidth: '44px',
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className="text-[10px] uppercase"
                          style={{ color: isToday ? colors.accent : colors.textMuted }}
                        >
                          {dayName}
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: isToday ? colors.accent : colors.text }}
                        >
                          {day}
                        </span>
                      </div>
                    </th>
                  );
                })}

                {/* Stats Headers */}
                <th className="px-2 py-2 text-center" style={{ background: colors.bgAlt }} title="Streak">
                  <Flame size={12} style={{ color: colors.textMuted }} className="mx-auto" />
                </th>
                <th className="px-2 py-2 text-center" style={{ background: colors.bgAlt }} title="Sum/Avg">
                  <TrendingUp size={12} style={{ color: colors.textMuted }} className="mx-auto" />
                </th>
                <th className="px-2 py-2 text-center" style={{ background: colors.bgAlt }} title="Completion %">
                  <Target size={12} style={{ color: colors.textMuted }} className="mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <MetricRow
                  key={metric.id}
                  metric={metric}
                  dates={dates}
                  days={days}
                  colors={colors}
                />
              ))}
              {/* Summary Row */}
              <SummaryRow
                metrics={metrics}
                dates={dates}
                days={days}
                colors={colors}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render via portal when fullscreen, otherwise inline
  return isFullscreen
    ? createPortal(boardContent, document.body)
    : boardContent;
};

export default WantTrackingBoard;
