<objective>
Fix two miscellaneous issues: remove the particle widget from authenticated app screens, and implement proper metrics data flow with a unified Metrics Overview dashboard.

The goal is to ensure the particle widget only appears on the public landing page, and that metrics are properly managed through Little Lord with a clear overview interface.
</objective>

<context>
FrameLord has a particle-play widget that's appearing where it shouldn't (blocking Little Lord in the dashboard), and unclear metrics data ownership that needs to be centralized.

Read CLAUDE.md for project conventions before making changes.

Key files to examine:
- `@src/components/ThreeParticles.tsx` - Particle widget component
- `@src/App.tsx` - Main router (controls which view is shown)
- `@src/components/Dashboard.tsx` - CRM dashboard
- `@src/services/littleLord/` - Little Lord service files
- `@src/components/wants/` - Scope pages that need metrics display
</context>

<bugs_to_fix>

<bug id="1" location="particle-widget">
**Problem**: A particle-play widget appears in the bottom right of backend/dashboard screens, blocking Little Lord.

**Required fixes**:
1. The particle widget must NEVER appear anywhere except the public landing page
2. Remove or conditionalize rendering so it doesn't appear inside the authenticated app
3. Check App.tsx and Dashboard.tsx for where this is rendered
4. Little Lord must remain unobstructed in the dashboard
</bug>

<bug id="2" location="metrics">
**Problem**: User uncertainty about how metrics get added and viewed.

**Required fixes**:
1. Only Little Lord should write values to the Metrics store
   - No direct UI writes to metrics
   - Little Lord analyzes user behavior/data and updates metrics
2. Add an always-available "Metrics Overview" view
   - Unified dashboard showing all tracked metrics
   - Accessible from main navigation
3. Each Scope page must display the correct metric set tied to that domain
   - Scope pages show domain-relevant metrics only
   - Metrics filtered/grouped by scope/domain
</bug>

</bugs_to_fix>

<implementation>
Step-by-step approach:

**Part 1: Particle Widget Fix**

1. **Find particle widget rendering location**:
   - Search for ThreeParticles or particle-related components
   - Check App.tsx conditional rendering
   - Check Dashboard.tsx for any particle imports

2. **Conditionalize rendering**:
   - Option A: Only render in App.tsx when view === 'landing'
   - Option B: Add prop to control visibility and only pass true for landing
   - Ensure complete removal from all dashboard/CRM views

3. **Verify Little Lord is unobstructed**:
   - Check Little Lord component positioning
   - Ensure no z-index conflicts

**Part 2: Metrics System**

1. **Audit current metrics flow**:
   - Check if metricsStore exists, if not create it
   - Review how metrics are currently written

2. **Enforce Little Lord as sole writer**:
   - Add clear documentation/comments that only Little Lord writes metrics
   - If direct UI writes exist, remove or route through Little Lord
   - Little Lord service should have methods like `updateMetric()`, `recordMetric()`

3. **Create Metrics Overview component**:
   - New component: `./src/components/metrics/MetricsOverview.tsx`
   - Display all tracked metrics in a unified dashboard
   - Group by category/domain if applicable
   - Show trends, current values, historical data

4. **Add to navigation**:
   - Add "Metrics" to dashboard sidebar/navigation
   - Make it always accessible from any authenticated view

5. **Domain-specific metrics on Scope pages**:
   - Each Scope page filters to show only relevant metrics
   - Pass domain/scope identifier to metrics display component
   - Scope-specific metric views should be subset of overall metrics

**What to avoid**:
- Don't remove particle widget from landing page
- Don't allow UI components to write directly to metrics
- Don't create duplicate metrics displays that could go out of sync
- Don't break existing Little Lord functionality
</implementation>

<output>
Modified files (use relative paths):
- `./src/App.tsx` - Conditionalize particle widget rendering
- `./src/components/Dashboard.tsx` - Remove any particle widget references
- `./src/components/metrics/MetricsOverview.tsx` - NEW: Unified metrics dashboard
- `./src/services/metricsStore.ts` - Create or modify metrics store
- `./src/services/littleLord/index.ts` - Add/document metric writing methods
- `./src/components/wants/WantProgressView.tsx` - Add domain-specific metrics display
- Navigation component (sidebar) - Add Metrics link
</output>

<verification>
Before declaring complete, verify:

1. **Particle widget removal test**:
   - Navigate to Dashboard/CRM views
   - Confirm NO particle widget in bottom right
   - Confirm Little Lord is fully visible and unobstructed
   - Navigate to landing page
   - Confirm particle widget DOES appear on landing page

2. **Metrics Overview test**:
   - Find Metrics in navigation
   - Click to open Metrics Overview
   - Confirm it displays tracked metrics
   - Confirm it's accessible from multiple dashboard views

3. **Scope-specific metrics test**:
   - Navigate to a Scope page
   - Confirm it shows metrics relevant to that domain
   - Confirm different Scopes show different metric subsets

4. **Little Lord ownership test**:
   - Search codebase for direct metrics writes
   - Confirm all metric updates go through Little Lord service
   - Check Little Lord has proper metric methods
</verification>

<success_criteria>
- Particle widget only renders on public landing page
- Little Lord is unobstructed in dashboard
- Metrics Overview is accessible from navigation
- All metrics in one unified dashboard view
- Scope pages show domain-relevant metrics
- Only Little Lord writes to metrics store
- No regressions to existing Little Lord or landing page functionality
</success_criteria>
