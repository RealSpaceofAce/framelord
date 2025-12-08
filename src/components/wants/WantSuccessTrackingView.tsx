// =============================================================================
// WANTS TRACKING VIEW — Dynamic metrics table with Recharts
// =============================================================================
// LEGACY VIEW - NOT USED IN CURRENT NAVIGATION
// Metrics and daily logging are now handled inside WantDetailView.
// This component is retained for reference but should NOT be wired into any route.
// If you need metrics functionality, use the embedded metrics section in WantDetailView.
// =============================================================================
// Renamed from "Success Tracking" to "Wants Tracking" - tracking the want itself
// =============================================================================

import React, { useState, useSyncExternalStore } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Plus, TrendingUp, Calendar, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  getWantById,
  getMetricChartData,
  getMetricStats,
  logMetricValue,
  addMetricType,
  subscribe,
  getSnapshot,
  chartRules,
  hasChartRule,
  type Want,
} from '../../services/wantStore';

// =============================================================================
// TYPES
// =============================================================================

interface WantSuccessTrackingViewProps {
  wantId?: string;
  onBack?: () => void;
}

// =============================================================================
// METRIC CHART COMPONENT
// =============================================================================

interface MetricChartProps {
  wantId: string;
  metricName: string;
}

const MetricChart: React.FC<MetricChartProps> = ({ wantId, metricName }) => {
  const chartRule = chartRules[metricName];
  if (!chartRule) return null;

  const data = getMetricChartData(wantId, metricName);
  const stats = getMetricStats(wantId, metricName);

  // Create empty data if no metrics logged
  const chartData = data.length > 0 ? data : [
    { date: new Date().toISOString().split('T')[0], value: 0 },
  ];

  const formatXAxis = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTooltip = (value: number) => {
    if (metricName === 'income') return `$${value.toLocaleString()}`;
    if (metricName === 'weight') return `${value} lbs`;
    return value.toLocaleString();
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">
          {chartRule.label || metricName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </h3>
        {stats.count > 0 && (
          <div className="text-xs text-gray-400">
            Avg: {typeof stats.avg === 'number' ? formatTooltip(Math.round(stats.avg)) : '-'}
          </div>
        )}
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartRule.type === 'bar' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#666"
                fontSize={10}
              />
              <YAxis stroke="#666" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatTooltip(value), chartRule.label || metricName]}
                labelFormatter={(label) => formatXAxis(label as string)}
              />
              <Bar dataKey="value" fill={chartRule.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartRule.type === 'area' ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#666"
                fontSize={10}
              />
              <YAxis stroke="#666" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatTooltip(value), chartRule.label || metricName]}
                labelFormatter={(label) => formatXAxis(label as string)}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartRule.color}
                fill={`${chartRule.color}20`}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#666"
                fontSize={10}
              />
              <YAxis stroke="#666" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatTooltip(value), chartRule.label || metricName]}
                labelFormatter={(label) => formatXAxis(label as string)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={chartRule.color}
                strokeWidth={2}
                dot={{ fill: chartRule.color, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: chartRule.color }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {data.length === 0 && (
        <div className="text-center text-xs text-gray-500 mt-2">
          No data logged yet
        </div>
      )}
    </div>
  );
};

// =============================================================================
// METRICS TABLE
// =============================================================================

interface MetricsTableProps {
  want: Want;
  onCellEdit: (date: string, metricName: string, value: number | string | boolean | null) => void;
}

