# Contract: Public Entity Template Package

No second format. The published package is the spec 167 `TemplatePackage`, passed through a strict projection.

```ts
// packages/schema/src/entity-template-public.ts (workers may only import `schema`)
export type PublicEntityTemplatePackage = {
  kind: "entity-template";
  formatVersion: 1;
  template: { name: string; entityType: string; markdown: string };
};

/** Pure. Never throws. */
export function toPublicEntityPackage(
  raw: unknown,
):
  | { ok: true; package: PublicEntityTemplatePackage }
  | { ok: false; error: string };

/** Limits applied to the listing metadata that accompanies a package. */
export const ENTITY_TEMPLATE_PUBLIC_LIMITS = {
  nameMax: 80,
  descriptionMax: 500,
  bodyMax: 50_000,
  labelsMax: 8,
  labelMax: 30,
} as const;

export function validateEntityTemplatePublishMetadata(input: {
  description: string;
  labels: string[];
  ownerDisplayName?: string;
}): ValidationIssue[]; // [] means valid; plain-language messages
```

## Rules

- Only `kind`, `formatVersion` and `template.{name, entityType, markdown}` survive the projection. Every other field, including unknown extras that `TemplatePackageSchema` would preserve locally, is dropped.
- `name` is trimmed and single line, 1–80 characters. `entityType` is trimmed and lower-cased. `markdown` is 1–50,000 characters and is otherwise **unchanged**: no trimming, normalising or reformatting, so an installed template is byte-identical to the published body (SC-007).
- An empty `markdown` is not publishable; the error explains that there is nothing to share. (Empty bodies remain valid for local templates and file import.)
- `formatVersion` greater than 1 fails with: "This template was made with a newer version of Codex Cryptica. Update the app to use it." Older versions would be migrated here; none exist yet.
- Labels are trimmed, de-duplicated case-insensitively, 1–8 of them, each 1–30 characters. At least one label is required at publish time.
- The same function runs in the browser (publish preview, install validation) and in the worker (create, update, and read-time validation), so both sides accept and reject the same input.

## Install mapping

A validated public package maps to a local `DraftTemplate` `{ name, entityType, markdown }` through the existing `importTemplatePackage`, then to one `EntityTemplateStore.create()` call. A name collision (same name, same entity type, case-insensitive) is resolved by an explicit rename or cancel before `create()` is called. `create()` assigns a new local id and `source: "user"`. No default is set.
