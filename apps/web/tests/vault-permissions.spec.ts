import { test, expect } from "@playwright/test";

test.describe("Vault Permissions Handling", () => {
  test("should gracefully handle invalid persisted handle (mobile simulation)", async ({ page }) => {
    
    // 1. Setup the environment to simulate a broken handle
    await page.addInitScript(() => {
        // Define a mock handle class if not present (or override it)
        class MockFileSystemDirectoryHandle {
            kind = "directory";
            name = "broken-vault";
            async queryPermission() {
                throw new Error("A requested file or directory could not be found at the time an operation was processed.");
            }
            async requestPermission() { return "denied"; }
        }
        
        // @ts-expect-error - Mocking global object for test
        window.FileSystemDirectoryHandle = MockFileSystemDirectoryHandle;
        
        // Helper to seed IDB
        (window as any).__seedBrokenHandle = async () => {
             const request = indexedDB.open("CodexCryptica", 4);
             request.onupgradeneeded = (event: any) => {
                 const db = event.target.result;
                 if (!db.objectStoreNames.contains("settings")) {
                     db.createObjectStore("settings");
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
    // - App should show "OPEN VAULT" (indicating handle was cleared and state reset)
    
    // Wait for potential init
    await page.waitForTimeout(1000); 
    
    await expect(page.locator("text=SYSTEM FAILURE")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "OPEN VAULT" })).toBeVisible();
    
    // Optional: Verify handle was cleared from IDB?
    // That requires peeking into IDB again, which is extra, but the UI state is the primary user concern.
  });
});
