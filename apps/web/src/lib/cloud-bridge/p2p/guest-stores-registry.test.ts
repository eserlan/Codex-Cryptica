import { afterEach, describe, expect, it } from "vitest";
import {
  getGuestStores,
  registerGuestStores,
  type GuestStoreBundle,
} from "./guest-stores-registry";

describe("guest stores registry", () => {
  afterEach(() => registerGuestStores(null));

  it("returns the registered bundle", () => {
    const bundle = { vault: {} } as unknown as GuestStoreBundle;
    registerGuestStores(bundle);
    expect(getGuestStores()).toBe(bundle);
  });

  it("throws when nothing is registered", () => {
    expect(() => getGuestStores()).toThrow(/not registered/);
  });
});
