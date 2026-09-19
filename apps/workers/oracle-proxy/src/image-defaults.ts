// Workers cannot import from `packages/oracle-engine/src` by relative path, so
// the shared proxy keeps its own copy of the default. Keep it aligned with
// `DEFAULT_CF_IMAGE_MODEL` in `@codex/oracle-engine` (image-defaults.ts), where
// the reasoning behind the cheap default is documented.
export const DEFAULT_CF_IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
