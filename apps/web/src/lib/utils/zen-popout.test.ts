import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeZenPopoutPayload,
  openEntityPopout,
  persistZenPopoutPayload,
  requestZenPopoutPayload,
} from "./zen-popout";

describe("zen-popout helpers", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("responds to guest popout payload requests from the child tab", () => {
    const childWindow = {
      postMessage: vi.fn(),
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(childWindow);

    openEntityPopout(
      "vault-1",
      {
        id: "entity-1",
        title: "Faerun",
        lore: "Hosts only",
        _path: ["faerun.md"],
      } as any,
      "",
      true,
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        source: childWindow,
        data: {
          source: "codex.zen-popout",
          type: "REQUEST_PAYLOAD",
          entityId: "entity-1",
        },
      }),
    );

    expect(childWindow.postMessage).toHaveBeenCalledWith(
      {
        source: "codex.zen-popout",
        type: "PAYLOAD",
        entityId: "entity-1",
        payload: expect.objectContaining({
          isGuest: true,
          entity: expect.not.objectContaining({ lore: expect.anything() }),
        }),
      },
      window.location.origin,
    );
  });

  it("requests a payload from the opener when session storage is empty", async () => {
    const opener = {
      postMessage: vi.fn((_message: unknown, _origin: string) => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: window.location.origin,
            source: opener as unknown as MessageEventSource,
            data: {
              source: "codex.zen-popout",
              type: "PAYLOAD",
              entityId: "entity-1",
              payload: {
                isGuest: true,
                entity: {
                  id: "entity-1",
                  title: "Faerun",
                  lore: "Hosts only",
                  _path: ["faerun.md"],
                },
              },
            },
          }),
        );
      }),
    };
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: opener,
    });

    const payload = await requestZenPopoutPayload("entity-1");

    expect(opener.postMessage).toHaveBeenCalledWith(
      {
        source: "codex.zen-popout",
        type: "REQUEST_PAYLOAD",
        entityId: "entity-1",
      },
      window.location.origin,
    );
    expect(payload?.entity.id).toBe("entity-1");
    // Payload comes directly from the opener postMessage, not sessionStorage.
  });

  it("persists a cloned guest entity snapshot without lore", () => {
    const entity = {
      id: "entity-1",
      title: "Faerun",
      content: "Ancient forests and ruined empires.",
      lore: "This should stay on the host",
      _path: ["faerun.md"],
    } as any;

    const payload = persistZenPopoutPayload("vault-1", entity, true);
    entity.content = "mutated after persist";
    entity.lore = "mutated lore";

    expect(payload.entity.content).toBe("Ancient forests and ruined empires.");
    expect(payload.entity).not.toHaveProperty("lore");
    const storedPayload = consumeZenPopoutPayload("vault-1", "entity-1");
    expect(storedPayload?.entity.content).toBe(
      "Ancient forests and ruined empires.",
    );
    expect(storedPayload?.entity).not.toHaveProperty("lore");
  });

  it("strips _fsHandle from guest entity snapshot", () => {
    const entity = {
      id: "entity-2",
      title: "Waterdeep",
      content: "City of splendors.",
      _path: ["waterdeep.md"],
      _fsHandle: { handle: "some-fs-handle" },
    } as any;

    const payload = persistZenPopoutPayload("vault-2", entity, true);

    expect(payload.entity).not.toHaveProperty("_fsHandle");
    expect(payload.entity.content).toBe("City of splendors.");
  });

  it("namespaces sessionStorage keys by vaultId to prevent collisions", () => {
    const entity = {
      id: "shared-id",
      title: "Entity A",
      _path: ["a.md"],
    } as any;

    persistZenPopoutPayload("vault-a", entity, true);
    persistZenPopoutPayload("vault-b", { ...entity, title: "Entity B" }, true);

    const payloadA = consumeZenPopoutPayload("vault-a", "shared-id");
    const payloadB = consumeZenPopoutPayload("vault-b", "shared-id");

    expect(payloadA?.entity.title).toBe("Entity A");
    expect(payloadB?.entity.title).toBe("Entity B");
  });
});
