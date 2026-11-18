---
id: adventure-mode
title: Solo Adventure Mode
description: Play a persistent, vault-grounded adventure with Oracle as GM.
tags: [adventure, oracle, solo, campaign]
---

# Solo Adventure Mode

Adventure Mode gives you a persistent, system-light solo session grounded in the
records in your current vault. You control one character; Oracle presents the
situation, portrays the world, and responds to your choices.

Adventure state is stored with your vault and remains readable offline. A typed
action or recorded roll result is kept for retry when you reconnect. A recorded
roll is never silently replaced or rolled again.

GM notes are hidden from the play surface, but they are not encrypted from the
vault owner. Material invented during play stays provisional and is not added to
your canonical vault automatically.

## See the current scene

When the adventure has room, a **Current scene** panel sits beside the story
with the location, situation, objectives and who is here. When it is narrow, a
collapsible **Scene details** bar sits above the story instead.

## Choose how to start

Open **Play → Let the Oracle run the game**. On mobile, **Play** is in the
navigation menu. If you have no active adventure, choose a starting approach:

- **Discover an Adventure** immediately generates six rumours using the in-app
  Rumour Generator's defaults. Choose **Play with Oracle** beside one lead,
  or select **Customize** to change the generator options. Only that rumour
  and its matching hidden GM preparation pass to Adventure Mode. Review the
  prefilled premise, choose your character, and start.
- **Surprise Me with an Adventure** opens the Adventure Idea generator. Review
  the player-safe opening situation and objective, then choose **Play with
  Oracle** to review the title, premise and character before starting. The
  generated plot and GM notes stay behind the spoiler shield in the generator.
  You need an Oracle connection to generate the adventure and begin play.
- **Create Your Own Premise** opens the usual adventure form. Enter a title,
  starting situation and character yourself. You can return to the starting
  choices without discarding an unsaved draft.
