// =============================================================================
// NETWORK HEALTH METRIC — Calculates relationship health score
// =============================================================================
// Provides network-level health metrics based on interaction recency,
// task completion, and contact engagement patterns.
// =============================================================================

import { getAllContacts, CONTACT_ZERO } from '@/services/contactStore';
import { getAllInteractions } from '@/services/interactionStore';
import { getAllOpenTasks } from '@/services/taskStore';
import type { Contact, Interaction } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

export interface ContactHealthMetric {
  contactId: string;
  contact: Contact;
  lastInteractionDate: Date | null;
  daysSinceContact: number;
  openTaskCount: number;
  overdueTaskCount: number;
  healthScore: number;  // 0-100, higher is better
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
}

export interface NetworkHealthSummary {
  overallScore: number;  // 0-100, weighted average
  totalContacts: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  unknownCount: number;
  contactsNeedingAttention: ContactHealthMetric[];
  recentlyContactedCount: number;  // Last 7 days
}

// =============================================================================
// THRESHOLDS
// =============================================================================

/** Days thresholds for health status */
export const HEALTH_THRESHOLDS = {
  /** Days without contact to be considered healthy */
  healthy: 7,
  /** Days without contact to trigger warning */
  warning: 14,
  /** Days without contact to be critical */
  critical: 30,
};

