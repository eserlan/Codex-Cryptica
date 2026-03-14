import { test, expect } from "@playwright/test";

test.describe("Oracle Response Parsing & Smart Apply", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
      localStorage.setItem("codex_skip_landing", "true");
      // Mock browser API
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
        getFileHandle: async () => ({
          kind: "file",
          name: "test.md",
          getFile: async () => new File([""], "test.md"),
          createWritable: async () => ({
            write: async () => {},
            close: async () => {},
          }),
        }),
        removeEntry: async () => {},
      });
    });
    await page.goto("/");

    // Wait for app to be ready
    await page.waitForFunction(
      () =>
        (window as any).vault?.isInitialized &&
        (window as any).oracle?.isInitialized &&
        (window as any).textGeneration !== undefined,
      { timeout: 15000 },
    );

    // After load, apply the vault handle mock
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      vault.rootHandle = {
        kind: "directory",
        name: "mock-vault",
        getFileHandle: async () => ({
          kind: "file",
          createWritable: async () => ({
            write: async () => {},
            close: async () => {},
          }),
          getFile: async () => new File([""], "test.md"),
        }),
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
        removeEntry: async () => {},
      };
      vault.isAuthorized = true;
    });
  });

  test("should show 'Smart Apply' button for structured Oracle response", async ({
    page,
  }) => {
    // 1. Open Oracle
    await page.getByTitle("Open Lore Oracle").click();

    // 2. Inject a structured message into the store
    await page.evaluate(() => {
      const oracle = (window as any).oracle;
      oracle.setMessages([
        ...oracle.messages,
        {
          id: "test-msg-1",
          role: "assistant",
          content:
            "## Chronicle\nA short summary.\n\n## Lore\nDetailed background info.",
        },
      ]);
    });

    // 3. Select a dummy node to enable 'Apply'
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      const id = await vault.createEntity("npc", "Test Entity");
      vault.selectedEntityId = id;
    });

    // 4. Verify Smart Apply button is visible
    const smartApplyBtn = page.getByRole("button", { name: /SMART APPLY/i });
    await expect(smartApplyBtn).toBeVisible();

    // 5. Hover to see preview (tooltip)
    await smartApplyBtn.hover();
    await expect(page.getByText("Chronicle:")).toBeVisible();
    await expect(smartApplyBtn.getByText("A short summary.")).toBeVisible();
    await expect(page.getByText("Lore:")).toBeVisible();
    await expect(
      smartApplyBtn.getByText("Detailed background info."),
    ).toBeVisible();

    // 6. Click Apply and verify vault update
    await smartApplyBtn.click();

    const vaultState = await page.evaluate(() => {
      const vault = (window as any).vault;
      const entity = Object.values(vault.entities)[0] as any;
      return {
        content: entity.content,
        lore: entity.lore,
      };
    });

    expect(vaultState.content).toBe("A short summary.");
    expect(vaultState.lore).toBe("Detailed background info.");
  });

  test("should support '/create' command for automatic node generation", async ({
    page,
  }) => {
    // 1. Open Oracle
    await page.getByTitle("Open Lore Oracle").click();

    // 2. Mock the AI response for a /create command
    await page.evaluate(() => {
      const textGeneration = (window as any).textGeneration;
      const contextRetrieval = (window as any).contextRetrieval;

      textGeneration.generateResponse = (
        _k: any,
        _q: any,
        _h: any,
        _c: any,
        _m: any,
        onUpdate: any,
      ) => {
        const text =
          "**Name:** Dragon Fire\n**Type:** Spell\n**Chronicle:** Burn everything.\n**Lore:** Ancient magic of the drakes.";
        onUpdate(text);
        return Promise.resolve();
      };
      textGeneration.expandQuery = (_k: any, q: any) => Promise.resolve(q);
      contextRetrieval.retrieveContext = () =>
        Promise.resolve({ content: "", sourceIds: [] });
    });

    const textarea = page.getByTestId("oracle-input");
    await textarea.fill("/create a dragon spell");
    await page.keyboard.press("Enter");

    // Verify create button appears and click it
    const createBtn = page.getByRole("button", {
      name: /CREATE AS ITEM: DRAGON FIRE/i,
    });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Verify SAVED state in message
    await expect(page.getByText(/SAVED/i)).toBeVisible({ timeout: 10000 });

    // Verify entity exists in vault
    const entityExists = await page.evaluate(() => {
      const vault = (window as any).vault;
      return !!vault.entities["dragon-fire"];
    });
    expect(entityExists).toBe(true);

    const entityData = await page.evaluate(() => {
      const vault = (window as any).vault;
      const e = vault.entities["dragon-fire"];
      return {
        title: e.title,
        type: e.type,
        content: e.content,
        lore: e.lore,
      };
    });

    expect(entityData.title).toBe("Dragon Fire");
    expect(entityData.type).toBe("item"); // 'spell' normalized to item
  });
});
