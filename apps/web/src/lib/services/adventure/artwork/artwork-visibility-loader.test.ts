import { expect, it, vi } from "vitest";
import { ArtworkPreferences } from "./artwork-preferences";
import { ArtworkVisibilityLoader } from "./artwork-visibility-loader";
const variant = {
  url: "https://assets.codexcryptica.com/adventure-artwork/a.webp",
  mime: "image/webp" as const,
  width: 1,
  height: 1,
  bytes: 1,
  sha256: "a".repeat(64),
};
it("aborts automatic requests on disable but leaves explicit downloads alone", async () => {
  const signals: AbortSignal[] = [];
  const loader = {
    load: vi.fn(async (_variant, signal: AbortSignal) => {
      signals.push(signal);
      return null;
    }),
  };
  const prefs = new ArtworkPreferences(null);
  const visibility = new ArtworkVisibilityLoader(loader, prefs);
  await visibility.load(variant, new AbortController().signal, "automatic");
  prefs.setEnabled(false);
  await visibility.load(variant, new AbortController().signal, "automatic");
  await visibility.load(variant, new AbortController().signal, "download");
  expect(loader.load).toHaveBeenCalledTimes(2);
  visibility.destroy();
});

it("signals cancellation to an in-flight automatic load", async () => {
  let automaticSignal: AbortSignal | undefined;
  const loader = {
    load: vi.fn(
      (_variant, signal: AbortSignal) =>
        new Promise<Blob | null>((resolve) => {
          automaticSignal = signal;
          signal.addEventListener("abort", () => resolve(null), { once: true });
        }),
    ),
  };
  const prefs = new ArtworkPreferences(null);
  const visibility = new ArtworkVisibilityLoader(loader, prefs);
  const pending = visibility.load(
    variant,
    new AbortController().signal,
    "automatic",
  );
  prefs.setEnabled(false);
  expect(automaticSignal?.aborted).toBe(true);
  expect(await pending).toBeNull();
  visibility.destroy();
});
