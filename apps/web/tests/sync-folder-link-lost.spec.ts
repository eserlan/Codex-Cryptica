import { test, expect } from "@playwright/test";

// Regression test for #1270: when a vault's stored local folder handle is
// stale (folder deleted / permission lost), a background sync must NOT try to
// open the directory picker — browsers reject it outside a user gesture with
// a raw SecurityError. Instead the sync surfaces an actionable error message.
test.describe("Sync with lost folder link", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("codex_skip_landing", "true");
        localStorage.setItem(
          "codex-cryptica-help-state",
          JSON.stringify({ completedTours: ["initial-onboarding"] }),
        );
      } catch {
        /* ignore */
      }
      // Track picker invocations and simulate the browser's gesture guard.
      (window as any).__pickerCalls = 0;
      (window as any).showDirectoryPicker = () => {
        (window as any).__pickerCalls++;
        const err = new Error(
          "Failed to execute 'showDirectoryPicker' on 'Window': Must be handling a user gesture to show a file picker.",
        );
        err.name = "SecurityError";
        return Promise.reject(err);
      };
    });

    await page.goto("/");
    await page.waitForFunction(
      () => (window as any).vault?.isInitialized === true,
    );
  });

  test("background sync reports a friendly error instead of opening the picker", async ({
    page,
  }) => {
    // Seed a stale folder handle: a real OPFS directory handle stored in IDB,
    // whose underlying directory is then removed so validation throws
    // NotFoundError — the same state as a lost local folder link.
    await page.evaluate(async () => {
      const vaultId = (window as any).vault.activeVaultId;
      const root = await navigator.storage.getDirectory();
      const stale = await root.getDirectoryHandle("__stale_link_test__", {
        create: true,
      });
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("CodexCryptica");
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("settings", "readwrite");
          tx.objectStore("settings").put(stale, `folderHandle_${vaultId}`);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
      await root.removeEntry("__stale_link_test__", { recursive: true });
    });

    // Reload: vault init triggers the background pull sync.
    await page.reload();
    await page.waitForFunction(
      () => (window as any).vault?.isInitialized === true,
    );

    // The sync should fail with the actionable message…
    await page.waitForFunction(
      () =>
        ((window as any).vault?.errorMessage ?? "").includes(
          "Folder link lost",
        ),
      undefined,
      { timeout: 15000 },
    );

    const state = await page.evaluate(() => ({
      errorMessage: (window as any).vault.errorMessage as string,
      pickerCalls: (window as any).__pickerCalls as number,
    }));

    // …never the raw browser SecurityError…
    expect(state.errorMessage).not.toContain("user gesture");
    expect(state.errorMessage).toContain("Folder link lost");
    // …and the picker must never have been attempted without a gesture.
    expect(state.pickerCalls).toBe(0);
  });
});
