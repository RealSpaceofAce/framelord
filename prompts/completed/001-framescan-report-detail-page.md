<objective>
Build the FrameScan Report Detail Page - a sophisticated sci-fi styled analysis dashboard that displays a complete FrameScan report. This is the single detail view for one FrameScan report, accessed after scan completion or from the sidebar report list.

Reference the mockup at: `_inbox/CleanShot 2025-12-09 at 20.59.44@2x.png`

Thoroughly analyze the existing codebase patterns before implementing to ensure consistency with the app's architecture.
</objective>

<context>
This is for the FrameLord CRM OS - an AI-powered authority diagnostics platform. The report page displays frame analysis results with a distinctive neon blue / dark background aesthetic.

Read these files first to understand existing patterns:
- `@src/lib/frameScan/frameTypes.ts` - FrameScan data types
- `@src/services/frameScanReportStore.ts` - Report store
- `@src/components/crm/FrameScanPage.tsx` - Existing FrameScan page
- `@src/components/littleLord/LittleLordOrbView.tsx` - Orb component to reuse
- `@src/styles/theme.css` - App theming
- `@CLAUDE.md` - Project conventions

The page should work with the existing routing and store infrastructure.
</context>

<requirements>

<layout_structure>
The page has 4 main sections stacked vertically:

1. **Top Bar (Header)**
   - Left: Product label stack (FRAMELORD / FRAMESCAN / ANALYSIS DASHBOARD)
   - Center: Decorative chrome panel
   - Right: System status block showing FrameScore (0-100) and Overall Frame (Apex/Slave/Mixed)

2. **Core Grid (3 columns)**
   - Left: S-AXIS BREAKDOWN with 2 stacked gauges (Coherence, Amplitude)
   - Center: SCAN CHAMBER with animated waveform + Little Lord Orb
   - Right: SYSTEM METRICS with 2 stacked gauges (Frequency, Amplitude)

3. **9-Axis Breakdown (2 rows × 3 cards)**
   - Each card has: small gauge on left, category label + summary text on right
   - Row 1: Frame Control, Validation, Intuition
   - Row 2: Presence, Assertiveness, Emotional Mastery

4. **Bottom Section (4 stacked text panels)**
   - Deep Pattern Analysis
   - Behavioral Structural Shift
   - Apex Protocol Rewrite
   - Strategic Implementation
   - Each panel: heading + paragraphs, scrollable if long
</layout_structure>

<gauge_component>
Create a reusable AxisGauge component:

```typescript
interface GaugeProps {
  label: string;           // e.g., "COHERENCE"
  band: FrameScanAxisBand; // STRONG_SLAVE | MILD_SLAVE | NEUTRAL | MILD_APEX | STRONG_APEX
  score: number | null;    // -3 to +3, null = insufficient context
}
```

Visual requirements:
- Outer tick marks from -3 to +3
- Band label text at top of dial
- Needle rotation interpolated from score -3 to +3
- Score thresholds:
  - score ≤ -2.0 → STRONG SLAVE
  - -2.0 < score ≤ -0.5 → MILD SLAVE
  - -0.5 < score < 0.5 → NEUTRAL
  - 0.5 ≤ score < 2.0 → MILD APEX
  - score ≥ 2.0 → STRONG APEX
- When score = null:
  - Needle at 0
  - Band text: NEUTRAL
  - Overlay red pill: "NOT ENOUGH CONTEXT"
  - Gauge renders greyed out
</gauge_component>

<scan_chamber>
**CRITICAL - THIS IS THE MOST IMPORTANT PART:**

The Scan Chamber center panel must contain the Little Lord Orb - the EXACT SAME animated 3D particle orb from `LittleLordOrbView.tsx` that appears in the fullscreen chat mode.

