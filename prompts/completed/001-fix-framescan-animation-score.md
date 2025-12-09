<objective>
Fix FrameScan functionality on both the public landing page test uploader AND the internal CRM dashboard FrameScan page.

The goal is to ensure that when a user uploads an image and submits text for analysis, they see the full experience: animation plays, audio feedback occurs, and the FrameScore with axes and summary renders correctly.
</objective>

<context>
FrameLord has two FrameScan entry points:
1. **Public landing page** - Works partially but score doesn't appear after animation
2. **Internal CRM FrameScan** - Missing animation and audio entirely

The landing page version should be the reference implementation. The internal version must match its behavior exactly.

Read CLAUDE.md for project conventions before making changes.

Key files to examine:
- `@src/components/Scanner.tsx` - Public landing scanner
- `@src/components/crm/FrameScanPage.tsx` - Internal CRM scanner
- `@src/services/frameScanReportStore.ts` - Report data store
- `@src/lib/frameScan/frameScanLLM.ts` - LLM inference logic
- `@src/styles/theme.css` - Theme variables
</context>

<bugs_to_fix>

<bug id="1" location="public-landing">
**Problem**: When user uploads an image and writes "This is me. I am the man," the animation and sound play, but no FrameScore appears.

**Root cause investigation**:
- Check if frameScanReportStore is being updated after inference
- Verify the component awaits the result before clearing state
- Check if inference returns empty/null silently

**Required fixes**:
1. Guarantee that after image upload and inference completes, frameScanReportStore is updated
2. UI must render the score, axes, and summary exactly like the expected landing page result
3. Component must await the inference result before clearing any state
4. If inference returns empty/null, throw a visual error instead of silently failing
</bug>

<bug id="2" location="internal-crm">
**Problem**: Internal FrameScan (inside CRM dashboard) has no animation and no audio feedback during scan.

**Required fixes**:
1. Internal FrameScan must trigger the same animation pipeline as public landing scanner
2. Internal FrameScan must trigger the same audio feedback as public landing scanner
3. Match the visual experience exactly - user should not notice a difference
</bug>

<bug id="3" location="internal-crm">
**Problem**: Savage Mode toggled on the internal FrameScan page propagates globally, affecting other parts of the app.

**Required fixes**:
1. Savage Mode toggle on internal FrameScan page only applies to that scan instance
2. Only the Settings page should toggle global Savage Mode
3. Internal FrameScan should read but not write to global Savage Mode state
</bug>

</bugs_to_fix>

<implementation>
Step-by-step approach:

1. **Audit the public Scanner.tsx** to understand:
   - How animation is triggered
   - How audio is played
   - How frameScanReportStore is updated
   - How results are rendered

2. **Fix public landing scanner** (Bug #1):
   - Add proper await for inference result
   - Ensure store update happens before state clear
   - Add error handling with visual feedback for empty results

3. **Port to internal FrameScanPage.tsx** (Bug #2):
   - Import and use same animation components/hooks
   - Import and use same audio playback logic
   - Ensure identical timing and sequencing

4. **Fix Savage Mode scope** (Bug #3):
   - Create local state for Savage Mode within FrameScanPage
   - Initialize from global store but don't sync back
   - Only Settings page writes to global savageModeStore

**What to avoid**:
- Don't create duplicate animation/audio logic - extract shared utilities if needed
- Don't modify the Settings page Savage Mode behavior
- Don't break the existing public landing scanner while fixing it
</implementation>

<output>
Modified files (use relative paths):
- `./src/components/Scanner.tsx` - Fix await and error handling
- `./src/components/crm/FrameScanPage.tsx` - Add animation and audio, fix Savage Mode scope
- Potentially create `./src/hooks/useFrameScanAnimation.ts` if extracting shared logic
- Potentially create `./src/hooks/useFrameScanAudio.ts` if extracting shared logic
</output>

<verification>
Before declaring complete, verify:

1. **Public landing scanner test**:
   - Upload an image
   - Enter text "This is me. I am the man."
   - Confirm animation plays
   - Confirm audio plays
   - Confirm FrameScore, axes, and summary appear after animation
   - Test with invalid/empty input - confirm error message appears

2. **Internal CRM scanner test**:
   - Navigate to FrameScan in dashboard
   - Upload an image and enter text
   - Confirm animation plays (same as landing)
   - Confirm audio plays (same as landing)
   - Confirm results render correctly

3. **Savage Mode isolation test**:
   - Toggle Savage Mode ON in internal FrameScan
   - Navigate to another page
   - Confirm global Savage Mode is unchanged
   - Toggle Savage Mode in Settings
   - Confirm it affects global state
</verification>

<success_criteria>
- Both public and internal FrameScan show animation during processing
- Both play audio feedback during processing
- Both display FrameScore, axes, and summary after completion
- Empty inference results show visual error message
- Internal FrameScan Savage Mode is isolated from global state
- No regressions in existing functionality
</success_criteria>
