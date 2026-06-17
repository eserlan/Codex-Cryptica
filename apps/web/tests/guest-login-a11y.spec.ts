import { test, expect } from "@playwright/test";

test.describe("Guest Login Modal Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );

      // Mock PeerJS connection to trigger the GuestLoginModal
      (window as any).Peer = class MockPeer {
        on() {}
        connect() {
          const handlers: Record<string, (...args: any[]) => void> = {};
          const conn = {
            open: true,
            on(event: string, handler: (...args: any[]) => void) {
              handlers[event] = handler;
            },
            send: () => {},
            close: () => {},
            emit(event: string, ...args: any[]) {
              handlers[event]?.(...args);
            },
          };
          (window as any).__guestConn = conn;
          return conn;
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
    const submitButton = page.getByRole("button", { name: "JOIN" });

    // 1. Initially no error
    await expect(page.locator("#username-error")).not.toBeAttached();

    // 2. Trigger "required" error
    await submitButton.click();
    const errorRequired = page.locator("#username-error");
    await expect(errorRequired).toBeVisible();
    await expect(errorRequired).toHaveAttribute("role", "alert");
    await expect(errorRequired).toHaveText("Name is required");
    await expect(usernameInput).toHaveAttribute("aria-invalid", "true");

    // 3. Type to clear error
    await usernameInput.fill("Baddy");
    await expect(page.locator("#username-error")).not.toBeAttached();
    await expect(usernameInput).toHaveAttribute("aria-invalid", "false");

    // 4. Submit valid username
    await submitButton.click();
    await expect(page.locator("#username-error")).not.toBeAttached();
  });

  test("should reopen the guest modal if the connection fails", async ({
    page,
  }) => {
    const usernameInput = page.locator("#username-input");
    const submitButton = page.getByRole("button", { name: "JOIN" });

    await page.waitForFunction(() => (window as any).p2pGuestService);
    await page.evaluate(() => {
      (window as any).__connectAttempts = 0;
      (window as any).p2pGuestService.connectToHost = () => {
        (window as any).__connectAttempts += 1;
        return Promise.reject(new Error("Connection failed"));
      };
    });

    await usernameInput.fill("Baddy");
    await submitButton.click();

    await expect
      .poll(() => page.evaluate(() => (window as any).__connectAttempts))
      .toBe(1);
    await expect(page.locator("#username-input")).toBeVisible();
    await expect(page.locator("#username-input")).toHaveValue("Baddy");
  });
});
