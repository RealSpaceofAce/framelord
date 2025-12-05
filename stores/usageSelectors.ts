// =============================================================================
// USAGE SELECTORS — Derived metrics from existing stores
// =============================================================================
// Pure selector functions that compute usage metrics from existing data.
// These do not mutate state or make network calls.
// Backend can mirror these computations server-side later.
// =============================================================================

import type {
  GlobalUsageSummary,
  GlobalFrameScoreAnalytics,
  TenantUsageSummary,
  UserUsageSummary,
  FrameScoreDistributionBin,
  Trajectory,
  UsageActionType,
  CREDIT_COSTS,
} from '../types/usage';
import { getAllTenants } from './tenantStore';
import { getAllTenantUsers, getTenantUsers } from './tenantUserStore';
import { 
  getAllFrameHealthSnapshots,
  getFrameHealthForTenant,
} from './frameHealthStore';
import { 
  getAllEvents as getAllLittleLordEvents, 
  getEventsForTenant as getLittleLordEventsForTenant,
} from './littleLordEventStore';
import { getAllCoachingCandidates } from './coachingStore';
import { getAllBetaUsers } from './betaProgramStore';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDateRangeFilter(days: number): (dateStr: string) => boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (dateStr: string) => new Date(dateStr) >= cutoff;
}

function getTodayFilter(): (dateStr: string) => boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (dateStr: string) => new Date(dateStr) >= today;
}

function getThisWeekFilter(): (dateStr: string) => boolean {
  return getDateRangeFilter(7);
}

function getThisMonthFilter(): (dateStr: string) => boolean {
  return getDateRangeFilter(30);
}

function computeTrajectory(scores: number[]): Trajectory {
  if (scores.length < 2) return 'NEUTRAL';
  const recent = scores.slice(-3);
  const earlier = scores.slice(0, Math.max(1, scores.length - 3));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const diff = recentAvg - earlierAvg;
  if (diff > 5) return 'POSITIVE';
  if (diff < -5) return 'NEGATIVE';
  return 'NEUTRAL';
}

// =============================================================================
// GLOBAL USAGE SUMMARY
// =============================================================================

/**
 * Compute platform-wide usage summary
 * TODO: Wire to backend usage data for accurate token counts
 */
export function computeGlobalUsageSummary(): GlobalUsageSummary {
  const tenants = getAllTenants();
  const users = getAllTenantUsers();
  const healthSnapshots = getAllFrameHealthSnapshots();
  const littleLordEvents = getAllLittleLordEvents();
  
  const todayFilter = getTodayFilter();
  const weekFilter = getThisWeekFilter();
  const monthFilter = getThisMonthFilter();
  
  // Count events by time period
  // TODO: Wire to backend usage data - these are placeholder calculations
  const todayEvents = littleLordEvents.filter(e => todayFilter(e.timestamp));
  const weekEvents = littleLordEvents.filter(e => weekFilter(e.timestamp));
  const monthEvents = littleLordEvents.filter(e => monthFilter(e.timestamp));
  
  // Estimate credits from events (placeholder logic)
  const creditsPerEvent = 1; // Simplified
  const totalFrameCreditsToday = todayEvents.length * creditsPerEvent;
  const totalFrameCreditsThisWeek = weekEvents.length * creditsPerEvent;
  const totalFrameCreditsThisMonth = monthEvents.length * creditsPerEvent;
  
  // Count by action type (placeholder - would need actual action tracking)
  const byActionType: Record<string, number> = {
    textScan: Math.floor(healthSnapshots.length * 0.6),
    imageScan: Math.floor(healthSnapshots.length * 0.2),
    audioMinutes: 0, // TODO: Wire to transcription store
    littleLordMessages: littleLordEvents.length,
    canvasEvents: 0, // TODO: Wire to canvas activity store
  };
  
  // Peak usage hours (placeholder - would need timestamp analysis)
  const peakUsageHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    credits: Math.floor(Math.random() * 100) + (hour >= 9 && hour <= 17 ? 50 : 10),
  }));
  
  const activeUsers = users.filter(u => u.isActive).length;
  const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
  
  return {
    totalFrameCreditsToday,
    totalFrameCreditsThisWeek,
    totalFrameCreditsThisMonth,
    byActionType,
    averageCostPerUser: activeUsers > 0 ? totalFrameCreditsThisMonth / activeUsers : 0,
    peakUsageHours,
    errorRateBlockedScans: 0.02, // TODO: Wire to error tracking
    totalTranscriptionMinutes: 0, // TODO: Wire to transcription store
    totalImageScans: byActionType.imageScan,
    totalInitialFrameScores: healthSnapshots.length,
    totalActiveUsers: activeUsers,
    totalActiveTenants: activeTenants,
  };
}

