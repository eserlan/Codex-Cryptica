# Feature Specification: Copyright and Fan-Content Notice for Public Worlds

**Feature Branch**: `1660-worlds-copyright-notice`
**Created**: 2026-07-10
**Status**: Draft
**Input**: User description: "Copyright and fan-content notice for public worlds (GitHub issue #1660): Add a concise copyright/fan-content notice to the public /worlds experience, per-vault fan-content disclaimers, a publishing acknowledgement, a copyright-report path, and the ability to delist reported vaults during review."

## Assumptions

- This feature builds on the public world directory ([`specs/139-public-world-directory/spec.md`](../139-public-world-directory/spec.md)) and published guest snapshots ([`specs/135-guest-vault-r2/spec.md`](../135-guest-vault-r2/spec.md)). "Public worlds" below means worlds listed in the public directory and/or reachable through a published guest view.
- The initial copyright-report path is a structured report form (or an equivalent pre-addressed email flow) that captures the required fields; a full DMCA-style legal workflow is out of scope for this feature.
- The fan-content flag and any selected disclaimer are part of the owner-approved listing/publishing metadata, consistent with the saved-record model established in spec 139 (metadata changes take effect when the owner saves them, not by silent mirroring).
- Worlds already listed before this feature ships remain listed; their owners are asked to complete the publishing acknowledgement the next time they open or update their listing settings. Retroactive forced acknowledgement or automatic delisting of existing worlds is out of scope.
- Delisting/disabling a reported vault is an operator (Codex Cryptica admin) capability; a self-service moderation dashboard is out of scope for the initial version as long as an operator can perform the action.
- A Terms of Use / publishing guidelines page does not exist yet; notices link to it only once it is available, and the notice copy must stand on its own until then.
- Actual review, adjudication, and communication with rights holders is a manual operational process; this feature only provides the intake and the delist/restore mechanism.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visitor Sees Provenance Notice on the Public Listing (Priority: P1)

As a visitor browsing the public worlds directory, I see a compact notice explaining that worlds are user-created, may contain unofficial fan content, are not endorsed by referenced rights holders, that authors are responsible for their publishing rights, and that copyright concerns can be reported.

**Why this priority**: This is the core legal/expectation-setting requirement of the feature. It applies to every visitor of the public directory and requires no author action, so it delivers value the moment it ships.

**Independent Test**: Open the public worlds listing as a signed-out visitor and verify the notice is present, readable, unobtrusive, and includes a working path to report a copyright concern.

**Acceptance Scenarios**:

1. **Given** a visitor opens the public worlds listing, **When** the page renders, **Then** a notice is visible (near the bottom or in the footer/help area) stating that worlds are user-created, may contain unofficial fan content, and are not affiliated with or endorsed by referenced rights holders.
2. **Given** the notice is displayed, **When** the visitor reads it, **Then** it states that authors are responsible for ensuring they have the right to publish their content and that copyright concerns may be reported for review.
3. **Given** the notice is displayed, **When** the visitor views the gallery, **Then** the notice does not dominate the gallery, does not look like a warning banner, and does not obstruct browsing.
4. **Given** the notice wording, **When** reviewed, **Then** it never states or implies that the notice itself grants permission to use copyrighted material.

---

### User Story 2 - Author Acknowledges Publishing Rights (Priority: P1)

As a world owner enabling public listing, I must confirm that I have the right to publish my material and that it does not include copied sourcebook text, scans, official artwork, maps, logos, or other protected material I am not authorised to use. I can also optionally mark the vault as referencing third-party intellectual property / unofficial fan content.

**Why this priority**: Author responsibility is the legal backbone of the notice: the public disclaimers only set expectations, while the acknowledgement puts the publishing responsibility explicitly on the author at the moment of consent.

**Independent Test**: Attempt to enable public listing for a world; verify listing cannot be completed without the acknowledgement, and that the fan-content toggle is offered and persisted.

**Acceptance Scenarios**:

1. **Given** a world owner is enabling public listing, **When** they reach the confirmation step, **Then** they must actively acknowledge (e.g., tick a checkbox) that they have the right to publish the material and that it contains no protected material they are not authorised to use.
2. **Given** the acknowledgement has not been given, **When** the owner tries to complete listing, **Then** the system blocks listing and indicates the acknowledgement is required.
3. **Given** the listing flow, **When** the owner reviews the options, **Then** an optional toggle "This vault references third-party intellectual property / is unofficial fan content" is available and off by default.
4. **Given** the owner completes listing with the acknowledgement, **When** the listing is saved, **Then** the acknowledgement (and the fan-content toggle state) is recorded with the listing so it can be shown to have been given.
5. **Given** a world was listed before this feature existed, **When** its owner next opens or updates the listing settings, **Then** the owner is asked to complete the acknowledgement before saving further changes.

---

### User Story 3 - Fan-Content Disclaimer on Public Vault Pages (Priority: P2)

