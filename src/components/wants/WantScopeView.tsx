// =============================================================================
// WANT SCOPE VIEW — Full scope view for a Want with metrics, charts, iterations
// =============================================================================
// The Scope is the doctrinal container for a Want's progress:
// - Objective and validation status
// - Daily metrics table (Notion-style)
// - Charts for key metrics (Income, Weight)
// - Doctrine notes from Little Lord
// - Iteration log with consequences
// =============================================================================
//
// NOTION-STYLE LIGHT SURFACE:
// ---------------------------
// This view uses a white "Notion-style" inner surface while keeping the outer
// app chrome dark. The NotionCard wrapper creates contrast and a document feel.
// =============================================================================

import React, { useState, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChevronLeft,
  Target,
  Check,
  X,
  AlertTriangle,
  BookOpen,
  Zap,
  TrendingUp,
  Calendar,
  MessageSquare,
  RefreshCw,
  UserX,
  Flag,
  Lightbulb,
  Route,
  Crown,
  Plus,
  BarChart3,
  ShieldOff,
  Crosshair,
  Edit2,
} from 'lucide-react';
// Notion-style components for light surface
import { NotionCard, NotionCardContent } from '../ui/NotionCard';
import { NotionSection } from '../ui/NotionSection';
import { Badge } from '../ui/Badge';
import { cn } from '@/lib/utils';
import {
  getWantById,
  getDailyRows,
  calculateAverages,
  calculateSums,
  calculateDerivedMetrics,
  getMetricChartData,
  logMetricValue,
  addMetricType,
  subscribe as wantSubscribe,
  getSnapshot as wantGetSnapshot,
  type Want,
  type DailyMetricRow,
} from '../../services/wantStore';
import {
  getOrCreateScope,
  getScopeStats,
  updateObjective,
  getCongruencyScore,
  subscribe as scopeSubscribe,
  getSnapshot as scopeGetSnapshot,
  type WantScope,
  type ScopeIterationEntry,
  type IterationAction,
} from '../../services/wantScopeStore';
import { getContactById } from '../../services/contactStore';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

interface WantScopeViewProps {
  wantId: string;
  onBack: () => void;
}

// =============================================================================
// VALIDITY & DIRECTNESS BADGES
// =============================================================================

const ValidityBadge: React.FC<{ isValid: boolean; light?: boolean }> = ({ isValid, light = false }) => (
  <Badge variant={isValid ? (light ? 'success-light' : 'success') : (light ? 'danger-light' : 'danger')}>
    {isValid ? <Check size={12} /> : <X size={12} />}
    {isValid ? 'Valid Want' : 'Rejected Should'}
  </Badge>
);

const DirectnessBadge: React.FC<{ isDirect: boolean; light?: boolean }> = ({ isDirect, light = false }) => (
  <Badge variant={isDirect ? (light ? 'info-light' : 'info') : (light ? 'warning-light' : 'warning')}>
    {isDirect ? <Target size={12} /> : <AlertTriangle size={12} />}
    {isDirect ? 'Direct' : 'Indirect'}
  </Badge>
);

const CongruencyScoreDisplay: React.FC<{ score: number; light?: boolean }> = ({ score, light = false }) => {
  const getColor = () => {
    if (light) {
      if (score >= 70) return 'text-green-600';
      if (score >= 40) return 'text-amber-600';
      return 'text-red-600';
    }
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Congruency</span>
      <span className={`text-lg font-bold ${getColor()}`}>{score}</span>
    </div>
  );
};

// =============================================================================
// OBJECTIVE SECTION — Notion-style light surface
// =============================================================================

interface ObjectiveSectionProps {
  wantId: string;
  objective: string;
  primaryContactId: string | null;
}