// =============================================================================
// GLOBAL FRAME SCORE ANALYTICS
// =============================================================================

/**
 * Compute platform-wide frame score distribution and trends
 */
export function computeGlobalFrameScoreAnalytics(): GlobalFrameScoreAnalytics {
  const healthSnapshots = getAllFrameHealthSnapshots();
  
  // Get all frame scores (using frameScanAverage as proxy)
  const scores = healthSnapshots
    .filter(h => h.frameScanAverage !== null)
    .map(h => h.frameScanAverage as number);
  
  const totalScans = scores.length;
  const averageScore = totalScans > 0 
    ? scores.reduce((a, b) => a + b, 0) / totalScans 
    : 0;
  
  // Calculate median
  const sortedScores = [...scores].sort((a, b) => a - b);
  const medianScore = totalScans > 0 
    ? sortedScores[Math.floor(totalScans / 2)] 
    : 0;
  
  // Create distribution bins
  const binRanges = [
    { label: '0-20', min: 0, max: 20 },
    { label: '21-40', min: 21, max: 40 },
    { label: '41-60', min: 41, max: 60 },
    { label: '61-80', min: 61, max: 80 },
    { label: '81-100', min: 81, max: 100 },
  ];
  
  const bins: FrameScoreDistributionBin[] = binRanges.map(range => {
    const count = scores.filter(s => s >= range.min && s <= range.max).length;
    return {
      rangeLabel: range.label,
      count,
      percentage: totalScans > 0 ? (count / totalScans) * 100 : 0,
    };
  });
  
  // Trend over time (group by date)
  const scoresByDate: Record<string, number[]> = {};
  healthSnapshots.forEach(h => {
    if (h.frameScanAverage !== null) {
      const date = h.computedAt.split('T')[0];
      if (!scoresByDate[date]) scoresByDate[date] = [];
      scoresByDate[date].push(h.frameScanAverage);
    }
  });
  
  const trendOverTime = Object.entries(scoresByDate)
    .map(([date, dateScores]) => ({
      date,
      averageScore: dateScores.reduce((a, b) => a + b, 0) / dateScores.length,
      scanCount: dateScores.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 days
  
  // Calculate improvement rate (placeholder)
  // TODO: Wire to actual user-level trajectory tracking
  const improvementRate = 45; // Placeholder percentage
  
  return {
    averageFrameScore: Math.round(averageScore * 10) / 10,
    medianFrameScore: Math.round(medianScore * 10) / 10,
    bins,
    trendOverTime,
    totalScansProcessed: totalScans,
    improvementRate,
  };
}

// =============================================================================
// TENANT USAGE SUMMARIES
// =============================================================================

/**
 * Compute usage summaries for all tenants
 */
export function computeTenantUsageSummaries(): TenantUsageSummary[] {
  const tenants = getAllTenants();
  return tenants.map(tenant => computeTenantUsageSummaryInternal(tenant.tenantId));
}

/**
 * Compute usage summary for a specific tenant
 */
export function computeTenantUsageSummary(tenantId: string): TenantUsageSummary | null {
  const tenants = getAllTenants();
  const tenant = tenants.find(t => t.tenantId === tenantId);
  if (!tenant) return null;
  return computeTenantUsageSummaryInternal(tenantId);
}

function computeTenantUsageSummaryInternal(tenantId: string): TenantUsageSummary {
  const tenants = getAllTenants();
  const tenant = tenants.find(t => t.tenantId === tenantId);
  const users = getTenantUsers(tenantId);
  const healthSnapshots = getFrameHealthForTenant(tenantId);
  const littleLordEvents = getLittleLordEventsForTenant(tenantId);
  const coachingCandidates = getAllCoachingCandidates().filter(c => c.tenantId === tenantId);
  
  const activeUsers = users.filter(u => u.isActive);
  
  // Calculate average frame score for tenant
  const scores = healthSnapshots
    .filter(h => h.frameScanAverage !== null)
    .map(h => h.frameScanAverage as number);
  const averageFrameScore = scores.length > 0 
    ? scores.reduce((a, b) => a + b, 0) / scores.length 
    : 0;
  
  // Count struggling users
  const struggleIndexCount = healthSnapshots.filter(h => h.level === 'RED' || h.level === 'YELLOW').length;
  
  // Calculate congruency average (placeholder - based on task completion)
  const congruencyAverage = healthSnapshots.length > 0
    ? healthSnapshots.reduce((sum, h) => sum + h.taskCompletionRate, 0) / healthSnapshots.length * 100
    : 0;
  
  // Identify high usage users (top 20% by events)
  const userEventCounts: Record<string, number> = {};
  littleLordEvents.forEach(e => {
    userEventCounts[e.userId] = (userEventCounts[e.userId] || 0) + 1;
  });
  const sortedUsers = Object.entries(userEventCounts)
    .sort((a, b) => b[1] - a[1]);
  const highUsageCount = Math.ceil(sortedUsers.length * 0.2);
  const highUsageUserIds = sortedUsers.slice(0, highUsageCount).map(([userId]) => userId);
  
  // Credits calculation (placeholder)
  // TODO: Wire to backend usage data
  const creditsPerScan = 1;
  const creditsConsumed = healthSnapshots.length * creditsPerScan + littleLordEvents.length * 0.5;
  const creditsAllocated = activeUsers.length * 100; // Placeholder allocation
  
  const creditsByActionType: Record<string, number> = {
    textScan: Math.floor(healthSnapshots.length * 0.6),
    imageScan: Math.floor(healthSnapshots.length * 0.2),
    audioMinutes: 0,
    littleLordMessages: littleLordEvents.length,
    canvasEvents: 0,
  };
  
  // Find last activity
  const allTimestamps = [
    ...healthSnapshots.map(h => h.computedAt),
    ...littleLordEvents.map(e => e.timestamp),
  ];
  const lastActivityAt = allTimestamps.length > 0
    ? allTimestamps.sort().reverse()[0]
    : null;
  
  return {
    tenantId,
    tenantName: tenant?.name || 'Unknown',
    seats: activeUsers.length,
    activeUsers: activeUsers.length,
    creditsAllocated,
    creditsConsumed: Math.round(creditsConsumed),
    creditsByActionType,
    averageFrameScore: Math.round(averageFrameScore * 10) / 10,
    struggleIndexCount,
    congruencyAverage: Math.round(congruencyAverage * 10) / 10,
    highUsageUserIds,
    lastActivityAt,
    createdAt: tenant?.createdAt || new Date().toISOString(),
    planName: tenant?.planName || 'Unknown',
  };
}

// =============================================================================
// USER USAGE SUMMARY
// =============================================================================

/**
 * Compute usage summary for a specific user
 */
export function computeUserUsageSummary(userId: string, tenantId: string): UserUsageSummary | null {
  const users = getTenantUsers(tenantId);
  const user = users.find(u => u.userId === userId);
  if (!user) return null;
  
  const healthSnapshots = getFrameHealthForTenant(tenantId)
    .filter(h => h.userId === userId);
  const littleLordEvents = getLittleLordEventsForTenant(tenantId)
    .filter(e => e.userId === userId);
  
  // Frame score history
  const frameScoreHistory = healthSnapshots
    .filter(h => h.frameScanAverage !== null)
    .map(h => ({
      date: h.computedAt.split('T')[0],
      score: h.frameScanAverage as number,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const scores = frameScoreHistory.map(h => h.score);
  const firstFrameScore = scores.length > 0 ? scores[0] : null;
  const currentFrameScore = scores.length > 0 ? scores[scores.length - 1] : null;
  
  // Calculate trajectory
  const trajectory = computeTrajectory(scores);
  
  // Congruency trend (based on task completion over time)
  const completionRates = healthSnapshots.map(h => h.taskCompletionRate);
  const congruencyTrend = computeTrajectory(completionRates.map(r => r * 100));
  
  // Struggle index (count of issues)
  const struggleIndex = healthSnapshots.filter(h => h.level === 'RED').length * 3 +
    healthSnapshots.filter(h => h.level === 'YELLOW').length;
  
  // Recent scans (last 7 days)
  const weekFilter = getThisWeekFilter();
  const recentScanCount = healthSnapshots.filter(h => weekFilter(h.computedAt)).length;
  
  // Last scan date
  const lastScanAt = healthSnapshots.length > 0
    ? healthSnapshots.sort((a, b) => b.computedAt.localeCompare(a.computedAt))[0].computedAt
    : null;
  
  // Credits calculation (placeholder)
  // TODO: Wire to backend usage data
  const creditsPerScan = 1;
  const creditsConsumed = healthSnapshots.length * creditsPerScan + littleLordEvents.length * 0.5;
  const creditsRemaining = 100 - creditsConsumed; // Placeholder allocation
  
  const creditsByCategory: Record<string, number> = {
    textScan: Math.floor(healthSnapshots.length * 0.6),
    imageScan: Math.floor(healthSnapshots.length * 0.2),
    littleLordMessages: littleLordEvents.length,
  };
  
  return {
    tenantId,
    userId,
    userName: user.displayName,
    email: user.email,
    creditsRemaining: Math.max(0, Math.round(creditsRemaining)),
    creditsConsumed: Math.round(creditsConsumed),
    creditsByCategory,
    frameScoreHistory,
    congruencyTrend,
    struggleIndex,
    firstFrameScore,
    currentFrameScore,
    recentScanCount,
    lastScanAt,
    trajectory,
    isActive: user.isActive,
  };
}

/**
 * Compute usage summaries for all users in a tenant
 */
export function computeAllUserUsageSummaries(tenantId?: string): UserUsageSummary[] {
  const users = tenantId ? getTenantUsers(tenantId) : getAllTenantUsers();
  return users
    .map(u => computeUserUsageSummary(u.userId, u.tenantId))
    .filter((summary): summary is UserUsageSummary => summary !== null);
}

// =============================================================================
// EXPORTS FOR BACKEND TODO
// =============================================================================

/**
 * BACKEND TODO: These selectors currently use placeholder data.
 * The backend should implement:
 * 
 * 1. GET /api/admin/usage/global - Returns GlobalUsageSummary with real token counts
 * 2. GET /api/admin/usage/frame-scores - Returns GlobalFrameScoreAnalytics
 * 3. GET /api/admin/usage/tenants - Returns TenantUsageSummary[]
 * 4. GET /api/admin/usage/tenants/:tenantId - Returns TenantUsageSummary
 * 5. GET /api/admin/usage/users/:userId - Returns UserUsageSummary
 * 
 * Real data sources needed:
 * - Token/credit consumption logs per action type
 * - Transcription minute tracking
 * - Image scan counts
 * - Error/blocked scan tracking
 * - User activity timestamps
 */

