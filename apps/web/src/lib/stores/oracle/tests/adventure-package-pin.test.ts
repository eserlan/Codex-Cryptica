import { describe, expect, it, vi } from "vitest";
import { AdventureManager } from "../adventure-manager.svelte";
import {
  dependencies,
  packageRef,
  referencePackage,
  referencePackageCache,
  startInput,
} from "./adventure-fixtures";

type Mode = "ok" | "missing" | "hash" | "id" | "version" | "other-version";

/** A package whose availability a test can flip between calls. */
function setup(initial: Mode = "ok") {
  let mode: Mode = initial;
  const loader = async () => {
    const stored = (overrides: Record<string, unknown> = {}) => ({
      hash: packageRef.hash,
      path: "",
      originFormat: "adventure-json/v1",
      package: referencePackage,
      ...overrides,
    });
    switch (mode) {
      case "missing":
      case "other-version":
        return null;
      case "hash":
        return stored({ hash: "c".repeat(64) });
      case "id":
        return stored({ package: { ...referencePackage, id: "other" } });
      case "version":
        return stored({ package: { ...referencePackage, version: "9.9.9" } });
      default:
        return stored();
    }
  };
  const checkOtherVersion = async () => mode === "other-version";
  const packages = referencePackageCache(loader, checkOtherVersion);
  const verifyPin = vi.spyOn(packages, "verifyPin");
  const deps: any = { ...dependencies(), packages };
  deps.generation = { generate: vi.fn(deps.generation.generate) };
  deps.repository.save = vi.fn(deps.repository.save);
  deps.repository.archive = vi.fn(deps.repository.archive);
  deps.authority.release = vi.fn(deps.authority.release);
  const manager = new AdventureManager(deps);
  return {
    manager,
    deps,
    verifyPin,
    setMode: (next: Mode) => (mode = next),
  };
}

async function startPackageSession(ctx: ReturnType<typeof setup>) {
  await ctx.manager.start({ ...startInput, sourcePackage: packageRef });
  return ctx.manager.session!;
}

describe("package pin on open", () => {
  it.each(["missing", "hash", "id", "version"] as const)(
    "enters package-unavailable for a %s failure without generating or saving",
    async (mode) => {
      const ctx = setup();
      const session = await startPackageSession(ctx);
      ctx.manager.close();
      ctx.setMode(mode);
      ctx.deps.generation.generate.mockClear();
      ctx.deps.repository.save.mockClear();
      ctx.deps.authority.release.mockClear();
      await ctx.manager.open(session.vaultId, session.id);

      expect(ctx.manager.phase).toBe("package-unavailable");
      expect(ctx.manager.errorCause).toBe("package-unavailable");
      expect(ctx.manager.readOnly).toBe(true);
      expect(ctx.manager.lease).toBeNull();
      expect(ctx.deps.generation.generate).not.toHaveBeenCalled();
      expect(ctx.deps.repository.save).not.toHaveBeenCalled();
      expect(ctx.deps.repository.archive).not.toHaveBeenCalled();
      expect(ctx.manager.session?.turns).toEqual(session.turns);
      expect(ctx.manager.session?.revision).toBe(session.revision);
    },
  );

  it("never verifies an emergent session", async () => {
    const ctx = setup();
    await ctx.manager.start(startInput);
    await ctx.manager.open("vault-1", ctx.manager.session!.id);
    await ctx.manager.submitAction("Walk on");
    expect(ctx.verifyPin).not.toHaveBeenCalled();
    expect(ctx.manager.phase).toBe("ready");
  });
});

describe("package pin during play", () => {
  it("blocks an action when the package disappears and keeps the draft", async () => {
    const ctx = setup();
    const session = await startPackageSession(ctx);
    ctx.setMode("missing");
    ctx.deps.generation.generate.mockClear();
    await ctx.manager.submitAction("Cross the bridge");

    expect(ctx.deps.generation.generate).not.toHaveBeenCalled();
    expect(ctx.manager.phase).toBe("package-unavailable");
    expect(ctx.manager.draft).toBe("Cross the bridge");
    expect(ctx.manager.session?.turns).toEqual(session.turns);
    expect(ctx.manager.session?.revision).toBe(session.revision);
    expect(ctx.manager.lease).toBeNull();
  });

  it("blocks roll resolution when the package disappears", async () => {
    const ctx = setup();
    const session = await startPackageSession(ctx);
    ctx.manager.session = {
      ...session,
      pendingRoll: { suppliedOutcome: { total: 10 } },
    } as any;
    ctx.setMode("hash");
    ctx.deps.generation.generate.mockClear();
    await ctx.manager.resolveRoll();

    expect(ctx.deps.generation.generate).not.toHaveBeenCalled();
    expect(ctx.manager.phase).toBe("package-unavailable");
    expect(ctx.manager.session?.turns).toEqual(session.turns);
  });

  it("blocks retrying the opening and does not archive the session", async () => {
    const ctx = setup();
    // A grounding failure leaves the session open with no committed opening.
    const { AdventureGroundingError } =
      await import("#lib/services/adventure/adventure-grounding-service.js");
    ctx.deps.generation.generate.mockRejectedValueOnce(
      new AdventureGroundingError("grounding failed" as any),
    );
    await ctx.manager.start({ ...startInput, sourcePackage: packageRef });
    expect(ctx.manager.session?.turns).toHaveLength(0);

    ctx.setMode("missing");
    ctx.deps.generation.generate.mockClear();
    await ctx.manager.retryOpening();

    expect(ctx.deps.generation.generate).not.toHaveBeenCalled();
    expect(ctx.deps.repository.archive).not.toHaveBeenCalled();
    expect(ctx.manager.phase).toBe("package-unavailable");
    expect(ctx.manager.session?.turns).toHaveLength(0);
  });
});

