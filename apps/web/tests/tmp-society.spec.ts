import { test, expect } from "@playwright/test";

const OUT = "/tmp/society";
test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
test.setTimeout(240000);

test("secret society shots", async ({ page }) => {
  await page.goto("https://codexcryptica.com/generators/secret-society", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}-1-form.png` });

  await page.locator("#generate-button").click();

  // Wait for the run to finish, not merely to start: the button reads
  // "Forging..." while it works, and shooting then catches a faded result.
  await expect(page.locator("#generate-button")).not.toContainText(/forging/i, {
    timeout: 120000,
  });
  await page.waitForTimeout(2500);

  // Dismiss the "AI unavailable, local draft instead" notice. The draft itself
  // is a real product path; the banner is a transient service state.
  const notice = page.getByRole("button", { name: /close|dismiss/i }).first();
  if (await notice.isVisible().catch(() => false)) await notice.click();
  await page.evaluate(() => {
    document.querySelectorAll("button").forEach((b) => {
      const box = b.closest("div");
      if (box && /AI generation was unavailable/i.test(box.textContent || ""))
        b.click();
    });
  });
  await page.waitForTimeout(800);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}-2-result.png` });

  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}-3-detail.png` });

  const heading = await page.locator("h2").first().textContent();
  console.log("SOCIETY", JSON.stringify(heading?.trim().slice(0, 50)));
});
