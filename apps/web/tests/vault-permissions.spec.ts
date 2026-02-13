import { test, expect } from "@playwright/test";

test.describe("Vault Permissions Handling", () => {
  test.skip("should gracefully handle invalid persisted handle (mobile simulation)", async ({
    page,
  }) => {
    // 1. Setup the environment to simulate a broken handle
    await page.addInitScript(() => {
      // Define a mock handle class if not present (or override it)
      class MockFileSystemDirectoryHandle {
        kind = "directory";
        name = "broken-vault";
        async queryPermission() {
          throw new Error(
            "A requested file or directory could not be found at the time an operation was processed.",
          );
        }
        async requestPermission() {
          return "denied";
        }
      }

      // @ts-expect-error - Mocking global object for test
      window.FileSystemDirectoryHandle = MockFileSystemDirectoryHandle;

      // Helper to seed IDB
      (window as any).__seedBrokenHandle = async () => {
        const request = indexedDB.open("CodexCryptica", 7);
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains("settings")) {
            db.createObjectStore("settings");
          }
          if (!db.objectStoreNames.contains("vault_cache")) {
            db.createObjectStore("vault_cache", { keyPath: "path" });
          }
          if (!db.objectStoreNames.contains("chat_history")) {
            db.createObjectStore("chat_history", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("world_eras")) {
            db.createObjectStore("world_eras", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("vaults")) {
            db.createObjectStore("vaults", { keyPath: "id" });
          }
        };

        return new Promise((resolve, reject) => {
          request.onsuccess = (event: any) => {
            const db = event.target.result;
            const tx = db.transaction("settings", "readwrite");
            const store = tx.objectStore("settings");
            // We store a plain object that looks like a handle, or an instance of our mock
            // Structured clone algorithm handles vanilla objects fine.
            store.put(new MockFileSystemDirectoryHandle(), "lastVaultHandle");
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
          };
          request.onerror = () => reject(request.error);
        });
      };
    });

    // 2. Load page to initialize environment (but don't wait for app full load yet)
    await page.goto("/");

    // 3. Seed the DB
    await page.evaluate(() => (window as any).__seedBrokenHandle());

    // 4. Reload to trigger app initialization with the seeded broken handle
    await page.reload();

    // 5. Verify:
    // - App should NOT be in error state (no red screen)
    // - App should show "NO VAULT" (indicating handle was cleared, vault init completed with 0 entities)

    await expect(page.locator("text=SYSTEM FAILURE")).not.toBeVisible();
    // Wait for vault to finish initializing after reload
    await page.waitForFunction(
      () => {
        const status = (window as any).vault?.status;
        return status === "idle" || status === "error";
      },
      {
        timeout: 15000,
      },
    );
    await expect(page.getByText("NO VAULT")).toBeVisible({ timeout: 10000 });

    // Optional: Verify handle was cleared from IDB?
    // That requires peeking into IDB again, which is extra, but the UI state is the primary user concern.
  });
});
