import { test, expect } from "@playwright/test";

test.describe("Footer", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		// Wait for the app to load
		await page.waitForSelector(".app-layout");
	});

	test("should display Patreon support link in the footer", async ({ page }) => {
		const footer = page.locator("footer");
		const patreonLink = footer.locator('a:has-text("Support on Patreon")');

		await expect(patreonLink).toBeVisible();
		await expect(patreonLink).toHaveAttribute("href", "https://patreon.com/");
		await expect(patreonLink).toHaveAttribute("target", "_blank");
		await expect(patreonLink).toHaveAttribute("rel", "noopener noreferrer");
	});

	test("should have correct styling classes on Patreon link", async ({ page }) => {
		const patreonLink = page.locator('footer a:has-text("Support on Patreon")');
		const classes = await patreonLink.getAttribute("class");

		expect(classes).toContain("text-[10px]");
		expect(classes).toContain("font-mono");
		expect(classes).toContain("uppercase");
		expect(classes).toContain("tracking-widest");
	});

	test("Patreon link should persist in offline mode", async ({ context, page }) => {
		// Go offline
		await context.setOffline(true);
		await page.reload();

		const patreonLink = page.locator('footer a:has-text("Support on Patreon")');
		await expect(patreonLink).toBeVisible();

		// Go back online
		await context.setOffline(false);
	});
});
