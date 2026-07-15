/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EntityProposals from "./EntityProposals.svelte";

const mocks = vi.hoisted(() => ({
  draftEntity: { value: null as unknown },
  requestCreateEntity: vi.fn(),
  search: vi.fn().mockResolvedValue([]),
  createEntity: vi.fn().mockResolvedValue("new-person"),
  deleteEntity: vi.fn(),
  addConnection: vi.fn(),
  revise: vi.fn().mockResolvedValue(true),
  pendingDraft: { chronicle: "Draft", deleteOnDiscard: false },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: "v1",
    selectedEntityId: null,
    entities: { existing: { title: "Existing", aliases: ["Known Alias"] } },
    allEntities: [{ title: "Existing", aliases: ["Known Alias"] }],
    createEntity: mocks.createEntity,
    deleteEntity: mocks.deleteEntity,
    addConnection: mocks.addConnection,
  },
}));
vi.mock("$lib/stores/proposer.svelte", () => ({
  proposerStore: {
    get draftEntity() {
      return mocks.draftEntity.value;
    },
    set draftEntity(value: unknown) {
      mocks.draftEntity.value = value;
    },
  },
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { requestCreateEntity: mocks.requestCreateEntity },
}));
vi.mock("@codex/search-orchestrator", () => ({
  searchService: { search: mocks.search },
}));
vi.mock("$lib/stores/oracle.svelte", () => ({ oracle: { apiKey: undefined } }));
vi.mock("$lib/services/RevisionService.svelte", () => ({
  revisionService: { revise: mocks.revise, pendingDraft: mocks.pendingDraft },
}));

describe("EntityProposals", () => {
  beforeEach(() => {
    mocks.draftEntity.value = null;
    mocks.requestCreateEntity.mockClear();
  });

  it("creates a transient revision draft for a missing bolded title", async () => {
    render(EntityProposals, {
      props: { content: "Meet **Existing** and **New Person**." },
    });

    expect(screen.queryByText("Existing")).toBeNull();
    expect(screen.getByText("New Person")).toBeTruthy();

    await fireEvent.click(
      screen.getByRole("button", { name: "Create proposed entity New Person" }),
    );

    expect(mocks.createEntity).toHaveBeenCalledWith("note", "New Person", {
      content: "",
    });
    expect(mocks.revise).toHaveBeenCalledOnce();
  });

  it("does not render while the detail is being edited", () => {
    render(EntityProposals, {
      props: { content: "Meet **New Person**.", isEditing: true },
    });

    expect(screen.queryByText("Proposed Entities")).toBeNull();
  });

  it("excludes known aliases and possessive titles", () => {
    render(EntityProposals, {
      props: { content: "**Known Alias**, **King's**, and **New Person**." },
    });

    expect(screen.queryByText("Known Alias")).toBeNull();
    expect(screen.queryByText("King's")).toBeNull();
    expect(screen.getByText("New Person")).toBeTruthy();
  });
});
