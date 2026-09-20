# Feature Specification: Idea Developer (POC)

**Feature Branch**: `163-idea-developer`
**Created**: 2026-09-20
**Status**: Draft
**Input**: User description: "Idea Developer POC (GitHub issue #3228): a public tool where a user pastes a freeform RPG idea and gets a structured development of it rather than a replacement. Core principle: develop the user's idea, don't replace it."

## Clarifications

### Session 2026-09-20

- Q: Idea and result retention → A: No server-side retention of idea or result text at all, including logs; only content-free funnel events are kept.
- Q: Abuse and cost limits → A: Use the project's existing bot-verification check (Turnstile) on each request, plus a per-browser usage limit; no account required.
- Q: How the idea reaches a generator → A: Browser-only hand-off; nothing in the link or sent to a server. (Refined during planning: the Session Hub draft is the hand-off, because generators already read reusable hub drafts as context; there is no separate copy to clear.)
- Q: How generator suggestions are chosen → A: The model picks only from a fixed list of generators that exist; the tool shows only links from that list.
- Q: What the user can do with the result → A: Keep the idea and latest result in the browser for the current tab only (restored on reload or back-navigation, cleared on tab close or by the user), and add the development to the existing public-generator Session Hub.
- Q: Single-shot or multi-turn? → A: Multi-turn (direction from the project owner). The tool continues the same conversation using the AI provider's stored conversation state (Luna via the existing conversation path), so earlier turns are not resent each time. Codex Cryptica itself retains nothing; the provider holds the conversation state, which is disclosed to the user.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Develop my idea without replacing it (Priority: P1)

A game master has a half-formed idea ("A town where everything is made from dragon parts, but there are no dragons nearby"). They paste it into the tool and get back a structured development that keeps their idea recognisable and shows them where it could go, without handing them a finished campaign.

**Why this priority**: This is the whole product. Without a result that preserves the user's idea and adds useful structure, nothing else in the funnel matters.

**Independent Test**: Paste the dragon-parts idea, run the tool, and confirm the result quotes or clearly references the original premise, contains every required section, and does not introduce a different premise.

**Acceptance Scenarios**:

1. **Given** the tool is open with no input, **When** the user pastes a freeform idea and chooses to develop it, **Then** they receive a result with these sections in order: what's already interesting, central question, make it move, people who care, things the players could do, consequences if nobody intervenes, questions for the creator, and develop further.
2. **Given** a submitted idea, **When** the result appears, **Then** the original idea is shown or quoted alongside the result and each section visibly refers back to its elements.
3. **Given** a submitted idea, **When** the result appears, **Then** "people who care" lists between 2 and 4 factions or roles whose interests conflict, and "questions for the creator" lists between 2 and 4 questions.
4. **Given** any result, **When** the user reads it, **Then** it contains no numeric score, grade or rating of the idea.
5. **Given** an idea, **When** the result appears, **Then** the "things the players could do" offers several distinct directions and none of them is presented as the single correct plot.

---

### User Story 2 - Choose how the idea is examined (Priority: P2)

The user can pick between two modes: **Assess**, which identifies strengths, gaps, unanswered questions and playability, and **Develop**, which adds pressure, conflict, factions, hooks and consequences. Both keep the same core principle of preserving the idea.

**Why this priority**: The two modes let the user choose between "tell me what I have" and "help me build on it". The tool should be built so further modes (explore alternatives, make playable, challenge it) can be added later without redoing the experience.

**Independent Test**: Run the same idea in each mode and confirm the results differ in emphasis while both preserve the original idea and contain no score.

**Acceptance Scenarios**:

1. **Given** an idea is entered, **When** the user selects Assess, **Then** the result emphasises strengths, gaps, unanswered questions and playability, and does not invent new factions or plot.
2. **Given** an idea is entered, **When** the user selects Develop, **Then** the result emphasises added pressure, opposing interests, hooks and consequences.
3. **Given** the tool is opened, **When** the user views the mode choices, **Then** only the modes that are available are offered; unreleased modes are not shown as broken or empty options.

---

### User Story 3 - Take the idea into the right generators (Priority: P2)

After reading the development, the user wants to keep going. The "develop further" section links to the Codex Cryptica generators that fit their idea (for example faction, rumours, settlement, NPC, secret society or quest), and opening one carries their idea across so they do not have to retype it.

**Why this priority**: This is the bridge from a one-off answer to continued use of the product, which is the purpose of the acquisition funnel.

