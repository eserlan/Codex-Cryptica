import { test, expect } from "@playwright/test";

test.describe("Sync Fidelity & Binary Safety", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        // Wait for app to be ready
        await page.waitForFunction(() => (window as any).uiStore !== undefined);
    });

    test("should handle offline mode gracefully", async ({ page, context }) => {
        await page.evaluate(() => {
            (window as any).TEST_FORCE_CONFIGURED = true;
            const cloudConfig = (window as any).cloudConfig;
            if (cloudConfig) {
                cloudConfig.setEnabled(true);
                cloudConfig.setConnectedEmail('test@example.com');
            }
            // Mock gapi token
            (window as any).gapi = {
                client: {
                    getToken: () => ({ access_token: 'mock-token' }),
                    setToken: () => {}
                }
            };
        });

        // 1. Go offline
        await context.setOffline(true);

        // 2. Attempt sync
        await page.evaluate(() => {
            const bridge = (window as any).workerBridge;
            bridge.startSync();
        });

        // 3. Verify error status
        // Set up a single subscription to syncStats in the page context and wait for ERROR status.
        await page.evaluate(() => {
            const stats = (window as any).syncStats;
            if (!stats || typeof stats.subscribe !== "function") {
                return;
            }
            // Avoid creating multiple subscriptions if this code is ever re-run.
            if ((window as any).__syncStatusUnsub) {
                return;
            }
            (window as any).__syncStatus = "";
            (window as any).__syncStatusUnsub = stats.subscribe((s: any) => {
                (window as any).__syncStatus = s?.status;
                if (s?.status === "ERROR" && typeof (window as any).__syncStatusUnsub === "function") {
                    // Unsubscribe once we've reached the desired state to prevent leaks.
                    (window as any).__syncStatusUnsub();
                    (window as any).__syncStatusUnsub = null;
                }
            });
        });

        await page.waitForFunction(
            () => (window as any).__syncStatus === "ERROR",
            { timeout: 10000 }
        );

        const syncStatus = await page.evaluate(() => {
            let s: any;
            const unsubscribe = (window as any).syncStats.subscribe((val: any) => {
                s = val;
            });
            // Immediately unsubscribe after reading the current value.
            unsubscribe();
            return s;
        });

        expect(syncStatus.status).toBe('ERROR');
        expect(syncStatus.lastError).toContain('Offline');

        // 4. Go back online
        await context.setOffline(false);
    });
});
