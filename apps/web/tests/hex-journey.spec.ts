import { expect, test, type Page } from "@playwright/test";
import { openMapWithUpload } from "./test-helpers";

async function enableHexMode(page: Page) {
  const controls = page.getByTestId("map-controls-fab");
  if (await controls.isVisible().catch(() => false)) await controls.click();
  await page
    .locator('[data-help-target="vtt-grid-button"]')
    .click({ button: "right" });
  await expect(
    page.getByRole("heading", { name: /grid/i }).first(),
  ).toBeVisible();
  const pointy = page.getByRole("button", { name: /pointy/i });
  await pointy.scrollIntoViewIfNeeded();
  await pointy.click();
  const hexCrawl = page.getByRole("switch", { name: /hex crawl/i });
  await hexCrawl.scrollIntoViewIfNeeded();
  await hexCrawl.check();
  const apply = page.getByRole("button", { name: "Apply to All", exact: true });
  await apply.scrollIntoViewIfNeeded();
  if (
    await page
      .getByTestId("map-controls-fab")
      .isVisible()
      .catch(() => false)
  ) {
    await apply.evaluate((button) => (button as HTMLButtonElement).click());
  } else {
    await apply.click();
  }
  await expect(page.getByRole("dialog", { name: "Grid Settings" })).toHaveCount(
    0,
  );
}

async function clickHex(page: Page, dx = 0, dy = 0) {
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error("Map canvas was not found.");
  await page.mouse.click(
    box.x + box.width / 2 + dx,
    box.y + box.height / 2 + dy,
  );
}

async function addPartyTokenAtMapCentre(page: Page, name = "Journey Party") {
  return page.evaluate((tokenName) => {
    const session = (window as any).mapSession;
    const map = session.deps.mapStore;
    const size = map.gridSize || 50;
    if (
      !map.activeMap.dimensions?.width ||
      map.activeMap.dimensions.width < size * 8
    ) {
      map.activeMap.dimensions = { width: 2048, height: 2048 };
      map.updateViewport({ x: 0, y: 0 }, 1);
    }
    const canvasCentre = {
      x: map.canvasSize.width / 2,
      y: map.canvasSize.height / 2,
    };
    const worldCentre = map.unproject(canvasCentre);
    const existing = session.allTokens.find(
      (token: { name: string }) => token.name === tokenName,
    );
    const token =
      existing ??
      session.addToken({
        name: tokenName,
        x: worldCentre.x - size / 2,
        y: worldCentre.y - size / 2,
        width: size,
        height: size,
        isVisionSource: true,
      });
    if (!token.isVisionSource) session.setVisionSource(token.id, true);
    session.setSelection(token.id);
    const centre = {
      x: token.x + token.width / 2,
      y: token.y + token.height / 2,
    };
    const twoHexesEast = map.project({
      x: centre.x + Math.sqrt(3) * size * 2,
      y: centre.y,
    });
    return {
      canvasX: twoHexesEast.x,
      canvasY: twoHexesEast.y,
      token: {
        x: token.x,
        y: token.y,
        width: token.width,
        height: token.height,
      },
    };
  }, name);
}

async function clickCanvasPoint(page: Page, x: number, y: number) {
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error("Map canvas was not found.");
  await page.mouse.click(box.x + x, box.y + y);
}

