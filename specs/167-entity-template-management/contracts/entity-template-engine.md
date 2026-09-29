# Contract: `entity-template-engine` and the web store

## Package: `packages/entity-template-engine` (pure, no DOM, no I/O)

```ts
compileTemplate(t: Pick<EntityTemplate, "intro" | "sections">): string
parseMarkdownToSections(md: string): { intro?: string; sections: TemplateSection[] }
validateTemplate(t: DraftTemplate): ValidationIssue[]        // [] means valid; messages are plain language
exportTemplatePackage(t: EntityTemplate): TemplatePackage
importTemplatePackage(raw: unknown): { ok: true; template: DraftTemplate } | { ok: false; error: string }
resolveTemplateMarkdown(input: {
  type: string
  templates: EntityTemplate[]        // built-in, legacy and user
  defaults: TemplateDefaults
  themeBuiltin?: string              // theme-aware markdown, if any
  genericBuiltin?: string
}): string                           // FR-018 order; "" means blank
```

Guarantees:

- `compileTemplate` is deterministic: same input, same output.
- `parseMarkdownToSections(compileTemplate(t))` yields the same sections (round trip for compiled templates).
- `importTemplatePackage` rejects: non-object, wrong `kind`, unsupported `formatVersion` (message says to update the app), invalid template. It never throws.
- `resolveTemplateMarkdown` never throws and never performs I/O.

## Web: `EntityTemplateStore` (Svelte 5, constructor DI)

```ts
constructor(deps: {
  repository: EntityTemplateRepository
  getTheme: () => string
  isReadOnly: () => boolean          // default: sessionModeStore.isGuestMode || no writable vault handle
  idGenerator: () => string
  notify: (message: string, kind: "error" | "warning") => void   // default: notificationStore
})

loadForVault(vaultId: string, handles: { vault?: FileSystemDirectoryHandle; folder?: FileSystemDirectoryHandle }): Promise<void>
list: EntityTemplate[]                     // reactive
warnings: string[]                         // skipped/malformed files
canEdit: boolean
defaultFor(type): string | undefined       // the CHOSEN default id only
effectiveDefaultFor(type): string          // the row shown as Default: chosen, else legacy, else built-in (exactly one per type)
setDefault(type, templateId): Promise<void>
create(draft): Promise<EntityTemplate>
duplicate(id, name?): Promise<EntityTemplate>
update(id, draft): Promise<void>           // user templates only
remove(id): Promise<void>                  // user templates only; clears default if chosen
exportPackage(id): TemplatePackage
importPackage(raw): Promise<Result>
previewMarkdown(id | draft): string
resolveSync(type, themeId?): string        // snapshot lookup, no I/O; used by the service facade and passed to configureAIEngine
```

Behaviour:

- Mutating methods throw or return an error result when `canEdit` is false. They never partially update state on a failed write.
- No method accepts or touches entities.
- `resolveSync` falls back to the built-in `resolveTemplateSync` before a vault has loaded.

## Web: `EntityTemplateRepository`

```ts
loadAll(handles): Promise<{ templates: StoredTemplate[]; defaults: TemplateDefaults; legacy: LegacyTemplate[]; warnings: string[] }>
saveTemplate(vaultHandle, t): Promise<void>       // .codex/templates/{id}.json
deleteTemplate(vaultHandle, id): Promise<void>
saveDefaults(vaultHandle, d): Promise<void>       // .codex/templates/defaults.json
```

Legacy files are read from `.cc/templates` and `.codex/templates` in both the OPFS vault directory and the linked folder. Case-insensitive `{type}.md` match is preserved. Empty files are valid.

## Web: `EntityTemplateService` (facade, unchanged signature)

```ts
resolveTemplate(type, themeId?, dirHandle?): Promise<string>
extractSummary(text): string
```

Delegates to the store; uses `dirHandle` only when the store has not loaded.

## UI contract (Settings → Templates)

- Section title "Entity templates", grouped by entity type.
- Row: name, source badge (Built-in / Yours), Default marker.
- Actions: Preview, Set as default, Duplicate, Edit\*, Export, Delete\* (\*user templates only; hidden in read-only mode).
- Header actions: New template, Import.
- Editor: name, entity type, intro (optional), orderable sections (title, hint), live preview, Save / Cancel with discard confirmation.
