# Quickstart: Voice Chat Smoke Test

Manual two-browser verification for the session voice channel (unit tests
cover the logic; real microphone/WebRTC behavior needs this pass).

## Setup

1. `bun run dev` (or use a PR preview deployment).
2. **Browser A (host)**: open the app, load a vault, start hosting a live
   session (Share → host session) and copy the invite link/ID.
3. **Browser B (guest)**: open the invite link in a different browser or
   profile (so it gets its own mic permission scope) and join the session
   with a display name.

## Test pass

| #   | Step                                                                                 | Expect                                                                         |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1   | Guest header, before host starts voice                                               | Voice pill visible but Join disabled; tooltip says the GM hasn't started voice |
| 2   | Host: click the Voice pill, allow mic                                                | Pill turns active, participant count 1; browser shows mic-in-use indicator     |
| 3   | Guest: click Join Voice, allow mic                                                   | Both sides show 2 participants; two-way audio works                            |
| 4   | Guest: talk while host mutes (host mic button)                                       | Guest stops hearing host; roster shows GM muted on both sides                  |
| 5   | Guest: mute self                                                                     | Host stops hearing guest; roster updates on both sides                         |
| 6   | Second guest joins voice (optional third browser)                                    | All three hear each other; existing audio uninterrupted while joining          |
| 7   | Guest: Leave voice                                                                   | Guest mic indicator turns off; host roster drops to remaining participants     |
| 8   | Guest rejoins voice                                                                  | Works; single roster entry (no duplicate)                                      |
| 9   | Host: End voice while guest is in channel                                            | Guest returns to Join state; both mic indicators off                           |
| 10  | Host: start voice, then click again while the permission prompt is open (deny later) | Attempt cancels cleanly; no stuck "connecting" state                           |
| 11  | Host stops hosting entirely while voice is active                                    | Voice tears down on both sides; mic indicators off                             |

## Failure modes to spot-check

- Deny mic permission → friendly error in the pill tooltip, retry works
  after granting.
- Guest joins voice while host tab is backgrounded → still connects (data
  channel keeps the session alive).