As a visitor viewing a public vault whose author marked it as referencing third-party IP, I see a specific disclaimer that this is unofficial fan content and is not affiliated with, endorsed, sponsored, or approved by the owners of the referenced setting or franchise. Where a rights holder requires specific wording under its fan-content policy, the author can add or select that wording for the vault.

**Why this priority**: The per-vault disclaimer is what rights-holder fan-content policies typically require (e.g., Wizards of the Coast's Fan Content Policy). It depends on the toggle from Story 2, so it lands second.

**Independent Test**: Mark a listed vault as fan content, open its public guest view, and verify the default disclaimer appears; select a custom/rights-holder-specific wording and verify it replaces or supplements the default.

**Acceptance Scenarios**:

1. **Given** a public vault whose author enabled the fan-content toggle, **When** a visitor opens the public vault page, **Then** a disclaimer is shown stating the vault is unofficial fan content not affiliated with, endorsed, sponsored, or approved by the owners of the referenced setting or franchise.
2. **Given** a public vault whose author did not enable the toggle, **When** a visitor opens the public vault page, **Then** no fan-content disclaimer is shown for that vault (the global listing notice still exists on the directory).
3. **Given** a rights holder requires specific disclaimer wording, **When** the author edits the vault's listing settings, **Then** the author can provide or select that specific wording for this vault, and it is displayed on the public vault page.
4. **Given** any disclaimer configuration, **When** the disclaimer is displayed, **Then** the system never states that the vault is "permitted" or "compliant" under a rights holder's fan policy unless the author has deliberately selected that policy's required disclaimer and conditions — and even then the display is limited to the disclaimer wording itself, not a compliance claim by Codex Cryptica.

---

### User Story 4 - Report a Copyright Concern (Priority: P2)

As a visitor or rights holder who believes a public vault infringes copyright, I can find a visible "Report copyright concern" action from the public vault page and/or the listing page, and submit a report that captures the affected vault, the copyrighted work or rights holder, the material believed to infringe, my contact details, and supporting explanation or evidence.

**Why this priority**: The reporting path is what makes the notices credible and gives Codex Cryptica a practical way to respond to legitimate concerns. It can ship independently of the per-vault disclaimers.

**Independent Test**: From a public vault page, follow the report action, submit a report with all required fields, and verify the report reaches the operators with the vault reference intact.

**Acceptance Scenarios**:

1. **Given** a visitor is on a public vault page, **When** they look for a way to raise a copyright concern, **Then** a "Report copyright concern" action is visible and reachable without signing in.
2. **Given** the visitor activates the report action, **When** the report intake opens, **Then** it captures: the affected public vault URL (pre-filled where possible), the copyrighted work or rights holder, the material believed to infringe, reporter contact details, and any supporting explanation or evidence.
3. **Given** a report is submitted, **When** intake completes, **Then** the reporter receives confirmation the report was received and will be reviewed, without any promise of a specific outcome.
4. **Given** an incomplete report (missing required fields such as vault URL or contact details), **When** the reporter tries to submit, **Then** the intake indicates which required information is missing.

---

### User Story 5 - Operator Delists a Reported Vault During Review (Priority: P3)

As a Codex Cryptica operator handling a copyright report, I can delist a reported vault from the public directory and/or disable its public access while the report is reviewed, and restore it afterwards if the report is not upheld.

**Why this priority**: Essential for responding to legitimate reports, but exercised rarely and only by operators; the visitor- and author-facing stories deliver the everyday value.

**Independent Test**: As an operator, delist a listed vault; verify it disappears from the directory (and, if public access is disabled, its guest view is no longer reachable), and verify it can be restored.

**Acceptance Scenarios**:

1. **Given** a vault is publicly listed, **When** an operator delists it during review, **Then** it no longer appears in the public directory.
2. **Given** a vault's public access is disabled during review, **When** a visitor opens its public URL, **Then** the content is not served and a neutral unavailability message is shown (no accusation of infringement).
3. **Given** a review concludes without upholding the report, **When** the operator restores the vault, **Then** its prior listing and public access return without the owner having to republish from scratch.
4. **Given** a vault is delisted or disabled during review, **When** the owner views their listing settings, **Then** they can see that public availability is suspended pending review.

---

### Edge Cases

- Author enables the fan-content toggle but provides empty or whitespace-only custom disclaimer wording → the default generic fan-content disclaimer is used.
- Author disables the fan-content toggle after previously providing rights-holder-specific wording → the disclaimer disappears from the public page, but the previously entered wording is retained in settings so re-enabling doesn't lose it.
- A report is submitted for a vault that is unlisted or deleted between page load and submission → the report is still accepted (the URL is evidence) and operators see the vault's current state.
- Duplicate or abusive reports against the same vault → reports are collected for operator review; delisting is an operator decision, never automatic on report volume.
- Custom disclaimer wording containing markup, links, or excessive length → displayed as plain text and bounded to a reasonable length so it cannot be used to deface the public page.
- The public vault page is reached directly by URL (unlisted but shared guest view) → the per-vault fan-content disclaimer and the report action still appear, since the notice concerns public availability, not just directory listing.
- Terms of Use / publishing guidelines page does not exist yet → notices render without a broken link; the link appears once the destination is available.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The public worlds listing MUST display a compact notice stating that public worlds are created and published by their authors, may contain unofficial fan content referencing third-party settings or trademarks, and that Codex Cryptica is not affiliated with or endorsed by those rights holders.
- **FR-002**: The listing notice MUST state that authors are responsible for ensuring they have the right to publish their content, and that copyright concerns may be reported for review.
- **FR-003**: The listing notice MUST be visible without interaction but visually unobtrusive — it must not dominate the gallery or present as a warning banner.
- **FR-004**: No notice, disclaimer, or acknowledgement text anywhere in the feature may state or imply that a generic disclaimer grants permission to use copyrighted material, or that Codex Cryptica certifies a vault as permitted under any rights holder's fan-content policy.
- **FR-005**: Enabling public listing MUST require an explicit, unchecked-by-default acknowledgement from the author confirming they have the right to publish the material and that it does not include copied sourcebook text, scans, official artwork, maps, logos, or other protected material they are not authorised to use.
- **FR-006**: The system MUST block completion of public listing until the acknowledgement is given, and MUST record that (and when) the acknowledgement was given with the listing.
- **FR-007**: The listing flow MUST offer an optional, off-by-default toggle marking the vault as referencing third-party intellectual property / unofficial fan content, persisted with the listing metadata.
- **FR-008**: Owners of worlds listed before this feature MUST be prompted to complete the acknowledgement the next time they open or save their listing settings; their existing listings are not removed automatically.
- **FR-009**: Public vault pages for vaults with the fan-content flag enabled MUST display a disclaimer stating the vault is unofficial fan content and is not affiliated with, endorsed, sponsored, or approved by the owners of the referenced setting or franchise.
- **FR-010**: Authors MUST be able to provide or select rights-holder-specific disclaimer wording per vault; when provided, that wording is displayed on that vault's public page. Rights-holder-specific wording is never applied globally across vaults.
- **FR-011**: Custom disclaimer wording MUST be rendered as plain text with a bounded length; it may not contain active content (links, markup) on the public page.
- **FR-012**: Public vault pages (and/or the public listing page) MUST offer a visible "Report copyright concern" action accessible without an account.
- **FR-013**: The report intake MUST capture: the affected public vault URL, the copyrighted work or rights holder, the material believed to infringe, reporter contact details, and optional supporting explanation or evidence. Vault URL and reporter contact are required fields.
- **FR-014**: Submitted reports MUST reach Codex Cryptica operators with the vault reference intact, and the reporter MUST receive confirmation of receipt without any commitment to a specific outcome.
- **FR-015**: Operators MUST be able to delist a reported vault from the public directory and/or disable its public access while a report is reviewed, and to restore listing and access afterwards without requiring the owner to republish.
- **FR-016**: When a vault's public access is disabled during review, visitors opening its public URL MUST see a neutral unavailability message that does not accuse the author of infringement; the owner MUST be able to see in their listing settings that public availability is suspended.
- **FR-017**: Notices and disclaimers MUST link to the Terms of Use / publishing guidelines once such a page exists; until then they MUST render without broken links.

### Key Entities

- **Listing acknowledgement**: A record attached to a world's public listing capturing that the author confirmed publishing rights, and when. Required for new/updated listings.
- **Fan-content flag**: An author-controlled boolean on the listing/publishing metadata marking the vault as referencing third-party IP / unofficial fan content. Drives the per-vault disclaimer.
- **Per-vault disclaimer wording**: Optional author-provided or author-selected text shown on the public vault page in place of (or alongside) the default fan-content disclaimer; plain text, bounded length, scoped to one vault.
- **Copyright report**: A submission containing vault URL, rights holder / copyrighted work, allegedly infringing material, reporter contact, and supporting evidence; delivered to operators for review.
- **Public availability state**: Whether a vault is listed in the directory and whether its public guest view is served; operators can suspend either during review and restore them afterwards.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of public worlds listing page views include the provenance/fan-content notice, and the notice occupies a small fraction of the viewport (unobtrusive footer-level placement) on both desktop and mobile.
- **SC-002**: 0 new public listings can be created without the publishing-rights acknowledgement.
- **SC-003**: 100% of public vault pages with the fan-content flag enabled display the applicable disclaimer; vaults without the flag show none.
- **SC-004**: A visitor can go from a public vault page to a submitted copyright report in under 2 minutes without creating an account.
- **SC-005**: An operator can delist or disable public access to a reported vault in under 5 minutes from receiving the report, and restore it just as quickly.
- **SC-006**: No text produced by this feature claims or implies rights-holder permission, endorsement, or Codex Cryptica certification of fan-policy compliance (verified by copy review).
