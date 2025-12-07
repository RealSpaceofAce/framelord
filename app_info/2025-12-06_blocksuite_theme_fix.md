# BlockSuite Theme Background Issue - Fix Documentation

**Date:** 2025-12-06
**Issue:** Different shade backgrounds appearing on text page (gray instead of pure black)

---

## Problem

The Notes editor was showing gray backgrounds (`#1f1f23`) instead of pure black (`#000000`) in dark mode, creating a visually inconsistent appearance with different shade backgrounds.

## Root Cause

BlockSuite theme colors are applied in **3 layers**, and they override each other:

1. **CSS Variables** (`lib/blocksuite/theme.css`)
   - Lowest priority
   - Can be overridden by inline styles

2. **CSS-in-JS / Tailwind Classes** (component files like `AffineNotes.tsx`)
   - Medium priority
   - Can be overridden by inline JavaScript styles

3. **JavaScript Inline Styles** (`lib/blocksuite/themes.ts` via `applyThemeToElement()`)
   - **HIGHEST PRIORITY** - This was the culprit!
   - Applied directly to elements via `element.style.setProperty()`
   - Overrides all CSS regardless of specificity

The `darkTheme` object in `lib/blocksuite/themes.ts` was using gray colors:
```typescript
// OLD (WRONG)
'--affine-background-primary-color': '#1f1f23',  // Gray!
'--affine-background-secondary-color': '#27272a', // Gray!
```

## Solution

Updated `lib/blocksuite/themes.ts` to use brand palette colors:

```typescript
// NEW (CORRECT)
export const darkTheme: EditorThemeVariables = {
  // Background — PURE BLACK (brand palette)
  '--affine-background-primary-color': '#000000',
  '--affine-background-secondary-color': '#000000',
  '--affine-background-tertiary-color': '#0a0a0a',
  '--affine-background-overlay-panel-color': 'rgba(0, 0, 0, 0.98)',
  '--affine-background-modal-color': '#000000',
  '--affine-background-code-block': '#050505',

  // Brand — Blue accent #0043ff
  '--affine-primary-color': '#0043ff',
  '--affine-brand-color': '#0043ff',

  // Borders — Brand palette
  '--affine-border-color': '#1c1c1c',
  '--affine-divider-color': '#1c1c1c',
  // ... etc
};
```

## Files Modified

| File | Changes |
|------|---------|
| `lib/blocksuite/themes.ts` | **PRIMARY FIX** - Updated `darkTheme` object to use pure black |
| `lib/blocksuite/theme.css` | Changed CSS fallback colors from `#111111` to `#0a0a0a` |
| `components/notes/AffineNotes.tsx` | Changed hover color from `#111111` to `#0a0a0a` |
| `components/notes/BiDirectionalLinks.tsx` | Changed backgrounds from `#111111` to `#0a0a0a` |
| `components/notes/WikiLinkPopup.tsx` | Changed backgrounds from `#111111` to `#0a0a0a` |
| `components/notes/NoteCanvasToolbar.tsx` | Changed hover backgrounds from `#111111` to `#0a0a0a` |

## FrameLord Brand Color Palette

Always use these colors for dark mode:

| Color | Hex | Usage |
|-------|-----|-------|
| Pure Black | `#000000` | Primary backgrounds |
| Near Black | `#0a0a0a` | Secondary/hover backgrounds |
| Border Dark | `#1c1c1c` | Borders, dividers |
| Brand Blue | `#0043ff` | Accent, selection, primary actions |

## How to Debug in Future

1. **Check `themes.ts` first** - The `darkTheme` object has the highest priority
2. **Use browser DevTools** - Inspect element styles:
   - Look for inline `style` attributes (these come from `applyThemeToElement()`)
   - Check which CSS variable is being used
3. **Search for gray hex codes**:
   ```bash
   grep -r "#1f1f|#18181|#27272|#111111" --include="*.ts" --include="*.tsx" --include="*.css"
   ```

## Key Insight

CSS changes alone won't fix theme issues if `applyThemeToElement()` is applying inline JavaScript styles. The JavaScript inline styles always win because they have the highest specificity in the cascade.

When debugging BlockSuite theme issues:
1. Check `lib/blocksuite/themes.ts` **FIRST**
2. Then check component files for hardcoded colors
3. Then check CSS files last (they have lowest priority)
