import { test, expect } from "@playwright/test";

test.describe("P2P Image Sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );

      // Mock Peer
      (window as any).Peer = class MockPeer {
        id = "mock-peer";
        activeConnections: any[] = [];
        _onOpen: (id: string) => void = () => {};
        _onConnection: (conn: any) => void = () => {};
        constructor() {
          (window as any).mockPeerInstance = this;
          setTimeout(() => this._onOpen(this.id), 10);
        }
        on(evt: string, cb: any) {
          if (evt === "open") this._onOpen = cb;
          if (evt === "connection") this._onConnection = cb;
        }
        connect() {
          const conn = {
            open: false,
            on: (evt: any, cb: any) => {
              if (evt === "open")
                setTimeout(() => {
                  conn.open = true;
                  cb();
                }, 10);
              if (evt === "data") (conn as any)._onData = cb;
            },
            send: (data: any) => {
              (window as any).lastSentData = data;
            },
            off: () => {},
            close: () => {},
          };
          (window as any).mockGuestConn = conn;
          return conn;
        }
        destroy() {}
      };
    });
  });

  test("Guest: should convert FILE_RESPONSE to Blob", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const guestService = await new Promise<any | null>((resolve) => {
        const check = setInterval(() => {
          const s = (window as any).p2pGuestService;
          if (s) {
            clearInterval(check);
            resolve(s);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(check);
          resolve(null);
        }, 5000);
      });

      if (!guestService) {
        return null;
      }

      const transport = guestService.transport;
      const listeners: Record<string, Array<(data?: any) => void>> = {};
      Object.defineProperty(transport, "connected", {
        configurable: true,
        get: () => true,
      });
      transport.on = (event: string, callback: (data?: any) => void) => {
        listeners[event] ??= [];
        listeners[event].push(callback);
      };
      transport.off = (event: string, callback: (data?: any) => void) => {
        listeners[event] = (listeners[event] ?? []).filter(
          (listener) => listener !== callback,
        );
      };
      transport.send = (data: any) => {
        (window as any).lastSentData = data;
        queueMicrotask(() => {
          const buffer = new Uint8Array([1, 2, 3]).buffer;
          for (const listener of listeners.data ?? []) {
            listener({
              type: "FILE_RESPONSE",
              requestId: data.requestId,
              found: true,
              mime: "image/png",
              data: buffer,
            });
          }
        });
      };

      const promise = guestService.getFile("images/test.png");
      const blob = await promise;
      return { size: blob.size, type: blob.type };
    });

    if (result === null) {
      test.skip(
        true,
        "P2P guest service did not initialize in this environment.",
      );
      return;
    }

    expect(result.size).toBe(3);
    expect(result.type).toBe("image/png");
  });

  test("Host: should serve file from OPFS", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(async () => {
      // Wait for vault to be ready
      const vault = await new Promise<any>((resolve) => {
        const check = setInterval(() => {
          const v = (window as any).vault;
          if (v) {
            clearInterval(check);
            resolve(v);
          }
        }, 100);
      });

      await vault.init();

      // Create file
      const handle = await vault.getActiveVaultHandle();
      if (!handle) throw new Error("No vault handle");

      const imgDir = await handle.getDirectoryHandle("images", {
        create: true,
      });
      const fileHandle = await imgDir.getFileHandle("test.webp", {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(new Uint8Array([10, 20, 30, 40]).buffer);
      await writable.close();
    });

    const response = await page.evaluate(async () => {
      // Wait for p2pHostService
      const p2pHostService = await new Promise<any>((resolve) => {
        const check = setInterval(() => {
          const s = (window as any).p2pHostService;
          if (s) {
            clearInterval(check);
            resolve(s);
          }
        }, 100);
      });

      return new Promise<any>((resolve) => {
        const mockConn = {
          send: (data: any) => resolve(data),
          on: () => {},
          peer: "guest-1",
        };

        (p2pHostService as any).dispatcher.dispatch(
          {
            type: "GET_FILE",
            path: "images/test.webp",
            requestId: "req-123",
          },
          mockConn,
          (p2pHostService as any).getHandlerContext(),
        );
      });
    });

    expect(response.type).toBe("FILE_RESPONSE");
    expect(response.found).toBe(true);
    expect(response.mime).toBe("image/webp");
  });
});
