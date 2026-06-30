# Quickstart: Public World Directory

## Prerequisites

- Feature `135-guest-vault-r2` is implemented and provides:
  - published guest snapshots under `/api/published/{publishId}`
  - a local `PublishRegistry` with `publishId` and `writeToken`
  - read-only guest viewer routes
- Cloudflare Worker has an R2 bucket binding configured.
- Use Bun from the repository root.

## Implementation Order

1. Extend `packages/schema/src/publishing.ts` with `ListingDraft`, `PublicListing`, `DirectoryQuery`, `DirectoryResult`, and `DirectoryPage` schemas.
2. Add schema tests covering valid listing metadata, missing required fields, overlong values, zero labels, and rejected extra private fields.
3. Add Worker directory route tests for:
   - blocked listing when the guest snapshot does not exist
   - unauthorized enable/update/delete without the snapshot write token
   - successful enable/update with saved owner-approved metadata
   - fetching an existing saved listing record for later owner review/editing
   - public browse/search/filter returning only listing metadata
   - delist preserving the guest snapshot but removing directory visibility
   - snapshot unpublish deleting any listing record
4. Implement `apps/workers/oracle-proxy/src/directory.ts` and route it from `index.ts`.
5. Add `PublicDirectoryService` with injectable `fetch` and `baseUrl`, then test success and failure paths.
6. Add owner listing controls to publishing settings:
   - load any existing saved public listing record
   - preview before listing
   - clear confirmation that anyone can find the world in the public directory
   - enable/update
   - delist without unpublishing the guest snapshot
7. Add public directory route at `/worlds` with browse/search/filter and guest-view navigation only.
8. Add or update the help article explaining "share by link" vs "list publicly".

## Manual Verification

1. Publish a guest snapshot for a test vault.
2. Open listing settings and confirm the preview shows only title, description, labels, optional cover image, optional owner display name, visible entity count, and guest destination behavior.
3. Enable public listing.
4. Open `/worlds` and verify the listing appears.
5. Search by title and description; filter by labels.
6. Open the result and verify navigation lands in the read-only guest view with no editable controls.
7. Rename the editable world or change profile display name; verify the directory listing does not change until the owner updates listing metadata.
8. Delist the world; verify it disappears from browse/search while the direct guest link still works.
9. Unpublish the guest snapshot; verify any public listing is removed.

## Validation Commands

```bash
bun run lint
bun run test
```

Run focused tests while developing:

```bash
bun test packages/schema/src/publishing.test.ts
bun test apps/workers/oracle-proxy/src/__tests__/directory.test.ts
bun test apps/web/src/lib/services/publishing/PublicDirectoryService.test.ts
```

## Copy Validation Checklist

Ensure the user interface correctly distinguishes "share by link" from "list publicly":

- [ ] Confirm settings page header copy explains: "Sharing by link stays unlisted. Listing publicly makes this world discoverable to anyone browsing the directory."
- [ ] Confirm confirmation copy explains: "Anyone can find this world in the public directory once you save this listing."
- [ ] Verify that directory search and cards never refer to "tags", only to "labels".
- [ ] Confirm preview helper text explicitly refers to the read-only guest route.
