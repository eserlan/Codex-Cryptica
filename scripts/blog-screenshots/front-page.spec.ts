import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test.describe("Blog Screenshots: Front Page", () => {
  const outputDir = path.join(process.cwd(), "../../blogPics/front-page");
  const briefingText = `# Moonfall Atlas

The frontier city of Valdris balances on a cracked moonlit coast, where treaty halls, harbor lanterns, and old vows keep the peace from collapsing.

- **The Setting:** A dusk-soaked city-state built around archives, trade routes, and the fragile authority of sworn houses.
- **Current Conflict:** The harbor council and the moonward factions are one bad night away from open break.
- **Key Players:** The archivists, the lantern captains, and the oathbound envoys all claim to protect the city.
- **Immediate Hook:** A sealed decree has resurfaced, and every faction believes it changes who owns the future.
`;

  const uploadGeneratedCover = async (page: any) => {
    await page.evaluate(async () => {
      const zone = document.querySelector(
        '[role="region"][aria-label="World image drop zone"]',
      ) as HTMLElement | null;
      if (!zone) throw new Error("World image drop zone not found");

      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      const background = ctx.createLinearGradient(0, 0, 1600, 900);
      background.addColorStop(0, "#241712");
      background.addColorStop(0.48, "#5a3420");
      background.addColorStop(1, "#0f1017");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1600, 900);

      const glow = ctx.createRadialGradient(1120, 250, 40, 1120, 250, 420);
      glow.addColorStop(0, "rgba(248, 196, 106, 0.95)");
      glow.addColorStop(0.35, "rgba(248, 196, 106, 0.35)");
      glow.addColorStop(1, "rgba(248, 196, 106, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1600, 900);

      const moon = ctx.createRadialGradient(360, 240, 10, 360, 240, 170);
      moon.addColorStop(0, "rgba(255, 246, 212, 0.95)");
      moon.addColorStop(0.55, "rgba(255, 231, 178, 0.48)");
      moon.addColorStop(1, "rgba(255, 231, 178, 0)");
      ctx.fillStyle = moon;
      ctx.beginPath();
      ctx.arc(360, 240, 160, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(8, 8, 14, 0.28)";
      ctx.beginPath();
      ctx.moveTo(0, 780);
      ctx.lineTo(120, 690);
      ctx.lineTo(260, 740);
      ctx.lineTo(430, 610);
      ctx.lineTo(620, 680);
      ctx.lineTo(860, 540);
      ctx.lineTo(1080, 680);
      ctx.lineTo(1290, 600);
      ctx.lineTo(1600, 720);
      ctx.lineTo(1600, 900);
      ctx.lineTo(0, 900);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(248, 196, 106, 0.42)";
      ctx.lineWidth = 3;
      for (const y of [660, 710, 760]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1600, y - 40);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255, 238, 200, 0.95)";
      ctx.font = '700 72px "Georgia", serif';
      ctx.fillText("Moonfall Atlas", 110, 150);
      ctx.fillStyle = "rgba(255, 238, 200, 0.78)";
      ctx.font = '400 28px "Georgia", serif';
      ctx.fillText(
        "A frontier setting of treaties, lantern law, and a moonlit archive.",
        112,
        205,
      );

      const blob = await (await fetch(canvas.toDataURL("image/png"))).blob();
      const file = new File([blob], "front-page-cover.png", {
        type: "image/png",
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      zone.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      );
    });
  };

  const fillBriefing = async (page: any) => {
    await page.getByRole("button", { name: "Edit briefing" }).click();
    const editor = page.locator(
      'textarea[placeholder="Write a short world briefing…"]',
    );
    await expect(editor).toBeVisible({ timeout: 15000 });
    await editor.fill(briefingText);
    await page.getByRole("button", { name: "Save Briefing" }).click();
    await expect(page.getByTestId("briefing-preview")).toContainText(
      "Moonfall Atlas",
      { timeout: 15000 },
    );
  };

  test.beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-test-key";
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.removeItem("codex_active_vault_id");
      localStorage.removeItem("codex_was_converted");
    });
  });

  test("01 - Front Page Hero", async ({ page }) => {
    await page.goto("/?demo=fantasy&s=" + Date.now());
    await page.waitForFunction(
      () =>
        (window as any).uiStore !== undefined &&
        (window as any).vault !== undefined,
    );
    await page.waitForFunction(
      () =>
        (window as any).vault?.status === "idle" &&
        (window as any).uiStore?.isDemoMode,
      { timeout: 15000 },
    );

    await page.getByTestId("header-front-page-button").click();
    await uploadGeneratedCover(page);
    await expect(page.getByTestId("front-page-hero-background")).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(400);

    await page.getByTestId("front-page-hero-background").screenshot({
      path: path.join(outputDir, "front-page-hero.png"),
    });
  });

  test("02 - Briefing And Context", async ({ page }) => {
    await page.goto("/?demo=fantasy&s=" + Date.now());
    await page.waitForFunction(
      () =>
        (window as any).uiStore !== undefined &&
        (window as any).vault !== undefined,
    );
    await page.waitForFunction(
      () =>
        (window as any).vault?.status === "idle" &&
        (window as any).uiStore?.isDemoMode,
      { timeout: 15000 },
    );

    await page.getByTestId("header-front-page-button").click();
    await uploadGeneratedCover(page);
    await expect(page.getByTestId("front-page-hero-background")).toBeVisible({
      timeout: 15000,
    });
    await fillBriefing(page);
    const briefingSection = page.getByTestId("briefing-content-section");
    await expect(briefingSection).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(400);

    await briefingSection.screenshot({
      path: path.join(outputDir, "front-page-theme.png"),
    });
  });
});