**Independent Test**: Develop an idea that clearly involves a settlement and a faction, then confirm the suggested links include those generators and that opening one opens with the idea available.

**Acceptance Scenarios**:

1. **Given** a completed result, **When** the user views "develop further", **Then** they see between 2 and 5 generator links chosen for relevance to the idea, each with a short reason it fits.
2. **Given** a suggested generator link, **When** the user opens it, **Then** the generator page opens with the user's idea available as starting material.
3. **Given** the idea suits none of the generators strongly, **When** the result appears, **Then** a sensible default set of general-purpose generators is offered instead of an empty section.
4. **Given** a completed development, **When** the user chooses "Save to your Codex", **Then** the existing public-generator save flow opens with the conversation's draft, and nothing new is stored by the tool.

---

### User Story 4 - Arrive from an answer page (Priority: P3)

A reader on the "Is my RPG campaign idea good?" answer (#3225), or a related answer about turning an idea into an adventure or expanding a simple idea, sees a "Develop your idea" call to action and lands in the tool ready to paste.

**Why this priority**: The tool needs an audience, but the tool is useful and testable without the funnel wiring in place.

**Independent Test**: From an answer page in the cluster, follow the call to action and confirm the tool opens and that the arrival is recorded as coming from that page.

**Acceptance Scenarios**:

1. **Given** a reader is on one of the three cluster answers, **When** they reach the end of the page, **Then** they find a closing section with guidance on how to develop their idea with the tool for that answer's question, and a "Develop your idea" call to action.
2. **Given** a reader chooses "Develop your idea", **When** the tool opens, **Then** the input is focused and ready, and the suggested mode for that answer is preselected (Assess for "Is my idea good?", Develop for the other two).
3. **Given** a reader arrives from an answer page, **When** the tool opens, **Then** the arrival source is recorded for funnel measurement.

---

### User Story 5 - Understand the funnel (Priority: P3)

The team can see how many people go from an answer page to the tool, from starting an idea to receiving a result, and from a result into a generator or a sign-up. This is measured only on public pages and the public tool.

**Why this priority**: The POC exists partly to learn whether the funnel works, but it does not affect the user-facing experience.

**Independent Test**: Walk through arrival, submission, result and a generator click, and confirm each step is recorded exactly once and that nothing is recorded from inside the signed-in vault application.

**Acceptance Scenarios**:

1. **Given** a visitor moves through the funnel, **When** each step happens, **Then** page-to-tool arrival, idea submission, result shown, and generator link opened are each recorded as separate steps.
2. **Given** analytics are recorded, **When** the records are inspected, **Then** they contain no text of the user's idea or of the result.
3. **Given** a user is inside the authenticated vault application, **When** they use any part of it, **Then** no funnel or usage tracking is recorded.

---

### User Story 6 - Plan for a vault-aware version (Priority: P3)

A design document describes how a later, signed-in version would develop an idea in the context of the user's own world, so the public version is built in a way that does not block it.

**Why this priority**: The public POC ships first, but the design must be agreed before it so the public version's structure is compatible with it.

**Independent Test**: A reviewer reads the design document and can answer, without asking the author, what context would be sent, how it is chosen, how the user can inspect it, and what is never sent.

**Acceptance Scenarios**:

1. **Given** the design document, **When** a reviewer reads it, **Then** it describes the flow from idea, to implicated concepts, to a compact relevant context package, to a grounded result with contradictions surfaced.
2. **Given** the design document, **When** a reviewer reads it, **Then** it states that the whole vault is never sent and that the selected context can be inspected before and after use.
3. **Given** the design document, **When** a reviewer reads it, **Then** it records the Jev (TypeSafe) evaluation as a separate follow-up with the comparison it would run and the measures it would use.

---

### User Story 7 - Keep developing across turns (Priority: P2)

After the first development, the user carries on with the same idea. They can answer the creator questions, ask for a change to one part ("make the people who care less obviously villainous"), or switch mode (Assess first, then Develop). Each turn builds on the conversation so far without the user pasting everything again, and each turn returns the full, updated development in the same structure.

**Why this priority**: The result ends in questions for the creator, so the natural next step is to answer them. A tool that only answers once makes the user copy everything back in by hand.

**Independent Test**: Develop an idea, answer two of the creator questions in a follow-up, and confirm the updated development reflects those answers, keeps the original idea recognisable, and did not require re-entering the idea.

**Acceptance Scenarios**:

1. **Given** a completed development, **When** the user answers one or more creator questions and continues, **Then** the next development incorporates those answers and the earlier material that was not affected.
2. **Given** a completed development, **When** the user asks for a change to one part, **Then** the updated development changes that part and leaves the rest recognisable.
3. **Given** a completed development in one mode, **When** the user continues in the other mode, **Then** the next development follows that mode's emphasis using the same idea and conversation.
4. **Given** a follow-up turn, **When** the result appears, **Then** it shows the same sections as the first turn, a one-line note of what changed, no numeric score, and the original idea is still shown beside it.
5. **Given** the conversation has reached the turn limit, **When** the user tries to continue, **Then** the tool says so in plain language and offers to start a new conversation or copy the current result.
6. **Given** a completed conversation, **When** the user starts a new conversation, **Then** earlier turns no longer influence the new result.
7. **Given** a conversation past its first turn, **When** the user looks at the original idea, **Then** it is shown read-only, and changing it means asking for a change as a new turn.

---

### Edge Cases

- The input is empty or only whitespace: the tool explains that an idea is needed and does not produce a result.
- The input is a single word or very short phrase: the tool still responds, treats thin input honestly by stating what is missing, and leans on questions for the creator rather than inventing detail (this is instructed in the prompt and covered by a fixture).
- The input is very long (multiple pages of notes): the tool accepts up to a stated limit and tells the user clearly if it was too long, rather than silently cutting it.
- The input is not an RPG idea (unrelated text, or an instruction aimed at the tool): the tool stays on its purpose and either asks for an RPG idea or treats the text only as material to develop.
- The input contains a finished campaign: the tool develops and questions it rather than rewriting it.
- The input is in a language other than English: the result is given in the language of the input where it can be.
- The user submits the same idea repeatedly, or many ideas in a short time: the per-browser limit applies and the tool tells the user when to try again.
- Bot verification fails or cannot load (blocker, network issue): the tool explains this in plain language, keeps the typed idea, and offers a retry.
- The provider no longer holds the conversation (it expired or was dropped): the tool rebuilds the conversation from the turns kept in the tab and continues, without asking the user to do anything; if that is not possible it says so and offers a new conversation with the current idea.
- The user reloads mid-conversation: the idea, turns and latest development are restored for the tab and the conversation continues.
- The user wants to change the idea itself after the first turn: the original idea is shown read-only beside every result, and any change goes through "Ask for a change" as a new turn, so the original is never silently replaced.
- The result cannot be produced (service unavailable, timeout): the user keeps their typed idea and is told plainly what happened and how to retry.
- The user reloads, navigates back, or closes the tab: a reload or back-navigation restores the idea and latest result; closing the tab clears them. Nothing is retained after that, and the user can clear them sooner.
- The user clears the Session Hub: the development is removed from the hub, and the tool's own restored copy is cleared with it or on its own clear action, never left as an orphan the user cannot remove.
- Input contains content that should not be processed (abusive or unsafe material): the tool declines in plain language.

## Requirements _(mandatory)_

### Functional Requirements

**Input and output**

- **FR-001**: Visitors MUST be able to use the tool without an account.
- **FR-002**: Users MUST be able to paste or type a freeform RPG idea and submit it for development.
- **FR-003**: The result MUST contain these sections, in this order: what's already interesting, central question, make it move, people who care, things the players could do, consequences, questions for the creator, develop further.
- **FR-004**: The result MUST preserve the recognisable core of the submitted idea and MUST show the original idea alongside the result.
- **FR-005**: The result MUST NOT replace the idea with a different premise, and MUST NOT present a single finished plot.
- **FR-006**: "People who care" MUST contain 2 to 4 factions or roles with incompatible interests.
- **FR-007**: "Things the players could do" MUST offer multiple distinct, actionable directions from the players' point of view.
- **FR-008**: "Questions for the creator" MUST contain 2 to 4 questions that leave the important creative decisions to the user.
- **FR-009**: The tool MUST NOT show any numeric score, grade or rating of an idea.
- **FR-010**: Users MUST be able to copy the full result.

**Modes**

- **FR-011**: The tool MUST offer Assess and Develop modes at launch, and the user MUST be able to choose between them.
- **FR-012**: The mode model MUST allow later modes (explore alternatives, make playable, challenge it) to be added without changing how ideas are submitted or how results are structured.

**Next steps**

- **FR-013**: The result MUST include 2 to 5 relevant links into existing Codex Cryptica generators, each with a short reason. Suggestions MUST be chosen from a fixed list of generators that exist and are verified to use Session Hub context (factions, rumours, settlements, NPCs, secret societies and quests; a generator is included only if it reads Session Hub context, so the adventure generator is left out until it does), and any suggestion not on that list MUST be dropped rather than shown.
- **FR-014**: Opening a suggested generator MUST make the user's idea available to that generator as starting material through the Session Hub draft (FR-031), which generators already reuse as context. The idea MUST NOT appear in the link and MUST NOT be sent to a server for the hand-off.
- **FR-015**: When no generator is a strong match, the tool MUST offer a default set rather than an empty section.

**Public surface and discovery**

- **FR-016**: The public tool MUST use only the idea the user submits and MUST NOT read any vault or account data.
- **FR-017**: Before any new public page is added, the discovery intent registry MUST be consulted; the tool MUST be registered with a canonical path, primary intent, user job and unique-value rationale, and the discovery audit MUST pass.
- **FR-018**: Each of the three cluster answers ("Is my RPG campaign idea good?", "How do I turn an RPG idea into an adventure?", "How do I expand a simple RPG campaign idea?") MUST end with a closing section that anchors the Idea Developer: a "Develop your idea" call to action to the tool, plus short practical guidance, specific to that answer's question, on how to develop the idea with it (which mode to start with, what to paste, how to read the result, and that the creator questions are theirs to answer). The section MUST NOT repeat the answer's earlier framework, and the link MUST only go live together with the tool.
- **FR-019**: The tool page MUST clearly state what the tool does and does not do, in plain language.

**Analytics and privacy**

- **FR-020**: The system MUST record, on public surfaces only, these funnel steps: arrival at the tool from an answer page, idea submitted, result shown, generator link opened, and any vault sign-up or save started from the result.
- **FR-021**: Recorded funnel data MUST NOT contain the text of the idea or of the result.
- **FR-022**: The system MUST NOT record any tracking or usage data from inside the authenticated vault application.
- **FR-023**: Codex Cryptica MUST NOT retain submitted ideas, turns or results anywhere on its own systems once a request completes, including in operational logs, and MUST NOT use them to train or improve models. To let a conversation continue without resending earlier turns, the AI provider holds the conversation state for the life of the conversation; the tool page MUST say this in plain language, and the user MUST be able to end the conversation and stop using it. The provider's data handling for this use MUST be confirmed to exclude model training before launch. The only other case where text leaves the browser is a snapshot the user explicitly chooses to share from the Session Hub (FR-031).

**Reliability and limits**

- **FR-024**: The tool MUST state and enforce a maximum idea length, and tell the user when it is exceeded.
- **FR-025**: Every turn MUST be made under a valid session obtained through the project's existing bot-verification check (a fresh challenge per turn is not required), and the tool MUST also apply a per-browser usage limit (for example a cooldown and a cap per period) that counts every turn. When a limit is reached, the tool MUST tell the user when they can try again. No account or stored personal identifier is required for either.
- **FR-026**: On failure, the tool MUST keep the user's typed idea and show a plain-language message with a way to retry.
- **FR-027**: The tool MUST keep to its purpose when given unrelated text or instructions aimed at the tool, and MUST decline abusive or unsafe content, or a provider safety refusal, with a plain-language message that keeps the user's typed input.

**Design deliverables**

- **FR-028**: A design document for a vault-aware version MUST be produced. It MUST cover: the flow from idea to implicated concepts to a compact context package to a grounded result; that the whole vault is never sent; how the selected context can be inspected and debugged; and how contradictions and reusable existing material are surfaced.
- **FR-029**: The design document MUST record the Jev (TypeSafe) evaluation as a follow-up, including the test corpus (standalone ideas, ideas that fit lore, ideas that contradict lore, ideas where one obscure entity matters, ideas with too little context), the three approaches to compare (plain generation, retrieval plus prompting, retrieval plus Jev), and the manual measures. The evaluation itself is out of scope for this feature.

**Conversation and continuity**

- **FR-030**: The idea, the turns so far, the latest development and the conversation reference MUST be kept in the browser for the current tab only, so a reload or back-navigation restores them and the conversation can continue; closing the tab MUST clear them, and the user MUST be able to clear them at any time. Nothing here is sent to a server other than as part of a turn request.
- **FR-031**: Each conversation MUST appear in the existing public-generator Session Hub as one draft that is updated in place as turns complete, so the user can reuse it as context for other generators, refine or save it, and share it using the hub's existing controls. Sharing remains an explicit user action and is the only case where result text leaves the browser after generation, other than to the AI provider as part of a turn.
- **FR-032**: After a development, the user MUST be able to continue the same conversation by (a) answering the creator questions, (b) asking for a change to a part, or (c) switching mode, and each turn MUST return the full development in the same section structure.
- **FR-033**: Turns after the first MUST NOT require the user to re-enter the idea, and earlier turns MUST NOT be resent by the browser while the conversation is held by the provider.
- **FR-034**: Each turn after the first MUST include a one-line note of what changed, and the original idea MUST remain visible beside the result.
- **FR-035**: A conversation MUST have a stated maximum number of turns; when it is reached the tool MUST say so and offer a new conversation or copying the result.
- **FR-036**: The user MUST be able to start a new conversation at any time, and earlier turns MUST NOT influence it.
- **FR-037**: If the provider no longer holds the conversation, the tool MUST recover by rebuilding it from the turns kept in the tab, transparently, and MUST keep the user's typed input if recovery fails.
- **FR-038**: The tool page MUST show a plain-language notice saying: the idea and later turns are sent to the AI provider, the provider keeps the conversation while it continues so earlier turns do not have to be resent, Codex Cryptica does not keep it, and how to end the conversation. By the project owner's decision it sits at the bottom of the page, under the tool, in a quiet style so it does not compete with the tool. It MUST NOT be hidden behind a checkbox, dialog or collapsed section, MUST be readable on a phone, and MUST link to the fuller explanation in the privacy page and the help entry.
- **FR-039**: The privacy page and the tool's help entry MUST describe the same behaviour as the notice, in the same plain terms, including what "start a new conversation" and "clear" do and do not remove (they clear the tab's copy and stop continuing the conversation; the provider's own retention window still applies to what was already sent).
- **FR-040**: The result MUST offer a "Save to your Codex" action that hands the conversation's Session Hub draft to the existing save flow used by the public generators. It MUST NOT add persistence of its own. The one copy that flow leaves in the browser (a pending import, kept until the app imports it) MUST be disclosed in the help and privacy text, and choosing the action counts as the sign-up or continue-in-app funnel step (FR-020).
- **FR-041**: While a turn is running, the tool MUST show a clear progress state (for example the thematic loading messages the public generators already use), disable submitting another turn, and offer a way to cancel.

### Key Entities

- **Idea**: The freeform text the user submits to start a conversation. Held only in the tab and, for the life of the conversation, by the AI provider; never retained by Codex Cryptica.
- **Mode**: The way the idea is examined (Assess, Develop, and later modes). Determines emphasis, not structure.
- **Development**: The structured result for one turn, made of the named sections. Carries a reference to the original idea, and after the first turn a one-line note of what changed.
- **Conversation**: One idea and its ordered turns, with the mode of each turn, the latest development and a reference the provider uses to continue it. Ends when the user starts a new one, clears it, or closes the tab.
- **Turn**: One user input (the idea, answers to questions, a requested change, or a mode switch) and the development it produced.
- **Session Hub Draft**: The development as it appears in the existing Session Hub, alongside drafts from public generators. Browser-local; reusable as context, refinable, saveable and shareable through existing hub controls.
- **Generator Suggestion**: A link to an existing generator with a short reason and the idea passed across as starting material.
- **Funnel Event**: A content-free record of one funnel step on a public surface, with its source page.
- **Context Package (future)**: The compact, inspectable set of world facts a vault-aware version would send with an idea. Described in the design document only.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A visitor can go from opening the tool to reading a complete result in under 60 seconds of active time, excluding time spent typing their idea.
- **SC-002**: In a manual review of at least 20 varied test ideas, at least 90% of results keep the original premise recognisable and none replaces it with a different one.
- **SC-003**: 100% of results include every required section, with 2 to 4 people who care, 2 to 4 creator questions, and at least 2 generator links, and 0% include a numeric score.
- **SC-004**: In the same review, at least 80% of results are judged by a reviewer to contain at least two player-facing directions they could run at the table.
- **SC-005**: At least 70% of results contain a generator suggestion that a reviewer judges relevant to the idea.
- **SC-006**: Each funnel step (arrival, submission, result, generator click) is recorded for at least 95% of test walk-throughs, and 0 records contain idea or result text.
- **SC-007**: 0 tracking records originate from inside the authenticated vault application.
- **SC-008**: The discovery audit reports no errors for the new page, and no second public page exists for the same intent.
- **SC-009**: A reviewer can answer what context is sent, how it is chosen, how it is inspected and what is never sent from the vault-aware design document alone.
- **SC-010**: When the result cannot be produced, 100% of tested failures keep the user's typed idea and show a retry option.
- **SC-011**: In an inspection of Codex Cryptica's stored data and logs after test runs, 0 records contain idea or result text.
- **SC-012**: 100% of tested requests without a passed bot-verification check, and 100% of requests over the per-browser limit, are refused with a plain-language message and no result produced.
- **SC-013**: In tested hand-offs, 100% of opened generators receive the idea as session context and 0 links contain idea text.
- **SC-014**: 100% of shown generator links point to a generator that exists, and 0 results show a link that fails to open.
- **SC-015**: In tested runs, 100% of completed developments appear in the Session Hub, 100% survive a reload or back-navigation within the tab, and 0 remain after the tab is closed or the user clears them.
- **SC-016**: Each of the three cluster answers ends with a closing section that links to the tool and gives guidance specific to its question, and a reader can go from the end of the answer to the tool in one click.
- **SC-017**: In tested conversations of at least three turns, 100% of turns after the first are sent without the browser resending earlier turns, and 100% return the full section structure with a what-changed note.
- **SC-018**: In a manual review of at least 10 multi-turn conversations, at least 90% of follow-up developments incorporate the user's answers or requested change and keep the original premise recognisable.
- **SC-019**: 100% of tested expired-conversation cases recover without the user re-entering anything, or fail with the typed input kept.
- **SC-020**: In tested runs, 0 records of idea, turn or result text exist on Codex Cryptica's own storage or logs (SC-011 extended to turns).
- **SC-021**: In a review of the tool page (desktop and phone width), the notice is on the page in every case, is not hidden behind anything the visitor must open, and the notice, help entry and privacy page agree on what is kept, by whom, and how to end the conversation.
- **SC-022**: In tested runs, choosing "Save to your Codex" opens the existing save flow with the conversation's draft in 100% of cases, and the tool writes no new stored record.
- **SC-023**: On a phone-width screen, all text on the tool page is at least 14px, text inputs are at least 16px (so phones do not zoom in on focus), and every button is at least 44px tall.
- **SC-024**: A reply that is not quite in the expected shape (a fifth person, a repeated direction, a list where a sentence was expected, text around the JSON) is accepted after tidying, and one that is unusable is asked for again once, with the reason, before the user sees an error.

## Assumptions

- The POC ships Assess and Develop only; the other three modes are designed for but not built.
- The tool is a public, no-login page. Its canonical location and registry entry are decided in planning, after checking the discovery intent registry; no existing entry currently owns the "develop an RPG idea" intent.
- Results are produced through the project's existing AI conversation path, which continues a conversation using state held by the AI provider. It keeps the same bot verification and edge limits as the public generators. Where the preferred model is unavailable (for example local development without a key), the existing fallback to the other provider applies with the same conversation shape.
- Codex Cryptica stores nothing server-side. The provider holds conversation state while a conversation continues, as the existing Oracle and generator sessions already do; this is disclosed to the user (FR-023). Whether the provider's retention window and no-training terms suit this public, no-login use is confirmed before launch.
- Starting values, adjustable during build: maximum idea or turn text length 4,000 characters; 8 completed turns per conversation; per-browser limit of a 10-second cooldown and 20 turns per hour. The length limit is shown to the user next to the input.
- Terminology: "development" is the structured result of one turn; "result" means the same thing in user-facing wording.
- "Save to your Codex" reuses the existing public-generator save flow through the Session Hub draft; the tool adds no persistence of its own (FR-040).
- The three cluster answers already exist; this feature adds a closing section to each and does not rewrite them.
- Funnel measurement reuses the project's existing privacy-safe first-party approach on public pages and never applies inside the vault application.
- The Jev evaluation depends on Jev access and API support and is handled as its own follow-up.

## Out of Scope

- Vault-aware development (design document only).
- Free-form chat with no structure; every turn returns the full section structure.
- Running the Jev-versus-baseline evaluation.
- Explore alternatives, Make playable and Challenge it modes.
- Saving results as vault entities.
- Writing new answer pages; only the closing section on the three existing cluster answers is in scope.
