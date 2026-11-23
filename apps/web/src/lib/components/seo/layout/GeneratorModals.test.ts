/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import GeneratorModals from "./GeneratorModals.svelte";

const attempts = vi.hoisted(() => ({ entity: 0, failRetry: false }));
vi.mock("../EntityDetailModal.svelte", async (importOriginal) => {
  if (attempts.entity++ === 0)
    throw new Error("entity modal chunk unavailable");
  return importOriginal();
});
vi.mock("../EntityDetailModal.svelte?retry", async () => {
  if (attempts.failRetry) throw new Error("retry chunk unavailable");
  return import("./__fixtures__/EntityDetailModalStub.svelte");
});

afterEach(() => {
  attempts.failRetry = false;
  vi.unstubAllGlobals();
});

describe("GeneratorModals lazy entity details", () => {
  it("keeps the selection and retries a rejected modal chunk", async () => {
    attempts.failRetry = false;
    render(GeneratorModals, {
      props: {
        selectedHubEntity: {
          id: "e1",
          title: "Old Tower",
          type: "location",
          content: "A tower above the harbour.",
          lore: "",
          labels: [],
          status: "active",
        },
        onCloseHubEntity: vi.fn(),
        refinement: { open: false },
        handoffs: { monsterLabsFlow: { open: false, state: "idle" } },
        clipboard: { handleCopySessionEntity: vi.fn() },
        sharing: {
          prepareSessionEntityShare: vi.fn(),
          sessionDetailTracking: {},
        },
      } as never,
    });

    expect(await screen.findByRole("alert")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("entity-detail-modal")).toBeTruthy();
    expect(screen.getByText("Entity detail ready")).toBeTruthy();
  });

  it("reloads directly after copy when storage is blocked", async () => {
    attempts.entity = 0;
    attempts.failRetry = true;
    vi.stubGlobal("sessionStorage", {
      setItem() {
        throw new Error("storage blocked");
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const reloadPage = vi.fn();
    render(GeneratorModals, {
      props: {
        recoveryKey: "npc",
        recoveryOutput: { type: "character", title: "Saved NPC" } as never,
        reloadPage,
        loadEntityModalOverride: vi
          .fn()
          .mockRejectedValue(new Error("chunk unavailable")),
        selectedHubEntity: {
          id: "e1",
          title: "Old Tower",
          type: "location",
          content: "A tower above the harbour.",
          lore: "",
          labels: [],
          status: "active",
        },
        onCloseHubEntity: vi.fn(),
        refinement: { open: false },
        handoffs: { monsterLabsFlow: { open: false, state: "idle" } },
        clipboard: { handleCopySessionEntity: vi.fn() },
        sharing: {
          prepareSessionEntityShare: vi.fn(),
          sessionDetailTracking: {},
        },
      } as never,
    });

    await screen.findByRole("alert");
    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("button", { name: "Reload page" });
    await fireEvent.click(screen.getByRole("button", { name: "Reload page" }));
    await fireEvent.click(screen.getByRole("button", { name: /Copy result/ }));
    expect(await screen.findByText(/Result copied/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Reload page" }));
    expect(reloadPage).toHaveBeenCalledOnce();
  });
});
