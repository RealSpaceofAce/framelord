// =============================================================================
// DOMAIN METRICS PANEL — Domain-specific metrics display
// =============================================================================
// This component displays metrics filtered by domain for use in
// domain-specific views (e.g., productivity metrics in Wants view).
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import {
  getMetricSummariesByDomain,
  getAllMetricDefinitions,
  formatMetricValue,
  isMetricOnTrack,
  type MetricDomain,
  type MetricDefinition,
  type MetricSummary,
} from '../../services/metricsStore';
import { CONTACT_ZERO } from '../../services/contactStore';
import { Card, CardContent } from '../ui/Card';
import { cn } from '@/lib/utils';

const MotionDiv = motion.div as any;

interface DomainMetricsPanelProps {
  domain: MetricDomain;
  title?: string;
  className?: string;
  maxMetrics?: number; // Limit number of metrics shown
}

export const DomainMetricsPanel: React.FC<DomainMetricsPanelProps> = ({
  domain,
  title,
  className,
  maxMetrics = 6,
}) => {
  const definitions = getAllMetricDefinitions().filter(d => d.domain === domain);
  const summaries = getMetricSummariesByDomain(domain, CONTACT_ZERO.id);

  // Limit to most recent metrics
  const displayMetrics = summaries.slice(0, maxMetrics);

  if (definitions.length === 0 || displayMetrics.length === 0) {
    return null; // Don't show panel if no metrics exist
  }

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
          <Target size={16} className="text-primary" />
          {title}
        </h3>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {displayMetrics.map((summary, index) => {
          const definition = definitions.find(d => d.id === summary.metricId);
          if (!definition) return null;

          const onTrack = isMetricOnTrack(summary, definition);

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
                ? 'text-green-500'
                : 'text-red-500'
              : summary.trend === 'down'
              ? definition.isHigherBetter
                ? 'text-red-500'
                : 'text-green-500'
              : 'text-muted-foreground';

          return (
            <MotionDiv
              key={summary.metricId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-[#0A0A0F] border-[#0043ff]/20 hover:border-primary/30 transition-all">
                <CardContent className="p-3">
                  {/* Metric Name */}
                  <div className="text-xs text-muted-foreground mb-1 line-clamp-1">
                    {definition.name}
                  </div>

                  {/* Current Value */}
                  <div className="text-xl font-bold text-foreground mb-1">
                    {summary.currentValue !== null
                      ? formatMetricValue(summary.currentValue, definition)
                      : '-'}
                  </div>

                  {/* Trend & Target Indicator */}
                  <div className="flex items-center justify-between">
                    {/* Trend */}
                    {summary.changePercentage !== undefined && (
                      <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
                        <TrendIcon size={12} />
                        <span>{Math.abs(summary.changePercentage).toFixed(0)}%</span>
                      </div>
                    )}

                    {/* On Track Indicator */}
                    {onTrack !== null && (
                      <div
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded",
                          onTrack
                            ? "bg-green-500/20 text-green-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        )}
                      >
                        {onTrack ? 'On Track' : 'Off Track'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>
          );
        })}
      </div>

      {summaries.length > maxMetrics && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {maxMetrics} of {summaries.length} metrics
        </p>
      )}
    </div>
  );
};
