# Bespoke Modals — Follow-Up Considerations

Written alongside the `ModalShell` extraction (#1611, part of the duplication
cleanup tracked in #1618). While migrating modals to the new shared
`apps/web/src/lib/components/ui/ModalShell.svelte`, several files turned out
to be more structurally/behaviorally distinct than the original duplication
audit assumed. This doc records what was found and why each was left out, so
the reasoning isn't lost and a future pass can make an informed call on
whether to unify, redesign, or deliberately leave them as-is.

**Migrated to `ModalShell` (the true common "centered dialog card" pattern):**
`ChangelogModal`, `RevisionInstructionModal`, `EdgeLabelModal`,
`VaultSwitcherModal`, `CampaignGeneratorModal`.

**Left out — details below:** `ConfirmationModal`, `NodeReadModal`,
`GuestLoginModal`, `SoundBiteModal`, `SettingsModal`.
`UnpublishConfirmModal` is tracked separately (#1612 — consolidate into
`ConfirmationModal` directly, not into `ModalShell`).

---

## `ConfirmationModal.svelte`

Centered, no-header dangerous-action dialog: icon circle + centered title +
centered message + full-width stacked action buttons, no top-right close X.
This is a deliberately different interaction shape from the "header bar +
X close" pattern the other modals share — forcing an X-close affordance onto
a confirm/cancel dialog would blur the distinction between "dismiss" and
"decide," which matters for a component whose whole job is making the user
explicitly choose Confirm or Cancel.

**Consideration for later:** if a second "centered decision dialog" variant
ever appears, it may be worth a `ConfirmationShell` sibling to `ModalShell`
(same backdrop/focus-trap/escape plumbing, different header/footer shape)
rather than trying to make one shell cover both.

## `NodeReadModal.svelte`

Uses a completely different, bespoke "terminal green" visual theme
(`bg-[#0c0c0c]`, `border-green-900/50`, `text-green-500`,
`icon-[heroicons--x-mark]` instead of the `icon-[lucide--x]` used everywhere
else) rather than the `theme-*`/`chrome-*` design tokens. It also lacks
`use:focusTrap`, `aria-labelledby`, and has its own copy-to-clipboard action
embedded in the header. This looks like an intentional "read mode" aesthetic
choice (distinguishing the read-only content viewer from editable dialogs),
not incidental drift — but it does mean it currently has **no focus trap and
no `aria-labelledby`**, an a11y gap independent of the `ModalShell` effort.

**Consideration for later:** decide whether the terminal-green look is a
kept design decision (in which case it should still adopt `focusTrap` and
`aria-labelledby` on its own, without necessarily using `ModalShell`) or
whether it should be re-themed to match the rest of the app.

## `GuestLoginModal.svelte`

Not actually a dismissible modal — it has no close button, no backdrop
click-to-cancel, no Escape handling, and no `role="dialog"`/`aria-modal` at
all. It's a mandatory "enter a display name" gate for guest sessions with no
way to bypass it. Wrapping it in `ModalShell` (whose whole contract is
"has a way to close") would either require a no-op `onClose` (misleading)
or would silently make the gate dismissible/skippable, which is a product
decision, not a refactor.

**Consideration for later:** if this should remain non-dismissible by
design, it's fine as-is; if it should support Escape/backdrop-dismiss
under some circumstances (e.g. guest session already established), that's
a product call to make before touching the component.

## `SoundBiteModal.svelte`

Responsive bottom-sheet-on-mobile pattern: `items-end md:items-center`
positioning, `in:fly`/`out:fly` transitions (slides up from the bottom on
mobile, not a centered scale-in), `rounded-t-2xl md:rounded-2xl`. This is a
deliberate mobile UX pattern distinct from the desktop-style centered card
the other modals use. `ModalShell`'s transition is hardcoded to `scale`;
supporting a responsive fly-from-bottom variant would need either a second
shell or a pluggable transition prop, which felt like over-engineering for a
single consumer.

**Consideration for later:** if more bottom-sheet-style mobile modals show
up, a `BottomSheetShell` (or a `variant="sheet"` prop on `ModalShell`) would
be worth building; for now it's a single, self-contained special case.

## `SettingsModal.svelte`

Not really a "dialog card" at all — it's a full-screen app-shell layout:
sidebar tab navigation + content pane, positioned via
`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` (not the
flex-centering every other modal uses), `w-full max-w-6xl h-[90vh]`, and its
own manual Tab-cycling focus trap tied to a `bind:this` element reference
rather than `use:focusTrap`. Restructuring this to fit `ModalShell`'s
centered-card assumptions would be a much bigger, riskier rewrite than a
boilerplate swap — it's closer to a page layout than a modal.

**Consideration for later:** `SettingsModal` could still adopt
`use:focusTrap` directly (dropping its ~20 lines of duplicated manual
Tab-cycling logic) without going through `ModalShell` at all, since
`focusTrap` the action (not `ModalShell` the component) only needs a root
element — that would be a smaller, lower-risk win worth doing separately.

---

## Side finding: `focusTrap.ts` bugs fixed during this pass

Migrating `ChangelogModal` to `ModalShell` (content passed via a
cross-component `{@render children()}` snippet rather than being direct
children of the same component) exposed two latent bugs in the shared
`apps/web/src/lib/actions/focusTrap.ts`, both fixed as part of #1611:

1. The auto-focus-first-focusable query ran synchronously at action-mount
   time rather than deferred, so content that isn't in the DOM yet at that
   exact instant (as with cross-component snippets) was never found.
2. The visibility filter relied on `offsetParent === null` as a "hidden"
   signal, which is unreliable both in real browsers (also true for
   `position: fixed`/`sticky` elements) and always-null under jsdom (no
   layout engine), causing visible elements to be wrongly excluded in unit
   tests. Replaced with a `display`/`visibility` computed-style walk up the
   ancestor chain, which works consistently in both environments.

A third change: `focusTrap` now skips its own auto-focus if a consumer has
already moved focus somewhere inside the trapped node by the time it runs
(e.g. `RevisionInstructionModal`'s own effect that focuses its textarea
instead of the close button) — otherwise the trap would clobber an
intentional custom initial-focus target.
