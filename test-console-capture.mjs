// Simple Console Capture - Opens browser and captures all console logs
// You interact with the app manually, and this script captures all the logs
import puppeteer from 'puppeteer';

const CAPTURE_DURATION = 60000; // Capture for 60 seconds

async function captureConsoleLogs() {
  console.log('🚀 Opening browser to capture console logs...');
  console.log('📋 You have 60 seconds to test the WikiLink feature manually');
  console.log('   Type [[ in the editor and try selecting a note\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 },
  });

  const page = await browser.newPage();

  // Capture ALL console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const logEntry = `[${timestamp}] [${msg.type()}] ${text}`;
    consoleLogs.push(logEntry);

    // Print WikiLink related logs immediately
    if (text.includes('WikiLink') || text.includes('wikilink')) {
      console.log(`📋 ${logEntry}`);
    }
  });

  // Capture errors
  page.on('pageerror', err => {
    console.log(`❌ Page Error: ${err.message}`);
    consoleLogs.push(`[ERROR] ${err.message}`);
  });

  try {
    console.log('📍 Navigating to http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Page loaded\n');
    console.log('⏱️  Capturing logs for 60 seconds. Test the WikiLink feature now!\n');
    console.log('='.repeat(60));

    // Wait for the capture duration
    await new Promise(resolve => setTimeout(resolve, CAPTURE_DURATION));

    console.log('='.repeat(60));
    console.log('\n📋 CAPTURE COMPLETE - ALL WIKILINK LOGS:');
    console.log('='.repeat(60));

    const wikiLogs = consoleLogs.filter(log =>
      log.toLowerCase().includes('wikilink') ||
      log.toLowerCase().includes('wiki') ||
      log.includes('[[')
    );

    if (wikiLogs.length === 0) {
      console.log('⚠️ No WikiLink logs captured!');
      console.log('   Make sure you typed [[ in the editor');
    } else {
      wikiLogs.forEach(log => console.log(log));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 ALL LOGS (last 100):');
    console.log('='.repeat(60));
    consoleLogs.slice(-100).forEach(log => console.log(log));

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed');
  }
}

captureConsoleLogs().catch(console.error);
