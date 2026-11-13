import { describe, expect, it } from "vitest";
import { planCacheMutation } from "../src/cache-policy";
const mib = 1024 * 1024;
describe("artwork cache budget", () => {
  it("evicts least recently used unprotected files to fit automatic bytes", () => {
    expect(
      planCacheMutation(
        [
          { id: "old", bytes: 20 * mib, lastUsed: 1, protected: false },
          { id: "new", bytes: 10 * mib, lastUsed: 2, protected: false },
        ],
        { id: "incoming", bytes: 10 * mib },
      ),
    ).toEqual({ ok: true, evict: ["old"] });
  });
  it("never evicts installed collection bytes and refuses excess capacity", () => {
    expect(
      planCacheMutation(
        [{ id: "installed", bytes: 250 * mib, lastUsed: 1, protected: true }],
        { id: "incoming", bytes: 10 * mib },
      ),
    ).toEqual({ ok: false, reason: "capacity" });
  });
  it("does not double count a file already cached", () => {
    expect(
      planCacheMutation(
        [{ id: "same", bytes: 3, lastUsed: 1, protected: false }],
        { id: "same", bytes: 3 },
      ),
    ).toEqual({ ok: true, evict: [] });
  });
  it("rejects inconsistent duplicate records", () => {
    expect(
      planCacheMutation(
        [
          { id: "same", bytes: 3, lastUsed: 1, protected: false },
          { id: "same", bytes: 5, lastUsed: 2, protected: true },
        ],
        { id: "new", bytes: 1 },
      ),
    ).toEqual({ ok: false, reason: "invalid-index" });
  });
});
