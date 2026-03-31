import { test, expect } from "@playwright/test";

test.describe("Guest Login Modal Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try { localStorage.setItem("codex_skip_landing", "true"); } catch { /* ignore */ }

      // Mock PeerJS connection to trigger the GuestLoginModal
      (window as any).Peer = class MockPeer {
        on() {}
        connect() {
          return { on: () => {}, send: () => {}, close: () => {} };
        }
        destroy() {}
      };
    });
    // shareId triggers the GuestLoginModal
    await page.goto("/?shareId=p2p-test-host");
  });

  test("should show validation error with role='alert' and clear it on input", async ({
    page,
  }) => {
    const usernameInput = page.locator("#username-input");
    const submitButton = page.getByRole("button", { name: "ACCESS ARCHIVE" });

    // 1. Initially no error
    await expect(page.locator("#username-error")).not.toBeAttached();

    // 2. Trigger "required" error
    await submitButton.click();
    const errorRequired = page.locator("#username-error");
    await expect(errorRequired).toBeVisible();
    await expect(errorRequired).toHaveAttribute("role", "alert");
    await expect(errorRequired).toHaveText("Username is required");
    await expect(usernameInput).toHaveAttribute("aria-invalid", "true");

    // 3. Type to clear error
    await usernameInput.fill("A");
    await expect(page.locator("#username-error")).not.toBeAttached();
    await expect(usernameInput).toHaveAttribute("aria-invalid", "false");

    // 4. Trigger "too short" error
    await submitButton.click();
    const errorShort = page.locator("#username-error");
    await expect(errorShort).toBeVisible();
    await expect(errorShort).toHaveAttribute("role", "alert");
    await expect(errorShort).toHaveText("Username too short");
    await expect(usernameInput).toHaveAttribute("aria-invalid", "true");

    // 5. Submit valid username
    await usernameInput.fill("ValidUser");
    await submitButton.click();
    // Modal should ideally disappear or start connecting (in this test it won't connect due to mock)
    await expect(page.locator("#username-error")).not.toBeAttached();
  });
});
