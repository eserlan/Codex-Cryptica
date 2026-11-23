import { test, expect } from "@playwright/test";

test("first local generator action works offline after the route is ready", async ({
  page,
  context,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/generators/npc");
  const generate = page.locator("#generate-button");
  await expect(generate).toBeEnabled({ timeout: 15000 });
  await page.waitForLoadState("networkidle");
  const output = page.getByRole("region", {
    name: "Generated Output Workspace",
  });
  const exampleText = await output.innerText();
  await expect(output.getByText("Example", { exact: true })).toBeVisible();

  await context.setOffline(true);
  await generate.click();

  await expect(output).not.toContainText("No Draft Generated", {
    timeout: 15000,
  });
  await expect(output.getByText("Example", { exact: true })).toHaveCount(0);
  await expect.poll(() => output.innerText()).not.toBe(exampleText);
  expect(pageErrors).toEqual([]);
});

test("slug changes preload the new route's local generator before offline use", async ({
  page,
  context,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/generators/npc");
  await expect(page.locator("#generate-button")).toBeEnabled({
    timeout: 15000,
  });
  await page.waitForLoadState("networkidle");
  await page.locator("#generator-switcher-btn").click();
  await page.getByRole("menuitem", { name: /Social Hub Generator/i }).click();
  await expect(page).toHaveURL(/\/generators\/social-hub$/);
  const generate = page.locator("#generate-button");
  await expect(generate).toBeEnabled({ timeout: 15000 });
  await page.waitForLoadState("networkidle");

  const output = page.getByRole("region", {
    name: "Generated Output Workspace",
  });
  await expect(output.getByText("Example", { exact: true })).toBeVisible();
  await context.setOffline(true);
  await generate.click();

  await expect(output.getByText("Example", { exact: true })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("setup recovery restores form context and the local-only AI choice before Generate enables", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "codex-generator-setup-recovery:/generators/npc",
      JSON.stringify({
        forms: {
          npc: { campaignContext: "Recovered private campaign context" },
        },
        activeTheme: "Classic Fantasy",
        useAI: false,
      }),
    );
  });
  await page.goto("/generators/npc");
  await expect(page.locator("#generate-button")).toBeEnabled({
    timeout: 15000,
  });
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("codex-generator-setup-recovery:/generators/npc"),
    ),
  ).toBeNull();
  await expect(page.getByLabel("Add campaign context")).toHaveValue(
    "Recovered private campaign context",
  );
  await expect(page.locator("#ai-toggle")).not.toBeChecked();
  await expect(page.locator("#generate-button")).toBeEnabled({
    timeout: 15000,
  });
});
