import { test, expect } from '@playwright/test';

test.describe('Orbit Layout', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;
            const applyMocks = () => {
                if ((window as any).vault) {
                    (window as any).vault.isAuthorized = true;
                    (window as any).vault.status = 'idle';
                    (window as any).vault.rootHandle = { kind: 'directory' };
                    // Inject some dummy entities to ensure graph renders
                    (window as any).vault.entities = {
                        "node-1": { id: "node-1", title: "Node 1", content: "Content 1", connections: [{ target: "node-2", type: "related_to" }] },
                        "node-2": { id: "node-2", title: "Node 2", content: "Content 2", connections: [{ target: "node-3", type: "related_to" }] },
                        "node-3": { id: "node-3", title: "Node 3", content: "Content 3", connections: [] }
                    };
                }
            };
            applyMocks();
            setInterval(applyMocks, 100);
        });
    });

    test('should activate orbit mode, switch center, and show detail panel', async ({ page }) => {
        await page.goto('/');

        // 1. Wait for graph to load
        const canvas = page.getByTestId('graph-canvas');
        await expect(canvas).toBeVisible();
        
        // 2. Activate Orbit Mode directly via Store
        await page.evaluate(() => {
            if ((window as any).graph) {
                (window as any).graph.setCentralNode('node-1');
            }
        });

        // 3. Verify Orbit Mode Active UI
        await expect(page.locator('.orbit-status')).toContainText('Orbit Mode Active');
        await expect(page.getByText('Node 1')).toBeVisible();

        // 4. Click another node to switch center
        await page.evaluate(() => {
             const cy = (window as any).cy;
             const otherNode = cy.$id('node-2');
             // Trigger tap directly on the node
             otherNode.trigger('tap');
        });
        
        // 5. Verify center switched (with a small timeout for animation/reactivity)
        // We expect at least one "Node 2" to be visible (e.g. in OrbitControls or Breadcrumbs)
        await expect(page.getByText('Node 2').first()).toBeVisible({ timeout: 10000 });
        
        // 6. Verify Detail Panel is open for node-2
        await expect(page.getByText('Archive Detail Mode')).toBeVisible();
        // The Detail Panel has the title in an h2
        await expect(page.locator('h2').filter({ hasText: 'Node 2' })).toBeVisible();
        await expect(page.getByText('Content 2')).toBeVisible();

        // 7. Exit Orbit Mode
        await page.getByTestId('orbit-exit-button').click();
        await expect(page.locator('.orbit-status')).not.toBeVisible();
    });
});