const ObjectiveSection: React.FC<ObjectiveSectionProps> = ({
  wantId,
  objective,
  primaryContactId,
}) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(objective);
  const contact = primaryContactId ? getContactById(primaryContactId) : null;

  const handleSave = () => {
    if (text.trim()) {
      updateObjective(wantId, text.trim());
    }
    setEditing(false);
  };

  return (
    <div className="space-y-3">
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            rows={3}
            autoFocus
            placeholder="Define your objective..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => { setText(objective); setEditing(false); }}
              className="px-3 py-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p
          className="text-foreground cursor-pointer hover:text-foreground/80 leading-relaxed group flex items-start gap-2"
          onClick={() => setEditing(true)}
        >
          <span className="flex-1">{objective || 'Click to set objective...'}</span>
          <Edit2 size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
        </p>
      )}
      {contact && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Primary Contact:</span>
          <span className="text-primary font-medium">{contact.fullName}</span>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// METRICS TABLE — Notion-style light surface
// =============================================================================

interface MetricsTableProps {
  wantId: string;
  want: Want;
}

const MetricsTable: React.FC<MetricsTableProps> = ({ wantId, want }) => {
  const [editingCell, setEditingCell] = useState<{ date: string; metric: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');

  const rows = getDailyRows(wantId);
  const averages = calculateAverages(wantId);
  const sums = calculateSums(wantId);
  const derived = calculateDerivedMetrics(wantId);
  const metricTypes = want.metricTypes;

  // Sum metrics show sum, others show average
  const sumMetrics = ['income', 'hours_worked', 'calories', 'calories_burned'];

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Check if today already has a row
  const todayDate = getTodayDate();
  const hasTodayRow = rows.some(r => r.date === todayDate);

  // Handle "Log Today" button - creates a row for today with null values
  const handleLogToday = () => {
    if (metricTypes.length === 0) return;
    // Log a null value for the first metric to create the row
    logMetricValue(wantId, todayDate, metricTypes[0], null);
  };

  // Handle adding a new metric type
  const handleAddMetric = () => {
    if (newMetricName.trim()) {
      addMetricType(wantId, newMetricName.trim());
      setNewMetricName('');
      setShowAddMetric(false);
    }
  };

  const handleAddMetricKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddMetric();
    } else if (e.key === 'Escape') {
      setNewMetricName('');
      setShowAddMetric(false);
    }
  };

  const formatMetricName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatCellValue = (value: number | string | boolean | null, metricName: string) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (metricName === 'income') return `$${Number(value).toLocaleString()}`;
    if (metricName === 'weight') return `${value} lbs`;
    return String(value);
  };

  const handleStartEdit = (date: string, metric: string, currentValue: unknown) => {
    setEditingCell({ date, metric });
    setEditValue(currentValue !== null && currentValue !== undefined ? String(currentValue) : '');
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;

    const { date, metric } = editingCell;
    let value: number | string | boolean | null = null;

    if (editValue.trim()) {
      const num = parseFloat(editValue);
      if (!isNaN(num)) {
        value = num;
      } else if (editValue.toLowerCase() === 'true' || editValue.toLowerCase() === 'yes') {
        value = true;
      } else if (editValue.toLowerCase() === 'false' || editValue.toLowerCase() === 'no') {
        value = false;
      } else {
        value = editValue;
      }
    }

    logMetricValue(wantId, date, metric, value);
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const getSummaryValue = (metric: string): string => {
    if (sumMetrics.includes(metric)) {
      const sum = sums[metric];
      if (sum === undefined) return '-';
      if (metric === 'income') return `$${sum.toLocaleString()}`;
      return sum.toLocaleString();
    }

    if (metric === 'workout') {
      return `${derived.workoutPct}%`;
    }

    const avg = averages[metric];
    if (avg === undefined) return '-';
    if (metric === 'weight') return `${avg.toFixed(1)} lbs`;
    return avg.toFixed(1);
  };

  // Empty state when no metrics defined
  if (metricTypes.length === 0) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
        <Crown size={32} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm mb-4">No metrics defined yet.</p>
        {/* DEV ONLY: add metrics from UI; production uses Little Lord events. */}
        {showAddMetric ? (
          <div className="flex items-center gap-2 justify-center">
            <input
              type="text"
              value={newMetricName}
              onChange={(e) => setNewMetricName(e.target.value)}
              onKeyDown={handleAddMetricKeyDown}
              placeholder="Metric name (e.g., Income, Weight)"
              className="px-3 py-1.5 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-48"
              autoFocus
            />
            <button
              onClick={handleAddMetric}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90"
            >
              Add
            </button>
            <button
              onClick={() => { setNewMetricName(''); setShowAddMetric(false); }}
              className="px-3 py-1.5 text-muted-foreground text-xs hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : import.meta.env.DEV ? (
          <button
            onClick={() => setShowAddMetric(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Add Your First Metric
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">No metrics configured for this Want.</p>
        )}
      </div>
    );
  }

  // Check if deficit should be shown (both calories and calories_burned exist)
  const showDeficit = metricTypes.includes('calories') && metricTypes.includes('calories_burned');

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Table Header with Actions */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
        <span className="text-sm font-medium text-foreground">
          {rows.length} {rows.length === 1 ? 'day' : 'days'} logged
        </span>
        <div className="flex items-center gap-2">
          {/* DEV ONLY: add metrics from UI; production uses Little Lord events. */}
          {showAddMetric ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMetricName}
                onChange={(e) => setNewMetricName(e.target.value)}
                onKeyDown={handleAddMetricKeyDown}
                placeholder="Metric name"
                className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary w-28"
                autoFocus
              />
              <button
                onClick={handleAddMetric}
                className="p-1 bg-green-600 text-white rounded hover:bg-green-500"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => { setNewMetricName(''); setShowAddMetric(false); }}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            </div>
          ) : import.meta.env.DEV ? (
            <button
              onClick={() => setShowAddMetric(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            >
              <Plus size={12} />
              Add Metric
            </button>
          ) : null}
          {/* Log Today Button */}
          {!hasTodayRow && (
            <button
              onClick={handleLogToday}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors"
            >
              <Plus size={12} />
              Log Today
            </button>
          )}
        </div>
      </div>
      {/* Theme-aware table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-2.5 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Date</th>
              <th className="text-left py-2.5 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Day</th>
              {metricTypes.map(metric => (
                <th key={metric} className="text-left py-2.5 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">
                  {formatMetricName(metric)}
                </th>
              ))}
              {showDeficit && (
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Deficit</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.date}
                className={cn(
                  "border-b border-border hover:bg-muted/30 transition-colors",
                  idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                )}
              >
                <td className="py-2.5 px-3 text-foreground whitespace-nowrap font-medium">
                  {new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{row.dayOfWeek}</td>
                {metricTypes.map(metric => {
                  const value = row.values[metric];
                  const isEditing = editingCell?.date === row.date && editingCell?.metric === metric;

                  return (
                    <td
                      key={metric}
                      className="py-2.5 px-3 text-foreground cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => !isEditing && handleStartEdit(row.date, metric, value)}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full bg-background border border-primary rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                      ) : (
                        formatCellValue(value, metric)
                      )}
                    </td>
                  );
                })}
                {showDeficit && (
                  <td className={cn(
                    "py-2.5 px-3 font-medium",
                    row.deficit !== null && row.deficit < 0 ? 'text-green-500' : 'text-red-500'
                  )}>
                    {row.deficit !== null ? row.deficit.toLocaleString() : '-'}
                  </td>
                )}
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={metricTypes.length + 2 + (showDeficit ? 1 : 0)}
                  className="py-8 text-center text-muted-foreground"
                >
                  No data logged yet. Click "Log Today" to start tracking.
                </td>
              </tr>
            )}
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 border-t border-border">
                <td className="py-2.5 px-3 text-foreground font-semibold" colSpan={2}>Summary</td>
                {metricTypes.map(metric => (
                  <td key={metric} className="py-2.5 px-3 text-primary font-semibold">
                    {getSummaryValue(metric)}
                  </td>
                ))}
                {showDeficit && (
                  <td className="py-2.5 px-3 text-primary font-semibold">
                    {derived.avgDeficit !== null ? derived.avgDeficit.toFixed(0) : '-'}
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// =============================================================================
// CHARTS SECTION
// =============================================================================

interface ChartsSectionProps {
  wantId: string;
  want: Want;
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ wantId, want }) => {
  const incomeData = getMetricChartData(wantId, 'income');
  const weightData = getMetricChartData(wantId, 'weight');

  // Check if metric types are defined (not just if data exists)
  const hasIncomeMetric = want.metricTypes.includes('income');
  const hasWeightMetric = want.metricTypes.includes('weight');
  const hasIncomeData = incomeData.length > 0;
  const hasWeightData = weightData.length > 0;

  // Don't render if neither metric is defined
  if (!hasIncomeMetric && !hasWeightMetric) {
    return null;
  }

  const formatXAxis = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Empty state component for charts
  const EmptyChartState: React.FC<{ metricName: string; color: string }> = ({ metricName, color }) => (
    <div className="h-[200px] flex items-center justify-center">
      <div className="text-center">
        <BarChart3 size={32} className="mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No {metricName.toLowerCase()} data yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Log values to see the chart</p>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {hasIncomeMetric && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-green-500" />
            Income
          </h3>
          {hasIncomeData ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incomeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxis}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickFormatter={(v) => `$${v.toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--foreground))',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Income']}
                    labelFormatter={(label) => formatXAxis(label as string)}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={{ fill: '#22C55E', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#22C55E' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartState metricName="Income" color="#22C55E" />
          )}
        </div>
      )}

      {hasWeightMetric && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-500" />
            Weight
          </h3>
          {hasWeightData ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxis}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickFormatter={(v) => `${v} lbs`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(var(--foreground))',
                    }}
                    formatter={(value: number) => [`${value} lbs`, 'Weight']}
                    labelFormatter={(label) => formatXAxis(label as string)}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartState metricName="Weight" color="#3B82F6" />
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// DOCTRINE NOTES SECTION
// =============================================================================

interface DoctrineNotesSectionProps {
  notes: string[];
}

const DoctrineNotesSection: React.FC<DoctrineNotesSectionProps> = ({ notes }) => {
  if (notes.length === 0) return null;

  return (
    <NotionSection title="Doctrine Notes" icon={<BookOpen size={14} />}>
      <div className="space-y-2">
        {notes.map((note, idx) => (
          <div key={idx} className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground">{note}</p>
          </div>
        ))}
      </div>
    </NotionSection>
  );
};

// =============================================================================
// ITERATION LOG SECTION
// =============================================================================

interface IterationLogSectionProps {
  entries: ScopeIterationEntry[];
}

const IterationLogSection: React.FC<IterationLogSectionProps> = ({ entries }) => {
  const getActionIcon = (action: IterationAction) => {
    switch (action) {
      case 'feedback': return <MessageSquare size={12} />;
      case 'revision': return <RefreshCw size={12} />;
      case 'resistance': return <AlertTriangle size={12} />;
      case 'external_feedback': return <UserX size={12} />;
      case 'milestone': return <Flag size={12} />;
      case 'reflection': return <Lightbulb size={12} />;
      case 'course_correction': return <Route size={12} />;
      case 'covert_contract_blocked': return <ShieldOff size={12} />;
      case 'bad_frame_corrected': return <Crosshair size={12} />;
      default: return <MessageSquare size={12} />;
    }
  };

  // Theme-aware color scheme for action badges
  const getActionColor = (action: IterationAction) => {
    switch (action) {
      case 'feedback': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'revision': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'resistance': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'external_feedback': return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
      case 'milestone': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'reflection': return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30';
      case 'course_correction': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'covert_contract_blocked': return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
      case 'bad_frame_corrected': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <MotionDiv
          key={entry.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-muted/30 border border-border rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs rounded border flex items-center gap-1 ${getActionColor(entry.action)}`}>
              {getActionIcon(entry.action)}
              {entry.action.replace('_', ' ')}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              entry.source === 'little_lord'
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}>
              {entry.source === 'little_lord' ? 'Little Lord' : 'User'}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(entry.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{entry.feedback}</p>
          {entry.consequence && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Consequence:</p>
              <p className="text-sm text-foreground/80">{entry.consequence}</p>
            </div>
          )}
        </MotionDiv>
      ))}

      {entries.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No iteration entries yet.
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WantScopeView: React.FC<WantScopeViewProps> = ({ wantId, onBack }) => {
  // Subscribe to store changes for reactivity
  const wants = useSyncExternalStore(wantSubscribe, wantGetSnapshot);
  const scopes = useSyncExternalStore(scopeSubscribe, scopeGetSnapshot);

  const want = wants.find(w => w.id === wantId);
  const scope = scopes.get(wantId) || getOrCreateScope(wantId);
  const stats = getScopeStats(wantId);
  const congruency = getCongruencyScore(wantId);

  if (!want) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Want not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - theme-aware */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={onBack}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <ChevronLeft size={20} className="text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{want.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <ValidityBadge isValid={want.validation.isValidWant} />
              <DirectnessBadge isDirect={want.directness.isDirect} />
            </div>
          </div>
          <CongruencyScoreDisplay score={congruency} />
        </div>

        {/* Inert Warning */}
        {stats.isInert && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">This Want is INERT</p>
              <p className="text-xs text-red-400/70">No iteration activity. Wants without iteration are fantasy.</p>
            </div>
          </div>
        )}
      </div>

      {/* Content - Notion-style white surface */}
      <div className="flex-1 overflow-y-auto p-6">
        <NotionCard variant="page">
          <NotionCardContent className="space-y-6">
            {/* Objective Section */}
            <NotionSection title="Objective" icon={<Target size={14} />} isFirst>
              <ObjectiveSection
                wantId={wantId}
                objective={scope?.objective || want.reason}
                primaryContactId={want.primaryContactId}
              />
            </NotionSection>

            {/* Metrics Table */}
            <NotionSection title="Daily Metrics" icon={<Calendar size={14} />}>
              <MetricsTable wantId={wantId} want={want} />
            </NotionSection>

            {/* Charts */}
            <ChartsSection wantId={wantId} want={want} />

            {/* Doctrine Notes */}
            {scope && <DoctrineNotesSection notes={scope.doctrineNotes} />}

            {/* Iteration Log */}
            {scope && (
              <NotionSection title="Iteration Log" icon={<Zap size={14} />}>
                <IterationLogSection entries={scope.iterationEntries} />
              </NotionSection>
            )}
          </NotionCardContent>
        </NotionCard>
      </div>
    </div>
  );
};

export default WantScopeView;