- **Import Adventure JSON** brings an adventure you own into the Vault as an
  immutable, locally validated package you can start a session from. See
  [Import an adventure](#import-an-adventure) below.
- **Enter Your World** opens **Set the Stage**, with no prepared quest needed.
  Choose a Vault character or name a new provisional one, then a Vault place
  or a new **Starting place**. Optionally pick a world date from your Vault
  calendar. Decide how it begins: open exploration, a particular scene you
  describe, or a plausible local situation. Choose **Review starting context**
  to see the Vault records that ground the opening, then **Start playing**.

A rumour is a lead, **not an assigned quest**. You may ignore it, investigate
it, or pursue something else. GM notes are hidden by default in the generator
review unless you choose to reveal them. When you already have an Adventure open, you
can add the selected lead to it as a known situation, continue the current
Adventure, cancel and return to the six rumours, or archive it before
starting a separate Adventure.

You can keep several Adventures going in one Vault. Opening Adventure Mode
takes you straight back into the one you played most recently. To change to
another, open the **⋮ menu → Switch to…**, or choose **Leave adventure** to see
all of them and start a new one.

Use the **Known situations** control during play to focus or clear attention.
Focusing is optional; ordinary free action continues without a selected lead.
To finish a lead or leave it behind, open **Adventure tools → Situations & Rumours** and
choose **Mark as concluded** or **Leave it behind**. Either choice can be undone
with **Reopen**. You can also choose **Look for local rumours** to ask around
and discover contextual leads in your current settlement without waiting for them to surface.
New world-entry rumours are introduced as
play makes them relevant rather than presented as a scenario-selection list.
You need an online Oracle connection for AI turns. The selected GM notes remain
stored within the Adventure session but are not encrypted from the vault owner.

## Import an adventure

Import Adventure JSON is available in a ready owner Vault. It is fully
local and deterministic: no AI calls are made to import, validate, or store
a package, and the same file always gives the same result.

1. Open **Play → Let the Oracle run the game** and choose **Import Adventure
   JSON**.
2. Drop or choose an Adventure JSON v1 (`.json`) file up to 10 MiB. If you
   have a module in another form, follow the
   [Adventure JSON conversion guide](/adventure-import) to convert it
   off-platform first.
3. Codex validates the file locally against the Adventure JSON schema. If
   validation fails, you get the exact errors and nothing is written.
4. Review its locations, actors, factions, scenes, encounters, clues,
   rumours, items, endings, and unresolved items. Secrets stay locked to
   `gm-only`; you can adjust visibility only for non-secret content.
5. Approve to save the package as an immutable SHA-256 baseline, or cancel —
   cancelling leaves no package in the Vault.

Once approved, each package version shows a card with its hook and source
details, without spoilers. When a package offers more than one starting point,
you can pick one before starting; the first scene is the default, and a hidden
alternative is shown only as "Alternative start (details hidden)". You can
start a new session pinned to that package version and hash, or resume an existing pinned session directly. Later changes to
the package never retarget a session that has already started.

Re-importing an identical package is a no-op. Changed content with the same
package ID opens a new version review against the previous approved version;
check the listed changes, including any change to the entry scene, before
approving. Each approved version stays available to start a session. Use
**Remove** in the approved package list to delete a version. A version pinned
by an adventure session cannot be removed; resume that session or keep the
version in the Vault.

If a session's package version is missing or has changed, the session pauses
with **Retry** and **Leave session**. Your story stays readable. Re-import
the same version, then choose Retry to continue.

## Check progress in an imported adventure

Open **Adventure tools** during a session pinned to an imported package. The
player progress view lists confirmed, player-visible scenes you have visited,
the current scene, and player-visible clues you have found. It leaves out
GM-only records, unvisited scenes, and unconfirmed claims, and does not show a
remaining-scene count.

The optional **GM details** audit is hidden until you choose **Show GM details**
and confirm the spoiler warning. It lists package records the ledger has
touched, including claims and superseded events, so you can check the Oracle's
bookkeeping. Choose **Hide GM details** to close it again. Revealing it may show
GM-only package content.

Markdown (`.md`, up to 2 MiB) and text-based PDF (`.pdf`, up to 20 MiB and
500 pages) remain available as experimental convenience inputs. They are
normalized locally into Adventure JSON before the same review; scanned or
encrypted PDFs are rejected. The original file stays on your device and is
not copied into the Vault; only the approved package is saved.

Where an imported adventure goes, in three phases:

1. **Conversion:** your source goes to the AI assistant you choose, not to
   Codex Cryptica.
2. **Import:** the Adventure JSON is checked and stored in the Vault on this
   device. This step is fully local and deterministic: no AI calls.
3. **AI play:** during Oracle turns, bounded parts of the package, such as its
   title and premise, go to your selected Oracle AI provider with relevant
   Vault records. The whole package is not sent.

Imported packages are not included in Cloud Backup, even if you opt in to
include adventures. They are included in a vault export (`.codex.zip`) and in
a folder save. After a Cloud Backup restore, keep your `.json` file and import
it again; the same file gives the same version. See
[Where your adventure goes](/adventure-import#privacy-notice-heading),
[Cloud Backup](/help#help/cloud-backup) and
[Export and Back Up](/help#help/export-and-backup).

## Start an adventure

1. Open **Play → Let the Oracle run the game**.
2. Choose **Create Your Own Premise**.
3. Enter an **Adventure title**, a **Premise** and your **Player character** name.
4. Optionally add a **Character description**.
5. Choose **Start adventure**, then respond to the situations the Oracle presents.

Starting and continuing AI turns needs an available Oracle connection. Your stored
session remains readable offline; a pending action can be retried after reconnecting.
Opening Play checks for an active adventure in the current vault so you can continue
that world’s session.

Adventure Mode is now chosen from the Play page. Starting a solo session does not need it. See [Solo Sessions](/help#help/solo-session) and [Adventure Artwork](/help#help/adventure-artwork).

## Playing in your existing world

Before an opening, action, dice resolution or background rumour generation, Oracle looks up relevant local Vault records and combines them with your adventure's committed discoveries. Existing Vault facts take priority over provisional details. Dated exploration keeps future and uncertain information distinct, and GM notes remain hidden preparation rather than character knowledge. Oracle can still make mistakes; review discoveries before saving them to campaign canon.

In **Enter Your World**, a few hidden situations are already unfolding around your character. They show up as small details, such as tracks, a closed shop, nervous locals, a posted notice or overheard talk, and you can ignore or follow any of them. If several turns pass quietly, Oracle adds one such detail to the scene. A detail never becomes a quest by itself; situations only develop through your actions or time passing in the story.

If world information cannot be loaded, generation stops so you can retry. Your committed progress, action draft and any recorded dice result remain available. Restore a missing selected character, location or source record, or edit your selection, before retrying. If no opening has been committed, use **Retry opening**; this is also available after reopening the adventure. A successful lookup with no matches can continue with provisional details. Optional rumour generation can use a local fallback after its world lookup succeeds. AI generation needs an available, configured Oracle; inspecting existing play remains local.
