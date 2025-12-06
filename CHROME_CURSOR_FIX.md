# Chrome/Cursor Browser Compatibility Fix

**Date:** 2025-12-04
**Status:** ✅ **RESOLVED**

## The Problem

BlockSuite canvas was working perfectly in Safari and ChatGPT Atlas browser, but completely failing to load in Chrome and Cursor browsers. User reported seeing "a flash for a split second then goes black."

## Root Cause Discovery

The issue was **NOT related to BlockSuite at all**. The failure was caused by `RetroClockPanel.tsx`, an unrelated component on the page that was crashing during initialization.

### The Error

```
IndexSizeError: Failed to execute 'createImageData' on 'CanvasRenderingContext2D':
The source width is zero or not a number
```

**Location:** `RetroClockPanel.tsx:110`

### Why This Broke the Entire Canvas

`RetroClockPanel.tsx` creates a TV static effect using HTML5 Canvas. During initialization:

1. The component mounts
2. It tries to create an ImageData object with `ctx.createImageData(width, height)`
3. At this exact moment, the canvas hasn't been sized yet (width = 0, height = 0)
4. Chrome throws `IndexSizeError` and the error propagates
5. The entire page component tree crashes
6. React error boundary or page error handler shows black screen
7. **This happens BEFORE BlockSuite can even initialize**

### Why Safari Worked But Chrome Didn't

This is a **timing difference** between browsers:
- **Safari**: More lenient with canvas operations, may have handled zero dimensions gracefully or sized the canvas faster
- **Chrome/Cursor**: Stricter validation, immediately throws error on invalid canvas dimensions

## The Fix

**File:** `components/RetroClockPanel.tsx` (line 107-118)

**Before:**
```typescript
const draw = () => {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.createImageData(width, height); // ❌ Crashes if width/height are 0
  const data = imageData.data;
  // ...
```

**After:**
```typescript
const draw = () => {
  const width = canvas.width;
  const height = canvas.height;

  // Skip drawing if canvas has no dimensions yet
  if (width <= 0 || height <= 0) {
    frameId = requestAnimationFrame(draw);
    return;
  }

  const imageData = ctx.createImageData(width, height); // ✅ Safe now
  const data = imageData.data;
  // ...
```

## Key Lessons Learned

### 1. **Diagnostic Red Herring**
We spent extensive time debugging BlockSuite initialization:
- Added MutationObserver polyfills
- Added canvas rendering safety wrappers **to BlockSuite component**
- Enhanced error boundaries
- Added comprehensive logging

**None of these were needed for the actual bug.** They were good defensive programming, but the real issue was elsewhere.

### 2. **Error Location Matters**
The browser console error pointed to `RetroClockPanel.tsx:110`, not BlockSuite code. This was the critical clue that we initially missed because we were focused on BlockSuite integration.

### 3. **Flash Then Black = Early Crash**
The "flash for a split second then black" symptom indicated:
- The page was starting to render (flash)
- Something crashed immediately during initialization (black)
- This pattern suggests an error in a component that mounts early, not in user-triggered actions

### 4. **Browser-Specific Failures**
When something works in Safari but not Chrome:
- Look for timing issues (race conditions, async operations)
- Look for strict vs. lenient API validation
- Check canvas/WebGL operations (Chrome is stricter)
- Verify Web Components compatibility

### 5. **The Real BlockSuite Polyfills**
The polyfills we added to `BlockSuiteEdgelessCanvas.tsx` are actually valuable:

**MutationObserver Safety:**
```typescript
MutationObserver.prototype.observe = function(target, options) {
  if (!target || !(target instanceof Node)) {
    console.warn('[BlockSuite Canvas] MutationObserver: Skipping invalid target');
    return;
  }
  return originalObserve.call(this, target, options);
};
```

**Canvas createImageData Safety:**
```typescript
CanvasProto.createImageData = function(...args: any[]) {
  const [width, height] = args;
  if (typeof width === 'number' && (width <= 0 || !isFinite(width))) {
    console.warn('[BlockSuite Canvas] createImageData: Invalid width', width);
    return originalCreateImageData.call(this, 1, height || 1);
  }
  // Similar check for height
  return originalCreateImageData.apply(this, args as any);
};
```

**These prevent similar issues in BlockSuite itself**, even though they didn't fix this specific bug.

## Impact

**Before Fix:**
- ❌ Chrome: Canvas page crashes, black screen
- ❌ Cursor: Canvas page crashes, black screen
- ✅ Safari: Works fine
- ✅ ChatGPT Atlas: Works fine

**After Fix:**
- ✅ Chrome: Canvas loads and works
- ✅ Cursor: Canvas loads and works
- ✅ Safari: Still works
- ✅ ChatGPT Atlas: Still works

## Files Modified

1. **`components/RetroClockPanel.tsx`** (PRIMARY FIX)
   - Added dimension check before `createImageData()`
   - Prevents crash when canvas has zero dimensions

2. **`components/canvas/BlockSuiteEdgelessCanvas.tsx`** (DEFENSIVE)
   - Added MutationObserver polyfill
   - Added canvas rendering safety wrapper
   - Added container dimension validation
   - Enhanced error handling and logging

## Testing Checklist

- [x] Chrome - Canvas loads without crash
- [x] Cursor - Canvas loads without crash
- [x] Safari - Still works (regression test)
- [ ] Color picker appears when clicking pencil tool (next issue)
- [ ] Text persists after typing content
- [ ] Mind map widget shows shapes when clicked

## Next Issue: Color Picker

Now that the canvas loads in Chrome/Cursor, we can debug the color picker issue. See user's next screenshot/feedback.

---

**Conclusion:** Always check the browser console error location carefully. The error message pointed directly at `RetroClockPanel.tsx:110`, not BlockSuite code. Following the error location immediately would have saved hours of debugging.
