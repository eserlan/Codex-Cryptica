import { describe, it, expect, beforeEach } from "vitest";
import { QuickNoteService } from "./QuickNoteService";
import { entityDb } from "../utils/entity-db";

describe("QuickNoteService", () => {
  let service: QuickNoteService;
  const mockClock = { now: () => 1234567890 };

  beforeEach(async () => {
    // Clear our dedicated Dexie table before each unit test run
    await entityDb.quickNotes.clear();
    service = new QuickNoteService(entityDb, mockClock);
  });

  it("should initialize with no active notes", async () => {
    const active = await service.getAllActiveNotes("vault-1");
    expect(active).toEqual([]);
  });

  it("should save and retrieve a new note", async () => {
    const id = await service.saveNote({
      vaultId: "vault-1",
      content: "This is a fleeting pirate idea",
      status: "active",
      createdAt: undefined,
    } as any);

    expect(id).toBeDefined();
    expect(typeof id).toBe("number");

    const note = await service.getNoteById(id);
    expect(note).toBeDefined();
    expect(note?.content).toBe("This is a fleeting pirate idea");
    expect(note?.status).toBe("active");
    expect(note?.createdAt).toBe(1234567890); // Uses injected mock clock
  });

  it("should filter active notes by vault and sort by createdAt descending", async () => {
    const baseTime = Date.now();

    const id1 = await service.saveNote({
      vaultId: "vault-1",
      content: "First Note",
      status: "active",
      createdAt: baseTime,
    });

    const id2 = await service.saveNote({
      vaultId: "vault-1",
      content: "Second Note (newer)",
      status: "active",
      createdAt: baseTime + 1000,
    });

    // Note from a different vault
    await service.saveNote({
      vaultId: "vault-2",
      content: "Other Vault Note",
      status: "active",
      createdAt: baseTime + 2000,
    });

    // Archived note (should not return in active list)
    await service.saveNote({
      vaultId: "vault-1",
      content: "Archived Note",
      status: "archived",
      createdAt: baseTime + 3000,
    });

    const active = await service.getAllActiveNotes("vault-1");

    expect(active).toHaveLength(2);
    // Verified sorting order: newest first
    expect(active[0].id).toBe(id2);
    expect(active[0].content).toBe("Second Note (newer)");
    expect(active[1].id).toBe(id1);
    expect(active[1].content).toBe("First Note");
  });

  it("should update an existing note successfully", async () => {
    const id = await service.saveNote({
      vaultId: "vault-1",
      content: "Original Content",
      status: "active",
      createdAt: Date.now(),
    });

    const note = await service.getNoteById(id);
    expect(note).toBeDefined();

    // Modify and update
    note!.content = "Updated Content";
    const updatedId = await service.saveNote(note!);
    expect(updatedId).toBe(id);

    const reLoaded = await service.getNoteById(id);
    expect(reLoaded?.content).toBe("Updated Content");
  });

  it("should delete a note from the store", async () => {
    const id = await service.saveNote({
      vaultId: "vault-1",
      content: "To Delete",
      status: "active",
      createdAt: Date.now(),
    });

    await service.deleteNote(id);

    const note = await service.getNoteById(id);
    expect(note).toBeUndefined();
  });

  it("should archive a note successfully", async () => {
    const id = await service.saveNote({
      vaultId: "vault-1",
      content: "To Archive",
      status: "active",
      createdAt: Date.now(),
    });

    await service.archiveNote(id);

    const note = await service.getNoteById(id);
    expect(note?.status).toBe("archived");

    const active = await service.getAllActiveNotes("vault-1");
    expect(active).toHaveLength(0);
  });

  it("should mark a note as elevated successfully", async () => {
    const id = await service.saveNote({
      vaultId: "vault-1",
      content: "To Elevate",
      status: "active",
      createdAt: Date.now(),
    });

    await service.elevateNote(id);

    const note = await service.getNoteById(id);
    expect(note?.status).toBe("elevated");

    const active = await service.getAllActiveNotes("vault-1");
    expect(active).toHaveLength(0);
  });
});
