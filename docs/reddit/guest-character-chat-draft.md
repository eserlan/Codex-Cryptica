# Reddit Post Draft: Guest Character Chat

## Title Options

- I built an NPC chat system that lets players interview characters in-game without spoiling GM secrets
- How I resolved NPC trust tiers and campaign canon promotion for player-facing chat
- Devlog: Player-NPC chat, dynamic trust levels, and promoting player conversations into campaign canon

## Post Body

I just finished implementing Guest Character Chat for Codex Cryptica. The goal was to let players and invited guests engage in real-time, in-character conversations with NPCs during or between sessions, using the actual lore of the campaign.

Here is how the feature works in play:

- **GM Configuration**: As a GM, you can toggle which NPCs are open for chat and limit what they know. You can set them to stick to public lore only, or allow them to use private context. The system is designed to reject leading questions and keep campaign secrets hidden, defaulting to in-character deflection if players pry.
- **Dynamic Trust Tiers**: The NPC behaves differently depending on who is talking. The system automatically identifies the player's character based on their login and checks the vault for existing relationships. The NPC dynamically adapts their voice and determines what lore they are willing to share based on whether the player is trusted, neutral, or a rival.

This gives players an organic way to explore the world's lore through conversation, while letting GMs build out the world's history based on the questions players actually ask.

**For GMs**: Do you prefer when tools automate character interactions like this to save you prep time, or do you feel it risks taking away the personal touch of roleplaying the NPCs yourself?

Project website: https://codexcryptica.com
