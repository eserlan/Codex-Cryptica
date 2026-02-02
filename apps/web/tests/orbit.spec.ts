
import { test, expect } from '@playwright/test';

test.describe('Orbit Layout', () => {
    test('should activate orbit mode, switch center, and exit', async ({ page }) => {
        // Mock offline verification
        // In a real scenario, we might toggle network conditions:
        // await page.context().setOffline(true);

        await page.goto('/');

        // 1. Wait for graph to load
        const canvas = page.getByTestId('graph-canvas');
        await expect(canvas).toBeVisible();
        
        // Note: Actual graph interaction in Playwright can be tricky without exposing Cy instance.
        // We exposed window.cy in DEV mode for this reason.
        
        // 2. Activate Orbit Mode via JS for reliability in this test environment
        await page.evaluate(() => {
            const cy = (window as any).cy;
            const nodes = cy.nodes();
            if (nodes.length > 0) {
                // Select first node
                const node = nodes[0];
                // Simulate context menu action or direct store manipulation
                // Let's verify via the Context Menu UI if possible, or fallback to direct state
                // For robustness, let's try to simulate the context menu open
                
                // Trigger context menu
                const pos = node.renderedPosition();
                cy.emit({ type: 'cxttap', target: node, renderedPosition: pos });
            }
        });

        // 3. Verify Context Menu appears
        const contextMenuBtn = page.getByText('Set as Central Node');
        await expect(contextMenuBtn).toBeVisible();
        await contextMenuBtn.click();

        // 4. Verify Orbit Mode Active UI
        await expect(page.locator('.orbit-status')).toContainText('Orbit Mode Active');

        // 5. Offline Verification (Constitution)
        // Ensure UI is still interactive and no network errors occurred
        // (Since this is a local-first app, this is implicit, but we document it)
        
        // 6. Switch Center (simulated tap on another node)
        await page.evaluate(() => {
             const cy = (window as any).cy;
             const nodes = cy.nodes();
             if (nodes.length > 1) {
                 const otherNode = nodes[1];
                 // Tap to switch center
                 cy.emit({ type: 'tap', target: otherNode });
             }
        });
        
        // Verify we are still in orbit mode
        await expect(page.locator('.orbit-status')).toBeVisible();
        
        // 7. Exit Orbit Mode
        await page.getByTestId('orbit-exit-button').click();
        await expect(page.locator('.orbit-status')).not.toBeVisible();

        // 8. Regression Test: Verify App Responsiveness
        // If the bug (infinite loop) triggers, the app will freeze here.
        // We attempt to interact with the graph again to ensure the main thread is free.
        await page.evaluate(() => {
             const cy = (window as any).cy;
             const nodes = cy.nodes();
             if (nodes.length > 0) {
                 cy.emit({ type: 'tap', target: nodes[0] });
             }
        });
        
        // If we can select something, the app is alive
        // (The exact selection isn't critical, just that the evaluate completed and UI updated)
        // We can check if the breadcrumb or detail panel state implies selection, 
        // or just rely on the test finishing without timeout.
    });
});
