import { test } from "@playwright/test";

test("screenshot front page", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).DISABLE_ONBOARDING = true;
  });
  await page.goto("http://localhost:5174");
  await page.waitForLoadState("networkidle");

  await page
    .evaluate(() => {
      const uiStore = (window as any).uiStore;
      if (uiStore) uiStore.dismissedLandingPage = true;
    })
    .catch(() => {});
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "/tmp/ss-app.png" });

  const shell = page.locator('[data-testid="front-page-shell"]');
  if (await shell.isVisible().catch(() => false)) {
    await shell.screenshot({ path: "/tmp/ss-frontpage.png" });
  }
});
