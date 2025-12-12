# Overview Dashboard Wiring Implementation

## Summary

Wired the FrameLord Overview dashboard and Frame Integrity widgets to use real data from in-memory stores, with Contact Zero as the central spine. All metrics are now computed dynamically from actual store data.

---

## Files Modified

### New Files

| File | Purpose |
|------|---------|
| `src/services/frameStatsService.ts` | Central selector module for all dashboard metrics |
| `src/services/frameStatsService.test.ts` | Unit tests (29 tests, all passing) |
| `docs/OVERVIEW_WIRING.md` | This implementation report |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/Dashboard.tsx` | Imported selectors, refactored FrameIntegrityWidget, RebelsRankingWidget, DashboardOverview |
| `src/components/crm/CasesView.tsx` | Refactored to use `getActiveWorkloadContacts` selector |
| `vitest.config.ts` | Fixed test setup path and path alias configuration |

---

## Dashboard Block Wiring

### A. Rebels Ranking (RebelsRankingWidget)

**Data Source:** `getLeaderboard(tenantId)`

**How it works:**
- Fetches all contacts (excluding Contact Zero)
- Computes `weeklyPoints` for each using formula: `scans*3 + actions*1 + leaksResolved*2`
- Sorts by weeklyPoints descending, returns top 5
- Adds `statusLabel`: "NEW REBEL" (created within 30 days) or "REBEL"

**Component integration:**
```typescript
const leaderboard = useMemo(() => getLeaderboard('default'), []);
const rankedContacts = leaderboard.map(entry => ({
  ...entry.contact,
  points: entry.weeklyPoints,
  trend: entry.trend,
  statusLabel: entry.statusLabel
}));
```

---

### B. Frame Integrity (FrameIntegrityWidget)

**Data Source:** `getFrameIntegrityMetrics(contactId)`

**Metrics computed:**
- `frameScore`: Average score from last 7 days of frame scan reports (0-100)
- `scansDone`: Count of frame scans in last 7 days
- `frameLeaks`: Count of unresolved leaks (overdue tasks + low-score patterns)
- `scansLabel`: "COMPLETED" if scans > 0, else "PENDING"
- `leaksLabel`: "INCONGRUENT" if leaks > 0, else "SEALED"

**Component integration:**
```typescript
const metrics = getFrameIntegrityMetrics(CONTACT_ZERO.id);
const { frameScore, scansDone, frameLeaks, scansLabel, leaksLabel } = metrics;
```

---

### C. Overview KPIs (DashboardOverview)

**Data Source:** `getOverviewKpis(contactId, range)`

**Metrics computed:**
- `scansCompleted`: Frame scans in range (week/month/year)
- `scansLabel`: "COMPLETED" or "PENDING"
- `frameLeaks`: Unresolved leaks count
- `leaksLabel`: "INCONGRUENT" or "SEALED"
- `actionsDue`: Tasks due within range
- `streakWeeks`: Consecutive weeks with at least one scan

**Component integration:**
```typescript
const kpis = useMemo(() => getOverviewKpis(CONTACT_ZERO.id, chartRange), [chartRange]);
const { scansCompleted, frameLeaks, actionsDue, streakWeeks } = kpis;
```

**Streak display:**
```typescript
{streakWeeks > 0 ? `${streakWeeks} WEEK${streakWeeks > 1 ? 'S' : ''} 🔥 STREAK` : 'NO STREAK'}
```

---

### D. Overview Timeline Chart

**Data Source:** `getOverviewTimeline(contactId, range)`

**Data points returned:**
- `week`: 7 daily buckets
- `month`: 30 daily buckets
- `year`: 12 monthly buckets

**Each point contains:**
- `ts`: Unix timestamp
- `label`: Display label ("Mon", "Jan", etc.)
- `scans`: Scan count for period
- `actions`: Action/task count for period
- `score`: Average frame score for period

**Component integration:**
```typescript
const chartData = useMemo(() => {
  const timelineData = getOverviewTimeline(CONTACT_ZERO.id, chartRange);
  if (timelineData.length < 2) return fallbackData;
  return timelineData;
}, [chartRange]);
```

---

### E. Cases/Workload (CasesView)

**Data Source:** `getActiveWorkloadContacts(tenantId)`

**Selection criteria (needsAttention = true when any of):**
- Has active leak (frame score < 60)
- Has overdue task
- No interaction in last 14 days

**Priority sorting:**
1. Active leaks first
2. Then due tasks
3. Then stale contacts

**Data returned per contact:**
- `contact`: Full contact object
- `frameScore`: Current score (0-100)
- `trend`: "up" | "down" | "flat"
- `lastContactAt`: Last interaction date
- `nextActionAt`: Next task due date
- `hasActiveLeak`, `hasDueTask`, `needsAttention` flags

**Component integration:**
```typescript
const workloadContacts = useMemo(() => getActiveWorkloadContacts('default'), []);
// Maps to table rows with contact, role, domain, frame score, last contact, next action
```

---

### F. Things Due Today (ThingsDueWidget)

**Data Source:** `getThingsDueToday(contactId)`

**Logic:**
- Gets tasks where `dueDate` is today
- Returns sorted by time
- Each item: `{ id, title, time, type: 'task', sortTime }`

**Already wired** - uses existing `getTasksByContactId` filtering by today's date.

---

### G. System Log (NotificationWidget)

**Data Source:** `systemLogStore.getAll()`

**Already wired** - displays recent system events in reverse chronological order.

---

### H. Clock/Weather

**Status:** Placeholder using browser `new Date()`

**TODO:** Could integrate weather API in future.

---

## Selector Functions Reference

All selectors in `src/services/frameStatsService.ts`:

| Function | Signature | Returns |
|----------|-----------|---------|
| `getContactWeeklyStats` | `(tenantId, contactId, weekStart?)` | Weekly points breakdown |
| `getFrameScoreSnapshot` | `(contactId)` | Score, trend, scan count |
| `getOverviewKpis` | `(contactId, range)` | KPI metrics for dashboard |
| `getOverviewTimeline` | `(contactId, range)` | Timeline chart data array |
| `getActiveWorkloadContacts` | `(tenantId)` | Contacts needing attention |
| `getThingsDueToday` | `(contactId)` | Tasks due today |
| `getLeaderboard` | `(tenantId, weekStart?)` | Top 5 ranked contacts |
| `getFrameIntegrityMetrics` | `(contactId)` | Frame integrity block data |

---

## Assumptions & TODOs

### Assumptions Made

1. **Leak detection**: A "leak" is defined as:
   - Overdue tasks (past due date, not completed)
   - Frame score patterns below 60

2. **Weekly points formula**: `scans*3 + actions*1 + leaksResolved*2`
   - Scans have highest weight (frame consciousness)
   - Actions are standard weight
   - Resolving leaks has medium weight

3. **Streak calculation**: Consecutive weeks with at least one frame scan

4. **NEW REBEL threshold**: Contact created within last 30 days

5. **Stale contact threshold**: No interaction in 14 days

### TODOs

1. **Dedicated leak store**: Currently leaks are computed on-the-fly. A `leakStore` could track explicit leak events for more accurate metrics.

2. **Weather integration**: Clock/weather widget currently shows time only.

3. **Caching**: High-frequency dashboard views may benefit from memoization at the store level.

4. **Real-time updates**: Consider Zustand or similar for reactive store subscriptions.

---

## Test Coverage

All 29 unit tests passing:

- Weekly points calculation
- Frame score snapshot structure and ranges
- KPI structure and labels
- Timeline data point counts (7/30/12)
- Timeline timestamp ordering
- Workload contact selection
- Contact Zero exclusion
- Leaderboard sorting
- Status label assignment

Run tests: `npm test -- --run src/services/frameStatsService.test.ts`

---

## Build Status

✅ `npm run build` passes
✅ `npm test` passes (29/29)
✅ TypeScript compilation clean

---

*Generated: 2025-12-11*