describe("retry and leave", () => {
  it("retry returns true once the package is back and play continues", async () => {
    const ctx = setup();
    await startPackageSession(ctx);
    ctx.setMode("missing");
    await ctx.manager.submitAction("Cross the bridge");
    expect(await ctx.manager.retryPackageCheck()).toBe(false);
    expect(ctx.manager.phase).toBe("package-unavailable");

    ctx.setMode("ok");
    expect(await ctx.manager.retryPackageCheck()).toBe(true);
    expect(ctx.manager.phase).toBe("ready");
    expect(ctx.manager.readOnly).toBe(false);
    expect(ctx.manager.lease).not.toBeNull();
    expect(ctx.manager.packageUnavailable).toBeNull();
    expect(ctx.manager.errorCause).toBeNull();

    await ctx.manager.submitAction(ctx.manager.draft);
    expect(ctx.manager.session?.turns.length).toBe(2);
  });

  it("flags another version and never retargets the pin", async () => {
    const ctx = setup();
    const session = await startPackageSession(ctx);
    ctx.setMode("other-version");
    await ctx.manager.submitAction("Cross the bridge");
    expect(ctx.manager.packageUnavailable).toEqual({
      otherVersionAvailable: true,
    });
    await ctx.manager.retryPackageCheck();
    expect(ctx.manager.session?.sourcePackage?.hash).toBe(
      session.sourcePackage?.hash,
    );
  });

  it("leave clears the state and releases the lease without archiving", async () => {
    const ctx = setup();
    await startPackageSession(ctx);
    ctx.manager.errorCause = null;
    ctx.setMode("missing");
    await ctx.manager.open("vault-1", ctx.manager.session!.id);
    ctx.deps.authority.release.mockClear();
    await ctx.manager.close();

    expect(ctx.manager.packageUnavailable).toBeNull();
    expect(ctx.manager.errorCause).toBeNull();
    expect(ctx.manager.phase).toBe("idle");
    expect(ctx.manager.session).toBeNull();
    expect(ctx.deps.repository.archive).not.toHaveBeenCalled();
  });

  it("leave after an in-play failure releases the held lease", async () => {
    const ctx = setup();
    await startPackageSession(ctx);
    ctx.setMode("missing");
    await ctx.manager.submitAction("Cross the bridge");
    expect(ctx.deps.authority.release).toHaveBeenCalled();
    await ctx.manager.close();
    expect(ctx.manager.errorCause).toBeNull();
    expect(ctx.deps.repository.archive).not.toHaveBeenCalled();
  });
});

describe("package pin on start and resume", () => {
  it("rejects a start whose package fails and saves nothing", async () => {
    const ctx = setup("missing");
    const savePinned = vi.spyOn(ctx.deps.repository, "savePinned");
    await expect(
      ctx.manager.start({ ...startInput, sourcePackage: packageRef }),
    ).rejects.toThrow("adventure-package-unavailable");
    expect(savePinned).not.toHaveBeenCalled();
    expect(ctx.manager.session).toBeNull();
    expect(ctx.manager.starting).toBe(false);
    expect(ctx.manager.errorCause).toBe("package-unavailable");
  });

  it("refuses to resume an archived session whose package is missing", async () => {
    const ctx = setup();
    const session = await startPackageSession(ctx);
    ctx.manager.close();
    ctx.setMode("missing");
    ctx.deps.repository.save.mockClear();
    await expect(
      ctx.manager.resumeArchived(session.vaultId, session.id),
    ).rejects.toThrow("package isn't in this Vault");
    expect(ctx.deps.repository.save).not.toHaveBeenCalled();
  });
});
