# Canvas Issue Protocol - Preventing Black Screen Issues

## What Happened

1. **Excalidraw had giant lock icon** - CSS issue with SVG sizing
2. **Tried to use AFFiNE BlockSuite** - Library had broken dependencies (typo in icon imports)
3. **Black screen appeared** - Build failed silently, nothing rendered

## Root Causes

### Issue 1: Giant Lock Icon
- **Cause**: Excalidraw's SVG icons weren't constrained by CSS
- **Fix**: Added aggressive max-width/max-height constraints to all SVGs

### Issue 2: Black Screen with BlockSuite
- **Cause**: BlockSuite package has a typo in their code (`CheckBoxCkeckSolidIcon` vs `CheckBoxCheckSolidIcon`)
- **Result**: Build failed, Vite showed error, but browser showed black screen

## Prevention Protocol

### Before Adding ANY New Library:

1. **Test Build First**
   ```bash
   npm install <library>
   # Check console immediately for errors
   # Wait for HMR to complete
   # Check browser console
   ```

2. **Check Library Health**
   - GitHub issues for "build" or "vite" or "esbuild" errors
   - Check last commit date (avoid abandoned packages)
   - Look for peer dependency warnings

3. **Have Rollback Plan**
   - Always test in a separate branch
   - Keep old working code commented out
   - Be ready to `npm uninstall` immediately

4. **Verify Browser Renders**
   - Don't assume build success = working UI
   - Open browser DevTools Console
   - Check for black screens, missing elements
   - Test basic interactions

### When Black Screen Appears:

1. **Check Browser Console First**
   - Look for import errors
   - Check for "build failed" messages
   - Look for missing exports

2. **Check Vite/Build Output**
   - Terminal shows build errors before browser
   - Look for "ERROR" messages in red

3. **Quick Rollback**
   ```bash
   npm uninstall <broken-library>
   git checkout <working-file>
   ```

4. **Don't Waste Time**
   - If library has build errors, move on
   - Don't try to fix third-party library bugs
   - Find alternative or use what works

## Current Working Solution

- **Excalidraw** with aggressive CSS constraints
- Grid enabled, icons sized correctly
- Clean, minimal interface
- **Works reliably**

## Lessons Learned

1. **"Popular" doesn't mean "works"** - Even AFFiNE (100k+ stars) had broken builds
2. **Test before committing** - Always verify the library actually works
3. **Keep it simple** - Working > Perfect
4. **Trust the warnings** - Build warnings often indicate real problems

## Red Flags for Libraries

- ❌ Multiple peer dependency conflicts
- ❌ esbuild/Vite errors on install
- ❌ "No matching export" errors
- ❌ Typos in error messages (indicates poor quality)
- ❌ Last update > 6 months ago

## Safe Library Checklist

- ✅ Clean install (no critical errors)
- ✅ Browser renders something (even if not perfect)
- ✅ Console is clean (no red errors)
- ✅ Active maintenance (recent commits)
- ✅ Clear documentation
- ✅ Works with your bundler (Vite/esbuild)

## Summary

**When in doubt, use what works.** Excalidraw works, even if it's not perfect. A working imperfect solution is infinitely better than a broken "ideal" solution.
