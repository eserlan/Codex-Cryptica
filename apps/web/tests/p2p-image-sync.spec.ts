import { test, expect } from "@playwright/test";

test.describe("P2P Image Sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;

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
    await page.goto("/?shareId=p2p-test-host");

    const result = await page.evaluate(async () => {
      // Wait for p2pGuestService
      const guestService = await new Promise<any>((resolve) => {
        const check = setInterval(() => {
          const s = (window as any).p2pGuestService;
          if (s) {
            clearInterval(check);
            resolve(s);
          }
        }, 100);
      });

      // Wait for connection
      await new Promise<void>((resolve) => {
        if (guestService.connection?.open) resolve();
        else {
          const check = setInterval(() => {
            if (guestService.connection?.open) {
              clearInterval(check);
              resolve();
            }
          }, 100);
        }
      });

      const promise = guestService.getFile("images/test.png");

      setTimeout(() => {
        const requestId = (window as any).lastSentData.requestId;
        const buffer = new Uint8Array([1, 2, 3]).buffer;
        (window as any).mockGuestConn._onData({
          type: "FILE_RESPONSE",
          requestId: requestId,
          found: true,
          mime: "image/png",
          data: buffer,
        });
      }, 100);

      const blob = await promise;
      return { size: blob.size, type: blob.type };
    });

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

      // We don't need to await p2pHostService.initHost() if we simply call the handler directly
      // But let's verify it exists

      return new Promise<any>((resolve) => {
        const mockConn = {
          send: (data: any) => resolve(data),
          on: () => {},
          peer: "guest-1",
        };

        // p2pHostService is likely a proxy or frozen? No, it's a class instance.
        // handleFileRequest is private, so we cast to any.
        (p2pHostService as any).handleFileRequest(
          mockConn,
          "images/test.webp",
          "req-123",
        );
      });
    });

    expect(response.type).toBe("FILE_RESPONSE");
    expect(response.found).toBe(true);
    expect(response.mime).toBe("image/webp");
  });
});
