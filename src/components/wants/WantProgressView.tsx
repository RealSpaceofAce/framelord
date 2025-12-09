// =============================================================================
// WANT PROGRESS VIEW — Progress tracking across all Wants (shadcn-ui)
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Target, CheckCircle2, Clock, AlertCircle, TrendingUp, Calendar, ChevronRight, Grid, List, BarChart3 } from 'lucide-react';
import {
  getAllWants,
  getStepCompletionPercentage,
  type Want,
  type WantStatus,
} from '../../services/wantStore';
import { getCongruencyScore } from '../../services/wantScopeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ScrollArea } from '../ui/ScrollArea';
import { cn } from '@/lib/utils';
import { DomainMetricsPanel } from '../metrics';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

interface WantProgressViewProps {
  onSelectWant?: (wantId: string) => void;
}

// =============================================================================
// PROGRESS CARD — Using shadcn Card
// =============================================================================

interface ProgressCardProps {
  want: Want;
  onClick: () => void;
}

const ProgressCard: React.FC<ProgressCardProps> = ({ want, onClick }) => {
  const completionPct = getStepCompletionPercentage(want.id);
  const completedSteps = want.steps.filter(s => s.status === 'done').length;
  const inProgressSteps = want.steps.filter(s => s.status === 'in_progress').length;

  const isOverdue = want.deadline && new Date(want.deadline) < new Date() && want.status !== 'done';
  const daysUntilDeadline = want.deadline
    ? Math.ceil((new Date(want.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const getStatusVariant = (status: WantStatus): 'muted' | 'info' | 'success' => {
    switch (status) {
      case 'not_started': return 'muted';
      case 'in_progress': return 'info';
      case 'done': return 'success';
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all hover:border-primary/50 group",
          "bg-[#0A0A0F] hover:shadow-lg hover:shadow-primary/5"
        )}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm line-clamp-1">{want.title}</CardTitle>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{want.reason}</p>
            </div>
            <Badge variant={getStatusVariant(want.status)} className="ml-2 shrink-0">
              {want.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-foreground font-medium">{completionPct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#0E0E16] rounded-lg p-2 text-center border border-[#0043ff]/10">
              <div className="text-lg font-bold text-green-500">{completedSteps}</div>
              <div className="text-[10px] text-muted-foreground">Done</div>
            </div>
            <div className="bg-[#0E0E16] rounded-lg p-2 text-center border border-[#0043ff]/10">
              <div className="text-lg font-bold text-blue-500">{inProgressSteps}</div>
              <div className="text-[10px] text-muted-foreground">Active</div>
            </div>
            <div className="bg-[#0E0E16] rounded-lg p-2 text-center border border-[#0043ff]/10">
              <div className="text-lg font-bold text-muted-foreground">{want.steps.length - completedSteps - inProgressSteps}</div>
              <div className="text-[10px] text-muted-foreground">Pending</div>
            </div>
          </div>

          {/* Timeline */}
          {want.deadline && (
            <div className={cn(
              "flex items-center justify-between text-xs",
              isOverdue ? "text-destructive" : "text-muted-foreground"
            )}>
              <div className="flex items-center gap-1">
                {isOverdue ? <AlertCircle size={12} /> : <Calendar size={12} />}
                <span>{new Date(want.deadline).toLocaleDateString()}</span>
              </div>
              <span>
                {isOverdue
                  ? `${Math.abs(daysUntilDeadline!)} days overdue`
                  : daysUntilDeadline === 0
                    ? 'Due today'
                    : `${daysUntilDeadline} days left`
                }
              </span>
            </div>
          )}

          {/* Arrow indicator */}
          <div className="flex justify-end mt-2">
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </MotionDiv>
  );
};

// =============================================================================
// AGGREGATE PROGRESS CHART — Large overview chart
// =============================================================================

interface ProgressDataPoint {
  date: string;
  wantsCompleted: number;
  stepsCompleted: number;
  avgCongruency: number;
}

interface AggregateProgressChartProps {
  wants: Want[];
}

const AggregateProgressChart: React.FC<AggregateProgressChartProps> = ({ wants }) => {
  // Generate mock time series data based on Want/Step completion dates
  // In a real app, this would come from actual completion timestamps
  const chartData = useMemo(() => {
    const data: ProgressDataPoint[] = [];
    const now = new Date();

    // Generate last 14 days of data
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Calculate cumulative completions up to this date
      // (simplified - in production, use actual completion timestamps)
      const dayOfProgress = 14 - i;
      const progressFactor = dayOfProgress / 14;

      const totalWantsCompleted = wants.filter(w => w.status === 'done').length;
      const totalStepsCompleted = wants.reduce(
        (sum, w) => sum + w.steps.filter(s => s.status === 'done').length,
        0
      );

      // Simulate progressive completion over time
      const wantsCompleted = Math.round(totalWantsCompleted * progressFactor);
      const stepsCompleted = Math.round(totalStepsCompleted * progressFactor);

      // Calculate average congruency
      const avgCongruency = wants.length > 0
        ? Math.round(wants.reduce((sum, w) => sum + getCongruencyScore(w.id), 0) / wants.length * progressFactor)
        : 0;

      data.push({
        date: dateStr,
        wantsCompleted,
        stepsCompleted,
        avgCongruency,
      });
    }

    return data;
  }, [wants]);

  const formatXAxis = (date: string) => date;

  if (wants.length === 0) {
    return (
      <Card className="mb-6 bg-[#0A0A0F] border-[#0043ff]/20">
        <CardContent className="p-8">
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={48} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No data to display yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create Wants and complete steps to see progress</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 bg-[#0A0A0F] border-[#0043ff]/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          Progress Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="wantsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="congruencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area
                type="monotone"
                dataKey="stepsCompleted"
                name="Steps Completed"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#stepsGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="wantsCompleted"
                name="Wants Completed"
                stroke="#22C55E"
                fillOpacity={1}
                fill="url(#wantsGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="avgCongruency"
                name="Avg Congruency"
                stroke="#8B5CF6"
                fillOpacity={1}
                fill="url(#congruencyGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// SUMMARY STATS — Using shadcn Card
// =============================================================================

interface SummaryStatsProps {
  wants: Want[];
}

const SummaryStats: React.FC<SummaryStatsProps> = ({ wants }) => {
  const totalWants = wants.length;
  const completedWants = wants.filter(w => w.status === 'done').length;
  const inProgressWants = wants.filter(w => w.status === 'in_progress').length;
  const totalSteps = wants.reduce((sum, w) => sum + w.steps.length, 0);
  const completedSteps = wants.reduce((sum, w) => sum + w.steps.filter(s => s.status === 'done').length, 0);
  const overallCompletion = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const stats = [
    { label: 'Total Wants', value: totalWants, icon: Target, color: 'text-primary' },
    { label: 'Completed', value: completedWants, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'In Progress', value: inProgressWants, icon: Clock, color: 'text-blue-500' },
    { label: 'Overall Progress', value: `${overallCompletion}%`, icon: TrendingUp, color: 'text-purple-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <MotionDiv
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="bg-[#0A0A0F] border-[#0043ff]/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={16} className={stat.color} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className={cn("text-2xl font-bold", stat.color)}>{stat.value}</div>
            </CardContent>
          </Card>
        </MotionDiv>
      ))}
    </div>
  );
};

// =============================================================================
// TIMELINE VIEW — Using shadcn Card
// =============================================================================

interface TimelineViewProps {
  wants: Want[];
  onSelectWant: (wantId: string) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ wants, onSelectWant }) => {
  const sortedWants = [...wants].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Calendar size={16} className="text-primary" />
        Timeline
      </h3>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-[#0043ff]/20" />

        <div className="space-y-4">
          {sortedWants.map((want, index) => {
            const completionPct = getStepCompletionPercentage(want.id);
            const isOverdue = want.deadline && new Date(want.deadline) < new Date() && want.status !== 'done';

            return (
              <MotionDiv
                key={want.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-10 cursor-pointer group"
                onClick={() => onSelectWant(want.id)}
              >
                <div className={cn(
                  "absolute left-2.5 w-3 h-3 rounded-full border-2",
                  want.status === 'done'
                    ? 'bg-green-500 border-green-500'
                    : isOverdue
                      ? 'bg-destructive border-destructive'
                      : 'bg-card border-primary'
                )} />

                <Card className="transition-all group-hover:border-primary/50 bg-[#0A0A0F] border-[#0043ff]/20">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{want.title}</span>
                      <span className="text-xs text-muted-foreground">{completionPct}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {want.deadline ? (
                        <span className={isOverdue ? 'text-destructive' : ''}>
                          {new Date(want.deadline).toLocaleDateString()}
                        </span>
                      ) : (
                        <span>No deadline</span>
                      )}
                      <span>•</span>
                      <span>{want.steps.length} steps</span>
                    </div>
                  </CardContent>
                </Card>
              </MotionDiv>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WantProgressView: React.FC<WantProgressViewProps> = ({ onSelectWant }) => {
  const [wants, setWants] = useState<Want[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');

  useEffect(() => {
    setWants(getAllWants());
  }, []);

  const handleSelectWant = (wantId: string) => {
    onSelectWant?.(wantId);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Sub-header with view toggle */}
      <div className="px-6 py-3 border-b border-[#0043ff]/20 flex items-center justify-between shrink-0">
        <p className="text-sm text-muted-foreground">
          Track your progress across all Wants
        </p>
        <div className="flex items-center gap-1 bg-[#0E0E16] rounded-lg p-1 border border-[#0043ff]/20">
          <Button
            variant={viewMode === 'grid' ? 'brand' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="gap-1.5"
          >
            <Grid size={14} />
            Grid
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'brand' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('timeline')}
            className="gap-1.5"
          >
            <List size={14} />
            Timeline
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Aggregate Progress Chart - Primary visual */}
          <AggregateProgressChart wants={wants} />

          {/* Summary Stats */}
          <SummaryStats wants={wants} />

          {/* Domain-Specific Metrics - Productivity metrics relevant to Wants */}
          <DomainMetricsPanel
            domain="productivity"
            title="Productivity Metrics"
            className="mb-6"
            maxMetrics={6}
          />

          {/* Personal Growth Metrics - Also relevant to Wants */}
          <DomainMetricsPanel
            domain="personal"
            title="Personal Growth"
            className="mb-6"
            maxMetrics={6}
          />

          {/* View Content */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wants.map(want => (
                <ProgressCard
                  key={want.id}
                  want={want}
                  onClick={() => handleSelectWant(want.id)}
                />
              ))}
              {wants.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Target size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No Wants defined yet</p>
                  <p className="text-xs mt-1">Create your first Want to start tracking progress</p>
                </div>
              )}
            </div>
          ) : (
            <TimelineView wants={wants} onSelectWant={handleSelectWant} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default WantProgressView;
