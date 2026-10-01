## 🎯 Purpose

<!-- What does this PR do? Why is it needed? -->

## 🛠️ Changes

<!-- High-level summary of the code changes -->

## 🚦 Target Branch Reminder

> [!IMPORTANT]
> **This PR must target the `staging` branch.**
> All features and fixes must be verified on staging before being promoted to `main`.

## 📚 Help & AI Help Coverage

<!-- Complete this section for major user-facing feature work. For fixes, chores,
     internal refactors, and non-user-facing changes, mark both as N/A. -->

**User Help** — choose one and give the article/reason:

- [ ] Existing Help remains sufficient
- [ ] Existing Help updated
- [ ] New Help article added
- [ ] No Help needed (reason required)
- [ ] N/A — not major user-facing feature work

**Contextual AI Help registry** — make this decision separately from prose Help:

- [ ] Existing registry coverage remains sufficient
- [ ] Registry entry/context/actions updated or added
- [ ] Registry support deliberately deferred/not needed (reason required)
- [ ] N/A — not major user-facing feature work

> Help prose stays in the shared `apps/web/src/lib/content/help/` corpus. Do not create AI-only duplicate documentation.

## 🔎 Discovery Intent

<!-- Skip this section entirely if the PR does not touch a public, indexable
     discovery page (/for, /answers, /examples, /solutions, /vs, /import,
     generator & tool landing pages, evergreen reference posts). -->

- [ ] Discovery intent checked: if this PR adds or materially repositions a public indexable discovery page, the discovery intent registry has been consulted and updated. Existing intent ownership was checked before creating a new URL.
- [ ] Synonyms/query variants were added as aliases to an existing intent rather than creating a duplicate page, unless a materially different user job justifies the new page.

<!-- `bun scripts/discovery-audit.mjs` reports both. See docs/discovery-intent-registry.md
     and Principle XIII of .specify/memory/constitution.md. -->

## 🧪 Testing

<!-- How did you test these changes? Include screenshots if applicable. -->

## 🏷️ Release Labeling

<!-- Apply one of these labels to the PR: -->

- `minor`: New features / Major enhancements (triggers a formal release)
- `major`: Breaking changes
- (No label): Bug fixes / Chores / Internal updates
