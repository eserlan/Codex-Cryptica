# Shared Vault for a Gaming Group Mini-Spec

A gaming group edits one vault together. Each member keeps a full local copy
that works offline, and Codex Cryptica Cloud merges their changes.

This plan steers the epic (#4772). Each slice in section 3 is one issue, sized for one
factory job, and ships on its own.

## 1. Specification (What & Why)

### Problem Statement

Codex Cryptica Cloud Backup holds one restorable copy of a vault, written by
one person. A group that builds a world together has no safe way to share it:
giving everyone the recovery key lets any member delete the backup, and two
people saving at once pause each other's sync ("another device updated this
backup") with no way to combine their work. Groups mostly add new entities and
sometimes edit older ones, so nearly all of their changes can be merged
automatically.

### Decisions already made

These were settled with the product owner on 2026-11-13. Do not reopen them in
a slice; raise a new issue instead.

| Area             | Decision                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trust            | Every member is a co-GM and sees the whole vault. The server does not filter content per member.                                                                                           |
| Access           | One shared group link grants editing. The recovery key stays with the owner, who alone can replace the link, roll back, or delete the backup.                                              |
| Names            | A member types a display name when joining. It is not verified. It labels "last edited by" and conflict copies.                                                                            |
| Local copy       | Opening the link creates a full local vault, linked to the shared one. It works offline.                                                                                                   |
| Sync             | Automatic both ways. Changes upload shortly after editing stops; others' changes arrive in the background.                                                                                 |
| Conflicts        | Edits to different fields of one entity merge silently. For the same field, the version synced first stays and the other is saved beside it as "Title (Mara's version)".                   |
| Deletes          | A deleted entity goes to a shared trash for 30 days, where any member can restore it. An edit beats a delete it had not seen.                                                              |
| Scope            | Entities, notes, labels, connections and their images merge. Maps and canvases sync as whole items and keep both versions on a clash. Session journals and adventures stay on each device. |
| Product fit      | "Share with group" is a mode of an existing Codex Cryptica Cloud backup, behind its own consent screen.                                                                                    |
| Removing someone | The owner replaces the link. Other members rejoin with the new link and keep their local copy. A removed member keeps their copy as an ordinary local vault.                               |
| Rollback         | The server keeps one restore point per day for 30 days. The owner can roll the shared vault back to one.                                                                                   |

### Scope & Boundaries

- **In Scope**:
  - A server revision for each backup and each entity, and a way to fetch what
    changed since a revision.
  - A three-way merge on the device, with "keep both" for same-field clashes.
  - One editor link per backup, a join flow with a display name, and
    attribution of changes.
  - A shared 30-day trash.
  - Maps and canvases as whole shared items.
  - Daily restore points and owner rollback.
  - Help content and consent copy for all of the above.
- **Out of Scope**:
  - Player-safe sharing: members who must not see hidden or GM-only content.
  - One invite link per member, verified identity, or accounts.
  - A read-only share link.
  - Live presence, cursors, or "who is typing".
  - History of every version of each entity.
  - End-to-end encryption of the cloud copy.
  - Sharing session journals, adventures, or kept adventure artwork.
  - Sharing through Google Drive.

### Remote-storage privacy conditions

Sharing is an opt-in mode of Cloud Backup. Before any shared vault data is
uploaded, the feature must satisfy all six conditions in Constitution V:

1. **Off by default:** sharing stays disabled until the owner accepts its
   separate consent screen. Creating or using an ordinary backup does not
   enable sharing.
2. **Informed consent before upload:** before the first shared byte leaves a
   device, the consent screen explains that the remote copy contains the
   shared vault data (entities, notes, labels, connections, images, maps and
   canvases); that the owner and every group member with the link can read it;
   and that Codex Cryptica's Cloudflare R2 provider holds the stored bytes and
   can technically read them because the copy is not end-to-end encrypted.
   Each member must see this disclosure before their first upload; the owner's
   consent does not cover a member's later upload. The screen also explains
   how to turn sharing off and permanently erase the remote copy. Codex
   Cryptica support can see backup metadata (vault title, size, entry count and
   last backup time) for service operation and lost-key recovery, but not vault
   contents; disclose any broader access if the deployed controls allow it.
3. **Reversible:** using the recovery key, the owner can turn sharing off in
   Cloud Backup settings to revoke the link and stop sync, or separately
   permanently delete the remote backup there. Deletion removes the manifest,
   current shared data, assets, trash and restore points; it does not delete
   members' local vaults. Neither action requires contacting support.
4. **Local authority:** every member keeps a full local vault that remains
   usable without the shared backup. Cloud storage is a sync mirror; losing
   remote access does not prevent local use.
5. **No onward sharing:** Codex Cryptica does not sell, forward or disclose
   shared vault data beyond the disclosed Cloudflare infrastructure provider,
   and the data never enters an AI training pipeline.
6. **Internal access disclosed:** Codex Cryptica staff can access the listed
   backup metadata for service operation and lost-key recovery, but not vault
   contents. The consent screen states this scope; if deployed controls grant
   staff broader access, sharing cannot ship until that access is narrowed or
   the disclosure is updated.

The release gate must compare the provider and staff-access statements with
the deployed storage, worker and support controls before enabling sharing.

### Acceptance Criteria

- [ ] Two members add different entities while offline. After both come online,
      each vault holds both entities, with no prompt.
- [ ] Two members edit different fields of the same entity. Both edits are
      present on both devices after sync, with no prompt.
- [ ] Two members edit the same field of the same entity. The version that
      synced first is the entity; the other exists as a separate entity named
      "Title (Name's version)"; the second member sees a notice that names it.
- [ ] A member with the group link cannot delete the backup, replace the link,
      or roll the vault back. Those requests fail the same way as a wrong key.
- [ ] After the owner replaces the link, the old link can neither read nor
      write. A member who rejoins with the new link keeps their local vault and
      does not download it again.
- [ ] A deleted entity disappears for every member, appears in the shared
      trash, and can be restored by any member within 30 days. If another
      member edited it before receiving the delete, the entity is kept.
- [ ] The owner rolls the vault back to a restore point. Every member's vault
      matches that point after their next sync, without rejoining.
- [ ] A single owner with two devices no longer sees "Sync paused — another
      device updated this backup" for changes that can be merged.
- [ ] Nothing is shared until the owner accepts the "Share with group" consent
      screen. Turning sharing off stops the link and leaves the backup intact.
- [ ] A backup created before this feature still restores and syncs.

---

## 2. Technical Plan (How & Where)

### What exists today

- The server is the `oracle-proxy` worker. Backups live in R2 as a manifest,
  64 entity shards, an index, bundle sections (maps, canvases, journals) and
  assets (`apps/workers/oracle-proxy/src/cloud-backup-*.ts`).
- `authorize()` in `cloud-backup-auth.ts` compares the bearer token with the
  manifest's `ownerCodeHash`. There is one credential and one role.
- `handleCloudBackupDelta` in `cloud-backup-delta.ts` accepts a set of changed
  and removed entities, and rejects the push with 409 when the client's
  `baseLastPushedAt` is not the manifest's `lastPushedAt`.
- The client in `packages/cloud-backup-sync` pushes deltas
  (`delta-sync.ts`) and, on a conflict, pauses automatic sync
  (`snapshot-sync.ts`, `auto-sync.ts`). Its own comments say a true race
  "needs server revisions (follow-up)".
- The recovery key is `backupId:ownerCode` (`recovery-key.ts`).

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/schema/src/publishing.ts`: add `revision` to the manifest, a
    per-entity revision, tombstones, the sharing block, and the limits.
  - `apps/workers/oracle-proxy/src/cloud-backup-delta.ts`: commit against a
    revision; stamp changed entities; write tombstones.
  - `apps/workers/oracle-proxy/src/cloud-backup-reads.ts`: new
    `GET /api/cloud-backup/:id/changes?since=<revision>`.
  - `apps/workers/oracle-proxy/src/cloud-backup-auth.ts`: roles `owner` and
    `editor`; the editor token hash.
  - `apps/workers/oracle-proxy/src/cloud-backup-routes.ts` and
    `cloud-backup-lifecycle.ts`: sharing on and off, replace link, trash,
    restore points.
  - `packages/cloud-backup-sync/src/`: new `merge.ts` (three-way merge, pure),
    `change-feed.ts` (pull), and a rebase step in the push path.
  - `apps/web/src/lib/stores/cloud-backup*.ts`: keep the last synced copy of
    each entity as the merge base; run pull and rebase.
  - `apps/web/src/lib/components/settings/CloudBackupSettings.svelte` and new
    siblings: "Share with group", the consent screen, the link, the trash, the
    restore points.
  - A join route under `apps/web/src/routes/(app)/` that reads the link.
  - `apps/web/src/lib/content/help/cloud-backup.md` and a new help page; the
    `help-engine` feature registry.
- **Data Contracts & State Flow**:
  - `manifest.revision`: an integer that rises by one on every accepted
    commit. It replaces `lastPushedAt` as the concurrency check. A backup with
    no `revision` is treated as revision 0.
  - Each stored entity carries sync metadata beside its content, never inside
    it: `rev` (the revision that last changed it), `editedBy`, `editedAt`.
  - A removed entity leaves a tombstone: `{ id, rev, deletedBy, deletedAt,
title }`. The server keeps the entity's last content with the tombstone for
    30 days, then purges both.
  - `manifest.sharing`: `{ editorTokenHash, linkVersion, enabledAt }`, absent
    when sharing is off.
  - `changes?since=N` returns the entities and tombstones with `rev > N`, plus
    the current revision. If `N` is older than the purge horizon it answers
    "resync", and the device loads the full bundle.
  - The device stores, per entity, the content it last synced. The merge is
    base (that copy), mine (local), theirs (from the change feed).
  - The group link is `…/join#<backupId>:<editorToken>`. The token is in the
    fragment so it is never sent in a request line or written to a server log.
  - The display name and a random device id are device-local. The device sends
    them with each push.
- **UI & Design Tokens**:
  - Svelte 5 runes, Tailwind 4 semantic tokens, Iconify classes, per
    `docs/STYLE_GUIDE.md`.
  - Sync states reuse the Cloud Backup panel's wording and add "Merged N
    changes from the group" and "Kept your version of X as a copy".

### Key Technical Decisions & Tradeoffs

- **The server orders commits; the device merges.** The server accepts a push
  only when its base revision is current, and otherwise answers 409. The
  device then pulls, merges and pushes again. The server never has to
  understand entity fields, and a group of a few devices rarely collides.
  The cost is a retry loop on the device.
- **Close the real race without exposing partial commits.** Two commits can
  pass the revision check at the same moment. Each commit stages changed
  shards, the index, bundle sections and asset references under immutable,
  revision-specific keys. It then conditionally switches the manifest's
  current-revision pointer using the prior R2 etag. Readers use only objects
  reachable from that pointer, so a loser gets 409 without overwriting data
  visible to the winner. Failed commits can leave unreachable staged objects;
  these are not visible changes and can be pruned after confirming that no
  manifest points to them. Asset bytes must also use immutable or
  content-addressed keys so a failed commit cannot replace bytes referenced
  by the current revision.
- **Merge by top-level field.** Two edits to different fields merge. Two edits
  to the same field do not, even if they touch different sentences. Merging
  inside a text field is left out: it is harder to get right, and "keep both"
  never loses work.
- **Keep both instead of asking.** A prompt can interrupt a session. A copy
  beside the original can be dealt with later.
- **One link, so the server cannot tell members apart.** Names are typed, not
  proven. This was chosen for ease of use. The server can still cap devices by
  the random device id.
- **Additive storage.** The new manifest fields and entity metadata are
  optional, so existing backups need no migration and the schema version
  stays at 2.
- **Rollback is a commit.** Rolling back writes the restore point's content as
  a new revision. Members receive it as ordinary changes and do not rejoin.
- **Owner-only actions need the recovery key.** Full-snapshot commit, delete,
  link replacement, rollback and sharing on or off reject the editor token.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: a member edits; the change uploads after a
  short pause; other devices pull it within about 30 seconds while the app is
  open, and at once when the app regains focus.
- **Negative / Error Path**:
  - Push answers 409: pull, merge, retry, at most three times, then show "Sync
    failed — retrying…" and try again later. Never drop local changes.
  - The link was replaced or sharing was turned off: the device stops syncing,
    keeps the local vault, and says the link no longer works.
  - The device is offline: changes queue, as Cloud Backup does today.
  - The change feed answers "resync": load the full bundle and merge it
    against the local vault with the same rules.
  - An entity body or asset cannot be read: report a partial sync, as today.
  - The device cap is reached: joining fails with a plain message.
- **Cancellation / Edge Case**:
  - A member leaves the join screen before typing a name: nothing is created.
  - The same person joins twice on one device: the existing local vault is
    linked again, not duplicated.
  - Two members create entities with the same title: both are kept; ids
    differ.
  - A "keep both" copy is itself edited by two members: the same rules apply.
  - A restored entity whose connections point at entities still in the trash:
    the connections stay and resolve when those are restored.

### Risks

- Slices 1, 2, 3 and 6 change how the worker stores and authorises backups. Treat
  them as high risk: security review, and a worker deploy that is separate
  from the web deploy. The web app must keep working against the old worker
  and the worker against the old web app.
- Automatic sync spreads a mistake to every member within seconds. Slices 9
  and 12 are the safety net; until they ship, keep sharing behind a feature
  flag.
- Restore points multiply storage per shared vault. Slice 11 must state the
  cost and the limit before it is built.

---

## 3. Tasks & Execution Sequence (When)

Twelve slices, in order. Each is one issue and one factory job, stacked on the
one before, and none is larger than medium. Every slice starts with failing
tests that cover the success path and at least one failure path, and ends with
the verification gate. Slices 1 to 4, 6 and 11 change nothing a user can
see.

- [ ] **Slice 1: Revision numbers** (#4773) — `revision` on the manifest;
      `rev`, `editedBy`, `editedAt` per entity. The client sends a base
      revision instead of a timestamp.
- [ ] **Slice 2: Race-safe commit** (#4782) — stage changed objects under
      immutable revision-specific keys, then conditionally switch the
      manifest pointer using its etag. Two commits from one revision cannot
      both become visible; a loser leaves no visible changes and is told to
      retry. Unreachable staged objects can be pruned safely.
- [ ] **Slice 3: Tombstones and change feed** (#4779) — a tombstone for each
      removed entity, with its last content kept; `changes?since`, with a
      "resync" answer.
- [x] **Slice 4: Merge engine** (#4774) — `merge.ts` in `cloud-backup-sync`
      as pure functions; the last synced copy kept per entity. Not yet used by
      sync.
- [ ] **Slice 5: Pull, merge and retry** (#4780) — `change-feed.ts`; pull,
      merge and retry on 409; background pull. One owner with two devices
      stops seeing "Sync paused" for changes that merge.
- [ ] **Slice 6: Editor link on the server** (#4775) — the editor role and
      token; sharing on, off and replace link; the owner-only guard; the
      device cap.
- [ ] **Slice 7: Owner turns sharing on** (#4781) — the feature flag; the
      consent screen; copy link, replace link and turn off.
- [ ] **Slice 8: Member joins** (#4783) — the join route with a display name;
      the linked vault; attribution; help content.
- [ ] **Slice 9: Shared trash** (#4776) — the trash list, restore, the 30-day
      purge, and "an edit beats a delete".
- [ ] **Slice 10: Maps and canvases** (#4777) — whole-item sync with a
      revision each, and "keep both" on a clash.
- [ ] **Slice 11: Restore points** (#4778) — one snapshot per day for 30
      days, with the storage cost stated first; the owner-only list.
- [ ] **Slice 12: Rollback** (#4784) — rollback as a commit; the owner's
      screen. Remove the feature flag.

### Verification gate (every slice)

- `bun scripts/lint-changed.mjs`
- `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in
  `apps/web`, when `web` is affected
- `bun scripts/test-changed.mjs`
- `bunx fallow audit --format json --quiet --explain --gate-marker agent`
- The `codex-review` specialist review
- For worker changes: the worker's own tests, and a note in the PR that the
  worker needs a deploy

---

## Open questions

- The device cap is settled. Confirmed at 10 active devices in 30 days in
  slice 6.
- How often a device pulls is proposed at 30 seconds while the app is open.
  Confirm against the worker's rate limits in slice 5.
- The storage cost and limit for restore points. Settle in slice 11.