const MetricsTable: React.FC<MetricsTableProps> = ({ want, onCellEdit }) => {
  const [editingCell, setEditingCell] = useState<{ date: string; metric: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const metricTypes = want.metricTypes;

  if (metricTypes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No metrics defined yet. Add metric types to start tracking.
      </div>
    );
  }

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

    onCellEdit(date, metric, value);
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

  const calculateSummary = (metric: string) => {
    const stats = getMetricStats(want.id, metric);
    if (stats.count === 0) return '-';

    const sumMetrics = ['income', 'hours_worked', 'calories', 'calories_burned'];
    if (sumMetrics.includes(metric)) {
      if (metric === 'income') return `$${stats.sum.toLocaleString()}`;
      return stats.sum.toLocaleString();
    }

    const boolValues = want.metrics
      .map(m => m.values[metric])
      .filter((v): v is boolean => typeof v === 'boolean');
    if (boolValues.length > 0) {
      const trueCount = boolValues.filter(v => v).length;
      return `${Math.round((trueCount / boolValues.length) * 100)}%`;
    }

    if (metric === 'weight') return `${stats.avg.toFixed(1)} lbs`;
    return stats.avg.toFixed(1);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#333]">
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Date</th>
            {metricTypes.map(metric => (
              <th key={metric} className="text-left py-2 px-3 text-gray-400 font-medium">
                {formatMetricName(metric)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {want.metrics.map((entry, idx) => (
            <tr
              key={entry.date}
              className={`border-b border-[#222] ${idx % 2 === 0 ? 'bg-[#0E0E0E]' : 'bg-[#111]'}`}
            >
              <td className="py-2 px-3 text-gray-300 whitespace-nowrap">
                {new Date(entry.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </td>
              {metricTypes.map(metric => {
                const value = entry.values[metric];
                const isEditing = editingCell?.date === entry.date && editingCell?.metric === metric;

                return (
                  <td
                    key={metric}
                    className="py-2 px-3 text-gray-200 cursor-pointer hover:bg-[#1A1A1A]"
                    onClick={() => !isEditing && handleStartEdit(entry.date, metric, value)}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-[#0A0A0A] border border-[#4433FF] rounded px-2 py-1 text-sm text-white focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      formatCellValue(value, metric)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}

          {want.metrics.length === 0 && (
            <tr>
              <td
                colSpan={metricTypes.length + 1}
                className="py-8 text-center text-gray-500"
              >
                No data logged yet
              </td>
            </tr>
          )}
        </tbody>

        {want.metrics.length > 0 && (
          <tfoot>
            <tr className="bg-[#1A1A1A] border-t border-[#333]">
              <td className="py-2 px-3 text-gray-400 font-medium">Summary</td>
              {metricTypes.map(metric => (
                <td key={metric} className="py-2 px-3 text-[#4433FF] font-medium">
                  {calculateSummary(metric)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

// =============================================================================
// ADD METRIC MODAL
// =============================================================================

interface AddMetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (metricName: string) => void;
}

const AddMetricModal: React.FC<AddMetricModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [metricName, setMetricName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricName.trim()) return;
    onAdd(metricName.trim());
    setMetricName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1A1A1A] border border-[#333] rounded-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Add Metric Type</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#333] rounded">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={metricName}
            onChange={(e) => setMetricName(e.target.value)}
            placeholder="e.g., steps, meditation_minutes, mood"
            className="w-full bg-[#0E0E0E] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4433FF] mb-4"
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!metricName.trim()}
              className="px-4 py-2 bg-[#4433FF] text-white text-sm rounded-lg hover:bg-[#5544FF] disabled:opacity-50"
            >
              Add Metric
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// LOG METRICS MODAL
// =============================================================================

interface LogMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  want: Want;
  onLog: (date: string, values: Record<string, number | string | boolean | null>) => void;
}

const LogMetricsModal: React.FC<LogMetricsModalProps> = ({ isOpen, onClose, want, onLog }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedValues: Record<string, number | string | boolean | null> = {};
    for (const [key, val] of Object.entries(values)) {
      if (val.trim()) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          parsedValues[key] = num;
        } else if (val.toLowerCase() === 'true' || val.toLowerCase() === 'yes') {
          parsedValues[key] = true;
        } else if (val.toLowerCase() === 'false' || val.toLowerCase() === 'no') {
          parsedValues[key] = false;
        } else {
          parsedValues[key] = val;
        }
      }
    }

    onLog(date, parsedValues);
    setValues({});
    onClose();
  };

  if (!isOpen) return null;

  const formatMetricName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1A1A1A] border border-[#333] rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Log Metrics</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#333] rounded">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0E0E0E] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4433FF]"
            />
          </div>

          {want.metricTypes.map(metric => (
            <div key={metric}>
              <label className="block text-xs text-gray-400 mb-1">
                {formatMetricName(metric)}
              </label>
              <input
                type="text"
                value={values[metric] || ''}
                onChange={(e) => setValues({ ...values, [metric]: e.target.value })}
                placeholder={`Enter ${formatMetricName(metric).toLowerCase()}`}
                className="w-full bg-[#0E0E0E] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4433FF]"
              />
            </div>
          ))}

          {want.metricTypes.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              Add metric types first to log values
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={want.metricTypes.length === 0}
              className="px-4 py-2 bg-[#4433FF] text-white text-sm rounded-lg hover:bg-[#5544FF] disabled:opacity-50"
            >
              Log Metrics
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WantSuccessTrackingView: React.FC<WantSuccessTrackingViewProps> = ({
  wantId,
  onBack,
}) => {
  // Subscribe to store changes for reactivity
  const wants = useSyncExternalStore(subscribe, getSnapshot);
  const want = wantId ? wants.find(w => w.id === wantId) : wants[0];

  const [selectedWantId, setSelectedWantId] = useState<string | null>(wantId || (wants[0]?.id || null));
  const [showAddMetricModal, setShowAddMetricModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  const selectedWant = selectedWantId ? wants.find(w => w.id === selectedWantId) : null;

  if (!selectedWant && wants.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <TrendingUp size={48} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-400">No Wants Yet</h2>
          <p className="text-sm text-gray-500 mt-2">Create a Want to start tracking metrics</p>
        </div>
      </div>
    );
  }

  const handleCellEdit = (date: string, metricName: string, value: number | string | boolean | null) => {
    if (selectedWant) {
      logMetricValue(selectedWant.id, date, metricName, value);
    }
  };

  const handleAddMetric = (metricName: string) => {
    if (selectedWant) {
      addMetricType(selectedWant.id, metricName);
    }
  };

  const handleLogMetrics = (date: string, values: Record<string, number | string | boolean | null>) => {
    if (selectedWant) {
      for (const [metric, value] of Object.entries(values)) {
        logMetricValue(selectedWant.id, date, metric, value);
      }
    }
  };

  // Get chartable metrics (only those with chart rules AND in metricTypes)
  const chartableMetrics = selectedWant?.metricTypes.filter(m => hasChartRule(m)) || [];

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp size={24} className="text-[#4433FF]" />
              Wants Tracking
            </h1>
            <p className="text-xs text-gray-500 mt-1">Track metrics and measure progress toward your want</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Want selector */}
          {wants.length > 1 && (
            <select
              value={selectedWantId || ''}
              onChange={(e) => setSelectedWantId(e.target.value)}
              className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4433FF]"
            >
              {wants.map(w => (
                <option key={w.id} value={w.id}>{w.title}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowAddMetricModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#333] text-white text-sm rounded-lg hover:border-[#4433FF] transition-colors"
          >
            <Plus size={14} />
            Add Metric
          </button>

          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#4433FF] text-white text-sm rounded-lg hover:bg-[#5544FF] transition-colors"
          >
            <Calendar size={14} />
            Log Today
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedWant && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Want info */}
          <div className="bg-[#111] border border-[#222] rounded-lg p-4">
            <h2 className="text-lg font-bold text-white mb-1">{selectedWant.title}</h2>
            <p className="text-sm text-gray-400">{selectedWant.reason}</p>
          </div>

          {/* Metrics table (above charts as requested) */}
          <div className="bg-[#111] border border-[#222] rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-4">Metrics Log</h3>
            <MetricsTable want={selectedWant} onCellEdit={handleCellEdit} />
          </div>

          {/* Charts - below table, only show metrics that have chartRules */}
          {chartableMetrics.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-4">Metric Visualizations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chartableMetrics.map(metric => (
                  <MetricChart key={metric} wantId={selectedWant.id} metricName={metric} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddMetricModal
        isOpen={showAddMetricModal}
        onClose={() => setShowAddMetricModal(false)}
        onAdd={handleAddMetric}
      />

      {selectedWant && (
        <LogMetricsModal
          isOpen={showLogModal}
          onClose={() => setShowLogModal(false)}
          want={selectedWant}
          onLog={handleLogMetrics}
        />
      )}
    </div>
  );
};

export default WantSuccessTrackingView;
