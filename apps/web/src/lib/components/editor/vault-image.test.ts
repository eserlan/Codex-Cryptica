import { describe, expect, it } from "vitest";
import {
  protectVaultImageSource,
  VAULT_IMAGE_PLACEHOLDER,
} from "./vault-image";

describe("protectVaultImageSource", () => {
  it("hides a vault-relative source until the asset URL is resolved", () => {
    expect(
      protectVaultImageSource({
        src: "images/delve-layout.webp",
        alt: "Delve layout",
      }),
    ).toEqual({
      src: VAULT_IMAGE_PLACEHOLDER,
      alt: "Delve layout",
      "data-vault-asset-path": "images/delve-layout.webp",
    });
  });

  it("blocks remote image sources to prevent passive network requests", () => {
    const attributes = {
      src: "https://example.com/layout.webp",
      alt: "Delve layout",
    };

    expect(protectVaultImageSource(attributes)).toEqual({
      ...attributes,
      src: VAULT_IMAGE_PLACEHOLDER,
    });
  });

  it.each(["data:image/png;base64,AAAA", "blob:https://example.com/id"])(
    "blocks unapproved image source %s",
    (src) => {
      expect(protectVaultImageSource({ src }).src).toBe(
        VAULT_IMAGE_PLACEHOLDER,
      );
    },
  );
});
