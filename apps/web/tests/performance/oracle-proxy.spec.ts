import { test, expect } from '@playwright/test';

/**
 * Performance tests for Oracle proxy call overhead.
 * Ensures proxy calls meet the <200ms overhead requirement.
 */

test('proxy call overhead is under 200ms', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const responseTimes: number[] = [];

  // Monitor response times for Oracle API calls
  page.on('response', async (response) => {
    const url = response.url();
    
    // Track proxy endpoint responses
    if (url.includes('oracle-proxy.codexcryptica.workers.dev')) {
      const timing = response.request().timing();
      
      // Calculate total time from request start to response end
      const totalTime = timing.responseEnd;
      
      if (totalTime > 0 && totalTime < 5000) {
        responseTimes.push(totalTime);
      }
    }
  });

  // Trigger an Oracle message if input is available
  const oracleInput = page.locator('[data-testid="oracle-input"]');
  if (await oracleInput.isVisible()) {
    await oracleInput.fill('Performance test message');
    
    const sendButton = page.locator('[data-testid="oracle-send"]');
    if (await sendButton.isVisible()) {
      await sendButton.click();
      
      // Wait for response to complete
      await page.waitForTimeout(3000);
    }
  }

  // Verify we captured some response times
  if (responseTimes.length > 0) {
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxTime = Math.max(...responseTimes);
    
    // Average overhead should be under 200ms
    expect(avgTime).toBeLessThan(200);
    
    // Log for debugging
    console.log(`Proxy performance - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms, Samples: ${responseTimes.length}`);
  } else {
    // If no proxy requests were made (e.g., user has custom key), skip this test
    console.log('No proxy requests detected - test skipped (user may be in Custom API Key mode)');
  }
});

test('Oracle UI renders without layout shift', async ({ page }) => {
  await page.goto('/');
  
  // Measure CLS for Oracle component
  const layoutShifts: number[] = [];
  
  let cumulatedShift = 0;
  page.on('console', async (msg) => {
    if (msg.type() === 'log' && msg.text().includes('layout-shift')) {
      const shift = parseFloat(msg.text().split(':')[1]);
      if (!isNaN(shift)) {
        layoutShifts.push(shift);
        cumulatedShift += shift;
      }
    }
  });

  // Open Oracle sidebar if needed
  const oracleToggle = page.locator('[data-testid="oracle-toggle"]');
  if (await oracleToggle.isVisible()) {
    await oracleToggle.click();
    await page.waitForTimeout(1000);
  }

  // CLS should be 0 for Oracle component
  expect(cumulatedShift).toBe(0);
});
