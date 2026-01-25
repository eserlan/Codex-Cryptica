import { test, expect } from '@playwright/test';

test('Graph status indicator should be positioned above zoom controls', async ({ page }) => {
  await page.goto('/');

  // Wait for the "Ready" status text to appear
  const statusIndicator = page.locator('text=Ready').first();
  await expect(statusIndicator).toBeVisible();

  // Find the container for the zoom buttons (the div containing the buttons)
  // We look for the button with "Zoom In" title and get its parent's parent or just the container
  // The structure is: div.flex-col > div (status) + div.flex (buttons)
  // Let's identify the zoom in button
  const zoomInButton = page.locator('button[title="Zoom In"]');
  await expect(zoomInButton).toBeVisible();

  // Get bounding boxes
  const statusBox = await statusIndicator.boundingBox();
  const zoomBtnBox = await zoomInButton.boundingBox();

  expect(statusBox).not.toBeNull();
  expect(zoomBtnBox).not.toBeNull();

  if (statusBox && zoomBtnBox) {
    // Check Vertical Stacking: Status bottom should be less than Zoom top
    // (Y coordinates increase downwards)
    expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(zoomBtnBox.y);

    // Check Left Alignment: Left coordinates should be close
    // The status text is inside a container with padding, so we check the container or rough alignment
    // The zoom button is inside a flex row.
    // Let's just ensure they are roughly in the same column (left aligned relative to viewport)
    expect(Math.abs(statusBox.x - zoomBtnBox.x)).toBeLessThan(50); // Allow some tolerance for padding
  }
});
