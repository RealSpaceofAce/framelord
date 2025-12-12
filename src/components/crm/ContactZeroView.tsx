// =============================================================================
// CONTACT ZERO VIEW — "Future AI Cockpit" for User's Network
// =============================================================================
// This is the dedicated view for Contact Zero (the user themselves).
// It shows a high-level dashboard of their entire network and life:
// - What is urgent today
// - Where am I slipping on Wants and relationships
// - What has recently happened
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Zap,
  Target,
  Activity,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Lock,
  Flame,
  Radio,
  Bell,
  FileText,
  Phone,
  MessageSquare,
  BarChart3,
  Brain,
  Sparkles,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Stores
import { CONTACT_ZERO, getContactById, getAllContacts } from '@/services/contactStore';
import { getAllOpenTasks, getOpenTasksByDateRange, getTasksByContactId } from '@/services/taskStore';
import { getInteractionsByAuthorId, getAllInteractions } from '@/services/interactionStore';
import { getMetrics, getStreak, getGoalMetHistory } from '@/services/wantTrackingStore';
import { getFrameScanReports } from '@/services/frameScanReportStore';
import { featureFlags } from '@/config/appConfig';

// Plan Config
import {
  type PlanTier,
  type FeatureKey,
  canUseFeature,
  getRequiredPlan,
  getCurrentUserPlan,
  PLAN_NAMES,
  LOCKED_FEATURE_TEASERS,
} from '@/config/planConfig';

// Metrics
import {
  getNetworkHealthSummary,
  getContactsNeedingAttention,
  getHealthScoreColor,
} from '@/lib/metrics/networkHealth';

