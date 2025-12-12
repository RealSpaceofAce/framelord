// =============================================================================
// WANT DETAIL VIEW — Central hub for a single Want
// =============================================================================
// A single vertically scrollable page with all Want-related content:
// 1. Want Header (cover image, title, status, congruency, actions)
// 2. Per-Want Steps Kanban (MAIN INTERACTION ZONE)
// 3. Metrics + Charts
// 4. Iteration Log
// 5. Doctrine Notes
// =============================================================================

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChevronLeft,
  Target,
  Plus,
  Check,
  Clock,
  Calendar,
  Edit2,
  MessageSquare,
  AlertTriangle,
  Crosshair,
  X,
  Sparkles,
  TrendingUp,
  BarChart3,
  BookOpen,
  Zap,
  RefreshCw,
  UserX,
  Flag,
  Lightbulb,
  Route,
  ShieldOff,
  Crown,
  LayoutGrid,
  List,
  CheckCircle2,
  FileText,
  Shield,
  Scale,
} from 'lucide-react';
import {
  getWantById,
  updateWant,
  updateWantCoverImage,
  getStepCounts,
  getDailyRows,
  calculateAverages,
  calculateSums,
  calculateDerivedMetrics,
  getMetricChartData,
  logMetricValue,
  addMetricType,
  subscribe,
  getSnapshot,
  type Want,
  type WantStatus,
  type DailyMetricRow,
} from '../../services/wantStore';
import {
  getOrCreateScope,
  getScopeStats,
  getCongruencyScore,
  isScopeInert,
  getDossierForWant,
  type WantScope,
  type WantDossier,
  type ScopeIterationEntry,
  type IterationAction,
  subscribe as scopeSubscribe,
  getSnapshot as scopeGetSnapshot,
} from '../../services/wantScopeStore';
import { WantStepsBoardView } from './WantStepsBoardView';
import { WantCoverImage } from './ui/WantCoverImage';
import { WantsBannerCompact } from './WantsBanner';
import { CongruencyBadge } from '../ui/CongruencyBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ScrollArea } from '../ui/ScrollArea';
import { Separator } from '../ui/Separator';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '@/lib/utils';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

interface WantDetailViewProps {
  wantId: string;
  onBack: () => void;
  onTalkToLittleLord?: (wantId: string) => void;
  /** Optional initial section to scroll to (e.g., when coming from Scope tab) */
  initialSection?: 'steps' | 'metrics' | 'scope';
}

