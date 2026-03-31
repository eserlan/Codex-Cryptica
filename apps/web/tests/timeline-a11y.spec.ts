import { test, expect } from "@playwright/test";

test.describe("Timeline Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).DISABLE_ERROR_OVERLAY = true;
      (window as any).__E2E__ = true;
      try { localStorage.setItem("codex_skip_landing", "true"); } catch { /* ignore */ }

      // Mock IDB to prevent errors
      const originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (
        ...args: [unknown, IDBValidKey?]
      ) {
        try {
          return originalPut.apply(this, args);
        } catch {
          return {} as any;
        }
      };

      // Mock window.showDirectoryPicker
      (window as any).showDirectoryPicker = async () => {
        const createMockFile = (content: string, name: string) => ({
          kind: "file",
          name,
          getFile: async () =>
            new File([content], name, { type: "text/markdown" }),
          createWritable: async () => ({
            write: async () => {},
            close: async () => {},
          }),
        });

        const f1 = createMockFile(
          "---\nid: e1\ntitle: Event 1\ntype: event\ndate:\n  year: 1000\n---\n# E1",
          "e1.md",
        );
        const f2 = createMockFile(
          "---\nid: e2\ntitle: Event 2\ntype: event\ndate:\n  year: 2000\n---\n# E2",
          "e2.md",
        );

        return {
          kind: "directory",
          name: "test-vault",
          requestPermission: async () => "granted",
          queryPermission: async () => "granted",
          values: () => [f1, f2][Symbol.iterator](),
          entries: () =>
            [
              ["e1.md", f1],
              ["e2.md", f2],
            ][Symbol.iterator](),
          getFileHandle: async (name: string) => {
            if (name === "e1.md") return f1;
            return f2;
          },
          getDirectoryHandle: async (name: string) => ({
            kind: "directory",
            name,
          }),
        };
      };
    });

    await page.goto("http://localhost:5173/timeline");
    // Wait for stores to be attached and initialized
    await page.waitForFunction(
      () =>
        (window as any).vault?.isInitialized === true &&
        (window as any).uiStore !== undefined &&
        (window as any).timelineStore !== undefined,
      { timeout: 15000 },
    );

    await page.evaluate(() => {
      (window as any).uiStore.dismissedLandingPage = true;
    });
  });

  test("should use aria-pressed to indicate selected entry", async ({
    page,
  }) => {
    // 1. Create entities via store for speed
    await page.evaluate(async () => {
      const v = (window as any).vault;
      await v.createEntity("event", "Event 1", {
        id: "event-1",
        date: { year: 1000 },
      });
      await v.createEntity("event", "Event 2", {
        id: "event-2",
        date: { year: 2000 },
      });

      // Force horizontal mode
      (window as any).timelineStore.viewMode = "horizontal";
    });

    // Wait for reactivity
    await page.waitForTimeout(1000);

    // 2. Verify horizontal timeline attributes
    const horizontalTimeline = page.getByRole("region", {
      name: "Horizontal Timeline",
    });
    await expect(horizontalTimeline).toBeVisible({ timeout: 10000 });
    await expect(horizontalTimeline).toHaveAttribute("tabindex", "0");

    // 3. Test entry selection and aria-pressed
    const e1Button = page.getByRole("button", { name: "Event 1" });
    const e2Button = page.getByRole("button", { name: "Event 2" });

    // Click Event 1
    await e1Button.click();
    await expect(e1Button).toHaveAttribute("aria-pressed", "true");
    await expect(e2Button).toHaveAttribute("aria-pressed", "false");

    // Click Event 2
    await e2Button.click();
    await expect(e1Button).toHaveAttribute("aria-pressed", "false");
    await expect(e2Button).toHaveAttribute("aria-pressed", "true");
  });

  test("should support keyboard scrolling in timelines", async ({ page }) => {
    // 1. Create many entities to ensure scrollability
    await page.evaluate(async () => {
      const v = (window as any).vault;
      for (let i = 1; i <= 15; i++) {
        await v.createEntity("event", `Event ${i}`, {
          id: `event-${i}`,
          date: { year: 1000 + i * 100 },
        });
      }

      // Force horizontal mode
      (window as any).timelineStore.viewMode = "horizontal";
    });

    // Wait for reactivity
    await page.waitForTimeout(1000);

    // 2. Test Horizontal Timeline keyboard scroll
    const horizontalTimeline = page.getByRole("region", {
      name: "Horizontal Timeline",
    });
    await expect(horizontalTimeline).toBeVisible({ timeout: 10000 });
    await horizontalTimeline.focus();

    // Ensure we are at start
    await horizontalTimeline.evaluate((el) => (el.scrollLeft = 0));

    const initialScrollLeft = await horizontalTimeline.evaluate(
      (el) => el.scrollLeft,
    );
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500); // Wait for scroll to happen
    const afterRightScroll = await horizontalTimeline.evaluate(
      (el) => el.scrollLeft,
    );

    expect(afterRightScroll).toBeGreaterThan(initialScrollLeft);

    // 3. Test Vertical Timeline (switch to vertical)
    await page.evaluate(() => {
      (window as any).timelineStore.viewMode = "vertical";
    });

    const verticalTimeline = page.getByRole("region", {
      name: "Vertical Timeline",
    });
    await expect(verticalTimeline).toBeVisible();
    await verticalTimeline.focus();

    await verticalTimeline.evaluate((el) => (el.scrollTop = 0));
    const initialScrollTop = await verticalTimeline.evaluate(
      (el) => el.scrollTop,
    );
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(500);
    const afterDownScroll = await verticalTimeline.evaluate(
      (el) => el.scrollTop,
    );
    expect(afterDownScroll).toBeGreaterThan(initialScrollTop);
  });
});
