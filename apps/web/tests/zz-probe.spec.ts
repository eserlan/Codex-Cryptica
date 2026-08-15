import { test, expect, type Page } from "@playwright/test";

async function boot(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("codex_skip_landing", "true");
    localStorage.setItem("codex_guided_mode_active", "false");
    localStorage.setItem(
      "codex-cryptica-help-state",
      JSON.stringify({ completedTours: ["initial-onboarding"] }),
    );
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForFunction(() => (window as any).vault?.status === "idle");
  await page.goto("/tables");
  await expect(page.getByTestId("new-table")).toBeVisible({ timeout: 30000 });
}

test("probe: which step fetches a font", async ({ page, context }) => {
  test.setTimeout(60000);
  await boot(page);

  const hits: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://localhost:")) hits.push(r.url());
  });
  const mark = (label: string) => {
    console.log(`PROBE ${label}: ${hits.length} ${hits.join("|")}`);
    hits.length = 0;
  };

  await context.setOffline(true);
  mark("after-offline");

  await page.getByTestId("source-mode-build").click();
  mark("mode-build-only");

  await page.getByTestId("source-mode-use").click();
  mark("mode-use-only");

  await page.getByTestId("new-table").click();
  await expect(page.getByTestId("table-editor")).toBeVisible();
  mark("new-table-editor");

  await context.setOffline(false);
});
