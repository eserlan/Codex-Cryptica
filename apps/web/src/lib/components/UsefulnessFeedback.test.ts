/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import UsefulnessFeedback from "./UsefulnessFeedback.svelte";
import { UIPersistence, type StorageLike } from "$lib/stores/ui/persistence";

function fakeStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  };
}

describe("UsefulnessFeedback", () => {
  it("shows Yes/No initially and records a yes vote", async () => {
    const storage = fakeStorage();
    const persistence = new UIPersistence({ storage });
    const onVote = vi.fn();

    render(UsefulnessFeedback, {
      props: { voteKey: "how-do-you-track-faction-turns", persistence, onVote },
    });

    expect(screen.getByRole("button", { name: /yes/i })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: /yes/i }));

    expect(onVote).toHaveBeenCalledWith("yes", undefined);
    expect(screen.getByText("Thanks for the feedback!")).toBeTruthy();
    expect(
      storage.getItem("codex_answer_feedback_how-do-you-track-faction-turns"),
    ).toBe(JSON.stringify({ value: "yes" }));
  });

  it("reveals structured reasons after No, without voting yet", async () => {
    const persistence = new UIPersistence({ storage: fakeStorage() });
    const onVote = vi.fn();

    render(UsefulnessFeedback, {
      props: { voteKey: "x", persistence, onVote },
    });

    await fireEvent.click(screen.getByRole("button", { name: /no/i }));

    expect(onVote).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Too vague" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Skip" })).toBeTruthy();
  });

  it("finalizes a no vote with a structured reason", async () => {
    const storage = fakeStorage();
    const persistence = new UIPersistence({ storage });
    const onVote = vi.fn();

    render(UsefulnessFeedback, {
      props: { voteKey: "x", persistence, onVote },
    });

    await fireEvent.click(screen.getByRole("button", { name: /no/i }));
    await fireEvent.click(screen.getByRole("button", { name: "Too long" }));

    expect(onVote).toHaveBeenCalledWith("no", "Too long");
    expect(storage.getItem("codex_answer_feedback_x")).toBe(
      JSON.stringify({ value: "no", reason: "Too long" }),
    );
    expect(screen.getByText("Thanks for the feedback!")).toBeTruthy();
  });

  it("finalizes a no vote without a reason when skipped", async () => {
    const onVote = vi.fn();
    const persistence = new UIPersistence({ storage: fakeStorage() });

    render(UsefulnessFeedback, {
      props: { voteKey: "x", persistence, onVote },
    });

    await fireEvent.click(screen.getByRole("button", { name: /no/i }));
    await fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(onVote).toHaveBeenCalledWith("no", undefined);
    expect(screen.getByText("Thanks for the feedback!")).toBeTruthy();
  });

  it("restores the already-voted state from storage without re-firing onVote", () => {
    const storage = fakeStorage();
    storage.setItem(
      "codex_answer_feedback_x",
      JSON.stringify({ value: "yes" }),
    );
    const persistence = new UIPersistence({ storage });
    const onVote = vi.fn();

    render(UsefulnessFeedback, {
      props: { voteKey: "x", persistence, onVote },
    });

    expect(screen.getByText("Thanks for the feedback!")).toBeTruthy();
    expect(onVote).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^yes$/i })).toBeNull();
  });

  it("lets the reader change their vote, overwriting the stored value", async () => {
    const storage = fakeStorage();
    const persistence = new UIPersistence({ storage });
    const onVote = vi.fn();

    render(UsefulnessFeedback, {
      props: { voteKey: "x", persistence, onVote },
    });

    await fireEvent.click(screen.getByRole("button", { name: /yes/i }));
    await fireEvent.click(
      screen.getByRole("button", { name: "Change your answer" }),
    );

    expect(screen.getByRole("button", { name: /no/i })).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: /no/i }));
    await fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(onVote).toHaveBeenLastCalledWith("no", undefined);
    expect(storage.getItem("codex_answer_feedback_x")).toBe(
      JSON.stringify({ value: "no" }),
    );
  });

  it("records a community vote without a previous value on first vote", async () => {
    const persistence = new UIPersistence({ storage: fakeStorage() });
    const recordVote = vi.fn(async () => true);
    const communityService = {
      recordVote,
      fetchBySlugs: async () => [],
    };

    render(UsefulnessFeedback, {
      props: { voteKey: "x", slug: "x", persistence, communityService },
    });

    await fireEvent.click(screen.getByRole("button", { name: /yes/i }));

    expect(recordVote).toHaveBeenCalledWith({
      slug: "x",
      value: "yes",
      previous: undefined,
    });
    expect(screen.getByText("Thanks for the feedback!")).toBeTruthy();
  });

  it("moves the community vote on change and survives aggregate failure", async () => {
    const persistence = new UIPersistence({ storage: fakeStorage() });
    const recordVote = vi.fn(async () => false);
    const communityService = {
      recordVote,
      fetchBySlugs: async () => [],
    };

    render(UsefulnessFeedback, {
      props: { voteKey: "x", slug: "x", persistence, communityService },
    });

    await fireEvent.click(screen.getByRole("button", { name: /yes/i }));
    await fireEvent.click(
      screen.getByRole("button", { name: "Change your answer" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: /no/i }));
    await fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(recordVote).toHaveBeenLastCalledWith({
      slug: "x",
      value: "no",
      previous: "yes",
    });
    // Aggregate failure never blocks the vote UI.
    expect(screen.getByText("Thanks for the feedback!")).toBeTruthy();
  });

  it("sends the current value when a reader reselects the same vote", async () => {
    const persistence = new UIPersistence({ storage: fakeStorage() });
    const recordVote = vi.fn(async () => true);
    const communityService = {
      recordVote,
      fetchBySlugs: async () => [],
    };

    render(UsefulnessFeedback, {
      props: { voteKey: "x", slug: "x", persistence, communityService },
    });

    await fireEvent.click(screen.getByRole("button", { name: /yes/i }));
    await fireEvent.click(
      screen.getByRole("button", { name: "Change your answer" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: /yes/i }));

    expect(recordVote).toHaveBeenLastCalledWith({
      slug: "x",
      value: "yes",
      previous: "yes",
    });
  });

  it("shows community proof only once the public threshold is met", async () => {
    const persistence = new UIPersistence({ storage: fakeStorage() });
    const communityService = {
      recordVote: vi.fn(async () => true),
      fetchBySlugs: async () => [{ slug: "x", yes: 24 }],
    };

    render(UsefulnessFeedback, {
      props: { voteKey: "x", slug: "x", persistence, communityService },
    });

    await screen.findByText("24 readers found this helpful");
  });

  it("hides community proof below threshold and skips fetch without a slug", async () => {
    const fetchBySlugs = vi.fn(async () => [{ slug: "x", yes: 9 }]);
    const persistence = new UIPersistence({ storage: fakeStorage() });

    render(UsefulnessFeedback, {
      props: {
        voteKey: "x",
        slug: "x",
        persistence,
        communityService: { recordVote: vi.fn(async () => true), fetchBySlugs },
      },
    });

    await vi.waitFor(() => expect(fetchBySlugs).toHaveBeenCalled());
    expect(screen.queryByText(/readers found this helpful/)).toBeNull();

    const noSlugFetch = vi.fn(async () => []);
    render(UsefulnessFeedback, {
      props: {
        voteKey: "y",
        persistence: new UIPersistence({ storage: fakeStorage() }),
        communityService: {
          recordVote: vi.fn(async () => true),
          fetchBySlugs: noSlugFetch,
        },
      },
    });
    expect(noSlugFetch).not.toHaveBeenCalled();
  });

  it("resyncs to the new key's stored vote when voteKey changes (page-instance reuse)", async () => {
    const storage = fakeStorage();
    storage.setItem(
      "codex_answer_feedback_b",
      JSON.stringify({ value: "no", reason: "Too long" }),
    );
    const persistence = new UIPersistence({ storage });

    const { rerender } = render(UsefulnessFeedback, {
      props: { voteKey: "a", persistence },
    });
    expect(screen.getByRole("button", { name: /yes/i })).toBeTruthy();

    await rerender({ voteKey: "b", persistence });

    expect(screen.getByText("Thanks for the feedback!")).toBeTruthy();
  });
});
