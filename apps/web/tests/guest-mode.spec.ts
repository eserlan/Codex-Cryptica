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
    defaultVisibility: "visible",
    sharedMode: true,
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
        activeConnections: any[] = [];

        constructor(_id: string | undefined, _options: any) {
          (window as any).mockPeerInstance = this;
          // Simulate the 'open' event with a slight delay
          setTimeout(() => {
            const mockId = "mock-guest-peer";
            this.onopenCallback(mockId);
          }, 100);
        }

        on(event: string, callback: (arg: any) => void) {
          if (event === "open") this.onopenCallback = callback;
          if (event === "connection") this.onconnectionCallback = callback;
        }

        connect(_peerId: string) {
          const mockConnection = {
            onopenCallback: () => {},
            onmessageCallback: (_data: any) => {},
            oncloseCallback: () => {},
            onerrorCallback: (_err: any) => {},
            on: (event: string, callback: (..._args: any[]) => void) => {
              if (event === "open") mockConnection.onopenCallback = callback;
              if (event === "data") mockConnection.onmessageCallback = callback;
              if (event === "close") mockConnection.oncloseCallback = callback;
              if (event === "error") mockConnection.onerrorCallback = callback;
            },
            send: (_data: any) => {},
            close: () => {
              mockConnection.oncloseCallback();
            },
            simulateData: (data: any) => {
              mockConnection.onmessageCallback(data);
            },
          };

          this.activeConnections.push(mockConnection);

          // Simulate successful connection immediately
          setTimeout(() => {
            mockConnection.onopenCallback();
            // Simulate receiving initial graph data from the host
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

    // Check if the title input is disabled
    const entityTitleInput = page.locator("input[placeholder='Title']");
    if ((await entityTitleInput.count()) > 0) {
      await expect(entityTitleInput).toBeDisabled();
    }

    // Verify save button is not visible
    await expect(
      page.getByRole("button", { name: "SAVE CHANGES" }),
    ).not.toBeVisible();

    // 5. Verify image save button in oracle is not visible
    const imageUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    await page.evaluate((url) => {
      (window as any).oracle.isOpen = true;
      const dummyBlob = new Blob([""], { type: "image/png" });
      (window as any).oracle.addTestImageMessage(
        "A shared image.",
        url,
        dummyBlob,
        "test-entity-1",
      );
    }, imageUrl);

    const saveImageButton = page.getByRole("button", { name: /SAVE TO/i });
    await expect(saveImageButton).not.toBeVisible();

    // 6. Test Real-time Updates: Host updates an entity
    const updatedEntity = {
      ...MOCK_GRAPH_DATA.entities["test-entity-1"],
      title: "Updated Mountain",
    };

    await page.evaluate((entity) => {
      (window as any).mockPeerInstance.activeConnections[0].simulateData({
        type: "ENTITY_UPDATE",
        payload: entity,
      });
    }, updatedEntity);

    // Verify title updated in UI
    await expect(
      page.locator("h2", { hasText: "Updated Mountain" }),
    ).toBeVisible();

    // 7. Verify "EXIT GUEST MODE" button appears
    const exitButton = page.getByTestId("exit-guest-mode-button");
    await expect(exitButton).toBeVisible();
  });
});
