import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
});

vi.mock("./vault.svelte", () => ({
  vault: {
    entities: {},
    updateEntity: vi.fn(),
    createEntity: vi.fn(),
    addConnection: vi.fn(),
  },
}));

import { ChronologyEditService } from "./chronology-edit.svelte";
import type { Entity } from "schema";

function makeVault(entities: Record<string, Entity>) {
  return {
    entities,
    updateEntity: vi.fn().mockResolvedValue(true),
    createEntity: vi.fn().mockResolvedValue("event-new"),
    addConnection: vi.fn().mockResolvedValue(true),
    deleteEntity: vi.fn().mockResolvedValue(true),
  };
}

describe("ChronologyEditService", () => {
  it("tracks grab, drag, drop, and confirms an event date write", async () => {
    const entity = {
      id: "e1",
      type: "event",
      title: "Founding",
      date: { year: 601 },
    } as Entity;
    const vault = makeVault({ e1: entity });
    const service = new ChronologyEditService({ vault: vault as any });

    expect(
      service.beginDrag({
        entity,
        pressPosition: 0,
        context: { yearPositions: { 601: 0, 605: 100 } },
      }),
    ).toBe(true);
    service.updateDrag(100, { yearPositions: { 601: 0, 605: 100 } });
    const intent = service.prepareDrop(entity);

    expect(intent?.writes).toEqual({ date: { year: 605 } });
    await service.confirm(entity);
    expect(vault.updateEntity).toHaveBeenCalledWith("e1", {
      date: { year: 605 },
    });
  });

  it("persists structured event dates without graph coordinates", async () => {
    const entity = {
      id: "e1",
      type: "event",
      title: "Founding",
      date: { year: 601 },
      metadata: { coordinates: { x: 12, y: 18 } },
    } as Entity;
    const vault = makeVault({ e1: entity });
    const service = new ChronologyEditService({ vault: vault as any });

    service.beginDrag({
      entity,
      pressPosition: 0,
      context: { yearPositions: { 601: 0, 605: 100 } },
    });
    service.updateDrag(100, { yearPositions: { 601: 0, 605: 100 } });
    service.prepareDrop(entity);
    await service.confirm(entity);

    expect(vault.updateEntity).toHaveBeenCalledWith("e1", {
      date: { year: 605 },
    });
    expect(vault.updateEntity.mock.calls[0][1]).not.toHaveProperty("metadata");
  });

  it("cancels without writing", () => {
    const entity = {
      id: "e1",
      type: "event",
      title: "Founding",
      date: { year: 601 },
    } as Entity;
    const vault = makeVault({ e1: entity });
    const service = new ChronologyEditService({ vault: vault as any });

    service.beginDrag({
      entity,
      pressPosition: 0,
      context: { yearPositions: { 601: 0, 605: 100 } },
    });
    service.prepareDrop(entity);
    service.cancel();

    expect(service.drag).toBeNull();
    expect(vault.updateEntity).not.toHaveBeenCalled();
  });

  it("derives span gestures and rejects inverted ranges", () => {
    const entity = { id: "n1", type: "note", title: "War" } as Entity;
    const service = new ChronologyEditService({
      vault: makeVault({ n1: entity }) as any,
    });

    service.beginDrag({
      entity,
      pressPosition: 100,
      context: { yearPositions: { 500: 0, 600: 100 } },
    });
    service.updateDrag(0, { yearPositions: { 500: 0, 600: 100 } }, 100);

    expect(service.drag?.gestureKind).toBe("span");
    expect(service.prepareDrop(entity)).toBeNull();
    expect(service.error).toContain("End date");
  });

  it("derives span gestures into start and end date writes", () => {
    const entity = { id: "n1", type: "note", title: "War" } as Entity;
    const service = new ChronologyEditService({
      vault: makeVault({ n1: entity }) as any,
    });

    service.beginDrag({
      entity,
      pressPosition: 0,
      context: { yearPositions: { 500: 0, 600: 100 } },
    });
    service.updateDrag(100, { yearPositions: { 500: 0, 600: 100 } }, 100);
    const intent = service.prepareDrop(entity);

    expect(service.drag?.gestureKind).toBe("span");
    expect(intent?.writes).toEqual({
      start_date: { year: 500 },
      end_date: { year: 600 },
    });
  });

  it("moves an existing range as a whole span by the dragged year delta", () => {
    const entity = {
      id: "n1",
      type: "note",
      title: "War",
      start_date: { year: 500 },
      end_date: { year: 510 },
    } as Entity;
    const service = new ChronologyEditService({
      vault: makeVault({ n1: entity }) as any,
    });

    service.beginDrag({
      entity,
      pressPosition: 0,
      context: { yearPositions: { 500: 0, 505: 100 } },
    });
    service.updateDrag(100, { yearPositions: { 500: 0, 505: 100 } }, 100);
    const intent = service.prepareDrop(entity);

    expect(intent?.writes).toEqual({
      start_date: { year: 505 },
      end_date: { year: 515 },
    });
  });

  it("writes only the dragged range edge handle", () => {
    const entity = {
      id: "n1",
      type: "note",
      title: "War",
      start_date: { year: 500 },
      end_date: { year: 510 },
    } as Entity;
    const service = new ChronologyEditService({
      vault: makeVault({ n1: entity }) as any,
    });

    service.beginDrag({
      entity,
      anchorId: "primary-range-start",
      pressPosition: 0,
      context: { yearPositions: { 490: 0 } },
    });
    const intent = service.prepareDrop(entity);

    expect(intent?.writes).toEqual({ start_date: { year: 490 } });
  });

  it("saves non-event semantic placements as anchors without changing primary fields", async () => {
    const entity = {
      id: "c1",
      type: "character",
      title: "Avel",
      date: { year: 580 },
    } as Entity;
    const vault = makeVault({ c1: entity });
    const service = new ChronologyEditService({ vault: vault as any });

    service.beginDrag({
      entity,
      pressPosition: 0,
      context: { yearPositions: { 621: 0 } },
    });
    service.buildSemanticIntent({
      entity,
      meaning: {
        id: "majorAppearance",
        label: "Major appearance",
        kind: "point",
        target: "anchor",
        anchorType: "majorAppearance",
      },
      date: { year: 621 },
    });
    await service.confirm(entity);

    expect(vault.updateEntity).toHaveBeenCalledWith("c1", {
      temporalAnchors: [
        expect.objectContaining({
          type: "majorAppearance",
          date: { year: 621 },
        }),
      ],
    });
    expect(vault.updateEntity.mock.calls[0][1]).not.toHaveProperty("date");
  });

  it("updates one grabbed anchor or creates a new anchor without mutating siblings", async () => {
    const entity = {
      id: "c1",
      type: "character",
      title: "Avel",
      date: { year: 580 },
      temporalAnchors: [
        { id: "born-extra", type: "born", date: { year: 580 } },
        { id: "appearance", type: "majorAppearance", date: { year: 621 } },
      ],
    } as Entity;
    const vault = makeVault({ c1: entity });
    const service = new ChronologyEditService({ vault: vault as any });

    service.beginDrag({
      entity,
      anchorId: "appearance",
      pressPosition: 0,
      context: { yearPositions: { 630: 0 } },
    });
    service.buildSemanticIntent({
      entity,
      meaning: {
        id: "majorAppearance",
        label: "Major appearance",
        kind: "point",
        target: "anchor",
        anchorType: "majorAppearance",
      },
      date: { year: 630 },
      existingAnchorId: "appearance",
    });
    await service.confirm(entity);

    expect(vault.updateEntity.mock.calls[0][1].temporalAnchors).toEqual([
      { id: "born-extra", type: "born", date: { year: 580 } },
      { id: "appearance", type: "majorAppearance", date: { year: 630 } },
    ]);

    const vaultForAdd = makeVault({ c1: entity });
    const addService = new ChronologyEditService({ vault: vaultForAdd as any });
    addService.beginDrag({
      entity,
      anchorId: "appearance",
      pressPosition: 0,
      context: { yearPositions: { 640: 0 } },
    });
    addService.buildSemanticIntent({
      entity,
      meaning: {
        id: "majorAppearance",
        label: "Major appearance",
        kind: "point",
        target: "anchor",
        anchorType: "majorAppearance",
      },
      date: { year: 640 },
      existingAnchorId: "appearance",
      createNewAnchor: true,
    });
    await addService.confirm(entity);

    expect(
      vaultForAdd.updateEntity.mock.calls[0][1].temporalAnchors,
    ).toHaveLength(3);
    expect(
      vaultForAdd.updateEntity.mock.calls[0][1].temporalAnchors[1],
    ).toEqual({
      id: "appearance",
      type: "majorAppearance",
      date: { year: 621 },
    });
  });

  it("surfaces conflicts and does not overwrite newer temporal metadata", async () => {
    const baseline = {
      id: "e1",
      type: "event",
      title: "Founding",
      date: { year: 601 },
    } as Entity;
    const current = { ...baseline, date: { year: 602 } } as Entity;
    const vault = makeVault({ e1: current });
    const service = new ChronologyEditService({ vault: vault as any });

    service.beginDrag({
      entity: baseline,
      pressPosition: 0,
      context: { yearPositions: { 601: 0, 605: 100 } },
    });
    service.updateDrag(100, { yearPositions: { 601: 0, 605: 100 } });
    service.prepareDrop(baseline);

    expect(await service.confirm(baseline)).toBe(false);
    expect(service.conflict).toBe(true);
    expect(vault.updateEntity).not.toHaveBeenCalled();
  });

  it("creates linked events additively", async () => {
    const entity = {
      id: "c1",
      type: "character",
      title: "Avel",
      date: { year: 580 },
    } as Entity;
    const vault = makeVault({ c1: entity });
    const service = new ChronologyEditService({
      vault: vault as any,
      now: () => 1,
    });

    service.beginDrag({
      entity,
      pressPosition: 0,
      context: { yearPositions: { 621: 0 } },
    });
    service.buildSemanticIntent({
      entity,
      meaning: {
        id: "majorAppearance",
        label: "Major appearance",
        kind: "point",
        target: "anchor",
        anchorType: "majorAppearance",
      },
      date: { year: 621 },
      createEvent: true,
      eventTitle: "Avel - 621",
    });

    await service.confirm(entity);

    expect(vault.createEntity).toHaveBeenCalledWith("event", "Avel - 621", {
      date: { year: 621 },
    });
    expect(vault.updateEntity).toHaveBeenCalledWith("c1", {
      temporalAnchors: [
        {
          id: "linked-event-1",
          type: "majorAppearance",
          date: { year: 621 },
          linkedEntityId: "event-new",
        },
      ],
    });
    expect(vault.addConnection).toHaveBeenCalledWith(
      "c1",
      "event-new",
      "related_to",
    );
  });

  it("rolls back a linked event when source anchoring fails", async () => {
    const entity = { id: "c1", type: "character", title: "Avel" } as Entity;
    const vault = makeVault({ c1: entity });
    vault.updateEntity.mockRejectedValueOnce(new Error("write failed"));
    const service = new ChronologyEditService({
      vault: vault as any,
      now: () => 1,
    });

    service.beginDrag({
      entity,
      pressPosition: 0,
      context: { yearPositions: { 621: 0 } },
    });
    service.buildSemanticIntent({
      entity,
      meaning: {
        id: "majorAppearance",
        label: "Major appearance",
        kind: "point",
        target: "anchor",
        anchorType: "majorAppearance",
      },
      date: { year: 621 },
      createEvent: true,
      eventTitle: "Avel - 621",
    });

    expect(await service.confirm(entity)).toBe(false);
    expect(vault.createEntity).toHaveBeenCalled();
    expect(vault.deleteEntity).toHaveBeenCalledWith("event-new");
    expect(service.error).toBe("write failed");
  });

  it("removes one temporal anchor without removing sibling anchors", async () => {
    const entity = {
      id: "c1",
      type: "character",
      title: "Avel",
      temporalAnchors: [
        { id: "birth", type: "born", date: { year: 580 } },
        { id: "appearance", type: "majorAppearance", date: { year: 621 } },
      ],
    } as Entity;
    const vault = makeVault({ c1: entity });
    const service = new ChronologyEditService({ vault: vault as any });

    expect(await service.removeAnchor(entity, "appearance")).toBe(true);

    expect(vault.updateEntity).toHaveBeenCalledWith("c1", {
      temporalAnchors: [{ id: "birth", type: "born", date: { year: 580 } }],
    });
  });

  it("writes a date for a previously undated entity so reload data can enter timeline mode", async () => {
    const entity = { id: "n1", type: "note", title: "Loose note" } as Entity;
    const vault = makeVault({ n1: entity });
    vault.updateEntity.mockImplementation(async (id, patch) => {
      vault.entities[id] = { ...vault.entities[id], ...patch } as Entity;
      return true;
    });
    const service = new ChronologyEditService({ vault: vault as any });

    service.beginDrag({
      entity,
      pressPosition: 0,
      context: { yearPositions: { 700: 0 } },
    });
    service.buildSemanticIntent({
      entity,
      meaning: {
        id: "associatedDate",
        label: "Associated date",
        kind: "point",
        target: "date",
      },
      date: { year: 700 },
    });

    expect(await service.confirm(entity)).toBe(true);
    const reloadedEntity = vault.entities.n1;
    expect(reloadedEntity.date).toEqual({ year: 700 });
  });

  it("clears stale errors when cancelling an edit", async () => {
    const entity = { id: "e1", type: "event", title: "Founding" } as Entity;
    const vault = makeVault({ e1: entity });
    vault.updateEntity.mockRejectedValue(new Error("write failed"));
    const service = new ChronologyEditService({ vault: vault as any });

    service.beginDrag({
      entity,
      pressPosition: 0,
      context: { yearPositions: { 700: 0 } },
    });
    service.buildSemanticIntent({
      entity,
      meaning: {
        id: "date",
        label: "Date",
        kind: "point",
        target: "date",
      },
      date: { year: 700 },
    });

    expect(await service.confirm(entity)).toBe(false);
    expect(service.error).toBe("write failed");

    service.cancel();

    expect(service.error).toBeNull();
  });
});
