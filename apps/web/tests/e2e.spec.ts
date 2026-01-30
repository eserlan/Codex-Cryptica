import { test, expect } from "@playwright/test";

test.describe("Vault E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Debugging: Pipe console logs
    page.on("console", (msg) => console.log(`BROWSER: ${msg.text()}`));
    page.on("pageerror", (err) => console.log(`BROWSER ERROR: ${err}`));

    // Setup default empty vault mock
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      // Intercept IndexedDB to handle DataCloneError with mock handles
      // instead of completely mocking the entire API which is brittle.
      const originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args: [unknown, IDBValidKey?]) {
        try {
          return originalPut.apply(this, args);
        } catch (e: any) {
          if (e.name === 'DataCloneError') {
            console.log("MOCK: Caught DataCloneError in IndexedDB, returning fake success");
            const req: any = {
              onsuccess: null,
              onerror: null,
              result: args[1],
              readyState: 'done',
              addEventListener: function (type: string, listener: any) {
                if (type === 'success') this.onsuccess = listener;
              }
            };
            setTimeout(() => {
              if (req.onsuccess) req.onsuccess({ target: req });
            }, 0);
            return req;
          }
          throw e;
        }
      };

      const mockFileSystem = {
        kind: "directory",
        name: "test-vault",
        requestPermission: async () => "granted",
        queryPermission: async () => "granted",
        entries: async function* () {
          yield* [];
        },
        values: () => [],
        getFileHandle: async (name: string) => ({
          kind: "file",
          name: name,
          getFile: async () =>
            new File(
              [
                `---\nid: ${name.replace(".md", "")} 
title: ${name}
type: npc
---
# Content`,
              ],
              name,
            ),
        }),
        getDirectoryHandle: async () => mockFileSystem,
      };

      // @ts-expect-error - Mock browser API
      window.showDirectoryPicker = async () => {
        console.log("MOCK: showDirectoryPicker invoked");
        return mockFileSystem;
      };
    });
    await page.goto("/");
  });

  test("Initial State (No Vault)", async ({ page }) => {
    await expect(page.getByText("NO SIGNAL")).toBeVisible();
    await expect(
      page.getByText("Open a local vault to initiate surveillance."),
    ).toBeVisible();
  });

  test("Open Empty Vault", async ({ page }) => {
    await page.getByRole("button", { name: "OPEN VAULT" }).click();
    await expect(page.getByTestId("entity-count")).toHaveText("0 ENTITIES");
  });

  test("Open Populated Vault", async ({ page }) => {
    // Inject populated mock
    await page.addInitScript(() => {
      const files = [
        {
          name: "Alice.md",
          kind: "file",
          content: "---\nid: alice\ntitle: Alice\ntype: npc\n---\n# Alice",
        },
        {
          name: "Bob.md",
          kind: "file",
          content: "---\nid: bob\ntitle: Bob\ntype: npc\n---\n# Bob",
        },
      ];

      // @ts-expect-error - Mock browser API
      window.showDirectoryPicker = async () => {
        const mockFS = {
          kind: "directory",
          name: "test-vault",
          requestPermission: async () => "granted",
          queryPermission: async () => "granted",
          values: () => files,
          // entries needs to yield [name, handle]
          entries: async function* () {
            for (const file of files) {
              const handle = {
                kind: "file",
                name: file.name,
                getFile: async () => new File([file.content], file.name),
              };
              yield [file.name, handle];
            }
          },
          getFileHandle: async (name: string) => ({
            kind: "file",
            name: name,
            getFile: async () => new File([""], name),
          }),
          getDirectoryHandle: async () => mockFS,
        };
        return mockFS;
      };
    });

    await page.reload();

    await page.getByRole("button", { name: "OPEN VAULT" }).click();

    // Verify Header Status
    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES");

    // Verify Entity Cards via Search
    await page.keyboard.press("Control+k");
    await page.keyboard.press("Meta+k");

    await expect(page.getByPlaceholder("Search (Cmd+K)...")).toBeVisible();

    // Type query to populate results
    await page.getByPlaceholder("Search (Cmd+K)...").fill("Alice");

    await expect(page.getByTestId("search-result").filter({ hasText: "Alice" })).toBeVisible();

    // Close search
    await page.keyboard.press("Escape");
  });

  test("Graph View Renders with Height", async ({ page }) => {
    await page.addInitScript(() => {
      const files = [
        {
          name: "NodeA.md",
          kind: "file",
          content: "---\nid: node-a\ntitle: Node A\ntype: npc\n---\n# Node A",
        },
        {
          name: "NodeB.md",
          kind: "file",
          content: "---\nid: node-b\ntitle: Node B\ntype: npc\n---\n# Node B",
        },
      ];
      // @ts-expect-error - Mock browser API
      window.showDirectoryPicker = async () => ({
        kind: "directory",
        name: "test-vault",
        requestPermission: async () => "granted",
        queryPermission: async () => "granted",
        values: () => files,
        entries: async function* () {
          for (const f of files)
            yield [
              f.name,
              {
                kind: "file",
                name: f.name,
                getFile: async () => new File([f.content], f.name),
              },
            ];
        },
        getFileHandle: async (name: string) => ({
          kind: "file",
          name,
          getFile: async () => new File([""], name),
        }),
        getDirectoryHandle: async () => ({}),
      });
    });
    await page.reload();
    await page.getByRole("button", { name: "Open Vault" }).click();

    // Wait for graph to be ready
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();

    // Check dimensions
    const box = await canvas.boundingBox();
    expect(box?.height).toBeGreaterThan(0);
    expect(box?.width).toBeGreaterThan(0);
  });

  test("Connect Mode UI", async ({ page }) => {
    // Setup vault to enable graph interaction
    await page.addInitScript(() => {
      const files = [
        { name: "A.md", kind: "file", content: "---\nid: a\n---\n" },
      ];
      // @ts-expect-error - Mock browser API
      window.showDirectoryPicker = async () => ({
        kind: "directory",
        name: "test-vault",
        requestPermission: async () => "granted",
        queryPermission: async () => "granted",
        values: () => files,
        entries: async function* () {
          for (const f of files)
            yield [
              f.name,
              {
                kind: "file",
                name: f.name,
                getFile: async () => new File([f.content], f.name),
              },
            ];
        },
        getFileHandle: async (name: string) => ({
          kind: "file",
          name,
          getFile: async () => new File([""], name),
        }),
        getDirectoryHandle: async () => ({}),
      });
    });
    await page.reload();
    await page.getByRole("button", { name: "Open Vault" }).click();

    // 1. Toggle via Button
    const linkBtn = page.getByTitle("Connect Mode (C)");
    await expect(linkBtn).toBeVisible();
    await linkBtn.click();
    await expect(page.getByText("> SELECT SOURCE NODE")).toBeVisible();

    // Toggle off
    await linkBtn.click();
    await expect(page.getByText("> SELECT SOURCE NODE")).not.toBeVisible();

    // 2. Toggle via Keyboard 'C'
    await page.keyboard.press("c");
    await expect(page.getByText("> SELECT SOURCE NODE")).toBeVisible();

    // 3. Exit via Escape
    await page.keyboard.press("Escape");
    await expect(page.getByText("> SELECT SOURCE NODE")).not.toBeVisible();
  });
});
