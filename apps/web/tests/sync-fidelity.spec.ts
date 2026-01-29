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
        // Wait for sync worker to report error - we check the syncStats state directly on window
        await page.waitForFunction(() => {
            const stats = (window as any).syncStats;
            let status = '';
            // stats is a svelte store, but in web it might be different. 
            // In our layout we exposed it.
            stats.subscribe((s: any) => status = s.status)();
            return status === 'ERROR';
        }, { timeout: 10000 });

        const syncStatus = await page.evaluate(() => {
            let s: any;
            (window as any).syncStats.subscribe((val: any) => s = val)();
            return s;
        });

        expect(syncStatus.status).toBe('ERROR');
        expect(syncStatus.lastError).toContain('Offline');

        // 4. Go back online
        await context.setOffline(false);
    });
});
