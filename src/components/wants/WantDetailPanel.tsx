// =============================================================================
// WANT DETAIL PANEL — Slide-out sheet with tabbed content
// =============================================================================
// Opens as a panel from the right side of the screen for viewing/editing a Want
// without leaving the current view (Board or Progress).
// =============================================================================

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Target,
  Plus,
  Check,
  Clock,
  Calendar,
  Trash2,
  Edit2,
  BarChart3,
  MessageSquare,
  ListChecks,
  TrendingUp,
  ChevronRight,
  Save,
} from 'lucide-react';
import {
  getWantById,
  updateWant,
  addStep,
  updateStep,
  deleteStep,
  logIteration,
  addMetricType,
  logMetricValue,
  getMetricStats,
  hasChartRule,
  getChartRule,
  getMetricChartData,
  subscribe,
  getSnapshot,
  type Want,
  type WantStep,
  type WantStatus,
} from '../../services/wantStore';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

interface WantDetailPanelProps {
  wantId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToFullView?: () => void;
}

type TabType = 'steps' | 'metrics' | 'iterations';

// =============================================================================
// STEP ITEM (COMPACT)
// =============================================================================

interface StepItemProps {
  step: WantStep;
  wantId: string;
}

const StepItem: React.FC<StepItemProps> = ({ step, wantId }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(step.title);

  const cycleStatus = () => {
    const statusOrder: WantStatus[] = ['not_started', 'in_progress', 'done'];
    const currentIndex = statusOrder.indexOf(step.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    updateStep(wantId, step.id, { status: nextStatus });
  };

  const handleSave = () => {
    if (title.trim()) {
      updateStep(wantId, step.id, { title: title.trim() });
    }
    setEditing(false);
  };

  const handleDelete = () => {
    deleteStep(wantId, step.id);
  };

  const getStatusIcon = () => {
    switch (step.status) {
      case 'done':
        return <Check size={14} className="text-green-400" />;
      case 'in_progress':
        return <Clock size={14} className="text-blue-400" />;
      default:
        return <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-500" />;
    }
  };

  return (
    <div
      className={`flex items-center gap-2 p-2 bg-[#1A1A1A] border border-[#333] rounded group ${
        step.status === 'done' ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={cycleStatus}
        className="shrink-0 p-0.5 hover:bg-[#333] rounded transition-colors"
      >
        {getStatusIcon()}
      </button>

      {editing ? (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="flex-1 bg-transparent border-b border-[#4433FF] text-xs text-white focus:outline-none"
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 text-xs cursor-pointer truncate ${
            step.status === 'done' ? 'line-through text-gray-500' : 'text-white'
          }`}
          onClick={() => setEditing(true)}
        >
          {step.title}
        </span>
      )}

      <button
        onClick={handleDelete}
        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
      >
        <Trash2 size={12} className="text-red-400" />
      </button>
    </div>
  );
};

// =============================================================================
// ADD STEP FORM (COMPACT)
// =============================================================================

interface AddStepFormProps {
  wantId: string;
}

const AddStepForm: React.FC<AddStepFormProps> = ({ wantId }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addStep(wantId, { title: title.trim() });
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add step..."
        className="flex-1 bg-[#1A1A1A] border border-[#333] rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#4433FF]"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="p-1.5 bg-[#4433FF] text-white rounded hover:bg-[#5544FF] transition-colors disabled:opacity-50"
      >
        <Plus size={14} />
      </button>
    </form>
  );
};

// =============================================================================
// METRICS TAB (COMPACT)
// =============================================================================

interface MetricsTabProps {
  want: Want;
}