test.describe("Hex Journey preview", () => {
  test.setTimeout(120000);
  test.use({ viewport: { width: 1400, height: 1100 } });

  test("previews a route from a chosen hex without a token or discovery request", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem("codex_ai_disabled", "true"),
    );
    await openMapWithUpload(page, "Hex Journey Map");
    await enableHexMode(page);
    await clickHex(page);
    await expect(page.locator("#hex-panel-title")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Set as journey start" }).click();
    await clickHex(page, 100, 0);
    await page.getByRole("button", { name: "Travel here" }).click();
    await expect(
      page.getByRole("region", { name: "Hex journey" }),
    ).toBeVisible();
    await expect(page.getByText(/hexes travelled/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start journey" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Review discovery" }),
    ).toHaveCount(0);

    const journey = page.getByRole("region", { name: "Hex journey" });
    const dismiss = page.getByRole("button", {
      name: "Dismiss journey preview",
    });
    await dismiss.focus();
    await expect(dismiss).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(journey).toHaveCount(0);
  });

  test.describe("mobile layout", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("keeps the journey controls within a narrow viewport", async ({
      page,
    }) => {
      test.setTimeout(60000);
      await page.addInitScript(() =>
        localStorage.setItem("codex_ai_disabled", "true"),
      );
      await openMapWithUpload(page, "Hex Journey Mobile Map");
      await enableHexMode(page);
      await clickHex(page);
      await page.getByRole("button", { name: "Set as journey start" }).click();
      await clickHex(page, 100, 0);
      await page.getByRole("button", { name: "Travel here" }).click();
      const journey = page.getByRole("region", { name: "Hex journey" });
      await expect(journey).toBeVisible();
      const box = await journey.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    });
  });

  test("travels one hex at a time, keeps exploration after Stop and reload, and does not restore the route", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem("codex_ai_disabled", "true"),
    );
    await openMapWithUpload(page, "Hex Journey Movement Map");
    await enableHexMode(page);
    await clickHex(page);
    await expect(page.locator("#hex-panel-title")).toBeVisible();
    const setup = await addPartyTokenAtMapCentre(page);
    const { canvasX, canvasY } = setup;
    await clickCanvasPoint(page, canvasX, canvasY);
    await page.getByRole("button", { name: "Travel here" }).click();
    await page.getByRole("button", { name: "Close hex panel" }).click();
    const journey = page.getByRole("region", { name: "Hex journey" });
    await expect(journey).toContainText(/0 of 2 hexes travelled/);
    await page.getByRole("button", { name: "Start journey" }).click();
    await page.getByRole("button", { name: "Next hex" }).click();
    await expect(journey).toContainText(/1 of 2 hexes travelled/);
    await page.getByRole("button", { name: "Stop journey" }).click();
    await expect(journey).toHaveCount(0);

    const exploredBeforeReload = await page.evaluate(() => {
      const session = (window as any).mapSession;
      const map = session.deps.mapStore;
      const vault = (window as any).vault;
      const record = vault.maps[map.activeMapId]?.hexCrawl;
      return Object.values(record?.hexes ?? {}).some(
        (hex: any) => hex.explored === true,
      );
    });
    expect(exploredBeforeReload).toBe(true);

    await page.reload();
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("region", { name: "Hex journey" })).toHaveCount(
      0,
    );
    const exploredAfterReload = await page.evaluate(() => {
      const mapStore = (window as any).mapSession.deps.mapStore;
      const vault = (window as any).vault;
      const record = vault.maps[mapStore.activeMapId]?.hexCrawl;
      return Object.values(record?.hexes ?? {}).some(
        (hex: any) => hex.explored === true,
      );
    });
    expect(exploredAfterReload).toBe(true);
  });

  test("allows host VTT stepping and hides journey controls in Player View", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem("codex_ai_disabled", "true"),
    );
    await openMapWithUpload(page, "Hex Journey Host Map");
    await enableHexMode(page);
    const vttToggle = page.getByRole("button", { name: "Toggle VTT mode" });
    await vttToggle.click();
    await expect(vttToggle).toHaveAttribute("aria-pressed", "true");
    await clickHex(page);
    await expect(page.locator("#hex-panel-title")).toBeVisible();
    const { canvasX, canvasY } = await addPartyTokenAtMapCentre(
      page,
      "Host Journey Party",
    );
    await clickCanvasPoint(page, canvasX, canvasY);
    await page.getByRole("button", { name: "Travel here" }).click();
    await page.getByRole("button", { name: "Close hex panel" }).click();
    const journey = page.getByRole("region", { name: "Hex journey" });
    await expect(journey).toContainText(/0 of 2 hexes travelled/);
    await page.getByRole("button", { name: "Start journey" }).click();
    await page.getByRole("button", { name: "Next hex" }).click();
    await expect(journey).toContainText(/1 of 2 hexes travelled/);

    const playerView = page.getByTestId("shared-mode-toggle");
    await playerView.evaluate((button) =>
      (button as HTMLButtonElement).click(),
    );
    await expect(playerView).toHaveAttribute("aria-pressed", "true");
    await expect(journey).toHaveCount(0);
  });
});
