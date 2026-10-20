# Feature Specification: In-App Problem Reports and Feedback

**Feature Branch**: `179-in-app-feedback`
**Created**: 2026-10-19
**Status**: Draft
**Input**: Epic [#4227](https://github.com/eserlan/Codex-Cryptica/issues/4227), first two slices: [#4228](https://github.com/eserlan/Codex-Cryptica/issues/4228) (secure anonymous intake and private triage) and [#4229](https://github.com/eserlan/Codex-Cryptica/issues/4229) (reusable report dialog and Help entry points).

## Overview

Today a Codex Cryptica user who hits a problem must leave the app and use GitHub or Discord, often creating an account first. Cif answers questions about how the app works, but it is not a way to tell the maintainer that something is broken. This feature gives anyone, signed in or not, a short in-app form to report a problem, suggest an idea or send other feedback. The report reaches a place only the maintainer can read, and the user gets a confirmation with a reference.

The two later slices of the epic, Cif-assisted handoff (#4230) and opt-in screenshots and diagnostics (#4231), are out of scope. This feature must leave room for them.

## Clarifications

### Session 2026-10-19

- Q: Where do reports go? → A: Issues in a private GitHub repository (option A). GitHub therefore holds report text, and the form discloses this (FR-005a).
- Q: When GitHub is unavailable at submission, keep the report for later delivery or fail? → A: Fail with a clear message; the form keeps the text and the user retries. The service keeps no copy of its own.
- Q: Should a given contact email be written into the private GitHub issue? → A: Yes, in the issue body, and the form says so. Deleting the issue deletes the email.
- Q: How many reports may one source send before waiting? → A: 5 per hour and 20 per day.
- Q: What is the longest description a report accepts? → A: 4,000 characters.
- Q: Do public website pages also get the report form? → A: Yes, both the app and the public generator and tool pages.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Report a problem from where it happened (Priority: P1)

A user in a generator, the editor or the virtual tabletop runs into something that does not work. They open Help, choose **Report a problem**, pick "Something isn't working", describe what they were trying to do and what happened, and submit. They see a confirmation with a short reference they can quote later. They never sign in, create an account or talk to Cif.

**Why this priority**: This is the epic's "done when": an anonymous user in a generator or the tabletop can file a bug and know it arrived. Without it, problems go unreported or reach the maintainer only through public channels.

**Independent Test**: From a generator page and from the tabletop, open Help, submit a bug report and confirm that the user sees a reference and that the maintainer can read the report, with its kind, text and approved technical details, in the private triage destination.

**Acceptance Scenarios**:

1. **Given** a user who is not signed in and is on a generator, **When** they open Help, choose Report a problem, select "Something isn't working", type a description and submit, **Then** they see a confirmation that includes a reference, and the maintainer can read the report.
2. **Given** a user on the virtual tabletop on a narrow phone screen, **When** they report a problem the same way, **Then** they can complete it with no more than three actions after opening Help, and every control fits and works without horizontal scrolling.
3. **Given** a user has opened the form, **When** they close it without submitting, **Then** nothing is sent.
4. **Given** a user has chosen "Something isn't working", **When** the form shows the description field, **Then** it prompts for what they were trying to do and what happened, without making either a separate required field.

---

### User Story 2 - Send an idea or other feedback (Priority: P1)

A user who wants a feature, or wants to say something that is not a bug, uses the same form and chooses "I have an idea" or "Something else". The maintainer receives it labelled with that kind, so ideas are not mixed up with breakages.

**Why this priority**: The same form and intake serve all three kinds, so ideas and general feedback cost almost nothing extra. They also stop feature requests arriving as bug reports.

**Independent Test**: Submit one report of each kind and confirm that each arrives in triage labelled with the kind the user chose.

**Acceptance Scenarios**:

1. **Given** the open form, **When** the user chooses "I have an idea" and submits, **Then** the report arrives in triage labelled as an idea.
2. **Given** the open form, **When** the user chooses "Something else" and submits, **Then** the report arrives labelled as other feedback.

---

### User Story 3 - Know exactly what is sent (Priority: P1)

Before submitting, the user can see the complete list of technical details that will go with their report, such as the app version and which part of the app they were in. They can add an email address for a reply, which is clearly marked as optional. Nothing from their campaign is ever sent: no lore, entities, notes, chat, AI responses, images or file names.

**Why this priority**: Codex Cryptica is local-first and promises that a user's campaign stays on their device. A report form that quietly attached campaign content or identifying details would break that promise. The disclosure is part of the minimum viable feature, not a refinement.

**Independent Test**: Open the form inside a campaign full of content and compare the list of details shown with what the maintainer receives. They must match, and nothing outside the approved list may appear.

**Acceptance Scenarios**:

1. **Given** the open form, **When** the user looks at what will be sent, **Then** they see every technical detail by name and value, and nothing else is sent.
2. **Given** the user leaves the email field empty, **When** they submit, **Then** the report is accepted with no contact details.
3. **Given** the user is on a page whose address holds a vault or entity identifier, a search query or a fragment, **When** they submit, **Then** the report records only a generic identifier for the area of the app, never the full address.
4. **Given** the user pastes text containing what looks like a key, token or password into the description, **When** the report is stored, **Then** the maintainer sees that text replaced by a marker rather than the secret.

---

### User Story 4 - Keep my words when sending fails (Priority: P1)

A user writes a careful report, but they are offline, they have sent several reports in a short time, or the service is down. The form tells them plainly that the report was not sent and what they can do, and keeps everything they typed so they can try again. It never shows a confirmation for a report that did not arrive.

**Why this priority**: A report form that loses a carefully written description or falsely claims success is worse than no form at all, because the user believes the maintainer knows.

**Independent Test**: Submit while offline, while over the sending limit and while the service returns an error. Confirm that each shows its own message, keeps the text, and allows a retry that succeeds once the cause is gone.

**Acceptance Scenarios**:

1. **Given** the device is offline, **When** the user submits, **Then** the form says the report could not be sent because the device is offline, keeps the text and offers to try again.
2. **Given** the user has reached the sending limit, **When** they submit, **Then** the form explains that they have sent several reports recently and can try again later, and keeps the text.
3. **Given** the triage destination is unavailable or not configured, **When** the user submits, **Then** they see a clear failure message, never a confirmation, and the text is kept.
4. **Given** the user presses Submit twice quickly or retries after a timeout, **When** the report is processed, **Then** the maintainer receives one report, not two.
5. **Given** the form cannot reach the service at all, **When** the user gives up retrying, **Then** the form offers an alternative way to reach the maintainer, such as the public community channel, without discarding their text.

---

### User Story 5 - Read and act on reports privately (Priority: P1)

The maintainer reads incoming reports in a destination only they (and anyone they explicitly grant access) can see. Each report shows its kind, reference, received time, description, the approved technical details and any voluntary contact address. When a report reveals a real defect, the maintainer writes a separate, cleaned-up public issue by hand. Reports themselves are never published automatically.

**Why this priority**: Without a private, readable destination, the intake either loses reports or exposes users' words publicly. Both break the epic's guardrails.

**Independent Test**: Submit a report and confirm that it appears in the private destination with only the approved fields and is not visible to anyone without access. Then follow the documented procedure to raise a public issue and delete the report.

**Acceptance Scenarios**:

1. **Given** a submitted report, **When** the maintainer opens the triage destination, **Then** they see the report with only the approved fields, shown as plain text so that no markup, links or images inside it are rendered or fetched.
2. **Given** a report that warrants an engineering issue, **When** the maintainer follows the documented procedure, **Then** a public issue is created by hand from a sanitised summary, and the raw report stays private.
3. **Given** a user asks for their report to be deleted and quotes its reference, **When** the maintainer follows the deletion procedure, **Then** the report and any contact address are removed.

---

### User Story 6 - Reach the form from any Help entry point (Priority: P2)

Wherever a user already finds help (the Help panel, the tabletop's help access, generator pages, on desktop and mobile), the report action is there in the same place and opens the same form. Later features, such as Cif offering to hand off an unresolved question, open this same form rather than a second one.

**Why this priority**: The core value comes from Stories 1–5 through at least the generator and tabletop entry points. Covering every remaining Help surface, and making the form reusable by later features, broadens reach rather than enabling the feature.

**Independent Test**: List every existing Help entry point, open the report action from each and confirm that it opens the same form. Then open the form from a test caller with a supplied area identifier and confirm that the identifier appears in the disclosure.

**Acceptance Scenarios**:

1. **Given** any existing Help entry point on desktop or mobile, **When** the user opens it, **Then** a "Report a problem / Send feedback" action is visible without scrolling past unrelated content.
2. **Given** a later feature opens the form with a suggested kind or description, **When** it opens, **Then** the user can review and edit everything, and nothing is sent until they press Submit.

---

### Edge Cases

- The description is empty, only whitespace or longer than the limit: the form explains the limit and does not submit. The intake rejects such requests if they arrive anyway.
- The email address is malformed: the form flags it before sending. The intake rejects it rather than storing a malformed contact.
- A request carries fields outside the contract, a huge body, or metadata that is not on the allowlist or does not match its expected form: it is rejected or the extra data is dropped. Nothing outside the approved fields is stored.
- The description contains markup, a script, an image link or a very long unbroken string: it is stored and shown to the maintainer as inert text and never rendered or fetched.
- A request comes from somewhere other than Codex Cryptica's own sites: it is refused.
- Automated or abusive volume from one source: it is limited without blocking ordinary users and without making a puzzle or challenge mandatory for them.
- The user changes page or closes the form while a report is sending: the report either arrives once or fails, and the user is never told it was sent when it was not.
- The Help surface is unavailable in a mode such as a guest or player view: the report action remains reachable wherever Help is offered, and still sends no campaign content.
- AI features are switched off on the device: reporting still works, because it needs no AI.

## Requirements _(mandatory)_

### Functional Requirements

**Reporting form**

- **FR-001**: Users MUST be able to open a "Report a problem / Send feedback" form from the existing Help entry points without signing in, having an account or using Cif. This applies inside the app (workspace, editor, in-app generators and the virtual tabletop) and on the public generator and tool pages, on desktop and mobile. The entry is labelled "Report a problem" and opens a dialog titled "Report a problem or send feedback".
- **FR-002**: The form MUST offer exactly three kinds: "Something isn't working", "I have an idea" and "Something else".
- **FR-003**: The form MUST contain a free-text description. For "Something isn't working" it MUST prompt for what the user was trying to do and what happened, without requiring separate fields.
- **FR-004**: The form MUST offer an optional email field, labelled as optional and used only to reply about this report. It MUST say that a given address is stored in the private report with the description.
- **FR-005**: Before submission the form MUST list every technical detail that will be sent, by name and value, and MUST NOT send anything that is not listed.
- **FR-005a**: The form MUST say in plain language who receives the report: it is stored as a private issue on GitHub, readable only by the maintainer and people they grant access, and deleted after the retention period or on request.
- **FR-006**: Nothing MUST be sent until the user presses Submit. Opening, editing or closing the form MUST NOT send anything.
- **FR-007**: While sending, the form MUST show progress and MUST prevent a second submission of the same report.
- **FR-008**: On success the form MUST show a confirmation containing the reference returned by the service, never a locally invented one.
- **FR-009**: On failure the form MUST keep everything the user typed, give a message specific to the cause (offline, sending limit reached, service unavailable, or the form needs a correction), offer a retry, and offer an alternative contact route. It MUST NOT show a success message.
- **FR-010**: The form MUST be usable with a keyboard alone, move focus into the dialog on open and back to the opener on close, give every control an accessible name, announce errors to assistive technology, fit narrow phone screens without horizontal scrolling, and follow the app's existing themes in light and dark.
- **FR-011**: The form MUST be one reusable component that other features can open with a suggested kind, description and area identifier, all of which the user can review and edit before sending.

**Intake**

- **FR-012**: The service MUST accept reports without sign-in and MUST validate them against a small, versioned contract containing: kind, description, optional contact email, and these technical details only: app version, area identifier, browser family and screen class (narrow or wide).
- **FR-013**: The area identifier MUST be one value from a fixed list of app areas. A path, route, query string or fragment MUST NOT be accepted or stored.
- **FR-014**: The service MUST bound request size and the length of every field. The description MUST be 1 to 4,000 characters (Unicode code points) after trimming, and the form MUST show how much room is left. The service MUST reject unknown kinds, malformed emails and metadata that is not on the allowlist or does not match its expected form, and MUST store no fields beyond the contract.
- **FR-015**: The service MUST replace recognisable secrets in the description (for example API keys, access tokens and passwords written as `password: ...`) with a marker before storing it, and MUST store the description so that it can only ever be shown as inert text.
- **FR-016**: The service MUST accept reports only from Codex Cryptica's own sites. It MUST accept at most 5 reports per hour and 20 per day from one source, and refuse more with a "try again later" response that the form shows as the sending-limit message (FR-009). Ordinary users MUST NOT face a mandatory challenge, though an invisible or managed check MAY apply.
- **FR-017**: Repeated submissions of the same report, such as a double click or a retry after a timeout, MUST result in one stored report, and the service MUST return the same reference for them.
- **FR-018**: The service MUST return a short, non-sensitive reference on success. It MUST NOT expose storage locations, internal issue numbers, infrastructure details or secrets in any response.
- **FR-019**: If the triage destination is not configured or does not accept the report, the service MUST return a controlled failure and MUST NOT report success. The service MUST NOT keep its own copy of the report to deliver later. The user's text survives in the form (FR-009), and the user retries.
- **FR-020**: Credentials and secrets used to reach the triage destination MUST stay on the server and MUST NEVER be sent to the browser.

**Triage**

- **FR-021**: Accepted reports MUST be delivered as issues in a private GitHub repository that only the maintainer and explicitly granted collaborators can read. Each issue is labelled with the report's kind, and the maintainer is notified through that repository's normal notifications.
- **FR-022**: Reports MUST NOT be published or turned into public issues automatically. Making a public issue MUST be a separate, manual step from a sanitised summary.
- **FR-023**: Each delivered report MUST show the kind, reference, time received, description, approved technical details and, if given, the contact email, and nothing else.
- **FR-024**: Reports and contact details MUST be deleted from the private repository no later than 181 days after they were received: they become due at 180 days and a daily purge removes them. They MUST also be deleted earlier on request when the user quotes their reference. Deletion means removing the issue, not only closing it.
- **FR-025**: The service MUST record a privacy-safe count for every request, giving its outcome (accepted, duplicate, rejected, limited, unavailable or misconfigured) and, when valid, its kind. These counts MUST contain no report text, contact details, references or source addresses.
- **FR-026**: Documentation MUST describe deployment configuration, who can access reports, retention and deletion, how to respond to spam, and the procedure for turning a report into a public issue.

**Product boundaries**

- **FR-027**: Reporting MUST work with AI features switched off and MUST NOT call any AI service.
- **FR-028**: The feature MUST NOT collect anything automatically. No campaign content, chat, AI output, screenshot, file name, credential or identifying address is attached, and no report or metadata is sent unless the user submits (see FR-006).

### Key Entities

- **Feedback Report**: one user submission. It has a kind (problem, idea or other), a description, an optional contact email, the approved technical details, a reference and a received time. It is private to the maintainer and deleted after the retention period or on request.
- **Report Reference**: a short, non-sensitive identifier returned to the user and shown to the maintainer, used to find or delete a report. It reveals nothing about where or how the report is stored.
- **Technical Details**: the fixed allowlist sent with a report: app version, area identifier, browser family and screen class. Every one is shown to the user before sending.
- **Area Identifier**: one value from a fixed list of app areas (for example "generators", "entity-detail", "tabletop", "help" or "public-generators"). It tells the maintainer where the problem happened without revealing what the user was working on.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user who is not signed in can file a report from a generator and from the tabletop in no more than three actions after opening Help, and in under two minutes including typing a short description.
- **SC-002**: 100% of accepted reports reach the private triage destination and are readable there, and none is publicly visible.
- **SC-003**: In privacy tests, 0 reports contain campaign content, chat or AI output, full page addresses, credentials or any field outside the approved list. Every secret pattern in the test set is replaced by a marker.
- **SC-004**: In failure tests (offline, limit reached, service down, destination missing), the user is shown success 0 times, and the typed text survives 100% of the time.
- **SC-005**: Double submissions and retries of one report produce exactly one stored report in 100% of tests.
- **SC-006**: The form passes keyboard-only and screen-reader checks and lays out without horizontal scrolling at a 320-pixel-wide screen, in both light and dark themes.
- **SC-007**: Within three months of release, most problem reports reach the maintainer through the form rather than only through public channels. This is measured by comparing report counts by source.

## Assumptions

- Contact email is the only personal detail and is voluntary. It is used only to reply about that report and is deleted with it.
- A report is plain text. Screenshots and richer diagnostics are excluded until #4231, which will add them only with explicit consent.
- The 180-day retention period is a default chosen to cover a triage and fix cycle. The maintainer can delete reports sooner.
- Reports go to a private GitHub repository owned by the maintainer. The service holds the only credential for it, scoped to creating issues in that repository.
- The intake belongs in the existing server-side service that already receives other private reports. It reuses that service's secret handling, per-source limits and bot checks rather than adding new infrastructure.
- Article usefulness feedback (#3038) remains a separate signal and is not merged with these reports.
- This is a user-initiated report, not tracking. Nothing is recorded inside a campaign unless the user submits, and the only data sent is what the form discloses.

## Dependencies

- The intake (Stories 4–5, FR-012–FR-026) must exist before the form can deliver reports. The form can be built against the published contract with a test double.
- Cif-assisted handoff (#4230) and opt-in screenshots and diagnostics (#4231) build on FR-011 and the versioned contract (FR-012) and are delivered separately.
