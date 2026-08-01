# Quickstart: Community Stat Sheet Template Directory

## Local development

1. Install dependencies with `bun install`.
2. Start the Worker in `apps/workers/oracle-proxy` with `bunx wrangler dev`.
3. Start the web app with `bun run --cwd apps/web dev` and point its proxy URL
   at the local Worker.
4. Save a Stat Sheet layout as a template, open publish, review the value-free
   preview, provide metadata, and acknowledge public discovery.
5. Open the community directory, search/filter a listing, inspect its field
   preview, and import it. Confirm it appears in the local template picker.

## Verification scenarios

- Publish, reload, update, and unpublish; the local template remains available.
- Copy/export the owner token, clear the local registry, re-enter the token,
  and confirm owner controls are restored without account lookup.
- Include entity values, notes, IDs, and local asset paths; assert the package
  excludes them.
- Import a malformed/future-version package or simulate network failure; assert
  no IndexedDB template is created.
- Import a duplicate name, choose rename, and cancel a second attempt; assert
  the existing template is unchanged.
- Use keyword, system, category, label, empty, and paginated directory queries.
- Exercise a 1,000-listing fixture and confirm search/filter behavior meets the
  directory performance target; verify unpublishing is absent from fresh browse
  results within 60 seconds.

## Required checks

Run focused Vitest suites for the new package, schema, worker, services, stores,
and routes. Then run `bun run lint`, `bun run test`, and
`bun run --cwd apps/web check`.
