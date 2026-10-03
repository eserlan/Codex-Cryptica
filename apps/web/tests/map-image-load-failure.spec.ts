import path from "path";
import { expect, test } from "@playwright/test";
import { openMapWithUpload } from "./test-helpers";

test.describe.configure({ mode: "serial" });

// A map whose image cannot be loaded used to show the loading spinner forever.
test("a failed map image shows an error and can be retried", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openMapWithUpload(page, "Retry Map");

  // Fail the next image resolution only, then behave normally again.
  await page.evaluate(() => {
    const vault = (window as any).vault;
    const original = vault.resolveImageUrl.bind(vault);
    let failed = false;
    vault.resolveImageUrl = (...args: unknown[]) => {
      if (!failed) {
        failed = true;
        return Promise.resolve("");
      }
      return original(...args);
    };
    // Changing the map's signature makes the view reload its image.
    const map = vault.maps[vault.activeMapId ?? Object.keys(vault.maps)[0]];
    map.dimensions = {
      width: map.dimensions.width + 1,
      height: map.dimensions.height,
    };
  });

  const error = page.getByTestId("map-image-error");
  await expect(error).toBeVisible({ timeout: 10000 });
  await expect(error).toContainText("could not be loaded");
  // The spinner is gone: it must not keep implying the load is in progress.
  await expect(page.getByText("Synthesizing Spatial Asset...")).toHaveCount(0);

  await error.getByRole("button", { name: "Try again" }).click();

  await expect(error).toBeHidden({ timeout: 10000 });
  await expect(page.locator("canvas")).toBeVisible();
});

test("a map with a missing image can be given a new one", async ({ page }) => {
  test.setTimeout(90000);
  await openMapWithUpload(page, "Broken Map");

  // Make the current image permanently unavailable, like a file lost from
  // this device, then make the view reload it.
  const oldPath = await page.evaluate(() => {
    const vault = (window as any).vault;
    const id = vault.activeMapId ?? Object.keys(vault.maps)[0];
    const map = vault.maps[id];
    const missing = map.assetPath;
    const original = vault.resolveImageUrl.bind(vault);
    vault.resolveImageUrl = (path: string, ...rest: unknown[]) =>
      path === missing ? Promise.resolve("") : original(path, ...rest);
    map.dimensions = {
      width: map.dimensions.width + 1,
      height: map.dimensions.height,
    };
    return missing as string;
  });

  const error = page.getByTestId("map-image-error");
  await expect(error).toBeVisible({ timeout: 10000 });

  // Retrying cannot help: the file is still missing.
  await error.getByRole("button", { name: "Try again" }).click();
  await expect(error).toBeVisible();

  await page
    .getByTestId("map-image-replace-input")
    .setInputFiles(path.join(process.cwd(), "static/favicon.png"));

  await expect(error).toBeHidden({ timeout: 15000 });
  await expect(page.locator("canvas")).toBeVisible();

  const newPath = await page.evaluate(() => {
    const vault = (window as any).vault;
    const id = vault.activeMapId ?? Object.keys(vault.maps)[0];
    return vault.maps[id].assetPath as string;
  });
  expect(newPath).toMatch(/^maps\/.+\.webp$/);
  expect(newPath).not.toBe(oldPath);
});
