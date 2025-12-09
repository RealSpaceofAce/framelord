// =============================================================================
// METRICS OVERVIEW — Unified dashboard for all tracked metrics
// =============================================================================
// This component displays all metrics tracked by Little Lord in a unified view.
// Metrics are grouped by domain (health, business, relationships, etc.) with
// current values, trends, and progress toward targets.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  Activity,
  Briefcase,
  Heart,
  Zap,
  DollarSign,
  User,
} from 'lucide-react';
import {
  getAllMetricDefinitions,
  getAllMetricSummaries,
  getMetricSummariesByDomain,
  formatMetricValue,
  isMetricOnTrack,
  type MetricDomain,
  type MetricDefinition,
  type MetricSummary,
} from '../../services/metricsStore';
import { CONTACT_ZERO } from '../../services/contactStore';

const MotionDiv = motion.div as any;

// Domain icons mapping
const DOMAIN_ICONS: Record<MetricDomain, React.ReactNode> = {
  health: <Activity size={20} />,
  business: <Briefcase size={20} />,
  relationships: <Heart size={20} />,
  productivity: <Zap size={20} />,
  finance: <DollarSign size={20} />,
  personal: <User size={20} />,
  custom: <Target size={20} />,
};

// Domain colors
const DOMAIN_COLORS: Record<MetricDomain, string> = {
  health: 'text-green-400 border-green-400/30 bg-green-400/10',
  business: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  relationships: 'text-pink-400 border-pink-400/30 bg-pink-400/10',
  productivity: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  finance: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  personal: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  custom: 'text-gray-400 border-gray-400/30 bg-gray-400/10',
};

interface MetricCardProps {
  definition: MetricDefinition;
  summary: MetricSummary;
}

