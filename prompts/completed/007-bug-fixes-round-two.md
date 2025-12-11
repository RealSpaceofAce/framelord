<objective>
Fix 4 bugs/issues identified in the recent feature implementation:
1. Missing audio text label on microphone button in fullscreen Little Lord mode
2. DocLord Writing Assistant preview text still says "I'm Little Lord" - must say "DocLord"
3. "Ask AI Anything" input area should be disabled/grayed out for non-pro users
4. Audio transcription only transcribes but doesn't embed the audio file in notes
</objective>

<context>
These are bugs from the 6-feature implementation just completed. The features work but have polish issues.

Key files to examine:
- `src/components/littleLord/LittleLordFullscreenChat.tsx` - fullscreen mode mic button
- `src/components/notes/RightSidebarTabs/AITab.tsx` - DocLord Writing Assistant
- `src/components/notes/AffineNotes.tsx` - audio recording and embedding in notes
- `src/hooks/useAudioRecorder.ts` - audio recording hook
</context>

<requirements>
<bug_1>
**Microphone Button Label in Fullscreen**
- Location: Little Lord fullscreen chat mode
- Issue: Mic button has no visible text/tooltip indicating its purpose
- Fix: Add "Record" label or tooltip to the microphone button
- The button should clearly indicate it's for voice recording
</bug_1>

<bug_2>
**DocLord Preview Text**
- Location: `src/components/notes/RightSidebarTabs/AITab.tsx`
- Issue: Intro text or placeholder says "I'm Little Lord" or similar
- Fix: All references should say "DocLord Writing Assistant"
- Check for any hardcoded "Little Lord" strings in this component
</bug_2>

<bug_3>
**Disable AI Input for Non-Pro Users**
- Location: `src/components/notes/RightSidebarTabs/AITab.tsx`
- Issue: "Ask AI Anything" input area is still interactive for free users
- Fix:
  - Gray out the entire input area for non-pro users
  - Make input non-focusable (disabled state)
  - Show upgrade prompt or lock icon
  - Check user tier from appropriate store (likely appConfig or a tier store)
</bug_3>

<bug_4>
**Audio Embed in Notes**
- Location: `src/components/notes/AffineNotes.tsx`
- Issue: When recording audio, only transcription is saved, not the audio itself
- Fix:
  - After recording, save audio blob as Data URL
  - Insert both: audio player element AND transcription text
  - Audio should be playable directly in the note
  - Use HTML5 `<audio>` element with Data URL src
  - Format: `<audio controls src="data:audio/webm;base64,..." />`
  - Transcription text appears below the audio player
</bug_4>
</requirements>

<implementation>
1. Read each affected file to understand current implementation
2. Make targeted fixes - don't refactor unrelated code
3. For the tier check in bug_3, look for existing tier/subscription patterns in codebase
4. For audio embed, ensure Data URL conversion happens before note insertion
5. Test that each fix works independently
</implementation>

<verification>
Before declaring complete:
- [ ] Fullscreen Little Lord mic button has visible label or tooltip
- [ ] AITab.tsx contains no "Little Lord" strings in user-facing text
- [ ] AI input area is visually disabled for non-pro users
- [ ] Recording audio in notes inserts BOTH audio player AND transcription
- [ ] Run `npm run build` to verify no TypeScript errors
</verification>

<success_criteria>
- All 4 bugs fixed with minimal code changes
- No regressions to existing functionality
- Build passes
</success_criteria>
