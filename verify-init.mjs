import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`BROWSER ERROR: ${err.message}`);
  });

  console.log('Navigating to http://localhost:5173...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Page loaded. Waiting a few seconds for init...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (err) {
    console.error('Failed to load page:', err.message);
  } finally {
    await browser.close();
  }
})();
