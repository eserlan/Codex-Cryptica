import { test, expect } from "@playwright/test";

test.describe("Oracle Merge Command E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).showDirectoryPicker = async () => ({
        kind: "directory",
        name: "test-vault",
        requestPermission: async () => "granted",
        queryPermission: async () => "granted",
        values: () => [],
        getDirectoryHandle: async () => ({
          kind: "directory",
          getFileHandle: async () => ({
            kind: "file",
            createWritable: async () => ({
              write: async () => {},
              close: async () => {},
            }),
          }),
        }),
      });
    });

    await page.goto("http://localhost:5173/");
    await page.waitForFunction(() => (window as any).uiStore !== undefined);

    // Inject fake API key and mock vault methods
    await page.evaluate(() => {
      (window as any).oracle.apiKey = "fake-key";
      const v = (window as any).vault;

      // Mock directory handle to prevent early returns in deleteEntity
      v.getActiveVaultHandle = async () => ({ kind: "directory" });

      // Ensure deleteEntity actually removes from in-memory state for the test
      v.deleteEntity = async (id: string) => {
        delete v.entities[id];
        // Trigger any listeners if necessary (though reactivity handles most)
        v.entities = { ...v.entities };
        return Promise.resolve();
      };
    });
  });

  test("should merge two entities using guided sequence", async ({ page }) => {
    // 1. Create two entities
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Old Hero");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Legendary Hero");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for indexing to complete (2 entries)
    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES", {
      timeout: 20000,
    });

    // 2. Open Oracle and start merge
    await page.getByTestId("oracle-orb").click();
    const chatInput = page.getByTestId("oracle-input");
    await expect(chatInput).toBeVisible();

    await chatInput.type("/mer");
    await page.keyboard.press("Tab");
    await expect(chatInput).toHaveValue("/merge ");

    // Check if CommandMenu appears with SOURCE (active for /merge)
    await expect(page.getByText("SOURCE", { exact: true })).toBeVisible();

    // 3. Select Source (Old Hero)
    await chatInput.type("Old");
    await expect(page.locator('button:has-text("Old Hero")')).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(chatInput).toHaveValue('/merge "Old Hero" ');

    // 4. Advance to INTO
    await expect(page.getByText("INTO", { exact: true })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(chatInput).toHaveValue('/merge "Old Hero" into "');

    // 5. Select Target (Legendary Hero)
    await expect(page.getByText("TARGET", { exact: true })).toBeVisible();
    await chatInput.type("Leg");
    await expect(
      page.locator('button:has-text("Legendary Hero")'),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(chatInput).toHaveValue(
      /\/merge "Old Hero" into "Legendary Hero"\s*/,
    );

    // 6. Finalize in chat (enter)
    await page.keyboard.press("Enter");

    // 7. Verify Success Message
    await expect(
      page.locator("text=Merged Old Hero into Legendary Hero"),
    ).toBeVisible();
    await expect(page.getByTestId("entity-count")).toHaveText("1 ENTITIES", {
      timeout: 10000,
    });

    const entities = await page.evaluate(() =>
      Object.keys((window as any).vault.entities),
    );
    expect(entities).toContain("legendary-hero");
    expect(entities).not.toContain("old-hero");
  });

  test("should use the Merge Wizard via /merge oracle", async ({ page }) => {
    // 1. Create two entities with content
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Source Node");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Target Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // Add content via evaluate to bypass editor interaction for speed
    await page.evaluate(() => {
      const v = (window as any).vault;
      v.entities["source-node"].content = "Source content";
      v.entities["target-node"].content = "Target content";
    });

    // 2. Trigger wizard
    await page.getByTestId("oracle-orb").click();
    const chatInput = page.getByTestId("oracle-input");
    await chatInput.fill("/merge oracle");
    await page.keyboard.press("Enter");

    // 3. Verify Wizard appears
    await expect(page.locator("text=Merge Wizard")).toBeVisible();

    // 4. Select Source
    await page.getByPlaceholder("Type source entity name...").type("Source");
    await page.locator('button:has-text("Source Node")').click();
    await page.click('button:has-text("Next")');

    // 5. Select Target
    await page.getByPlaceholder("Type target entity name...").type("Target");
    await page.locator('button:has-text("Target Node")').click();
    await page.click('button:has-text("Next")');

    // 6. Review and Confirm
    await expect(page.locator("text=Merge Strategy")).toBeVisible();
    // Wait for proposal preview and verify it contains content from both entities
    const preview = page.locator(".max-h-32");
    await expect(preview).toContainText("Source content");
    await expect(preview).toContainText("Target content");
    await page.click('button:has-text("Confirm Merge")');

    // 7. Success - The wizard converts itself to a normal message, so we look for the transcript text
    const SLOW_TIMEOUT = 10000;
    await expect(
      page.getByText(/Merged Source Node into Target Node/),
    ).toBeVisible({ timeout: SLOW_TIMEOUT });
    await expect(page.getByTestId("entity-count")).toHaveText("1 ENTITIES", {
      timeout: SLOW_TIMEOUT,
    });
  });

  test("should merge two entities using direct quoted command", async ({
    page,
  }) => {
    // 1. Create two entities
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Minion");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Boss");
    await page.getByRole("button", { name: "ADD" }).click();
    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES", {
      timeout: 10000,
    });

    // 2. Direct command
    await page.getByTestId("oracle-orb").click();
    const chatInput = page.getByTestId("oracle-input");
    await chatInput.fill('/merge "Minion" into "Boss"');
    await page.keyboard.press("Enter");

    // 3. Verify success message
    await expect(page.locator("text=Merged Minion into Boss")).toBeVisible();
    await expect(page.getByTestId("entity-count")).toHaveText("1 ENTITIES", {
      timeout: 10000,
    });
  });

  test("should undo a merge and restore source, target, and connections", async ({
    page,
  }) => {
    // 1. Create two entities to merge
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Minion");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Boss");
    await page.getByRole("button", { name: "ADD" }).click();

    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES", {
      timeout: 10000,
    });

    // Capture pre-merge state from the in-memory vault
    const preMergeState = await page.evaluate(() => {
      const v = (window as any).vault;
      const entities = Object.values(v.entities || {}) as any[];
      const minion = entities.find((e) => e.title === "Minion");
      const boss = entities.find((e) => e.title === "Boss");
      return {
        minionId: minion?.id,
        bossId: boss?.id,
        bossState: boss ? JSON.parse(JSON.stringify(boss)) : null,
      };
    });

    // Ensure we actually found both entities
    expect(preMergeState.minionId).toBeTruthy();
    expect(preMergeState.bossId).toBeTruthy();

    // 2. Perform the merge via direct oracle command
    await page.getByTestId("oracle-orb").click();
    const chatInput = page.getByTestId("oracle-input");
    await chatInput.fill('/merge "Minion" into "Boss"');
    await page.keyboard.press("Enter");

    await expect(page.locator("text=Merged Minion into Boss")).toBeVisible();
    await expect(page.getByTestId("entity-count")).toHaveText("1 ENTITIES", {
      timeout: 10000,
    });

    // Sanity check: source entity should be gone after merge
    const postMergeState = await page.evaluate(() => {
      const v = (window as any).vault;
      const entities = Object.values(v.entities || {}) as any[];
      return {
        hasMinion: entities.some((e) => e.title === "Minion"),
        entityIds: entities.map((e) => e.id),
      };
    });
    expect(postMergeState.hasMinion).toBeFalsy();

    // 3. Trigger undo via the Oracle store's undo mechanism (accessed through the UI or directly)
    // In our app, Oracle undo is separate from global undo?
    // Actually, ChatMessage.svelte calls oracle.undo().
    // The E2E environment has access to 'oracle' singleton.
    await page.evaluate(async () => {
      const oracle = (window as any).oracle;
      await oracle.undo();
    });

    // Wait for UI to reflect undo (entity count back to 2)
    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES", {
      timeout: 10000,
    });

    // 4. Verify that undo recreated the source entity with the same ID,
    // restored the target entity to its pre-merge state, and restored connections.
    const undoState = await page.evaluate(() => {
      const v = (window as any).vault;
      const entities = Object.values(v.entities || {}) as any[];
      const byId: Record<string, any> = {};
      for (const e of entities) {
        byId[e.id] = e;
      }
      return {
        entities,
        byId,
      };
    });

    const minionAfterUndo = (undoState.byId as any)[preMergeState.minionId!];
    const bossAfterUndo = (undoState.byId as any)[preMergeState.bossId!];

    // 4.1 Undoing a merge recreates the deleted source entity (with same ID)
    expect(minionAfterUndo).toBeTruthy();

    // 4.2 Undoing a merge restores the target entity to its pre-merge state
    // Compare a deep clone of the original boss state with the current one.
    const bossRestored = await page.evaluate(
      ({ preBoss, bossId }) => {
        const v = (window as any).vault;
        const current = v.entities[bossId];
        if (!preBoss || !current) return false;
        // Compare serialized forms to catch differences in fields & connections
        const snapshot = (obj: any) =>
          JSON.stringify(obj, Object.keys(obj).sort());
        return snapshot(preBoss) === snapshot(current);
      },
      { preBoss: preMergeState.bossState, bossId: preMergeState.bossId! },
    );
    expect(bossRestored).toBeTruthy();

    // 4.3 Undoing a merge restores connections properly
    // (connections are part of bossState; already checked above).
    // As an extra guard, ensure the boss entity still exists and has connections field.
    expect(bossAfterUndo).toBeTruthy();
    expect(typeof bossAfterUndo.connections !== "undefined").toBeTruthy();
  });
});
