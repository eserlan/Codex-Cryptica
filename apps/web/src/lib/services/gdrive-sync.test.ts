import { describe, it, expect, vi } from "vitest";
import { DriveRestClient } from "./gdrive-sync";

const ok = (body: unknown) => ({
  ok: true,
  json: () => Promise.resolve(body),
});

describe("DriveRestClient (injected fetcher)", () => {
  it("returns an existing folder id without creating one", async () => {
    const fetcher = vi.fn().mockResolvedValue(ok({ files: [{ id: "f1" }] }));
    const client = new DriveRestClient(fetcher as any);

    const id = await client.findOrCreateFolder("tok", "Vault");

    expect(id).toBe("f1");
    expect(fetcher).toHaveBeenCalledOnce(); // search only, no create
  });

  it("creates a folder when none exists", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(ok({ files: [] }))
      .mockResolvedValueOnce(ok({ id: "new" }));
    const client = new DriveRestClient(fetcher as any);

    const id = await client.findOrCreateFolder("tok", "Vault", "parent");

    expect(id).toBe("new");
    expect(fetcher).toHaveBeenCalledTimes(2);
    const createInit = fetcher.mock.calls[1][1];
    expect(createInit.method).toBe("POST");
    expect(JSON.parse(createInit.body).parents).toEqual(["parent"]);
  });

  it("lists subfolders via the injected fetcher", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(ok({ files: [{ id: "a", name: "A" }] }));
    const client = new DriveRestClient(fetcher as any);

    const folders = await client.listSubfolders("tok", "root");

    expect(folders).toEqual([{ id: "a", name: "A" }]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("sends the auth header and never touches the global fetch", async () => {
    const globalFetch = vi.fn();
    vi.stubGlobal("fetch", globalFetch);
    const fetcher = vi.fn().mockResolvedValue(ok({ files: [{ id: "x" }] }));

    await new DriveRestClient(fetcher as any).findOrCreateFolder("tok", "V");

    const init = fetcher.mock.calls[0][1];
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(globalFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
