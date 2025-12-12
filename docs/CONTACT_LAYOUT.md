# Contact Layout Architecture

This document describes the layout architecture for Contact Zero and Contact Dossier views in FrameLord.

## Overview

FrameLord has two distinct "cockpit" views for contacts:

1. **Contact Zero View** - "Future AI cockpit" for the user's whole life and network
2. **Contact Dossier View** - "Tactical cockpit" for viewing any individual contact

## Plan Tier System

All views use the new beta plan tier system for feature gating:

| Tier | Description |
|------|-------------|
| `beta_free` | Basic access to core features |
| `beta_plus` | Enhanced features with AI insights |
| `ultra_beta` | Full access to all beta features |
| `enterprise_beta` | Enterprise-grade features with priority support |

Feature gating is controlled via `canUseFeature(plan, featureKey)` in `src/config/planConfig.ts`.

## Contact Zero View

**File:** `src/components/crm/ContactZeroView.tsx`

Contact Zero represents the user themselves. The Contact Zero View is their command center, answering:
- What is urgent today?
- Where am I slipping on Wants and relationships?
- What has recently happened?

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ HEADER - Avatar + Name + "Contact Zero" badge       │
├─────────────────────────────────────────────────────┤
│ PRE-FLIGHT BRIEFING                                 │
│ AI-generated daily summary strip                    │
├────────────┬────────────┬────────────┬──────────────┤
│ THINGS DUE │ NETWORK    │ RADAR      │ LIVE FEED    │
│ TODAY      │ HEALTH     │ WIDGET     │              │
│            │            │            │              │
├────────────┴────────────┴────────────┴──────────────┤
│ BELOW-FOLD PANELS                                    │
│ ┌────────────────────┬────────────────────────────┐ │
│ │ WANTS & STREAKS    │ FRAME ANALYTICS            │ │
│ └────────────────────┴────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Sub-Components

| Component | Purpose | Tier Required |
|-----------|---------|---------------|
| `PreFlightBriefing` | AI-generated daily summary | Basic |
| `ThingsDueToday` | Tasks due today with overdue count | Basic |
| `NetworkHealth` | Contact relationship health score | Pro |
| `RadarWidget` | Alerts and attention items | Pro |
| `LiveFeed` | Recent activity stream | Basic |
| `WantsStreaksPanel` | Active wants with streak counts | Pro |
| `FrameStatsPanel` | FrameScan score overview | Basic |

## Contact Dossier View

**Files:**
- `src/components/crm/ContactDossierView.tsx` - Main dossier component
- `src/components/crm/DossierTwoColumnLayout.tsx` - Two-column layout wrapper

The Contact Dossier View is the tactical cockpit for any individual contact (not Contact Zero). It answers:
- Who is this person?
- What is our history?
- What should I do next?
- What does the AI think?

### Layout Structure (Two-Column)

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER STRIP                                                     │
│ ┌─────────────────────────────┬─────────────────────────────────┤
│ │ Identity Cluster            │ Control Deck                    │
│ │ Avatar | Name | Role | Tags │ Call | Message | Email | Log    │
│ └─────────────────────────────┴─────────────────────────────────┤
├─────────────────────────────────────┬───────────────────────────┤
│ LEFT COLUMN (Tabbed)               │ RIGHT COLUMN (Card Stack)  │
│ ┌─────────────────────────────┐    │ ┌───────────────────────┐  │
│ │ [Timeline] [Notes] [Tasks]  │    │ │ PersonalIntelCard     │  │
│ │ [FrameScan]                 │    │ └───────────────────────┘  │
│ ├─────────────────────────────┤    │ ┌───────────────────────┐  │
│ │                             │    │ │ MiniGraphCard         │  │
│ │ Tab Content Area            │    │ └───────────────────────┘  │
│ │                             │    │ ┌───────────────────────┐  │
│ │ - Timeline: Interactions    │    │ │ PersonalityTestsCard  │  │
│ │ - Notes: Contact notes      │    │ └───────────────────────┘  │
│ │ - Tasks: Open/Done tasks    │    │ ┌───────────────────────┐  │
│ │ - FrameScan: Scan reports   │    │ │ NextMoveCard          │  │
│ │                             │    │ └───────────────────────┘  │
│ └─────────────────────────────┘    │ ┌───────────────────────┐  │
│                                    │ │ CallAnalyzerCard      │  │
│                                    │ └───────────────────────┘  │
└────────────────────────────────────┴───────────────────────────┘
```

### Right Column Card Components

| Component | Purpose | Tier Required |
|-----------|---------|---------------|
| `PersonalIntelCard` | Communication style, triggers, interests | beta_plus |
| `MiniGraphCard` | Visual network position | beta_plus |
| `PersonalityAndTestsCard` | Big Five, MBTI, DISC profiles | ultra_beta |
| `NextMoveCard` | AI-powered action suggestions | ultra_beta |
| `CallAnalyzerCard` | AI analysis of call transcripts | enterprise_beta |

## Tier-Aware Gating

All components support tier-aware gating through the `LockedOverlay` component and `canUseFeature()` helper:

```tsx
import { canUseFeature, type PlanTier, type FeatureKey } from '@/config/planConfig';

// Check if user can access a feature
if (canUseFeature(userPlan, 'network_health')) {
  // Show feature
}

// Locked overlay usage
<LockedOverlay featureKey="network_health" currentPlan={userPlan} />
```

The overlay:
- Blurs the content
- Shows a lock icon and feature teaser
- Displays the required tier name

Plan tier levels in order: `beta_free` < `beta_plus` < `ultra_beta` < `enterprise_beta`

## Routing

The Dashboard (`src/components/Dashboard.tsx`) handles view routing:

```tsx
{currentView === 'DOSSIER' && (
  selectedContactId === CONTACT_ZERO.id ? (
    <ContactZeroView ... />
  ) : (
    <ContactDossierView ... />
  )
)}
```

When navigating to Contact Zero's dossier (via the "CONTACT ZERO" nav item), the Dashboard renders `ContactZeroView` instead of `ContactDossierView`.

## File Structure

```
src/components/crm/
├── ContactZeroView.tsx      # Contact Zero command center
├── ContactDossierView.tsx   # Contact dossier (all contacts)
├── PersonalIntelCard.tsx    # Intel summary for contacts
├── NextMoveCard.tsx         # AI action suggestions
└── ...
```

## Data Sources

The views pull data from these stores:

| Store | Data |
|-------|------|
| `contactStore` | Contact data, Contact Zero |
| `taskStore` | Tasks, due dates |
| `interactionStore` | Logged interactions |
| `wantTrackingStore` | Want metrics and streaks |
| `frameScanReportStore` | FrameScan reports and scores |
| `psychometricStore` | Personality profiles |

## Future Enhancements

1. **Mini Graph Widget** - Visual network graph in dossier right column
2. **Call Analyzer Card** - AI analysis of call transcripts
3. **Personality/Tests Section** - Big Five, MBTI, DISC displays
4. **AI Talking Points** - Generated conversation starters
5. **Drag-and-drop Layout** - User-configurable widget positions
