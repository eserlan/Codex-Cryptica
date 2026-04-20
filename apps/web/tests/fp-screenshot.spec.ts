import { test } from "@playwright/test";

test("screenshot front page", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).DISABLE_ONBOARDING = true;
  });
  await page.goto("http://localhost:5174");
  await page.waitForLoadState("networkidle");

  const enterBtn = page.getByText("Enter the Codex");
  if (await enterBtn.isVisible()) {
    await enterBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: "/tmp/ss-app.png" });

  const shell = page.locator('[data-testid="front-page-shell"]');
  if (await shell.isVisible().catch(() => false)) {
    await shell.screenshot({ path: "/tmp/ss-frontpage.png" });
  }
});
