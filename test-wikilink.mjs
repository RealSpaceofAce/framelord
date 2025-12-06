// WikiLink Test Script - Captures browser console logs
import puppeteer from 'puppeteer';

const TIMEOUT = 30000;

// Helper function to wait (waitForTimeout was deprecated)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testWikiLink() {
  console.log('🚀 Starting WikiLink test...\n');

  const browser = await puppeteer.launch({
    headless: false,  // Show the browser so we can see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 },
    slowMo: 100,  // Slow down actions so we can see them
  });

  const page = await browser.newPage();

  // Capture ALL console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    // Print WikiLink related logs immediately
    if (text.includes('WikiLink')) {
      console.log(`📋 ${text}`);
    }
  });

  // Capture errors
  page.on('pageerror', err => {
    console.log(`❌ Page Error: ${err.message}`);
  });

  try {
    console.log('📍 Navigating to http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: TIMEOUT });
    console.log('✅ Page loaded\n');

    // Wait for the app to initialize
    await delay(2000);

    // Take a screenshot of initial state
    await page.screenshot({ path: 'test-screenshot-1-initial.png' });
    console.log('📸 Screenshot 1: Initial state saved\n');

    // Look for Notes navigation - try multiple selectors
    console.log('🔍 Looking for Notes navigation...');

    // Click on NOTES in the sidebar (visible in screenshot)
    const clicked = await page.evaluate(() => {
      // Find element containing "NOTES" text
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent?.trim();
        if (text === 'NOTES' || text === 'Notes') {
          console.log('[Test] Found NOTES element:', el.tagName);
          el.click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      console.log('✅ Clicked on NOTES');
    } else {
      console.log('⚠️ Could not find NOTES element');
    }

    await delay(1500);
    await page.screenshot({ path: 'test-screenshot-2-after-notes-click.png' });
    console.log('📸 Screenshot 2: After Notes click\n');

    // Look for a note to click or create one
    console.log('🔍 Looking for an existing note or create button...');

    // Try to find and click on any note in the list
    const noteListItemClicked = await page.evaluate(() => {
      // Look for note items in the sidebar
      const noteItems = document.querySelectorAll('[class*="note-item"], [class*="NoteItem"], [data-note-id]');
      if (noteItems.length > 0) {
        noteItems[0].click();
        return true;
      }

      // Try clicking on anything that looks like a note title
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent && (el.textContent.includes('Untitled') || el.textContent.includes('Note'))) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 50 && rect.height > 20 && rect.height < 100) {
            el.click();
            return true;
          }
        }
      }
      return false;
    });

    if (noteListItemClicked) {
      console.log('✅ Clicked on a note item');
    } else {
      console.log('⚠️ No note item found to click');
    }

    await delay(2000);
    await page.screenshot({ path: 'test-screenshot-3-note-opened.png' });
    console.log('📸 Screenshot 3: Note opened\n');

    // Find the editor / contenteditable area
    console.log('🔍 Looking for editor area...');

    const editorFound = await page.evaluate(() => {
      // Look for BlockSuite editor or contenteditable
      const selectors = [
        'affine-editor-container',
        '[contenteditable="true"]',
        '.blocksuite-editor',
        '.affine-page-viewport',
        '.inline-editor',
        '[data-block-id]',
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          console.log('[Test] Found editor element:', selector);
          // Try to focus it
          if (el.focus) {
            el.focus();
          }
          // Click it
          el.click();
          return { found: true, selector };
        }
      }

      return { found: false };
    });

    console.log('Editor search result:', editorFound);

    await delay(500);

    // Now type [[ to trigger WikiLink
    console.log('\n⌨️ Typing "[["...');
    await page.keyboard.type('[[', { delay: 100 });

    await delay(1000);
    await page.screenshot({ path: 'test-screenshot-4-after-brackets.png' });
    console.log('📸 Screenshot 4: After typing [[\n');

    // Check if popup appeared
    const popupVisible = await page.evaluate(() => {
      // Look for WikiLink popup
      const popup = document.querySelector('[class*="WikiLink"], [class*="wiki-link"], .fixed.bg-\\[\\#1f1f23\\]');
      if (popup) {
        const styles = window.getComputedStyle(popup);
        return {
          found: true,
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
        };
      }
      return { found: false };
    });

    console.log('WikiLink popup status:', popupVisible);

    // If popup is visible, try clicking on the first option
    if (popupVisible.found) {
      console.log('\n👆 Attempting to click popup option...');

      await page.evaluate(() => {
        const options = document.querySelectorAll('.fixed [class*="cursor-pointer"]');
        if (options.length > 0) {
          console.log('[Test] Found', options.length, 'clickable options');
          options[0].click();
        }
      });

      await delay(500);
      await page.screenshot({ path: 'test-screenshot-5-after-click.png' });
      console.log('📸 Screenshot 5: After clicking option\n');
    }

    // Print summary of WikiLink console logs
    console.log('\n' + '='.repeat(60));
    console.log('📋 WIKILINK CONSOLE LOGS:');
    console.log('='.repeat(60));

    const wikiLogs = consoleLogs.filter(log => log.includes('WikiLink'));
    if (wikiLogs.length === 0) {
      console.log('⚠️ No WikiLink logs captured!');
    } else {
      wikiLogs.forEach(log => console.log(log));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 ALL CONSOLE LOGS (last 50):');
    console.log('='.repeat(60));
    consoleLogs.slice(-50).forEach(log => console.log(log));

  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'test-screenshot-error.png' });
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed');
  }
}

testWikiLink().catch(console.error);
