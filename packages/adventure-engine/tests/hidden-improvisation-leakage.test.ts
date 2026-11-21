import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  detectHiddenLeakage,
  detectHiddenTextLeakage,
} from "../src";
import { meta, proposal, session } from "./reducer-fixtures";

const hiddenCreditor = "Dorje secretly holds the village debts";
const hiddenRinger = "The missing ringer lives beneath the shrine";

describe("GM-only improv secrecy at the commit boundary", () => {
  it("checks narration from a partial proposal without requiring a hidden patch", () => {
    const current = session();
    current.hiddenState.secrets.push({
      id: "secret-1",
      text: hiddenCreditor,
      status: "hidden",
    });

    expect(
      detectHiddenLeakage(current, {
        kind: "complete",
        narration: hiddenCreditor,
        revealSecretIds: [],
      } as never),
    ).toContainEqual({ field: "root.narration", secretId: "secret-1" });
  });

  it("rejects a same-turn leak of a newly proposed secret", () => {
    const draft = proposal();
    draft.narration = hiddenCreditor;
    draft.hiddenPatch.secrets.add.push({
      text: hiddenCreditor,
      status: "hidden",
    });

    expect(detectHiddenLeakage(session(), draft)).toContainEqual({
      field: "root.narration",
      secretId: "proposed-secret-0",
    });
    const committed = applyCompletedTurn(session(), draft, meta);
    expect(committed.ok).toBe(false);
    if (!committed.ok) {
      expect(committed.errors[0]?.code).toBe("hidden-leakage");
      expect(JSON.stringify(committed.errors)).not.toContain(hiddenCreditor);
    }
  });

  it("rejects a new secret marked revealed without an existing reveal ID", () => {
    const draft = proposal();
    draft.narration = hiddenCreditor;
    draft.hiddenPatch.secrets.add.push({
      text: hiddenCreditor,
      status: "revealed",
    });

    expect(detectHiddenLeakage(session(), draft)).toContainEqual({
      field: "root.narration",
      secretId: "proposed-secret-0",
    });
    const committed = applyCompletedTurn(session(), draft, meta);
    expect(committed.ok).toBe(false);
    if (!committed.ok) expect(committed.errors[0]?.code).toBe("hidden-leakage");
  });

  it("rejects copied text from a newly proposed GM-only thread", () => {
    const draft = proposal();
    draft.hiddenPatch.gmThreads.add.push({
      text: hiddenCreditor,
      status: "hidden",
    });
    draft.suggestedActions = [
      `Accuse ${hiddenCreditor}.`,
      "Ask the clerk to show the ledger.",
      "Leave the market.",
    ];

    expect(detectHiddenLeakage(session(), draft)).toContainEqual({
      field: "root.suggestedActions[0]",
      secretId: "proposed-thread-0",
    });
    const committed = applyCompletedTurn(session(), draft, meta);
    expect(committed.ok).toBe(false);
    if (!committed.ok) expect(committed.errors[0]?.code).toBe("hidden-leakage");
  });

  it("guards already committed hidden threads in narration and streaming text", () => {
    const current = session();
    current.hiddenState.gmThreads.push({
      id: "thread-1",
      text: hiddenRinger,
      status: "hidden",
    });

    const draft = proposal();
    draft.narration = hiddenRinger;
    expect(detectHiddenLeakage(current, draft)).toContainEqual({
      field: "root.narration",
      secretId: "thread-1",
    });
    expect(detectHiddenTextLeakage(current, hiddenRinger)).toContainEqual({
      field: "root",
      secretId: "thread-1",
    });
  });

  it("allows signs from newly revealed threads without exposing their GM text", () => {
    const current = session();
    current.hiddenState.gmThreads.push({
      id: "thread-1",
      text: hiddenRinger,
      status: "revealed",
    });
    const draft = proposal();
    draft.narration = hiddenRinger;
    expect(detectHiddenLeakage(current, draft)).toEqual([]);

    current.hiddenState.gmThreads[0]!.status = "hidden";
    draft.hiddenPatch.gmThreads.update.push({
      id: "thread-1",
      text: hiddenRinger + ". The bell rings once after midnight.",
      status: "revealed",
    });
    draft.narration = "A bell rings once after midnight, then falls silent.";
    expect(detectHiddenLeakage(current, draft)).toEqual([]);

    draft.narration = hiddenRinger + ". The bell rings once after midnight.";
    expect(detectHiddenLeakage(current, draft)).toContainEqual({
      field: "root.narration",
      secretId: "thread-1",
    });
    const committed = applyCompletedTurn(current, draft, meta);
    expect(committed.ok).toBe(false);
    if (!committed.ok) expect(committed.errors[0]?.code).toBe("hidden-leakage");
  });

  it("guards updated hidden text as well as the earlier committed value", () => {
    const current = session();
    current.hiddenState.secrets.push({
      id: "secret-1",
      text: hiddenRinger,
      status: "hidden",
    });
    const draft = proposal();
    draft.hiddenPatch.secrets.update.push({
      id: "secret-1",
      text: hiddenCreditor,
      status: "hidden",
    });

    draft.narration = hiddenRinger;
    expect(detectHiddenLeakage(current, draft)).toContainEqual({
      field: "root.narration",
      secretId: "secret-1",
    });
    draft.narration = hiddenCreditor;
    expect(detectHiddenLeakage(current, draft)).toContainEqual({
      field: "root.narration",
      secretId: "secret-1",
    });
  });

  it("does not let an update mark a hidden secret revealed without its ID", () => {
    const current = session();
    current.hiddenState.secrets.push({
      id: "secret-1",
      text: hiddenRinger,
      status: "hidden",
    });
    const draft = proposal();
    draft.hiddenPatch.secrets.update.push({
      id: "secret-1",
      text: hiddenCreditor,
      status: "revealed",
    });
    draft.narration = hiddenCreditor;

    expect(detectHiddenLeakage(current, draft)).toContainEqual({
      field: "root.narration",
      secretId: "secret-1",
    });
    const committed = applyCompletedTurn(current, draft, meta);
    expect(committed.ok).toBe(false);
    if (!committed.ok) expect(committed.errors[0]?.code).toBe("hidden-leakage");
  });

  it("reveals an updated secret only when its existing ID is explicit", () => {
    const current = session();
    current.hiddenState.secrets.push({
      id: "secret-1",
      text: hiddenRinger,
      status: "hidden",
    });
    const draft = proposal();
    draft.hiddenPatch.secrets.update.push({
      id: "secret-1",
      text: hiddenCreditor,
      status: "hidden",
    });
    draft.revealSecretIds = ["secret-1"];
    draft.narration = hiddenCreditor;

    const committed = applyCompletedTurn(current, draft, meta);
    expect(committed.ok).toBe(true);
    if (committed.ok) {
      expect(
        committed.value.hiddenState.secrets.find(
          (secret) => secret.id === "secret-1",
        )?.status,
      ).toBe("revealed");
    }
  });

  it("allows hidden-only inventions, public narration and genuine secret reveals", () => {
    const current = session();
    current.hiddenState.secrets.push({
      id: "known-secret",
      text: hiddenRinger,
      status: "hidden",
    });
    const draft = proposal();
    draft.narration = "The tally-keeper points to the public account rolls.";
    draft.hiddenPatch.gmThreads.add.push({
      text: hiddenCreditor,
      status: "hidden",
    });
    draft.hiddenPatch.secrets.add.push({
      text: "The clerk has kept a second set of books.",
      status: "revealed",
    });
    expect(detectHiddenLeakage(current, draft)).toEqual([]);
    const committed = applyCompletedTurn(current, draft, meta);
    expect(committed.ok).toBe(true);
    if (committed.ok) {
      expect(
        committed.value.hiddenState.secrets.find(
          (secret) =>
            secret.text === "The clerk has kept a second set of books.",
        )?.status,
      ).toBe("hidden");
    }

    const discovered = proposal();
    discovered.narration = hiddenRinger;
    discovered.revealSecretIds = ["known-secret"];
    expect(detectHiddenLeakage(current, discovered)).toEqual([]);
  });

  it("does not make newly proposed secrets revealable by arbitrary IDs", () => {
    const draft = proposal();
    draft.narration = hiddenCreditor;
    draft.hiddenPatch.secrets.add.push({
      text: hiddenCreditor,
      status: "hidden",
    });
    draft.revealSecretIds = ["proposed-secret-0"];
    expect(detectHiddenLeakage(session(), draft)).toContainEqual({
      field: "root.narration",
      secretId: "proposed-secret-0",
    });
  });
});