/** Weight factors for health score calculation */
const HEALTH_WEIGHTS = {
  recency: 0.6,      // How recent was last contact
  taskLoad: 0.25,    // Open task burden
  overduePenalty: 0.15,  // Penalty for overdue tasks
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the most recent interaction for a contact.
 */
const getLastInteraction = (
  contactId: string,
  interactions: Interaction[]
): Interaction | null => {
  const contactInteractions = interactions
    .filter(i => i.contactId === contactId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return contactInteractions[0] || null;
};

/**
 * Calculate days since a date.
 */
const daysSince = (date: Date | null): number => {
  if (!date) return 999;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Calculate health score for a single contact.
 * Score is 0-100, higher is better.
 */
const calculateContactHealthScore = (
  daysSinceContact: number,
  openTaskCount: number,
  overdueTaskCount: number
): number => {
  // Recency score: 100 if contacted today, 0 if 30+ days
  const recencyScore = Math.max(0, 100 - (daysSinceContact / HEALTH_THRESHOLDS.critical) * 100);

  // Task load score: 100 if no open tasks, decreases with more tasks
  const taskLoadScore = Math.max(0, 100 - (openTaskCount * 20));

  // Overdue penalty: 100 if no overdue, decreases sharply with overdue
  const overdueScore = overdueTaskCount > 0
    ? Math.max(0, 100 - (overdueTaskCount * 40))
    : 100;

  // Weighted average
  const weightedScore =
    (recencyScore * HEALTH_WEIGHTS.recency) +
    (taskLoadScore * HEALTH_WEIGHTS.taskLoad) +
    (overdueScore * HEALTH_WEIGHTS.overduePenalty);

  return Math.round(weightedScore);
};

/**
 * Determine health status based on days since contact.
 */
const getHealthStatus = (
  daysSinceContact: number
): 'healthy' | 'warning' | 'critical' | 'unknown' => {
  if (daysSinceContact === 999) return 'unknown';
  if (daysSinceContact <= HEALTH_THRESHOLDS.healthy) return 'healthy';
  if (daysSinceContact <= HEALTH_THRESHOLDS.warning) return 'warning';
  return 'critical';
};

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get health metrics for a single contact.
 */
export const getContactHealth = (contactId: string): ContactHealthMetric | null => {
  const contact = getAllContacts().find(c => c.id === contactId);
  if (!contact || contact.id === CONTACT_ZERO.id) return null;

  const interactions = getAllInteractions();
  const openTasks = getAllOpenTasks();
  const today = new Date().toISOString().split('T')[0];

  const lastInteraction = getLastInteraction(contactId, interactions);
  const lastInteractionDate = lastInteraction
    ? new Date(lastInteraction.occurredAt)
    : null;
  const days = daysSince(lastInteractionDate);

  const contactOpenTasks = openTasks.filter(t => t.contactId === contactId);
  const overdueCount = contactOpenTasks.filter(t => t.dueAt && t.dueAt < today).length;

  return {
    contactId,
    contact,
    lastInteractionDate,
    daysSinceContact: days,
    openTaskCount: contactOpenTasks.length,
    overdueTaskCount: overdueCount,
    healthScore: calculateContactHealthScore(days, contactOpenTasks.length, overdueCount),
    status: getHealthStatus(days),
  };
};

/**
 * Get network health summary across all contacts.
 */
export const getNetworkHealthSummary = (): NetworkHealthSummary => {
  const contacts = getAllContacts().filter(c => c.id !== CONTACT_ZERO.id);
  const interactions = getAllInteractions();
  const openTasks = getAllOpenTasks();
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  if (contacts.length === 0) {
    return {
      overallScore: 100,
      totalContacts: 0,
      healthyCount: 0,
      warningCount: 0,
      criticalCount: 0,
      unknownCount: 0,
      contactsNeedingAttention: [],
      recentlyContactedCount: 0,
    };
  }

  const healthMetrics: ContactHealthMetric[] = contacts.map(contact => {
    const lastInteraction = getLastInteraction(contact.id, interactions);
    const lastInteractionDate = lastInteraction
      ? new Date(lastInteraction.occurredAt)
      : null;
    const days = daysSince(lastInteractionDate);

    const contactOpenTasks = openTasks.filter(t => t.contactId === contact.id);
    const overdueCount = contactOpenTasks.filter(t => t.dueAt && t.dueAt < today).length;

    return {
      contactId: contact.id,
      contact,
      lastInteractionDate,
      daysSinceContact: days,
      openTaskCount: contactOpenTasks.length,
      overdueTaskCount: overdueCount,
      healthScore: calculateContactHealthScore(days, contactOpenTasks.length, overdueCount),
      status: getHealthStatus(days),
    };
  });

  // Count by status
  const healthyCount = healthMetrics.filter(m => m.status === 'healthy').length;
  const warningCount = healthMetrics.filter(m => m.status === 'warning').length;
  const criticalCount = healthMetrics.filter(m => m.status === 'critical').length;
  const unknownCount = healthMetrics.filter(m => m.status === 'unknown').length;

  // Calculate overall score (weighted by contact count)
  const totalScore = healthMetrics.reduce((sum, m) => sum + m.healthScore, 0);
  const overallScore = Math.round(totalScore / healthMetrics.length);

  // Get contacts needing attention (warning + critical, sorted by urgency)
  const contactsNeedingAttention = healthMetrics
    .filter(m => m.status === 'warning' || m.status === 'critical')
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);

  // Count recently contacted
  const recentlyContactedCount = healthMetrics.filter(m =>
    m.lastInteractionDate && m.lastInteractionDate >= sevenDaysAgo
  ).length;

  return {
    overallScore,
    totalContacts: contacts.length,
    healthyCount,
    warningCount,
    criticalCount,
    unknownCount,
    contactsNeedingAttention,
    recentlyContactedCount,
  };
};

/**
 * Get contacts that need attention (warning or critical status).
 * Sorted by days since contact (most urgent first).
 */
export const getContactsNeedingAttention = (limit?: number): ContactHealthMetric[] => {
  const summary = getNetworkHealthSummary();
  const needingAttention = summary.contactsNeedingAttention;
  return limit ? needingAttention.slice(0, limit) : needingAttention;
};

/**
 * Get the overall network health score (0-100).
 */
export const getOverallNetworkHealth = (): number => {
  return getNetworkHealthSummary().overallScore;
};

/**
 * Get health score color based on score value.
 */
export const getHealthScoreColor = (score: number): string => {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * Get health status color.
 */
export const getHealthStatusColor = (status: ContactHealthMetric['status']): string => {
  switch (status) {
    case 'healthy': return 'text-green-400';
    case 'warning': return 'text-yellow-400';
    case 'critical': return 'text-red-400';
    case 'unknown': return 'text-gray-400';
  }
};
