import { describe, expect, it, vi } from "vitest";
import { EntityTemplateDirectoryError } from "$lib/services/publishing/PublicEntityTemplateDirectoryService";
import { installEntityTemplate } from "./entity-template-install";
import { makeStore, draft } from "./test-helpers";

const pkg = (over: Record<string, unknown> = {}) => ({
  kind: "entity-template",
  formatVersion: 1,
  template: {
    name: "Guild Hall",
    entityType: "location",
    markdown: "\n## Rooms\r\n\r\nBig.  \n",
    ...over,
  },
});

async function setup(
  opts: {
    readOnly?: boolean;
    download?: () => Promise<unknown>;
    known?: string[];
  } = {},
) {
  const { store, repository, vault } = makeStore({ readOnly: opts.readOnly });
  await store.loadForVault("v1", { vault });
  const download = vi.fn(opts.download ?? (async () => pkg()));
  const service = { downloadEntityTemplatePackage: download } as any;
  const known = opts.known ?? ["character", "location", "faction"];
  const install = (args: { listingId?: string; name?: string } = {}) =>
    installEntityTemplate(
      { service, store, getKnownTypes: () => known },
      { listingId: args.listingId ?? "l1", name: args.name },
    );
  return { store, repository, download, install };
}

describe("installEntityTemplate", () => {
  it("creates one ordinary user template with byte-identical text", async () => {
    const { store, repository, install } = await setup();
    const result = await install();
    expect(result.status).toBe("installed");
    expect(repository.saveTemplate).toHaveBeenCalledTimes(1);
    const created = store.list.find((t) => t.source === "user")!;
    expect(created.markdown).toBe("\n## Rooms\r\n\r\nBig.  \n");
    expect(created.name).toBe("Guild Hall");
    expect(created.entityType).toBe("location");
  });

  it("never changes a default and never touches entities", async () => {
    const { store, repository, install } = await setup();
    const before = store.defaultFor("location");
    await install();
    expect(repository.saveDefaults).not.toHaveBeenCalled();
    expect(store.defaultFor("location")).toBe(before);
    for (const call of (repository.saveTemplate as any).mock.calls) {
      expect(call[1]).not.toHaveProperty("entities");
    }
  });

  it("keeps no reference to the listing, so later listing changes cannot reach the copy", async () => {
    const { repository, install } = await setup();
    await install();
    const stored = JSON.stringify(
      (repository.saveTemplate as any).mock.calls[0][1],
    );
    expect(stored).not.toMatch(/listing|l1/i);
  });

  it("asks for a new name on a same-name, same-type collision and writes nothing yet", async () => {
    const { store, repository, install } = await setup();
    await store.create(draft({ name: "guild hall", entityType: "Location" }));
    (repository.saveTemplate as any).mockClear();
    const result = await install();
    expect(result.status).toBe("needs-name");
    expect(repository.saveTemplate).not.toHaveBeenCalled();
    const renamed = await install({ name: "Guild Hall (mine)" });
    expect(renamed.status).toBe("installed");
    expect(repository.saveTemplate).toHaveBeenCalledTimes(1);
  });

  it("does not treat the same name under a different type as a collision", async () => {
    const { store, install } = await setup();
    await store.create(draft({ name: "Guild Hall", entityType: "faction" }));
    expect((await install()).status).toBe("installed");
  });

  it("still asks again when the supplied name is also taken", async () => {
    const { store, install } = await setup();
    await store.create(draft({ name: "Guild Hall", entityType: "location" }));
    await store.create(draft({ name: "Taken", entityType: "location" }));
    expect((await install({ name: "Taken" })).status).toBe("needs-name");
  });

  it("writes nothing when the user cancels at the name step", async () => {
    const { store, repository, install } = await setup();
    await store.create(draft({ name: "Guild Hall", entityType: "location" }));
    (repository.saveTemplate as any).mockClear();
    const result = await install();
    expect(result.status).toBe("needs-name");
    // Cancelling is simply not calling install again.
    expect(repository.saveTemplate).not.toHaveBeenCalled();
  });

  it("rejects an invalid or newer-version package without writing", async () => {
    for (const bad of [
      pkg({ name: "  " }),
      { ...pkg(), formatVersion: 9 },
      { nonsense: true },
    ]) {
      const { repository, install } = await setup({
        download: async () => bad,
      });
      const result = await install();
      expect(result.status).toBe("error");
      expect(repository.saveTemplate).not.toHaveBeenCalled();
    }
  });

  it("explains a listing that is no longer available and writes nothing", async () => {
    const { repository, install } = await setup({
      download: async () => {
        throw new EntityTemplateDirectoryError(
          "This template is no longer available.",
          "not_found",
        );
      },
    });
    const result = await install();
    expect(result).toMatchObject({
      status: "error",
      message: "This template is no longer available.",
    });
    expect(repository.saveTemplate).not.toHaveBeenCalled();
  });

  it("reports a download failure and writes nothing", async () => {
    const { repository, install } = await setup({
      download: async () => {
        throw new Error("Could not download the template.");
      },
    });
    expect((await install()).status).toBe("error");
    expect(repository.saveTemplate).not.toHaveBeenCalled();
  });

  it("leaves the vault unchanged when saving fails", async () => {
    const { store, repository, install } = await setup();
    (repository.saveTemplate as any).mockRejectedValueOnce(
      new Error("disk full"),
    );
    const result = await install();
    expect(result.status).toBe("error");
    expect(store.list.some((t) => t.source === "user")).toBe(false);
  });

  it("installs a custom type the vault does not have yet and says so", async () => {
    const { store, install } = await setup({
      download: async () => pkg({ entityType: "sky-city" }),
    });
    const result = await install();
    expect(result.status).toBe("installed");
    expect((result as any).notice).toMatch(/sky-city/i);
    expect(store.list.find((t) => t.source === "user")!.entityType).toBe(
      "sky-city",
    );
  });

  it("gives no notice for a type the vault has", async () => {
    const { install } = await setup();
    expect(((await install()) as any).notice).toBeUndefined();
  });

  it("refuses in a read-only vault without downloading", async () => {
    const { download, install } = await setup({ readOnly: true });
    const result = await install();
    expect(result.status).toBe("error");
    expect(download).not.toHaveBeenCalled();
  });

  it("makes exactly one network request, for the package only", async () => {
    const { download, install } = await setup();
    await install({ listingId: "abc" });
    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith("abc");
  });
});
