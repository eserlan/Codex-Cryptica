import { test, expect } from "@playwright/test";

/**
 * The welcome screen's graph preview and the demo vault must show the same
 * world (chunk 14).
 *
 * They used to show different ones: the preview had Captain Veyra, the Glass
 * Rebellion and the Sunken Archive, while "Explore Demo Vault" opened Eldrin
 * the Wise, the Black Iron Tavern and the Gilded Hand. Zero overlap, so a
 * visitor studied one graph and landed in another. That is the "unrelated
 * generated samples" finding in its most concrete form.
 *
 * This compares the preview against the demo vault's own JSON rather than a
 * hardcoded list, so adding an entity to the demo without updating the preview
 * fails here.
 */

test("the welcome preview shows the demo vault's cast", async ({
  page,
  request,
}) => {
  const demo = await (await request.get("/vault-samples/fantasy.json")).json();
  const entities = Array.isArray(demo.entities)
    ? demo.entities
    : Object.values(demo.entities ?? demo);
  const demoTitles = entities.map((e: { title: string }) => e.title).sort();

  await page.goto("/");
  await expect(page.getByTestId("welcome-preview-button")).toBeVisible();

  const previewLabels = await page
    .locator('[data-testid="welcome-preview-button"] svg text')
    .allTextContents();

  expect(previewLabels.map((t) => t.trim()).sort()).toEqual(demoTitles);
});

test("the preview's detail panel quotes the demo entity, not an invented one", async ({
  page,
}) => {
  await page.goto("/");
  const panel = page.getByTestId("welcome-preview-button");

  // Eldrin's two connections in fantasy.json: member_of the Gilded Hand, and
  // located_in the Black Iron Tavern.
  await expect(panel.getByText("Eldrin the Wise").first()).toBeVisible();
  await expect(panel.getByText("The Gilded Hand").first()).toBeVisible();
  await expect(panel.getByText("Black Iron Tavern").first()).toBeVisible();
});
