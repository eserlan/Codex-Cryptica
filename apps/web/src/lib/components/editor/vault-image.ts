export const VAULT_IMAGE_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

export function protectVaultImageSource(
  attributes: Record<string, unknown>,
): Record<string, unknown> {
  const source = attributes.src;
  if (typeof source === "string" && source.startsWith("images/")) {
    return {
      ...attributes,
      src: VAULT_IMAGE_PLACEHOLDER,
      "data-vault-asset-path": source,
    };
  }

  // Markdown and imported HTML are untrusted. Never let an image element
  // fetch a remote, data, blob, or otherwise unapproved source on render.
  if (source === VAULT_IMAGE_PLACEHOLDER) {
    return attributes;
  }

  return { ...attributes, src: VAULT_IMAGE_PLACEHOLDER };
}
