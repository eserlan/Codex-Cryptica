# Template Package Contract

```ts
type PublicTemplatePackage = {
  schemaVersion: 1;
  template: {
    name: string;
    description: string;
    system?: string;
    category?: EntityCategory;
    labels: string[];
    fields: Array<{
      id: string;
      label: string;
      type: "counter" | "number" | "text" | "longtext" | "heading" | "dice";
      formula?: string;
      min?: number;
      max?: number;
      step?: number;
    }>;
  };
};
```

The package metadata MUST contain at least one of `system` or `category`; a
homebrew system name is valid when no controlled category is appropriate.
`heading` fields represent section structure in the current local model, so
their order and labels are preserved during projection and import.

The canonical package is strict: no `value`, `collapsed`, entity IDs, notes,
vault IDs, asset paths, credentials, or arbitrary extension fields. It must
contain at least one field renderable by the current Stat Sheet model. Migrations
are pure functions from supported older versions to the current envelope.
Packages newer than the supported version are rejected with an import-specific
error.
