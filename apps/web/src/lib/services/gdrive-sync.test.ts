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
    try {
      const fetcher = vi.fn().mockResolvedValue(ok({ files: [{ id: "x" }] }));

      await new DriveRestClient(fetcher as any).findOrCreateFolder("tok", "V");

      const init = fetcher.mock.calls[0][1];
      expect(init.headers.Authorization).toBe("Bearer tok");
      expect(globalFetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("escapes single quotes in folder names so the query stays valid", async () => {
    const fetcher = vi.fn().mockResolvedValue(ok({ files: [{ id: "x" }] }));
    await new DriveRestClient(fetcher as any).findOrCreateFolder(
      "tok",
      "O'Reilly",
    );
    const url = String(fetcher.mock.calls[0][0]);
    // encoded `name='O\'Reilly'` — the apostrophe is backslash-escaped.
    expect(decodeURIComponent(url)).toContain("name='O\\'Reilly'");
  });

  it("getFolderMetadataResponse hits the file endpoint via the injected fetcher", async () => {
    const response = ok({ id: "f", name: "F", trashed: false });
    const fetcher = vi.fn().mockResolvedValue(response);

    const res = await new DriveRestClient(
      fetcher as any,
    ).getFolderMetadataResponse("tok", "folder-1");

    expect(res).toBe(response);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toContain("/files/folder-1?fields=id,name,trashed");
    expect((init as any).headers.Authorization).toBe("Bearer tok");
  });
});
