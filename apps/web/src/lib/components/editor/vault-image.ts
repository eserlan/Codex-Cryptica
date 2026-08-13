export const VAULT_IMAGE_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

export function protectVaultImageSource(
  attributes: Record<string, unknown>,
): Record<string, unknown> {
  const source = attributes.src;
  if (typeof source !== "string" || !source.startsWith("images/")) {
    return attributes;
  }

  return {
    ...attributes,
    src: VAULT_IMAGE_PLACEHOLDER,
    "data-vault-asset-path": source,
  };
}
