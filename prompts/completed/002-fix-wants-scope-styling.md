<objective>
Fix styling issues in the Wants/Scope module: remove unwanted header bar, apply blue color scheme throughout, fix image click behavior, and fix status button visibility.

The goal is a cohesive dark blue aesthetic with no white elements, proper Floating Aurora display, and correct navigation when clicking Scope images.
</objective>

<context>
The Wants module displays user "Scopes" (goals/wants) in a grid with images. Currently it has multiple styling inconsistencies that break the intended dark blue brand aesthetic.

Read CLAUDE.md for project conventions before making changes.

Key files to examine:
- `@src/components/wants/WantsPage.tsx` - Main Wants page
- `@src/components/wants/WantsBanner.tsx` - Floating Aurora header component
- `@src/components/wants/WantBoardView.tsx` - Scope grid/board view
- `@src/components/wants/WantProgressView.tsx` - Progress tracking view
- `@src/styles/theme.css` - Brand colors (check for brand blue variable)
</context>

<bugs_to_fix>

<bug id="1" location="WantsBanner">
**Problem**: A black bar still sits above the Floating Aurora header.

**Required fixes**:
1. Remove the black bar entirely
2. Do NOT reduce the height of the Floating Aurora
3. INCREASE Floating Aurora height by approximately 25%
4. The top section must render ONLY the Floating Aurora gradient and animation
5. No text, no bars, no containers on top of it
</bug>

<bug id="2" location="scope-images">
**Problem**: Scope images are grayscale. User wants them tinted blue.

**Required fixes**:
1. Apply a uniform blue overlay to all Scope images
2. Images remain black and white underneath but appear saturated in blue
3. Tint color must match existing brand blue from theme.css
4. Use CSS filter or overlay technique that preserves image detail
</bug>

<bug id="3" location="scope-image-click">
**Problem**: Clicking a Scope image opens a centered white modal-like view.

**Required fixes**:
1. Remove the modal/preview behavior completely
2. Clicking an image should NOT open a centered preview
3. Instead, route to the Want detail page (e.g., /wants/:id or equivalent view)
4. Check existing routing patterns in the app for consistency
</bug>

<bug id="4" location="scope-containers">
**Problem**: Containers around Scope images show white backgrounds.

**Required fixes**:
1. Every container in the Scope grid must be blue-themed
2. Use dark blue or brand blue backgrounds
3. No white backgrounds on any card, border, button, or container in this module
4. Check all child components for white styling and replace
</bug>

<bug id="5" location="status-button">
**Problem**: Status selector (Not Started / In Progress / Done) shows white text on white button - invisible.

**Required fixes**:
1. Button background must be blue (brand blue or dark blue)
2. Text must be white and clearly visible
3. States must visually change when selected (different shade, border, or highlight)
4. Ensure proper contrast ratio for accessibility
</bug>

</bugs_to_fix>

<implementation>
Step-by-step approach:

1. **Check theme.css** for brand blue color variable - use it consistently

2. **Fix WantsBanner** (Bug #1):
   - Remove any container/bar above Floating Aurora
   - Increase Floating Aurora height by ~25%
   - Ensure only the gradient animation renders, no overlaid elements

3. **Add blue image overlay** (Bug #2):
   - Add CSS for blue tint overlay on Scope images
   - Options: `filter: sepia(100%) saturate(300%) hue-rotate(180deg)` or absolute-positioned blue overlay with mix-blend-mode
   - Test that images remain distinguishable

4. **Fix image click routing** (Bug #3):
   - Find the onClick handler for Scope images
   - Remove modal/preview logic
   - Add navigation to Want detail page using existing routing pattern

5. **Remove white containers** (Bug #4):
   - Search for white/light backgrounds in Scope components
   - Replace with dark blue or brand blue
   - Check: backgroundColor, bg-white, bg-gray-*, etc.

6. **Fix status button** (Bug #5):
   - Locate status button/selector component
   - Set background to blue
   - Set text to white
   - Add visual differentiation for selected state

**What to avoid**:
- Don't change the Floating Aurora animation itself, only its container
- Don't make images unrecognizable with heavy filtering
- Don't break navigation to other parts of the app
- Don't use hardcoded colors - use theme variables
</implementation>

<output>
Modified files (use relative paths):
- `./src/components/wants/WantsBanner.tsx` - Remove bar, increase Aurora height
- `./src/components/wants/WantBoardView.tsx` - Blue containers, image click routing
- `./src/components/wants/WantProgressView.tsx` - Blue styling if applicable
- `./src/components/wants/WantsPage.tsx` - Any page-level styling fixes
- Potentially add CSS in component files or `./src/styles/` for blue overlay
</output>

<verification>
Before declaring complete, verify:

1. **Header check**:
   - Navigate to Wants module
   - Confirm NO black bar above Floating Aurora
   - Confirm Floating Aurora is taller (25% increase)
   - Confirm only gradient animation visible at top, no text/containers

2. **Image styling check**:
   - All Scope images have blue tint
   - Images are still distinguishable/recognizable
   - No pure white elements visible

3. **Click behavior check**:
   - Click a Scope image
   - Confirm NO modal/preview opens
   - Confirm navigation to Want detail page occurs

4. **Container colors check**:
   - Inspect all cards/containers in Scope grid
   - Confirm all backgrounds are dark blue or brand blue
   - No white backgrounds anywhere in the module

5. **Status button check**:
   - Find status selector
   - Confirm blue background, white text
   - Click through states - confirm visual change for each state
</verification>

<success_criteria>
- No black bar above Floating Aurora
- Floating Aurora ~25% taller
- All Scope images have blue tint overlay
- Clicking Scope image routes to detail page (no modal)
- All containers use blue backgrounds (no white)
- Status button: blue background, white text, visible state changes
- Consistent use of brand blue from theme.css
</success_criteria>