// =============================================================================
// METRICS TABLE COMPONENT (Theme-aware)
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

  const sumMetrics = ['income', 'hours_worked', 'calories', 'calories_burned'];
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const todayDate = getTodayDate();
  const hasTodayRow = rows.some(r => r.date === todayDate);

  const handleLogToday = () => {
    if (metricTypes.length === 0) return;
    logMetricValue(wantId, todayDate, metricTypes[0], null);
  };

  const handleAddMetric = () => {
    if (newMetricName.trim()) {
      addMetricType(wantId, newMetricName.trim());
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
      if (!isNaN(num)) value = num;
      else if (['true', 'yes'].includes(editValue.toLowerCase())) value = true;
      else if (['false', 'no'].includes(editValue.toLowerCase())) value = false;
      else value = editValue;
    }
    logMetricValue(wantId, date, metric, value);
    setEditingCell(null);
    setEditValue('');
  };

  const getSummaryValue = (metric: string): string => {
    if (sumMetrics.includes(metric)) {
      const sum = sums[metric];
      if (sum === undefined) return '-';
      if (metric === 'income') return `$${sum.toLocaleString()}`;
      return sum.toLocaleString();
    }
    if (metric === 'workout') return `${derived.workoutPct}%`;
    const avg = averages[metric];
    if (avg === undefined) return '-';
    if (metric === 'weight') return `${avg.toFixed(1)} lbs`;
    return avg.toFixed(1);
  };

  const showDeficit = metricTypes.includes('calories') && metricTypes.includes('calories_burned');

  if (metricTypes.length === 0) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
        <Crown size={32} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm mb-4">No metrics defined yet.</p>
        {showAddMetric ? (
          <div className="flex items-center gap-2 justify-center">
            <Input
              value={newMetricName}
              onChange={(e) => setNewMetricName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMetric()}
              placeholder="Metric name"
              className="w-48"
              autoFocus
            />
            <Button size="sm" variant="brand" onClick={handleAddMetric}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setNewMetricName(''); setShowAddMetric(false); }}>Cancel</Button>
          </div>
        ) : (
          <Button variant="brand" onClick={() => setShowAddMetric(true)} className="gap-1.5">
            <Plus size={14} />
            Add Metric
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
        <span className="text-sm font-medium text-foreground">{rows.length} days logged</span>
        <div className="flex items-center gap-2">
          {showAddMetric ? (
            <div className="flex items-center gap-2">
              <Input
                value={newMetricName}
                onChange={(e) => setNewMetricName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMetric()}
                placeholder="Metric name"
                className="w-28 h-7 text-xs"
                autoFocus
              />
              <Button size="sm" variant="brand" onClick={handleAddMetric} className="h-7 px-2">
                <Check size={12} />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setNewMetricName(''); setShowAddMetric(false); }} className="h-7 px-2">
                <X size={12} />
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="brand-outline" onClick={() => setShowAddMetric(true)} className="h-7 gap-1">
              <Plus size={12} />
              Add Metric
            </Button>
          )}
          {!hasTodayRow && (
            <Button size="sm" variant="brand" onClick={handleLogToday} className="h-7 gap-1">
              <Plus size={12} />
              Log Today
            </Button>
          )}
        </div>
      </div>
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
              <tr key={row.date} className={cn("border-b border-border hover:bg-muted/30 transition-colors", idx % 2 === 0 ? 'bg-card' : 'bg-muted/20')}>
                <td className="py-2.5 px-3 text-foreground whitespace-nowrap font-medium">
                  {new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{row.dayOfWeek}</td>
                {metricTypes.map(metric => {
                  const value = row.values[metric];
                  const isEditing = editingCell?.date === row.date && editingCell?.metric === metric;
                  return (
                    <td key={metric} className="py-2.5 px-3 text-foreground cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => !isEditing && handleStartEdit(row.date, metric, value)}>
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full h-7"
                          autoFocus
                        />
                      ) : formatCellValue(value, metric)}
                    </td>
                  );
                })}
                {showDeficit && (
                  <td className={cn("py-2.5 px-3 font-medium", row.deficit !== null && row.deficit < 0 ? 'text-green-500' : 'text-red-500')}>
                    {row.deficit !== null ? row.deficit.toLocaleString() : '-'}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={metricTypes.length + 2 + (showDeficit ? 1 : 0)} className="py-8 text-center text-muted-foreground">
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
                  <td key={metric} className="py-2.5 px-3 text-primary font-semibold">{getSummaryValue(metric)}</td>
                ))}
                {showDeficit && (
                  <td className="py-2.5 px-3 text-primary font-semibold">{derived.avgDeficit !== null ? derived.avgDeficit.toFixed(0) : '-'}</td>
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
  const hasIncomeMetric = want.metricTypes.includes('income');
  const hasWeightMetric = want.metricTypes.includes('weight');

  if (!hasIncomeMetric && !hasWeightMetric) return null;

  const formatXAxis = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const ChartCard: React.FC<{ title: string; data: Array<{ date: string; value: number }>; color: string; icon: React.ReactNode; yFormatter: (v: number) => string }> = ({ title, data, color, icon, yFormatter }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={yFormatter} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [yFormatter(value), title]}
                  labelFormatter={(label) => formatXAxis(label as string)}
                />
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ fill: color, strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: color }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={32} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No data yet</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {hasIncomeMetric && (
        <ChartCard title="Income" data={incomeData} color="#22C55E" icon={<TrendingUp size={14} className="text-green-500" />} yFormatter={(v) => `$${v.toLocaleString()}`} />
      )}
      {hasWeightMetric && (
        <ChartCard title="Weight" data={weightData} color="#3B82F6" icon={<TrendingUp size={14} className="text-blue-500" />} yFormatter={(v) => `${v} lbs`} />
      )}
    </div>
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
    const icons: Record<IterationAction, React.ReactNode> = {
      feedback: <MessageSquare size={12} />,
      revision: <RefreshCw size={12} />,
      resistance: <AlertTriangle size={12} />,
      external_feedback: <UserX size={12} />,
      milestone: <Flag size={12} />,
      reflection: <Lightbulb size={12} />,
      course_correction: <Route size={12} />,
      covert_contract_blocked: <ShieldOff size={12} />,
      bad_frame_corrected: <Crosshair size={12} />,
    };
    return icons[action] || <MessageSquare size={12} />;
  };

  const getActionColor = (action: IterationAction) => {
    const colors: Record<IterationAction, string> = {
      feedback: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      revision: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      resistance: 'bg-red-500/10 text-red-500 border-red-500/30',
      external_feedback: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      milestone: 'bg-green-500/10 text-green-500 border-green-500/30',
      reflection: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
      course_correction: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
      covert_contract_blocked: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
      bad_frame_corrected: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    };
    return colors[action] || 'bg-muted text-muted-foreground border-border';
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No iteration entries yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <MotionDiv key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-muted/30 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="muted" className={cn("text-xs gap-1 border", getActionColor(entry.action))}>
              {getActionIcon(entry.action)}
              {entry.action.replace(/_/g, ' ')}
            </Badge>
            <Badge variant={entry.source === 'little_lord' ? 'default' : 'muted'} className="text-xs">
              {entry.source === 'little_lord' ? 'Little Lord' : 'User'}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
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
    <div className="space-y-2">
      {notes.map((note, idx) => (
        <div key={idx} className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-foreground">{note}</p>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// DOSSIER SECTION — AI-generated strategic analysis
// =============================================================================

interface DossierSectionProps {
  dossier: WantDossier;
}

const DossierSection: React.FC<DossierSectionProps> = ({ dossier }) => {
  const DossierField: React.FC<{
    label: string;
    value: string;
    icon: React.ReactNode;
    variant?: 'default' | 'warning' | 'success';
  }> = ({ label, value, icon, variant = 'default' }) => (
    <div className={cn(
      "p-3 rounded-lg border",
      variant === 'warning' && "bg-amber-500/5 border-amber-500/20",
      variant === 'success' && "bg-green-500/5 border-green-500/20",
      variant === 'default' && "bg-muted/30 border-border"
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cn(
          "text-muted-foreground",
          variant === 'warning' && "text-amber-500",
          variant === 'success' && "text-green-500"
        )}>
          {icon}
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value || 'Not provided'}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Summary */}
      <DossierField
        label="Summary"
        value={dossier.summary}
        icon={<FileText size={14} />}
      />

      {/* Why It Matters */}
      <DossierField
        label="Why It Matters"
        value={dossier.why_it_matters}
        icon={<Target size={14} />}
        variant="success"
      />

      {/* Two-column layout for Timeline and Win-Win */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DossierField
          label="Intended Timeline"
          value={dossier.intended_timeline}
          icon={<Calendar size={14} />}
        />
        <DossierField
          label="Win-Win Frame"
          value={dossier.win_win_frame}
          icon={<Scale size={14} />}
        />
      </div>

      {/* Risks & Costs */}
      {dossier.risks_or_costs && (
        <DossierField
          label="Risks & Costs"
          value={dossier.risks_or_costs}
          icon={<AlertTriangle size={14} />}
          variant="warning"
        />
      )}

      {/* Covert Contract Flags */}
      {dossier.covert_contract_flags && dossier.covert_contract_flags.length > 0 && (
        <div className="p-3 rounded-lg border bg-red-500/5 border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-red-500" />
            <span className="text-xs font-medium text-red-500 uppercase tracking-wide">
              Covert Contract Flags
            </span>
          </div>
          <ul className="space-y-1.5">
            {dossier.covert_contract_flags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-red-500 mt-1">•</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Congruence Notes */}
      {dossier.congruence_notes && (
        <DossierField
          label="Congruence Notes"
          value={dossier.congruence_notes}
          icon={<Crosshair size={14} />}
        />
      )}

      {/* Dossier Metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>
          Generated by {dossier.source === 'little_lord' ? 'Little Lord' : 'Manual Entry'}
        </span>
        <span>
          Updated {new Date(dossier.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WantDetailView: React.FC<WantDetailViewProps> = ({
  wantId,
  onBack,
  onTalkToLittleLord,
  initialSection,
}) => {
  // Subscribe to store changes
  useSyncExternalStore(subscribe, getSnapshot);
  const scopes = useSyncExternalStore(scopeSubscribe, scopeGetSnapshot);

  const want = getWantById(wantId);
  const scope = scopes.get(wantId) || getOrCreateScope(wantId);
  const dossier = getDossierForWant(wantId);
  const congruency = getCongruencyScore(wantId);
  const stats = getScopeStats(wantId);
  const isInert = isScopeInert(wantId);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editReason, setEditReason] = useState('');
  const [stepsViewMode, setStepsViewMode] = useState<'kanban' | 'list'>('kanban');

  // Section refs for scrolling
  const stepsRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);

  // Scroll to top on mount, or to initial section if specified
  useEffect(() => {
    // Always scroll to top first
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Then scroll to initial section if specified
    if (initialSection) {
      const refMap = {
        steps: stepsRef,
        metrics: metricsRef,
        scope: scopeRef,
      };
      const targetRef = refMap[initialSection];
      if (targetRef?.current) {
        setTimeout(() => {
          targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [wantId, initialSection]);

  useEffect(() => {
    if (want) {
      setEditTitle(want.title);
      setEditReason(want.reason);
    }
  }, [want?.id]);

  const handleStatusChange = (status: WantStatus) => {
    updateWant(wantId, { status });
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      updateWant(wantId, { title: editTitle.trim(), reason: editReason.trim() });
    }
    setIsEditing(false);
  };

  const handleCoverUpload = (dataUrl: string) => {
    updateWantCoverImage(wantId, dataUrl);
  };

  const handleCoverRemove = () => {
    updateWantCoverImage(wantId, null);
  };

  if (!want) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Want not found</p>
      </div>
    );
  }

  const completedSteps = want.steps.filter(s => s.status === 'done').length;
  const totalSteps = want.steps.length;
  const completionPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Banner - Aurora-styled compact header */}
      <WantsBannerCompact
        title={want.title}
        subtitle={want.reason}
        onBack={onBack}
        onTalkToLittleLord={onTalkToLittleLord ? () => onTalkToLittleLord(wantId) : undefined}
      />

      {/* Main Content - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          {/* ============================================================= */}
          {/* SECTION 1: WANT HEADER */}
          {/* ============================================================= */}
          <section className="space-y-4">
            {/* Cover Image - reduced size with 21:9 ratio */}
            <WantCoverImage
              imageUrl={want.coverImageUrl}
              onUpload={handleCoverUpload}
              onRemove={handleCoverRemove}
              ratio={21 / 9}
            />

            {/* Title & Status Row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-xl font-bold" autoFocus />
                    <Textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={2} placeholder="Why do you want this?" />
                    <div className="flex gap-2">
                      <Button variant="brand" size="sm" onClick={handleSaveEdit}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-foreground">{want.title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{want.reason}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <CongruencyBadge score={congruency} size="lg" />
                <StatusBadge status={want.status} size="default" />
              </div>
            </div>

            {/* Inert Warning */}
            {isInert && (
              <Card className="bg-destructive/10 border-destructive/30">
                <CardContent className="p-3 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-destructive shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">This Want is INERT</p>
                    <p className="text-xs text-destructive/70">No iteration activity. Log progress to make this real.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={want.status}
                onChange={(e) => handleStatusChange(e.target.value as WantStatus)}
                className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer pr-8 bg-[length:16px_16px] bg-[right_8px_center] bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6,9 12,15 18,9'%3E%3C/polyline%3E%3C/svg%3E")`
                }}
              >
                <option value="not_started" className="bg-card text-foreground">Not Started</option>
                <option value="in_progress" className="bg-card text-foreground">In Progress</option>
                <option value="done" className="bg-card text-foreground">Done</option>
              </select>

              {want.deadline && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar size={14} />
                  {new Date(want.deadline).toLocaleDateString()}
                </span>
              )}

              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${completionPct}%` }} className="h-full bg-primary rounded-full" />
                </div>
                <span className="text-xs text-muted-foreground">{completionPct}%</span>
              </div>

              <div className="flex-1" />

              {!isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                  <Edit2 size={14} />
                  Edit
                </Button>
              )}
            </div>

            {/* Dossier Section - AI-generated strategic analysis */}
            {dossier ? (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText size={14} className="text-primary" />
                    Strategic Dossier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DossierSection dossier={dossier} />
                </CardContent>
              </Card>
            ) : (
              <Card className="mt-4 border-dashed">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Sparkles size={24} className="mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground mb-1">Want Dossier Not Generated Yet</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Talk to Little Lord about this Want to generate a strategic dossier with analysis and recommendations.
                    </p>
                    {onTalkToLittleLord && (
                      <Button
                        variant="brand-outline"
                        size="sm"
                        className="mt-4 gap-1.5"
                        onClick={() => onTalkToLittleLord(wantId)}
                      >
                        <Sparkles size={14} />
                        Generate Dossier
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <Separator />

          {/* ============================================================= */}
          {/* SECTION 2: STEPS KANBAN (MAIN INTERACTION ZONE) */}
          {/* ============================================================= */}
          <section ref={stepsRef}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp size={14} className="text-primary" />
                    Steps
                    <Badge variant="muted" className="ml-2 text-xs">{completedSteps}/{totalSteps}</Badge>
                  </CardTitle>
                  {/* Kanban/List Toggle */}
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <Button
                      variant={stepsViewMode === 'kanban' ? 'brand' : 'brand-outline'}
                      size="sm"
                      onClick={() => setStepsViewMode('kanban')}
                      className="gap-1.5 h-7 px-2"
                    >
                      <LayoutGrid size={12} />
                      <span className="hidden sm:inline text-xs">Kanban</span>
                    </Button>
                    <Button
                      variant={stepsViewMode === 'list' ? 'brand' : 'brand-outline'}
                      size="sm"
                      onClick={() => setStepsViewMode('list')}
                      className="gap-1.5 h-7 px-2"
                    >
                      <List size={12} />
                      <span className="hidden sm:inline text-xs">List</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {stepsViewMode === 'kanban' ? (
                  <WantStepsBoardView wantId={wantId} />
                ) : (
                  /* List View */
                  <div className="space-y-2">
                    {want.steps.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Target size={32} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No steps defined yet.</p>
                      </div>
                    ) : (
                      want.steps.map((step) => (
                        <div
                          key={step.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                            step.status === 'done'
                              ? "bg-muted/30 border-border/50"
                              : "bg-card border-border hover:border-primary/50"
                          )}
                        >
                          {/* Status indicator */}
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                              step.status === 'done' && "bg-green-500/20 text-green-500",
                              step.status === 'in_progress' && "bg-amber-500/20 text-amber-500",
                              step.status === 'not_started' && "bg-muted text-muted-foreground"
                            )}
                          >
                            {step.status === 'done' && <CheckCircle2 size={14} />}
                            {step.status === 'in_progress' && <Clock size={14} />}
                            {step.status === 'not_started' && <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium",
                              step.status === 'done' && "line-through text-muted-foreground"
                            )}>
                              {step.title}
                            </p>
                            {step.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {step.description}
                              </p>
                            )}
                          </div>
                          {/* Deadline */}
                          {step.deadline && (
                            <span className={cn(
                              "text-xs shrink-0 flex items-center gap-1",
                              new Date(step.deadline) < new Date() && step.status !== 'done'
                                ? "text-destructive font-medium"
                                : "text-muted-foreground"
                            )}>
                              <Calendar size={10} />
                              {new Date(step.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {/* Status badge */}
                          <Badge
                            variant="muted"
                            className={cn(
                              "text-[10px] shrink-0",
                              step.status === 'done' && "bg-green-500/10 text-green-500",
                              step.status === 'in_progress' && "bg-amber-500/10 text-amber-500",
                              step.status === 'not_started' && "bg-muted text-muted-foreground"
                            )}
                          >
                            {step.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* ============================================================= */}
          {/* SECTION 3: METRICS + CHARTS */}
          {/* ============================================================= */}
          <section ref={metricsRef} className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 size={14} className="text-primary" />
                  Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MetricsTable wantId={wantId} want={want} />
              </CardContent>
            </Card>

            <ChartsSection wantId={wantId} want={want} />
          </section>

          <Separator />

          {/* ============================================================= */}
          {/* SECTION 4: ITERATION LOG + DOCTRINE (SCOPE) */}
          {/* ============================================================= */}
          {scope && (
            <section ref={scopeRef}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap size={14} className="text-primary" />
                    Iteration Log
                    <Badge variant="muted" className="ml-2 text-xs">{scope.iterationEntries.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <IterationLogSection entries={scope.iterationEntries} />
                </CardContent>
              </Card>
            </section>
          )}

          {/* ============================================================= */}
          {/* SECTION 5: DOCTRINE NOTES */}
          {/* ============================================================= */}
          {scope && scope.doctrineNotes.length > 0 && (
            <section>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen size={14} className="text-primary" />
                    Doctrine Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DoctrineNotesSection notes={scope.doctrineNotes} />
                </CardContent>
              </Card>
            </section>
          )}

          {/* REMOVED: "Open Full Scope View" button - scope is now fully embedded in this view */}
        </div>
      </ScrollArea>
    </div>
  );
};

export default WantDetailView;