const MetricsTab: React.FC<MetricsTabProps> = ({ want }) => {
  const [newMetricName, setNewMetricName] = useState('');
  const [logForm, setLogForm] = useState<{ metric: string; value: string } | null>(null);

  const handleAddMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetricName.trim()) return;
    addMetricType(want.id, newMetricName.trim());
    setNewMetricName('');
  };

  const handleLogValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logForm || !logForm.value.trim()) return;

    const value = isNaN(Number(logForm.value)) ? logForm.value : Number(logForm.value);
    logMetricValue(want.id, new Date().toISOString().split('T')[0], logForm.metric, value);
    setLogForm(null);
  };

  // Get chartable metrics (those with chart rules)
  const chartableMetrics = want.metricTypes.filter(m => hasChartRule(m));

  return (
    <div className="space-y-4">
      {/* Add metric type */}
      <form onSubmit={handleAddMetric} className="flex items-center gap-2">
        <input
          type="text"
          value={newMetricName}
          onChange={(e) => setNewMetricName(e.target.value)}
          placeholder="Add metric type..."
          className="flex-1 bg-[#1A1A1A] border border-[#333] rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#4433FF]"
        />
        <button
          type="submit"
          disabled={!newMetricName.trim()}
          className="p-1.5 bg-[#4433FF] text-white rounded hover:bg-[#5544FF] transition-colors disabled:opacity-50"
        >
          <Plus size={14} />
        </button>
      </form>

      {/* Metric types list */}
      <div className="space-y-2">
        {want.metricTypes.map((metric) => {
          const stats = getMetricStats(want.id, metric);
          const chartRule = getChartRule(metric);

          return (
            <div key={metric} className="p-2 bg-[#1A1A1A] border border-[#333] rounded">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white capitalize">
                  {metric.replace(/_/g, ' ')}
                </span>
                <button
                  onClick={() => setLogForm({ metric, value: '' })}
                  className="text-xs text-[#4433FF] hover:text-[#5544FF]"
                >
                  Log
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                {stats.count > 0 && (
                  <>
                    <span>Count: {stats.count}</span>
                    {typeof stats.avg === 'number' && <span>Avg: {stats.avg.toFixed(1)}</span>}
                    {stats.latest !== null && <span>Latest: {String(stats.latest)}</span>}
                  </>
                )}
                {stats.count === 0 && <span>No data yet</span>}
              </div>

              {/* Mini chart for chartable metrics */}
              {chartRule && stats.count >= 2 && (
                <div className="mt-2 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartRule.type === 'bar' ? (
                      <BarChart data={getMetricChartData(want.id, metric)}>
                        <Bar dataKey="value" fill={chartRule.color} />
                      </BarChart>
                    ) : (
                      <LineChart data={getMetricChartData(want.id, metric)}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={chartRule.color}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}

        {want.metricTypes.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-xs">
            No metrics defined. Add one above.
          </div>
        )}
      </div>

      {/* Log value modal */}
      {logForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form
            onSubmit={handleLogValue}
            className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4 w-80"
          >
            <h3 className="text-sm font-bold text-white mb-3">
              Log {logForm.metric.replace(/_/g, ' ')}
            </h3>
            <input
              type="text"
              value={logForm.value}
              onChange={(e) => setLogForm({ ...logForm, value: e.target.value })}
              placeholder="Enter value..."
              className="w-full bg-[#0E0E0E] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4433FF] mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLogForm(null)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!logForm.value.trim()}
                className="px-3 py-1.5 bg-[#4433FF] text-white text-xs rounded hover:bg-[#5544FF] disabled:opacity-50"
              >
                Log
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ITERATIONS TAB (COMPACT)
// =============================================================================

interface IterationsTabProps {
  want: Want;
}

const IterationsTab: React.FC<IterationsTabProps> = ({ want }) => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    logIteration(want.id, feedback.trim());
    setFeedback('');
  };

  return (
    <div className="space-y-3">
      {/* Add iteration form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Log iteration feedback..."
          rows={2}
          className="w-full bg-[#1A1A1A] border border-[#333] rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#4433FF] resize-none"
        />
        <button
          type="submit"
          disabled={!feedback.trim()}
          className="w-full py-1.5 bg-[#4433FF] text-white text-xs rounded hover:bg-[#5544FF] transition-colors disabled:opacity-50"
        >
          Log Iteration
        </button>
      </form>

      {/* Iterations list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {want.iterations.map((iteration, index) => (
          <div
            key={index}
            className="p-2 bg-[#1A1A1A] border border-[#333] rounded"
          >
            <div className="flex items-center gap-1 mb-1 text-[10px] text-gray-500">
              <MessageSquare size={10} />
              {new Date(iteration.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <p className="text-xs text-gray-300 line-clamp-3">{iteration.feedback}</p>
          </div>
        ))}

        {want.iterations.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-xs">
            No iterations logged yet
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WantDetailPanel: React.FC<WantDetailPanelProps> = ({
  wantId,
  isOpen,
  onClose,
  onNavigateToFullView,
}) => {
  // Subscribe to store for reactivity
  const wants = useSyncExternalStore(subscribe, getSnapshot);
  const want = wants.find(w => w.id === wantId);

  const [activeTab, setActiveTab] = useState<TabType>('steps');
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [editingReason, setEditingReason] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (want) {
      setTitle(want.title);
      setReason(want.reason);
    }
  }, [want?.title, want?.reason]);

  const handleStatusChange = (status: WantStatus) => {
    updateWant(wantId, { status });
  };

  const handleSaveTitle = () => {
    if (title.trim() && title !== want?.title) {
      updateWant(wantId, { title: title.trim() });
    }
    setEditingTitle(false);
  };

  const handleSaveReason = () => {
    if (reason.trim() && reason !== want?.reason) {
      updateWant(wantId, { reason: reason.trim() });
    }
    setEditingReason(false);
  };

  if (!want) return null;

  const completedSteps = want.steps.filter(s => s.status === 'done').length;
  const completionPct = want.steps.length > 0 ? Math.round((completedSteps / want.steps.length) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <MotionDiv
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-96 bg-[#0E0E0E] border-l border-[#222] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#222]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-[#4433FF]" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Want</span>
                </div>
                <div className="flex items-center gap-1">
                  {onNavigateToFullView && (
                    <button
                      onClick={onNavigateToFullView}
                      className="p-1 hover:bg-[#333] rounded transition-colors"
                      title="Open full view"
                    >
                      <ChevronRight size={16} className="text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-[#333] rounded transition-colors"
                  >
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Title */}
              {editingTitle ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  className="w-full bg-transparent text-lg font-bold text-white focus:outline-none border-b border-[#4433FF]"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-lg font-bold text-white cursor-pointer hover:text-gray-300"
                  onClick={() => setEditingTitle(true)}
                >
                  {want.title}
                </h2>
              )}

              {/* Reason */}
              {editingReason ? (
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onBlur={handleSaveReason}
                  className="w-full bg-transparent text-xs text-gray-400 focus:outline-none border-b border-[#4433FF] resize-none mt-1"
                  rows={2}
                  autoFocus
                />
              ) : (
                <p
                  className="text-xs text-gray-500 mt-1 cursor-pointer hover:text-gray-400"
                  onClick={() => setEditingReason(true)}
                >
                  {want.reason || 'Add a reason...'}
                </p>
              )}
            </div>

            {/* Status & Progress */}
            <div className="px-4 py-2 border-b border-[#222] flex items-center gap-3">
              <select
                value={want.status}
                onChange={(e) => handleStatusChange(e.target.value as WantStatus)}
                className="bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#4433FF]"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>

              {want.deadline && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar size={12} />
                  {new Date(want.deadline).toLocaleDateString()}
                </span>
              )}

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-[#333] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4433FF] rounded-full transition-all"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{completionPct}%</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-4 py-2 border-b border-[#222]">
              <div className="flex items-center gap-1 bg-[#1A1A1A] rounded p-0.5">
                <button
                  onClick={() => setActiveTab('steps')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                    activeTab === 'steps' ? 'bg-[#4433FF] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ListChecks size={12} />
                  Steps
                </button>
                <button
                  onClick={() => setActiveTab('metrics')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                    activeTab === 'metrics' ? 'bg-[#4433FF] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <BarChart3 size={12} />
                  Metrics
                </button>
                <button
                  onClick={() => setActiveTab('iterations')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                    activeTab === 'iterations' ? 'bg-[#4433FF] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <MessageSquare size={12} />
                  Iterations
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'steps' && (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {want.steps.map(step => (
                      <MotionDiv
                        key={step.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        <StepItem step={step} wantId={want.id} />
                      </MotionDiv>
                    ))}
                  </AnimatePresence>
                  <AddStepForm wantId={want.id} />
                </div>
              )}

              {activeTab === 'metrics' && <MetricsTab want={want} />}

              {activeTab === 'iterations' && <IterationsTab want={want} />}
            </div>

            {/* Footer with stats */}
            <div className="px-4 py-2 border-t border-[#222] bg-[#0A0A0A]">
              <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span>{want.steps.length} steps</span>
                <span>{want.metricTypes.length} metrics</span>
                <span>{want.iterations.length} iterations</span>
              </div>
            </div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
};

export default WantDetailPanel;
