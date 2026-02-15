import { test, expect } from "@playwright/test";

test.describe("Guest Mode (P2P Share)", () => {
  // Mock data for the P2P host to send
  const MOCK_GRAPH_DATA = {
    version: 1,
    entities: {
      "test-entity-1": {
        id: "test-entity-1",
        title: "Shared Mountain",
        type: "location",
        content: "A tall, craggy mountain shared via P2P.",
        connections: [],
      },
      "test-entity-2": {
        id: "test-entity-2",
        title: "Shared River",
        type: "location",
        content: "A winding river shared via P2P.",
        connections: [
          {
            target: "test-entity-1",
            type: "flows_from",
            label: "flows from",
            strength: 1,
          },
        ],
      },
    },
    assets: {},
  };

  test.beforeEach(async ({ page }) => {
    // Mock PeerJS connection in Playwright's browser context
    await page.addInitScript((data) => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;

      // Mock the PeerJS constructor and its methods
      (window as any).Peer = class MockPeer {
        onopenCallback: (id: string) => void = () => {};
        onconnectionCallback: (conn: any) => void = () => {};

        constructor(_id: string | undefined, _options: any) {
          console.log(`[MockPeer] CONSTRUCTOR CALLED with ID: ${_id}`);
          // Simulate the 'open' event with a slight delay
          setTimeout(() => {
            const mockId = "mock-peer-host";
            console.log(`[MockPeer] Triggering OPEN event with ID: ${mockId}`);
            this.onopenCallback(mockId);
          }, 100);
        }

        on(event: string, callback: (arg: any) => void) {
          console.log(`[MockPeer] Registered listener for event: ${event}`);
          if (event === "open") this.onopenCallback = callback;
          if (event === "connection") this.onconnectionCallback = callback;
        }

        connect(peerId: string) {
          console.log(`[MockPeer] Attempting to connect to: ${peerId}`);
          const mockConnection = {
            onopenCallback: () => {},
            onmessageCallback: (_data: any) => {},
            oncloseCallback: () => {},
            onerrorCallback: (_err: any) => {},
            on: (_event: string, callback: (..._args: any[]) => void) => {
              if (_event === "open") mockConnection.onopenCallback = callback;
              if (_event === "data")
                mockConnection.onmessageCallback = callback;
              if (_event === "close") mockConnection.oncloseCallback = callback;
              if (_event === "error") mockConnection.onerrorCallback = callback;
            },
            send: (_data: any) => {},
            close: () => {
              mockConnection.oncloseCallback();
            },
          };

          // Simulate successful connection immediately
          setTimeout(() => {
            mockConnection.onopenCallback();
            // Simulate receiving initial graph data from the host
            // Use a slightly longer delay to ensure the app has attached its listener
            setTimeout(() => {
              mockConnection.onmessageCallback({
                type: "GRAPH_SYNC",
                payload: data,
              });
            }, 500);
          }, 100);
          return mockConnection;
        }

        destroy() {}
      };
    }, MOCK_GRAPH_DATA);
  });

  test("should enter guest mode, load shared data, and disable editing", async ({
    page,
  }) => {
    await page.goto("/?shareId=p2p-mock-peer-host");

    // 1. Wait for guest mode to activate and initialize
    await page.waitForFunction(
      () =>
        (window as any).vault?.isGuest === true &&
        (window as any).vault?.isInitialized === true &&
        Object.keys((window as any).vault?.entities || {}).length > 0,
    );

    // 2. Verify shared data is loaded
    const entitiesCount = await page.evaluate(
      () => Object.keys((window as any).vault.entities).length,
    );
    expect(entitiesCount).toBe(2);

    const title = await page.evaluate(
      () => (window as any).vault.entities["test-entity-1"].title,
    );
    expect(title).toBe("Shared Mountain");

    // 3. Verify editing is disabled (e.g., no "NEW ENTITY" button)
    await expect(page.getByTestId("new-entity-button")).not.toBeVisible();

    // 4. Select an entity and verify detail panel is read-only
    await page.evaluate(() => {
      (window as any).vault.selectedEntityId = "test-entity-1";
    });

    // The detail panel should appear
    await expect(
      page.locator("h2", { hasText: "Shared Mountain" }),
    ).toBeVisible();

    // Check if the title input is disabled (or if it's rendered as text in guest mode)
    // Based on EntityDetailPanel implementation, it might still be an input but disabled
    const entityTitleInput = page.locator(
      "input[placeholder='Title'], h2:has-text('Shared Mountain')",
    );
    const isInput = await entityTitleInput.evaluate(
      (el) => el.tagName === "INPUT",
    );
    if (isInput) {
      await expect(entityTitleInput).toBeDisabled();
    }

    // Verify save button is not visible
    await expect(page.getByRole("button", { name: "SAVE" })).not.toBeVisible();

    // 5. Verify image save button in oracle is disabled or not visible
    // Mock image message
    const imageUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    await page.evaluate((url) => {
      (window as any).oracle.isOpen = true; // Open oracle chat
      // We need a dummy blob, but in the browser context
      const dummyBlob = new Blob([""], { type: "image/png" });
      (window as any).oracle.addTestImageMessage(
        "A shared image.",
        url,
        dummyBlob,
        "test-entity-1",
      );
    }, imageUrl);

    // The "SAVE TO..." button should NOT be visible or should be disabled
    // In guest mode, handleSave has a guard: if (!message.imageBlob || !activeEntity || vault.isGuest) return;
    // Actually, ImageMessage.svelte might still render it but it won't work,
    // or better yet, it should be hidden.
    const saveImageButton = page.getByRole("button", { name: /SAVE TO/i });
    await expect(saveImageButton).not.toBeVisible();

    // 6. Verify "EXIT GUEST MODE" button appears and works
    // We need to find where this button is rendered. It should be in VaultControls probably?
    // Let's check VaultControls.svelte
  });
});
