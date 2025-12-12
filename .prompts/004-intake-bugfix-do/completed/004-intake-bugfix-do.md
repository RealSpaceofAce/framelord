# Fix Intake Flow Bugs: Validation, Mic Button, Animation

## Objective

Fix three concrete bugs in the FrameLord Intake / Authority Diagnostics flow to make it usable and honest:

1. **Answer validation** - Submit button stays disabled despite sufficient answer length
2. **Mic button** - Click does nothing, no feedback
3. **Intro animation** - Text block doesn't fade in after orb appears

## Context

Primary files:
- @src/components/intake/AnswerInput.tsx - Answer input with validation
- @src/components/intake/IntakeFlow.tsx - Flow state and intro screen
- @docs/specs/business_frame_spec.json - Question definitions with minLength/maxLength

## Requirements

### A. Simplify and Harden Validation for Tier 1 Answers

**File:** `src/components/intake/AnswerInput.tsx`

1. **Answer length rules - single, explicit character-length rule:**

   | Question Type | minChars |
   |---------------|----------|
   | identity, work_context, want_discovery_1, failure, motivation_goal, process, constraint | 80 |
   | want_discovery_2 ("list three things") | 40 |
   | closing / optional | 0 (can skip) |
   | All questions | maxChars = 800 |

   **No additional gating** on sentence counts, word counts, or progress bar state.

2. **Implementation - derive simple boolean:**

   ```ts
   const length = value.trim().length;
   const isTooShort = length > 0 && length < minChars;
   const isEmptyRequired = required && length === 0;
   const isValid = !isEmptyRequired && !isTooShort && length <= maxChars;
   ```

   - Submit button enabled exactly when `isValid === true`
   - Only other condition: a global `isSubmitting` flag
   - Remove any "ready/building/overflow" progress state gating logic

3. **User feedback (under textarea):**

   - If `isTooShort`: `"Answer is too short. Add more detail."`
   - If `length > maxChars`: `"Answer is too long. Trim it slightly."`
   - Keep textual hints ("Paint a vivid picture…")
   - **No numeric counter**

4. **Debug logging (development only):**

   ```ts
   if (process.env.NODE_ENV === 'development' && !isValid) {
     console.log('[AnswerInput] Validation:', { length, minChars, maxChars, isTooShort, isEmptyRequired });
   }
   ```

### B. Fix/Stub the Microphone Button

**File:** `src/components/intake/AnswerInput.tsx`

**Option 1 - Clean stub with feedback:**

```ts
const [showMicMessage, setShowMicMessage] = useState(false);

const handleMicClick = () => {
  setShowMicMessage(true);
  setTimeout(() => setShowMicMessage(false), 3000);
};

// In JSX: show inline message when showMicMessage is true
// "Voice input is coming soon. For now, type your answer."
```

- Mic button must provide immediate visual feedback (brief highlight or state change)
- Must never interfere with typing or Submit logic

**Option 2 - Hide entirely:**

If clean stub isn't achievable, remove the mic button completely rather than leaving a dead control.

### C. Fix Intro Fade-In Animation

**File:** `src/components/intake/IntakeFlow.tsx`

1. **Wrap text block in motion.div:**

   ```tsx
   import { motion } from 'framer-motion';

   // Wrap: label, heading, three copy lines, button
   <motion.div
     initial={{ opacity: 0, y: 16 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
   >
     {/* FrameLord Intake Gateway label */}
     {/* TIER 1: FIRST-ACCESS GATE heading */}
     {/* Three intro lines */}
     {/* Begin Assessment button */}
   </motion.div>
   ```

2. **Verify:**
   - `motion.div` is actually rendered (not conditionally skipped)
   - No `hasMounted` or similar flag preventing `initial` state
   - Orb appears immediately, text+button fade in ~0.4s later

## Output

After making changes, create SUMMARY.md at:
`.prompts/004-intake-bugfix-do/SUMMARY.md`

### Manual Verification Checklist

1. **Validation test:**
   - Reload Intake screen
   - Paste 3-4 sentence answer (~200-300 chars) on Tier 1 question
   - Verify: No numeric counter, Submit enabled, no "too short" error

2. **Mic button test:**
   - Click mic button
   - Verify: Inline message appears ("Voice input coming soon...") OR mic button is absent

3. **Animation test:**
   - Reload intro screen
   - Verify: Orb appears immediately, text block fades in ~0.4s later

## Constraints

- Do NOT change Tier 1 question wording
- Do NOT modify the 9-question sequence
- Focus only on: validation logic, mic stub, animation reliability

## Success Criteria

- [ ] Submit button enables correctly based on simple length check
- [ ] No hidden validation rules blocking valid answers
- [ ] User sees clear feedback when answer is invalid
- [ ] Mic button either shows feedback message or is hidden
- [ ] Intro text visibly fades in after page load
- [ ] All three manual tests pass
- [ ] Build succeeds with no TypeScript errors
