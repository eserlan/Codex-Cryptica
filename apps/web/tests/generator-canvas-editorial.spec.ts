import { expect, test } from "@playwright/test";

for (const entry of [
  {
    slug: "dungeon-generator",
    action: "Build Delve Canvas",
    type: "Location",
    node: ".svelte-flow__node-delveRoom",
  },
  {
    slug: "adventure-generator",
    action: "Open Adventure Canvas",
    type: "Note",
    node: ".svelte-flow__node-adventureNode",
  },
]) {
  test(`${entry.slug} opens the populated imported canvas without a refresh`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 844 });
    await page.goto(`/generators/${entry.slug}`);
    const ai = page.locator("#ai-toggle");
    if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
    await page.locator("#generate-button").click();
    // The canvas action is present in the example; wait for completed generation.
    await expect(
      page.getByRole("button", { name: "Save selected (1)" }),
    ).toBeVisible();
    const title = await page.locator("h2").first().innerText();
    await page.getByRole("button", { name: entry.action }).click();
    await expect(page).toHaveURL(/\/canvas\/[^/]+$/, { timeout: 30000 });
    const workspace = page.getByRole("region", { name: "Canvas Workspace" });
    await expect(
      workspace.getByText(title, { exact: true }).first(),
    ).toBeVisible({ timeout: 30000 });
    await expect(workspace.locator(entry.node).first()).toBeVisible({
      timeout: 30000,
    });
    await expect(
      workspace.getByText("Untitled Workspace", { exact: true }),
    ).toHaveCount(0);
    await expect(
      workspace.getByRole("button", {
        name:
          entry.type === "Location"
            ? `Open Location: ${title}`
            : `Open Adventure: ${title}`,
      }),
    ).toBeVisible();
    await page.waitForFunction(
      () => !localStorage.getItem("__codex_pending_canvas"),
    );
    await page.reload();
    await expect(
      workspace.getByText(title, { exact: true }).first(),
    ).toBeVisible({ timeout: 30000 });
    await expect(workspace.locator(entry.node).first()).toBeVisible({
      timeout: 30000,
    });
    await page.goto("/table");
    const rows = page.getByTestId("entity-table-row");
    await expect(rows.filter({ hasText: title })).toHaveCount(1, {
      timeout: 30000,
    });
    await expect(rows.filter({ hasText: title })).toContainText(entry.type);
  });
}