// Types
import type { Task } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface ContactZeroViewProps {
  onNavigateToDossier?: (contactId: string) => void;
  onNavigateToTasks?: () => void;
  onNavigateToWants?: () => void;
  onNavigateToFrameScan?: () => void;
  onNavigateToContacts?: () => void;
  onNavigateToCalendar?: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getTodayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDatePlusDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDueTime = (dueAt: string | null | undefined): string => {
  if (!dueAt) return '';
  const date = new Date(dueAt);
  const hasTime = dueAt.includes('T') && !dueAt.endsWith('T00:00:00.000Z');
  if (hasTime) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return '';
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Locked Feature Overlay - Shows when feature requires higher tier
 */
const LockedOverlay: React.FC<{
  featureKey: FeatureKey;
  currentPlan: PlanTier;
}> = ({ featureKey, currentPlan }) => {
  const hasAccess = canUseFeature(currentPlan, featureKey);

  if (hasAccess) return null;

  const requiredPlan = getRequiredPlan(featureKey);
  const teaser = LOCKED_FEATURE_TEASERS[featureKey];

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
      <div className="text-center px-4">
        <Lock size={20} className="mx-auto mb-2 text-gray-500" />
        {teaser ? (
          <>
            <p className="text-sm font-medium text-gray-300 mb-1">{teaser.title}</p>
            <p className="text-[10px] text-gray-500 max-w-[180px] mx-auto mb-2">{teaser.description}</p>
          </>
        ) : null}
        <p className="text-[10px] text-[#4433FF] uppercase tracking-wider">
          {PLAN_NAMES[requiredPlan]} required
        </p>
      </div>
    </div>
  );
};

/**
 * PreFlight Briefing Overlay - Expanded view with all items
 */
const PreFlightBriefingOverlay: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTasks?: () => void;
  onNavigateToDossier?: (contactId: string) => void;
}> = ({ isOpen, onClose, onNavigateToTasks, onNavigateToDossier }) => {
  const todayKey = getTodayKey();
  const openTasks = getAllOpenTasks();
  const todayTasks = openTasks.filter(t => t.dueAt?.startsWith(todayKey));
  const overdueTasks = openTasks.filter(t => t.dueAt && t.dueAt < todayKey);
  const contactsNeedingAttention = getContactsNeedingAttention(10);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#0c1424] border border-[#1b2c45] rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4433FF] to-[#7a5dff] flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Pre-Flight Briefing</h2>
                <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#1b2c45] rounded-lg transition-colors"
            >
              <Eye size={16} />
            </button>
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tasks Column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-400" />
                  Tasks Requiring Action
                </h3>
                {onNavigateToTasks && (
                  <button
                    onClick={() => {
                      onNavigateToTasks();
                      onClose();
                    }}
                    className="text-xs text-[#4433FF] hover:text-white"
                  >
                    View All
                  </button>
                )}
              </div>

              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-red-400 uppercase tracking-wider mb-2">
                    {overdueTasks.length} Overdue
                  </p>
                  <div className="space-y-2">
                    {overdueTasks.slice(0, 5).map(task => {
                      const contact = getContactById(task.contactId);
                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (contact) {
                              onNavigateToDossier?.(contact.id);
                              onClose();
                            }
                          }}
                          className="flex items-center gap-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg cursor-pointer hover:border-red-500/50 transition-colors"
                        >
                          {contact && (
                            <img
                              src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                              alt={contact.fullName}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{task.title}</p>
                            <p className="text-[10px] text-gray-500">{contact?.fullName || 'Unassigned'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Due Today */}
              {todayTasks.length > 0 && (
                <div>
                  <p className="text-[10px] text-green-400 uppercase tracking-wider mb-2">
                    {todayTasks.length} Due Today
                  </p>
                  <div className="space-y-2">
                    {todayTasks.slice(0, 5).map(task => {
                      const contact = getContactById(task.contactId);
                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (contact) {
                              onNavigateToDossier?.(contact.id);
                              onClose();
                            }
                          }}
                          className="flex items-center gap-3 p-2 bg-[#0a111d] border border-[#112035] rounded-lg cursor-pointer hover:border-[#1b2c45] transition-colors"
                        >
                          {contact && (
                            <img
                              src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                              alt={contact.fullName}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{task.title}</p>
                            <p className="text-[10px] text-gray-500">
                              {contact?.fullName || 'Unassigned'}
                              {formatDueTime(task.dueAt) && ` • ${formatDueTime(task.dueAt)}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {overdueTasks.length === 0 && todayTasks.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle2 size={24} className="mx-auto mb-2 text-green-400" />
                  <p className="text-sm">No urgent tasks</p>
                </div>
              )}
            </div>

            {/* Contacts Column */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                <Users size={14} className="text-blue-400" />
                Contacts Needing Attention
              </h3>

              {contactsNeedingAttention.length > 0 ? (
                <div className="space-y-2">
                  {contactsNeedingAttention.map(({ contact, daysSinceContact, status }) => (
                    <div
                      key={contact.id}
                      onClick={() => {
                        onNavigateToDossier?.(contact.id);
                        onClose();
                      }}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        status === 'critical'
                          ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                          : 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
                      }`}
                    >
                      <img
                        src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                        alt={contact.fullName}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{contact.fullName}</p>
                        <p className="text-[10px] text-gray-500">{contact.relationshipRole || contact.relationshipDomain}</p>
                      </div>
                      <span className={`text-xs font-medium ${status === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {daysSinceContact}d ago
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Users size={24} className="mx-auto mb-2 text-green-400" />
                  <p className="text-sm">All contacts healthy</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * PreFlight Briefing Strip - AI-generated daily summary
 */
const PreFlightBriefing: React.FC<{
  plan: PlanTier;
  onExpand: () => void;
}> = ({ plan, onExpand }) => {
  const todayKey = getTodayKey();
  const openTasks = getAllOpenTasks();
  const todayTasks = openTasks.filter(t => t.dueAt?.startsWith(todayKey));
  const overdueTasks = openTasks.filter(t => t.dueAt && t.dueAt < todayKey);
  const recentInteractions = getInteractionsByAuthorId(CONTACT_ZERO.id).slice(0, 5);

  // Get network health summary
  const networkHealth = getNetworkHealthSummary();

  // Generate briefing points
  const briefingPoints: string[] = [];

  if (overdueTasks.length > 0) {
    briefingPoints.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} need attention`);
  }
  if (todayTasks.length > 0) {
    briefingPoints.push(`${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today`);
  }
  if (networkHealth.criticalCount > 0) {
    briefingPoints.push(`${networkHealth.criticalCount} contact${networkHealth.criticalCount > 1 ? 's' : ''} need attention`);
  }
  if (recentInteractions.length === 0) {
    briefingPoints.push('No recent interactions logged');
  }

  if (briefingPoints.length === 0) {
    briefingPoints.push('All clear — no urgent items');
  }

  return (
    <div className="relative bg-gradient-to-r from-[#0a1628] via-[#0c1a30] to-[#0a1628] border border-[#1b2c45] rounded-xl p-4 overflow-hidden">
      <LockedOverlay featureKey="preflight_briefing" currentPlan={plan} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(68,51,255,0.1),transparent_50%)]" />
      <div className="relative flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4433FF] to-[#7a5dff] flex items-center justify-center shadow-[0_0_20px_rgba(68,51,255,0.4)]">
          <Sparkles size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-[#4433FF] uppercase tracking-widest">Pre-Flight Briefing</span>
            <span className="text-[9px] text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {briefingPoints.map((point, i) => (
              <span key={i} className="text-sm text-gray-300 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#4433FF]" />
                {point}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onExpand}
          className="px-3 py-1.5 text-xs font-semibold text-[#4433FF] border border-[#4433FF]/30 rounded-lg hover:bg-[#4433FF]/10 transition-colors"
        >
          Expand
        </button>
      </div>
    </div>
  );
};

/**
 * Things Due Today Card - Tasks requiring action
 */
const ThingsDueToday: React.FC<{
  plan: PlanTier;
  onNavigateToTasks?: () => void;
  onNavigateToCalendar?: () => void;
  onNavigateToDossier?: (contactId: string) => void;
}> = ({ plan, onNavigateToTasks, onNavigateToCalendar, onNavigateToDossier }) => {
  const todayKey = getTodayKey();
  const openTasks = getAllOpenTasks();

  const todayTasks = openTasks
    .filter(t => t.dueAt?.startsWith(todayKey))
    .sort((a, b) => {
      if (!a.dueAt || !b.dueAt) return 0;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, 5);

  const overdueTasks = openTasks.filter(t => t.dueAt && t.dueAt < todayKey);

  return (
    <div className="relative bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4 h-full">
      <LockedOverlay featureKey="things_due_today" currentPlan={plan} />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Due Today</span>
        </div>
        {overdueTasks.length > 0 && (
          <span className="text-[9px] px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
            {overdueTasks.length} overdue
          </span>
        )}
      </div>

      {todayTasks.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No tasks due today</p>
          <p className="text-[10px] text-gray-600 mt-1">Enjoy your clear schedule</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todayTasks.map(task => {
            const contact = getContactById(task.contactId);
            return (
              <div
                key={task.id}
                onClick={() => {
                  if (contact && onNavigateToDossier) {
                    onNavigateToDossier(contact.id);
                  }
                }}
                className="flex items-center gap-3 p-2 bg-[#0a111d] rounded-lg border border-[#112035] hover:border-[#1b2c45] transition-colors cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{task.title}</p>
                  {formatDueTime(task.dueAt) && (
                    <p className="text-[10px] text-gray-500">{formatDueTime(task.dueAt)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer links */}
      <div className="flex items-center gap-2 mt-3">
        {onNavigateToTasks && (
          <button
            onClick={onNavigateToTasks}
            className="flex-1 text-xs text-[#4433FF] hover:text-white flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-[#4433FF]/10 transition-colors"
          >
            View All Tasks <ChevronRight size={14} />
          </button>
        )}
        {onNavigateToCalendar && (
          <button
            onClick={onNavigateToCalendar}
            className="p-2 text-gray-400 hover:text-[#4433FF] hover:bg-[#4433FF]/10 rounded-lg transition-colors"
            title="Open Calendar"
          >
            <Calendar size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Network Health Card - Contact relationship overview
 */
const NetworkHealth: React.FC<{
  plan: PlanTier;
  onNavigateToContacts?: () => void;
  onNavigateToDossier?: (contactId: string) => void;
}> = ({ plan, onNavigateToContacts, onNavigateToDossier }) => {
  // Use the network health helper
  const healthSummary = getNetworkHealthSummary();
  const contactsNeedingAttention = getContactsNeedingAttention(4);

  return (
    <div className="relative bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4 h-full">
      <LockedOverlay featureKey="network_health" currentPlan={plan} />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-blue-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Network Health</span>
        </div>
        <span className={`text-lg font-bold ${getHealthScoreColor(healthSummary.overallScore)}`}>
          {healthSummary.overallScore}%
        </span>
      </div>

      {/* Health breakdown */}
      <div className="flex gap-2 mb-3">
        <span className="text-[9px] px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
          {healthSummary.healthyCount} healthy
        </span>
        {healthSummary.warningCount > 0 && (
          <span className="text-[9px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full">
            {healthSummary.warningCount} warning
          </span>
        )}
        {healthSummary.criticalCount > 0 && (
          <span className="text-[9px] px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
            {healthSummary.criticalCount} critical
          </span>
        )}
      </div>

      {contactsNeedingAttention.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">All contacts healthy</p>
          <p className="text-[10px] text-gray-600 mt-1">You're staying connected</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 mb-2">Needs attention:</p>
          {contactsNeedingAttention.map(({ contact, daysSinceContact, status }) => (
            <div
              key={contact.id}
              onClick={() => onNavigateToDossier?.(contact.id)}
              className="flex items-center gap-3 p-2 bg-[#0a111d] rounded-lg border border-[#112035] hover:border-[#1b2c45] transition-colors cursor-pointer"
            >
              <img
                src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                alt={contact.fullName}
                className="w-6 h-6 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{contact.fullName}</p>
              </div>
              <span className={`text-[10px] ${status === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                {daysSinceContact}d ago
              </span>
            </div>
          ))}
        </div>
      )}

      {onNavigateToContacts && (
        <button
          onClick={onNavigateToContacts}
          className="w-full mt-3 text-xs text-[#4433FF] hover:text-white flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-[#4433FF]/10 transition-colors"
        >
          View All Contacts <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};

/**
 * Radar Widget - Attention/alerts overview
 */
const RadarWidget: React.FC<{
  plan: PlanTier;
  onNavigateToTasks?: () => void;
  onNavigateToContacts?: () => void;
  onNavigateToFrameScan?: () => void;
}> = ({ plan, onNavigateToTasks, onNavigateToContacts, onNavigateToFrameScan }) => {
  const openTasks = getAllOpenTasks();
  const todayKey = getTodayKey();
  const overdueTasks = openTasks.filter(t => t.dueAt && t.dueAt < todayKey);
  const reports = getFrameScanReports();
  const recentReports = reports.filter(r => {
    const reportDate = new Date(r.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return reportDate > sevenDaysAgo;
  });

  // Get network health for alerts
  const healthSummary = getNetworkHealthSummary();

  const alerts: Array<{
    type: 'warning' | 'alert';
    message: string;
    onClick?: () => void;
  }> = [
    ...(overdueTasks.length > 0 ? [{
      type: 'warning' as const,
      message: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
      onClick: onNavigateToTasks,
    }] : []),
    ...(recentReports.filter(r => r.score.frameScore < 50).length > 0 ? [{
      type: 'alert' as const,
      message: 'Low FrameScore detected',
      onClick: onNavigateToFrameScan,
    }] : []),
    ...(healthSummary.criticalCount > 0 ? [{
      type: 'warning' as const,
      message: `${healthSummary.criticalCount} contact${healthSummary.criticalCount > 1 ? 's' : ''} need attention`,
      onClick: onNavigateToContacts,
    }] : []),
  ];

  return (
    <div className="relative bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4 h-full">
      <LockedOverlay featureKey="radar_widget" currentPlan={plan} />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-purple-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Radar</span>
        </div>
        {alerts.length > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-green-400" />
          </div>
          <p className="text-sm text-gray-400">All clear</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              onClick={alert.onClick}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                alert.type === 'alert'
                  ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                  : 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
              }`}
            >
              <AlertTriangle size={14} className={alert.type === 'alert' ? 'text-red-400' : 'text-yellow-400'} />
              <span className="text-sm text-gray-300">{alert.message}</span>
              <ChevronRight size={14} className="ml-auto text-gray-500" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Live Feed - Recent activity stream
 */
const LiveFeed: React.FC<{
  plan: PlanTier;
  onNavigateToDossier?: (contactId: string) => void;
}> = ({ plan, onNavigateToDossier }) => {
  const interactions = getAllInteractions()
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 5);

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={12} className="text-green-400" />;
      case 'message': case 'dm': return <MessageSquare size={12} className="text-blue-400" />;
      default: return <Activity size={12} className="text-gray-400" />;
    }
  };

  return (
    <div className="relative bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4 h-full">
      <LockedOverlay featureKey="live_feed" currentPlan={plan} />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-cyan-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Feed</span>
        </div>
      </div>

      {interactions.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-2">
          {interactions.map(interaction => {
            const contact = getContactById(interaction.contactId);
            return (
              <div
                key={interaction.id}
                onClick={() => onNavigateToDossier?.(interaction.contactId)}
                className="flex items-start gap-2 p-2 bg-[#0a111d] rounded-lg border border-[#112035] hover:border-[#1b2c45] transition-colors cursor-pointer"
              >
                {getInteractionIcon(interaction.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{interaction.summary}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-500">{contact?.fullName || 'Unknown'}</span>
                    <span className="text-[10px] text-gray-600">
                      {new Date(interaction.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Wants & Streaks Panel - Compliance tracking
 */
const WantsStreaksPanel: React.FC<{
  plan: PlanTier;
  onNavigateToWants?: () => void;
}> = ({ plan, onNavigateToWants }) => {
  const metrics = getMetrics();
  const activeMetrics = metrics.filter(m => m.isActive).slice(0, 4);

  return (
    <div className="relative bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4">
      <LockedOverlay featureKey="wants_streaks" currentPlan={plan} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-orange-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Wants & Streaks</span>
        </div>
        {onNavigateToWants && (
          <button
            onClick={onNavigateToWants}
            className="text-xs text-[#4433FF] hover:text-white flex items-center gap-1"
          >
            View All <ChevronRight size={14} />
          </button>
        )}
      </div>

      {activeMetrics.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">No active wants</p>
          <p className="text-[10px] text-gray-600 mt-1">Define what you want to track</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {activeMetrics.map(metric => {
            const streak = getStreak(metric.slug);
            return (
              <div
                key={metric.slug}
                className="p-3 bg-[#0a111d] rounded-lg border border-[#112035]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: metric.color || '#4433FF' }}
                  />
                  <span className="text-xs text-white font-medium truncate">{metric.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame size={12} className={streak > 0 ? 'text-orange-400' : 'text-gray-600'} />
                  <span className={`text-sm font-bold ${streak > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                    {streak} day{streak !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Frame Stats Panel - FrameScore overview
 */
const FrameStatsPanel: React.FC<{
  plan: PlanTier;
  onNavigateToFrameScan?: () => void;
}> = ({ plan, onNavigateToFrameScan }) => {
  const reports = getFrameScanReports();
  const recentReports = reports
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const averageScore = recentReports.length > 0
    ? Math.round(recentReports.reduce((sum, r) => sum + r.score.frameScore, 0) / recentReports.length)
    : null;

  return (
    <div className="relative bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4">
      <LockedOverlay featureKey="frame_analytics" currentPlan={plan} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-[#4433FF]" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Frame Analytics</span>
        </div>
        {onNavigateToFrameScan && (
          <button
            onClick={onNavigateToFrameScan}
            className="text-xs text-[#4433FF] hover:text-white flex items-center gap-1"
          >
            View All <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className={`text-3xl font-bold ${
            averageScore === null ? 'text-gray-500' :
            averageScore >= 70 ? 'text-green-400' :
            averageScore >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {averageScore ?? '—'}
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Score</p>
        </div>
        <div className="flex-1 text-center">
          <div className="text-xl font-bold text-white">{reports.length}</div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Scans</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-white">{recentReports.length}</div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">This Week</p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ContactZeroView: React.FC<ContactZeroViewProps> = ({
  onNavigateToDossier,
  onNavigateToTasks,
  onNavigateToWants,
  onNavigateToFrameScan,
  onNavigateToContacts,
  onNavigateToCalendar,
}) => {
  // Get user's plan from config (will come from auth/tenant context later)
  const userPlan = getCurrentUserPlan();

  // Pre-flight briefing expanded state
  const [isPreFlightExpanded, setIsPreFlightExpanded] = useState(false);

  const contact = CONTACT_ZERO;

  return (
    <div className="relative min-h-screen text-[#dce8ff]">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(68,51,255,0.08),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(68,140,255,0.12),transparent_28%),linear-gradient(140deg,#050810_0%,#060b17_45%,#04060d_100%)]" />

      {/* Pre-Flight Briefing Overlay */}
      <PreFlightBriefingOverlay
        isOpen={isPreFlightExpanded}
        onClose={() => setIsPreFlightExpanded(false)}
        onNavigateToTasks={onNavigateToTasks}
        onNavigateToDossier={onNavigateToDossier}
      />

      <div className="relative space-y-6 pb-20 px-4 lg:px-8">
        {/* HEADER */}
        <div className="bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-[#4433FF] to-[#7a5dff] opacity-50 blur-sm" />
              <img
                src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                alt={contact.fullName}
                className="relative w-12 h-12 rounded-full border-2 border-[#0c1424]"
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#4433FF]">Command Center</p>
              <h1 className="text-xl font-display font-bold text-white">{contact.fullName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-3 py-1 rounded-full border border-[#4433FF]/50 bg-[#4433FF]/20 text-[#4433FF] font-semibold uppercase tracking-wider">
              Contact Zero
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full border border-gray-600/50 bg-gray-800/50 text-gray-400 uppercase tracking-wider">
              {PLAN_NAMES[userPlan]}
            </span>
          </div>
        </div>

        {/* PRE-FLIGHT BRIEFING */}
        <PreFlightBriefing
          plan={userPlan}
          onExpand={() => setIsPreFlightExpanded(true)}
        />

        {/* FRAME INTEGRITY - Prominent position, visible without scrolling */}
        <FrameStatsPanel plan={userPlan} onNavigateToFrameScan={onNavigateToFrameScan} />

        {/* MAIN GRID - 2x2 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ThingsDueToday
            plan={userPlan}
            onNavigateToTasks={onNavigateToTasks}
            onNavigateToCalendar={onNavigateToCalendar}
            onNavigateToDossier={onNavigateToDossier}
          />
          <NetworkHealth
            plan={userPlan}
            onNavigateToContacts={onNavigateToContacts}
            onNavigateToDossier={onNavigateToDossier}
          />
          <RadarWidget
            plan={userPlan}
            onNavigateToTasks={onNavigateToTasks}
            onNavigateToContacts={onNavigateToContacts}
            onNavigateToFrameScan={onNavigateToFrameScan}
          />
          <LiveFeed plan={userPlan} onNavigateToDossier={onNavigateToDossier} />
        </div>

        {/* BELOW-FOLD PANELS */}
        <div className="w-full">
          <WantsStreaksPanel plan={userPlan} onNavigateToWants={onNavigateToWants} />
        </div>
      </div>
    </div>
  );
};

export default ContactZeroView;
