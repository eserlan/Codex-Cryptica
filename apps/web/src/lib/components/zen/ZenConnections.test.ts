/** @vitest-environment jsdom */
import { render, fireEvent, within } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import ZenConnections from "./ZenConnections.svelte";
import { vault } from "$lib/stores/vault.svelte";

// Mock SvelteKit base path
vi.mock("$app/paths", () => ({
  base: "",
}));

// Mock stores
vi.mock("$lib/stores/vault.svelte", () => {
  const mockEntities: Record<string, any> = {
    "entity-1": {
      id: "entity-1",
      title: "Entity One",
      labels: [],
      aliases: [],
      connections: [
        {
          target: "entity-2",
          type: "ALLY",
          label: "Ally Of",
          strength: 2,
        },
      ],
    },
    "entity-2": {
      id: "entity-2",
      title: "Entity Two",
      labels: [],
      aliases: [],
      connections: [],
    },
    "entity-child": {
      id: "entity-child",
      title: "Entity Child",
      labels: [],
      aliases: [],
      parent: "entity-1",
      connections: [],
    },
    "entity-empty": {
      id: "entity-empty",
      title: "Empty Entity",
      labels: [],
      aliases: [],
      connections: [],
    },
  };

  const mockAllEntities = Object.values(mockEntities);

  const mockInbound: Record<string, any[]> = {
    "entity-2": [
      {
        sourceId: "entity-1",
        connection: {
          target: "entity-2",
          type: "ALLY",
          label: "Ally Of",
          strength: 2,
        },
      },
    ],
  };

  return {
    vault: {
      isGuest: false,
      allEntities: mockAllEntities,
      entities: mockEntities,
      inboundConnections: mockInbound,
      removeConnection: vi.fn(),
      updateEntity: vi.fn().mockResolvedValue(true),
      defaultVisibility: "public",
    },
  };
});

vi.mock("$lib/components/ui/Autocomplete.svelte", async () => {
  const mod = await import("../entity-detail/MockAutocomplete.svelte");
  return {
    default: mod.default,
  };
});

describe("ZenConnections component", () => {
  it("renders 'No known connections.' when there are no connections or children", () => {
    const mockEntity = vault.entities["entity-empty"];
    const onNavigate = vi.fn();

    const { getByText } = render(ZenConnections, {
      entity: mockEntity,
      onNavigate,
    });

    expect(getByText("No known connections.")).toBeTruthy();
  });

  it("renders outbound connections and handles navigation", async () => {
    const mockEntity = vault.entities["entity-1"];
    const onNavigate = vi.fn();

    const { getByText } = render(ZenConnections, {
      entity: mockEntity,
      onNavigate,
    });

    expect(getByText("Entity Two")).toBeTruthy();
    expect(getByText("Ally Of")).toBeTruthy();

    await fireEvent.click(getByText("Entity Two"));
    expect(onNavigate).toHaveBeenCalledWith("entity-2");
  });

  it("renders child connection and supports removing child via parent update", async () => {
    const mockEntity = vault.entities["entity-1"];
    const onNavigate = vi.fn();

    const { getByText } = render(ZenConnections, {
      entity: mockEntity,
      onNavigate,
    });

    const childEl = getByText("Entity Child");
    expect(childEl).toBeTruthy();
    expect(getByText("Child")).toBeTruthy();

    const container = childEl.closest("div.w-full");
    if (!container) throw new Error("Could not find connection container");

    const deleteBtn = within(container as HTMLElement).getByLabelText(
      /^Delete connection to /,
    );
    await fireEvent.click(deleteBtn);

    expect(vault.updateEntity).toHaveBeenCalledWith("entity-child", {
      parent: undefined,
    });
  });

  it("supports removing an outbound connection", async () => {
    const mockEntity = vault.entities["entity-1"];
    const onNavigate = vi.fn();

    const { getByText } = render(ZenConnections, {
      entity: mockEntity,
      onNavigate,
    });

    const connEl = getByText("Entity Two");
    const container = connEl.closest("div.w-full");
    if (!container) throw new Error("Could not find connection container");

    const deleteBtn = within(container as HTMLElement).getByLabelText(
      /^Delete connection to /,
    );
    await fireEvent.click(deleteBtn);

    expect(vault.removeConnection).toHaveBeenCalledWith(
      "entity-1",
      "entity-2",
      "ALLY",
    );
  });

  it("toggles the ConnectionEditor when clicking edit and closes on cancel", async () => {
    const mockEntity = vault.entities["entity-1"];
    const onNavigate = vi.fn();

    const { getByLabelText, getByRole, queryByRole } = render(ZenConnections, {
      entity: mockEntity,
      onNavigate,
    });

    const editBtn = getByLabelText(/^Edit connection to /);
    expect(editBtn).toBeTruthy();
    expect(queryByRole("combobox", { name: /relationship type/i })).toBeNull();

    await fireEvent.click(editBtn);
    expect(getByRole("combobox", { name: /relationship type/i })).toBeTruthy();

    const cancelBtn = getByRole("button", { name: /cancel/i });
    await fireEvent.click(cancelBtn);
    expect(queryByRole("combobox", { name: /relationship type/i })).toBeNull();
  });

  it("toggles the ConnectionCreator when clicking ADD", async () => {
    const mockEntity = vault.entities["entity-1"];
    const onNavigate = vi.fn();

    const { getByLabelText, getByRole, queryByRole } = render(ZenConnections, {
      entity: mockEntity,
      onNavigate,
    });

    const addBtn = getByLabelText("Add new connection");
    expect(addBtn).toBeTruthy();

    await fireEvent.click(addBtn);
    expect(getByRole("button", { name: /^connect$/i })).toBeTruthy();

    const cancelBtn = getByRole("button", { name: /^cancel$/i });
    await fireEvent.click(cancelBtn);
    expect(queryByRole("button", { name: /^connect$/i })).toBeNull();
  });

  it("does not render when isPopout is true and vault is in guest mode", () => {
    (vault as unknown as { isGuest: boolean }).isGuest = true;
    const mockEntity = vault.entities["entity-1"];
    const onNavigate = vi.fn();

    const { queryByText } = render(ZenConnections, {
      entity: mockEntity,
      isPopout: true,
      onNavigate,
    });

    expect(queryByText("Connections")).toBeNull();
    (vault as unknown as { isGuest: boolean }).isGuest = false;
  });
});