What to do:
1. Import and render `LittleLordOrbView` from `@/components/littleLord/LittleLordOrbView`
2. Place it CENTERED in the Scan Chamber panel
3. The orb should be the ONLY thing in the chamber - no extra background needed (the mockup's chamber background looks great already)
4. Pass a calm/neutral `SpiritState` so it has the slow, ambient animation

Visual reference: Look at `LittleLordFullscreenChat.tsx` lines 408-411 to see how the orb is rendered. Use the SAME component but:
- Smaller container size (fit within the chamber panel, maybe 200-250px)
- No surrounding UI (header, messages, input) - JUST the orb
- The chamber panel provides the background (grid lines, dark surface from mockup)

The orb features you MUST preserve:
- 3D particle sphere with indigo/white particles
- Noise-based organic movement
- Occasional shooting star particles
- Interactive (responds to mouse hover/drag)
- Slow rotation animation

DO NOT create a new orb component. DO NOT simplify the animation. Use the EXISTING `LittleLordOrbView` exactly as-is.

Code structure for ScanChamberPanel:
```typescript
import { LittleLordOrbView, type SpiritState } from '@/components/littleLord/LittleLordOrbView';

function ScanChamberPanel({ report }: { report: FrameScanReport }) {
  const spiritState: SpiritState = {
    isThinking: false,  // calm ambient animation
    isSpeaking: false,
    emotion: 'neutral'
  };

  return (
    <div className="scan-chamber-panel">
      <h3>SCAN CHAMBER</h3>
      <div className="chamber-container relative" style={{ width: 250, height: 250 }}>
        {/* Background grid/waveform from CSS */}
        <LittleLordOrbView state={spiritState} />
      </div>
    </div>
  );
}
```

The Little Lord chat still exists separately - this is just an additional instance of the orb for visual effect in the report dashboard.
</scan_chamber>

<data_mapping>
Map doctrine axes to fixed UI slots via uiSlot field:

S-Axis Panel:
- s_axis_left_top → Coherence gauge
- s_axis_left_bottom → Amplitude gauge

System Metrics Panel:
- system_right_top → Frequency gauge
- system_right_bottom → Amplitude gauge

9-Axis Breakdown Cards:
- nine_axis_frame_control → Frame Control
- nine_axis_validation → Validation
- nine_axis_intuition → Intuition
- nine_axis_presence → Presence
- nine_axis_assertiveness → Assertiveness
- nine_axis_emotional_mastery → Emotional Mastery

Narrative sections from report.narratives:
- deepPatternAnalysis
- behavioralStructuralShift
- apexProtocolRewrite
- strategicImplementation

If any narrative is null, show:
- Heading stays
- Body replaced with red highlight: "Not enough context provided. Re-scan with clearer who / what / stakes."
</data_mapping>

<insufficient_context_handling>
When axis confidence < 0.4:
- score = null
- band = 'neutral'
- summary = null
- Gauge: grey dial + red pill "NOT ENOUGH CONTEXT"
- No paragraph text

When narrative section conditions fail (< 4 valid axes OR section confidence < 0.5):
- narratives.[section] = null
- Show red banner with re-scan guidance
</insufficient_context_handling>

</requirements>

<component_structure>
Create these files:

1. `./src/pages/FrameScanReportPage.tsx` - Route component
   - Route: /framescan/report/:reportId
   - Loads report from frameScanReportStore
   - Handles loading/error states
   - Renders FrameScanReportLayout

2. `./src/components/framescan/FrameScanReportLayout.tsx` - Main layout
   - Composes all section components
   - Grid structure matching mockup

3. `./src/components/framescan/ReportHeaderTopBar.tsx` - Header bar

4. `./src/components/framescan/AxisGauge.tsx` - Reusable gauge with needle

5. `./src/components/framescan/SAxisPanel.tsx` - Left column gauges

6. `./src/components/framescan/ScanChamberPanel.tsx` - Center with orb

7. `./src/components/framescan/SystemMetricsPanel.tsx` - Right column gauges

8. `./src/components/framescan/NineAxisBreakdownPanel.tsx` - 9-axis cards

9. `./src/components/framescan/DeepAnalysisPanels.tsx` - Bottom text sections

10. `./src/components/framescan/FrameScanReportLayout.css` - Styles

</component_structure>

<visual_styling>
Match the mockup aesthetic:
- Dark background (use existing theme variables)
- Neon blue accent color (#00D4FF or similar from theme)
- Chrome/metallic card borders with inner shadows
- Consistent padding and rounded corners
- Sci-fi terminal / HUD aesthetic
- Monospace or technical fonts for labels
- Glowing effects on active elements
</visual_styling>

<integration>
- Add route to App.tsx for /framescan/report/:reportId
- After scan completion in Scanner component, navigate to this page
- Sidebar FrameScan list should navigate here on row click
- Use frameScanReportStore.getReportById(id) for data
</integration>

<constraints>
- WHY: Reuse existing components (LittleLordOrb) to maintain consistency and reduce code duplication
- WHY: Use existing store patterns so data flows correctly through the app
- WHY: Match existing theming so the page feels native to the app
- Do NOT create duplicate data models - use FrameScanReport type
- Do NOT add external dependencies - use existing animation (framer-motion) and styling approaches
</constraints>

<output>
Create/modify files with relative paths:
- `./src/pages/FrameScanReportPage.tsx` - Main page component
- `./src/components/framescan/` - All sub-components listed above
- `./src/components/framescan/FrameScanReportLayout.css` - Styling
- Update `./src/App.tsx` - Add route
- Update LittleLordOrb if needed for scan-chamber variant
</output>

<verification>
Before declaring complete, verify:
1. Run `npm run dev` and navigate to /framescan/report/[valid-id]
2. All 4 sections render correctly matching mockup layout
3. Gauges animate needle to correct position based on score
4. null scores show "NOT ENOUGH CONTEXT" red pill
5. Orb animates in scan chamber
6. Narrative panels show content or "not enough context" message
7. No TypeScript errors: `npx tsc --noEmit`
8. Page is responsive (test at different widths)
</verification>

<success_criteria>
- Page matches mockup visual design closely
- All gauge components work with -3 to +3 scoring
- Insufficient context states handled gracefully
- Navigation from scan completion and sidebar both work
- Little Lord Orb integrated in scan chamber
- All narrative sections render or show fallback
- Build passes without errors
</success_criteria>
