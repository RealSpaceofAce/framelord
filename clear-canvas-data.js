#!/usr/bin/env node
/**
 * Canvas Data Cleaner
 * Removes all Frame Canvas localStorage data to resolve issues with stuck/cluttered canvases
 *
 * Usage:
 * 1. Open your browser's Developer Tools (F12)
 * 2. Go to the Console tab
 * 3. Paste this code and press Enter:
 */

console.log('🧹 Clearing Frame Canvas data...');

// Clear all Excalidraw canvas data
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('framelord_excalidraw_')) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  console.log(`  Removing: ${key}`);
  localStorage.removeItem(key);
});

console.log(`✅ Cleared ${keysToRemove.length} canvas(es)`);
console.log('🔄 Reload the page to start with a clean canvas');

/**
 * To use this in the browser console:
 *
 * 1. Copy the code below
 * 2. Paste in browser console
 * 3. Press Enter
 * 4. Refresh the page
 */

// Browser console version (copy this):
/*
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('framelord_excalidraw_')) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => localStorage.removeItem(key));
console.log(`Cleared ${keysToRemove.length} canvas(es). Reload the page.`);
*/
