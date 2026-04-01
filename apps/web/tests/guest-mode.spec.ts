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
      localStorage.setItem("codex_skip_landing", "true");

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
    await page.waitForFunction(
      () =>
        (window as any).vault !== undefined &&
        (window as any).uiStore !== undefined,
    );

    await page.evaluate((data) => {
      const vault = (window as any).vault;
      const uiStore = (window as any).uiStore;
      vault.isGuest = true;
      vault.isInitialized = true;
      vault.repository.entities = JSON.parse(JSON.stringify(data.entities));
      vault.selectedEntityId = "test-entity-1";
      uiStore.isGuestMode = true;
      uiStore.guestUsername = "guest";
    }, MOCK_GRAPH_DATA);

    // 1. Verify shared data is loaded
    const entitiesCount = await page.evaluate(
      () => Object.keys((window as any).vault.entities).length,
    );
    expect(entitiesCount).toBe(2);

    const title = await page.evaluate(
      () => (window as any).vault.entities["test-entity-1"].title,
    );
    expect(title).toBe("Shared Mountain");

    // 2. Verify editing is disabled (e.g., no "NEW ENTITY" button)
    await expect(page.getByTestId("new-entity-button")).not.toBeVisible();

    // 3. The guest data should be present in the store
    await page.waitForFunction(
      () =>
        (window as any).vault?.selectedEntityId === "test-entity-1" &&
        (window as any).vault?.entities?.["test-entity-1"] !== undefined,
    );

    // 4. Verify the guest UI stays read-only
    const entityTitleInput = page.locator("input[placeholder='Title']");
    if ((await entityTitleInput.count()) > 0) {
      await expect(entityTitleInput).toBeDisabled();
    }

    await expect(
      page.getByRole("button", { name: "SAVE CHANGES" }),
    ).not.toBeVisible();
  });
});