const MetricCard: React.FC<MetricCardProps> = ({ definition, summary }) => {
  const onTrack = isMetricOnTrack(summary, definition);
  const hasTarget = definition.target !== undefined;

  // Trend icon
  const TrendIcon =
    summary.trend === 'up'
      ? TrendingUp
      : summary.trend === 'down'
      ? TrendingDown
      : Minus;

  // Trend color
  const trendColor =
    summary.trend === 'up'
      ? definition.isHigherBetter
        ? 'text-green-400'
        : 'text-red-400'
      : summary.trend === 'down'
      ? definition.isHigherBetter
        ? 'text-red-400'
        : 'text-green-400'
      : 'text-gray-400';

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border border-white/10 rounded-lg p-4 hover:border-fl-primary/30 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-white font-medium mb-1">{definition.name}</h3>
          <p className="text-fl-gray text-xs">{definition.description}</p>
        </div>
        <div className={`p-2 rounded-lg ${DOMAIN_COLORS[definition.domain]}`}>
          {DOMAIN_ICONS[definition.domain]}
        </div>
      </div>

      {/* Current Value */}
      <div className="mb-3">
        <div className="text-3xl font-bold text-white mb-1">
          {summary.currentValue !== null
            ? formatMetricValue(summary.currentValue, definition)
            : '-'}
        </div>
        {summary.lastUpdated && (
          <div className="text-xs text-fl-gray flex items-center gap-1">
            <Calendar size={12} />
            {new Date(summary.lastUpdated).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Trend & Change */}
      {summary.previousValue !== null && summary.changePercentage !== undefined && (
        <div className={`flex items-center gap-2 text-sm ${trendColor} mb-3`}>
          <TrendIcon size={16} />
          <span>{Math.abs(summary.changePercentage).toFixed(1)}%</span>
          <span className="text-xs text-fl-gray">
            from {formatMetricValue(summary.previousValue, definition)}
          </span>
        </div>
      )}

      {/* Target Progress */}
      {hasTarget && summary.currentValue !== null && (
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-fl-gray flex items-center gap-1">
              <Target size={12} />
              Target
            </span>
            <span className="text-white">
              {formatMetricValue(definition.target!, definition)}
            </span>
          </div>
          {onTrack !== null && (
            <div
              className={`text-xs ${
                onTrack ? 'text-green-400' : 'text-yellow-400'
              }`}
            >
              {onTrack ? '✓ On track' : '⚠ Below target'}
            </div>
          )}
        </div>
      )}

      {/* Entry Count */}
      <div className="text-xs text-fl-gray mt-2">
        {summary.entryCount} {summary.entryCount === 1 ? 'entry' : 'entries'}
      </div>
    </MotionDiv>
  );
};

interface DomainSectionProps {
  domain: MetricDomain;
  definitions: MetricDefinition[];
  summaries: MetricSummary[];
}

const DomainSection: React.FC<DomainSectionProps> = ({
  domain,
  definitions,
  summaries,
}) => {
  if (definitions.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-lg ${DOMAIN_COLORS[domain]}`}>
          {DOMAIN_ICONS[domain]}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white capitalize">{domain}</h2>
          <p className="text-sm text-fl-gray">{definitions.length} metrics tracked</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {definitions.map(def => {
          const summary = summaries.find(s => s.metricId === def.id);
          if (!summary) return null;
          return <MetricCard key={def.id} definition={def} summary={summary} />;
        })}
      </div>
    </div>
  );
};

export const MetricsOverview: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<MetricDomain | 'all'>('all');

  const definitions = getAllMetricDefinitions();
  const summaries = getAllMetricSummaries(CONTACT_ZERO.id);

  // Group definitions by domain
  const definitionsByDomain = useMemo(() => {
    const grouped: Record<MetricDomain, MetricDefinition[]> = {
      health: [],
      business: [],
      relationships: [],
      productivity: [],
      finance: [],
      personal: [],
      custom: [],
    };

    definitions.forEach(def => {
      grouped[def.domain].push(def);
    });

    return grouped;
  }, [definitions]);

  // Filter by selected domain
  const filteredDefinitions =
    selectedDomain === 'all'
      ? definitions
      : definitionsByDomain[selectedDomain];

  const filteredSummaries = useMemo(() => {
    if (selectedDomain === 'all') return summaries;
    const metricIds = filteredDefinitions.map(d => d.id);
    return summaries.filter(s => metricIds.includes(s.metricId));
  }, [selectedDomain, filteredDefinitions, summaries]);

  // Calculate stats
  const totalMetrics = definitions.length;
  const activeMetrics = summaries.filter(s => s.currentValue !== null).length;
  const metricsOnTrack = summaries.filter(s => {
    const def = definitions.find(d => d.id === s.metricId);
    return isMetricOnTrack(s, def || null) === true;
  }).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Metrics Overview</h1>
          <p className="text-fl-gray">
            Track your progress across all domains. All metrics are managed by Little
            Lord based on your behavior and data.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card border border-white/10 rounded-lg p-4">
            <div className="text-fl-gray text-sm mb-1">Total Metrics</div>
            <div className="text-3xl font-bold text-white">{totalMetrics}</div>
          </div>
          <div className="glass-card border border-white/10 rounded-lg p-4">
            <div className="text-fl-gray text-sm mb-1">Active Metrics</div>
            <div className="text-3xl font-bold text-green-400">{activeMetrics}</div>
          </div>
          <div className="glass-card border border-white/10 rounded-lg p-4">
            <div className="text-fl-gray text-sm mb-1">On Track</div>
            <div className="text-3xl font-bold text-blue-400">{metricsOnTrack}</div>
          </div>
        </div>

        {/* Domain Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedDomain('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              selectedDomain === 'all'
                ? 'bg-fl-primary text-white'
                : 'glass-card border border-white/10 text-fl-gray hover:text-white'
            }`}
          >
            All Domains
          </button>
          {(Object.keys(definitionsByDomain) as MetricDomain[]).map(domain => {
            const count = definitionsByDomain[domain].length;
            if (count === 0) return null;

            return (
              <button
                key={domain}
                onClick={() => setSelectedDomain(domain)}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  selectedDomain === domain
                    ? DOMAIN_COLORS[domain]
                    : 'glass-card border border-white/10 text-fl-gray hover:text-white'
                }`}
              >
                {DOMAIN_ICONS[domain]}
                <span className="capitalize">{domain}</span>
                <span className="text-xs">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Metrics Display */}
        {selectedDomain === 'all' ? (
          // Show all domains in sections
          Object.entries(definitionsByDomain).map(([domain, defs]) => (
            <DomainSection
              key={domain}
              domain={domain as MetricDomain}
              definitions={defs}
              summaries={summaries}
            />
          ))
        ) : (
          // Show filtered domain
          <DomainSection
            domain={selectedDomain}
            definitions={filteredDefinitions}
            summaries={filteredSummaries}
          />
        )}

        {/* Empty State */}
        {totalMetrics === 0 && (
          <div className="glass-card border border-white/10 rounded-lg p-12 text-center">
            <Target size={48} className="text-fl-gray mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Metrics Yet</h3>
            <p className="text-fl-gray mb-6">
              Little Lord will start tracking metrics as you use FrameLord.
            </p>
            <p className="text-sm text-fl-gray">
              Metrics are automatically created and updated by Little Lord based on your
              activity, progress, and patterns.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
