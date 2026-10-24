# Idea Developer pattern analysis: GPT-6 Luna comparison transcript (#3466)

Real model output from `bun scripts/idea-pattern-ab.ts --modes assess,challenge --json` against the deployed worker on 23 October 2026, after GPT-6 Luna was deployed (PR 4363). Every call was answered by `luna-fast` (GPT-6 Luna); no Gemini fallbacks. One run per idea and mode. Rendered with the harness's own `toMarkdown`. See [the write-up](./3466-idea-pattern-analysis.md).

## dragon-protector · assess

_reveal-driven premise (the issue's example)_

> A disgraced knight discovers that the dragon terrorising the kingdom is actually protecting it from the king.

### baseline (calls: 1, 5385 ms, models: luna-fast)

#### What is compelling

The premise turns a familiar threat into a possible protector, making the kingdom’s apparent safety and the king’s authority uncertain. The disgraced knight offers a compelling point of view: their damaged reputation may make them less trusted, but could also leave them with a reason to challenge the accepted story.

#### The core to preserve

- A disgraced knight is central to the premise.
- A dragon is terrorising the kingdom.
- The dragon is actually protecting the kingdom.
- The king is the danger the dragon is protecting the kingdom from.

#### Gaps worth checking

- Clarify what the king is doing that makes him a threat, and how the dragon’s actions protect people from it.
- Consider what evidence could persuade others that the dragon is protecting the kingdom, rather than merely offering a different rumour.
- Decide what being disgraced means for the knight’s relationships, resources, and credibility, so their status matters in play.
- Check that the dragon’s protection leaves room for difficult choices: its methods might save the kingdom while still causing real harm.

#### Questions for you

- What brought the knight into disgrace, and does that history connect to the dragon or the king?
- What specific danger does the king pose to the kingdom?
- Why does the dragon terrorise people as part of its protection?
- What does the dragon want, if anything, in return for protecting the kingdom?
- Would you like the central tension to lean towards uncovering the truth, deciding whom to trust, or choosing what kind of protection the kingdom deserves?

### assisted (calls: 2, 15267 ms, models: luna-fast, luna-fast)

_Pattern score: found disgraced-champion, misunderstood-monster, rot-at-the-top; missed none; wrong none._

#### Pattern analysis

- **Disgraced Champion**: The protagonist is a disgraced knight.
- **Truth Behind the Legend**: The dragon said to be terrorising the kingdom is actually protecting it.
- **Misunderstood Monster**: The dragon appears to be a threat but is protecting the kingdom from the king.
- **Rot at the Top**: The king is the danger the dragon is protecting the kingdom from.

```text
Familiar patterns in play:
- Disgraced Champion (The protagonist is a disgraced knight.). Expected: The disgrace will prove unjust or the champion will earn their way back. Ways to complicate it: Make the disgrace deserved, and the redemption something other than reinstatement. Tie the disgrace to a choice the champion would make again.
- Truth Behind the Legend (The dragon said to be terrorising the kingdom is actually protecting it.). Expected: The hidden account will be uncovered and will overturn who is trusted. Ways to complicate it: Let the legend be partly true, so neither version is clean. Make someone sympathetic depend on the legend staying believed.
- Misunderstood Monster (The dragon appears to be a threat but is protecting the kingdom from the king.). Expected: Fear will give way to understanding, and the real threat will surface. Ways to complicate it: Keep the creature genuinely dangerous even after it is understood. Give the people who feared it a reasonable cause to keep fearing it.
- Rot at the Top (The king is the danger the dragon is protecting the kingdom from.). Expected: The authority will be confronted, deposed or exposed. Ways to complicate it: Make the authority's fall dangerous to the people it was harming. Give the authority loyal, decent servants who are not complicit.
Thin or missing structure:
- escalation (thin): The premise gives no sequence of worsening events or deadline.
- choices (thin): The knight may face divided loyalties, but no concrete trade-off is given.
Reveal dependency: Once the dragon's true role is known, tension can come from whether the knight exposes or opposes the king without losing the dragon's protection.
What the audience will expect:
- The knight will have to decide whether to defend the dragon or continue serving the king.
- The king will try to preserve the story that the dragon is the threat.
- The dragon's protection will involve a danger or cost the kingdom has not recognised.
- The knight's disgrace will matter to their ability to act or be believed.
Where it differs: The premise closely combines the misunderstood-monster and truth-behind-the-legend patterns with rot at the top. The disgraced knight makes the discovery personal, but the setup does not yet specify how their disgrace relates to the king or dragon.
```

#### What is compelling

The premise turns a familiar tale of a kingdom under threat inside out: the feared dragon may be the kingdom’s safeguard, while its rightful ruler is the danger. Making the discoverer a disgraced knight gives that revelation a personal edge—their reputation, loyalties and ability to be believed could all matter.

#### The core to preserve

- The protagonist is a disgraced knight.
- A dragon is terrorising the kingdom—or is believed to be doing so.
- The dragon is actually protecting the kingdom.
- The king is the threat the dragon is protecting it from.

#### Gaps worth checking

- Clarify how the knight’s disgrace relates, if at all, to the king or the dragon. If it is unrelated, consider how it still shapes the knight’s ability to act or be believed.
- Decide what the dragon’s protection entails and why people reasonably fear it. Keeping the dragon genuinely dangerous can preserve the tension after its role is understood.
- Consider who benefits from the belief that the dragon is the threat, and whether anyone sympathetic would be harmed if that story were overturned.
- The premise does not yet establish escalation or a concrete trade-off. What changes if the knight acts now, and what becomes harder if they wait?

#### Questions for you

- What caused the knight’s disgrace, and would they make the choice that led to it again?
- What is the king doing that makes the dragon’s protection necessary, and what does that protection cost the kingdom?
- What evidence could convince the knight, and what would make other people doubt or resist the truth?
- What immediate change or deadline could bring the knight’s discovery to a head?

---

## dragon-protector · challenge

_reveal-driven premise (the issue's example)_

> A disgraced knight discovers that the dragon terrorising the kingdom is actually protecting it from the king.

### baseline (calls: 1, 7963 ms, models: luna-fast)

#### What is compelling

The apparent monster may be the kingdom’s real safeguard, while the disgraced knight has to decide what to do with knowledge that could restore their reputation—or put the kingdom at risk. The reversal also makes the king’s authority and the knight’s disgrace worth examining rather than taking at face value.

#### The core to preserve

- The protagonist is a disgraced knight.
- A dragon is terrorising the kingdom.
- The dragon is actually protecting the kingdom.
- The king is the danger the dragon is protecting the kingdom from.

#### Things to stress-test

- What does ‘protecting’ mean in practice? If the dragon’s attacks harm ordinary people, players may find its protective role morally or factually hard to parse.
- Why has the dragon’s true purpose remained hidden, and what makes the disgraced knight able to discover it? Without a clear answer, the reveal could feel like a convenient twist.
- What is the king doing that makes him a threat to the kingdom? The scale and evidence of that danger will shape whether opposing him feels urgent, credible, or simply a matter of competing claims.
- The premise may cast the knight as the obvious person to expose the truth. Consider whether they have reasons to doubt the dragon, protect the king, or distrust their own judgement, so their disgrace matters beyond backstory.

#### Questions for you

- What did the knight do—or refuse to do—that led to their disgrace?
- How does the dragon protect the kingdom, and what costs or collateral harm come with that protection?
- What is the king doing that threatens the kingdom, and who knows or suspects the truth?
- Do you want the dragon’s motives to be genuinely protective, self-interested but beneficial, or open to interpretation?

### assisted (calls: 2, 15945 ms, models: luna-fast, luna-fast)

_Pattern score: found disgraced-champion, misunderstood-monster, rot-at-the-top; missed none; wrong villain-has-better-evidence._

#### Pattern analysis

- **Disgraced Champion**: The protagonist is a “disgraced knight”.
- **Truth Behind the Legend**: The dragon “terrorising the kingdom” is actually protecting it.
- **Villain Has the Better Evidence**: The apparent threat, the dragon, is acting to protect the kingdom from the king.
- **Rot at the Top**: The king is the source of the danger the dragon is guarding against.
- **Misunderstood Monster**: The feared dragon is not the threat it appears to be.

```text
Familiar patterns in play:
- Disgraced Champion (The protagonist is a “disgraced knight”.). Expected: The disgrace will prove unjust or the champion will earn their way back. Ways to complicate it: Make the disgrace deserved, and the redemption something other than reinstatement. Tie the disgrace to a choice the champion would make again.
- Truth Behind the Legend (The dragon “terrorising the kingdom” is actually protecting it.). Expected: The hidden account will be uncovered and will overturn who is trusted. Ways to complicate it: Let the legend be partly true, so neither version is clean. Make someone sympathetic depend on the legend staying believed.
- Villain Has the Better Evidence (The apparent threat, the dragon, is acting to protect the kingdom from the king.). Expected: The heroes will learn the facts and face whether to change sides. Ways to complicate it: Make the antagonist right about the problem but wrong about the cure. Show the evidence early and let the cost of acting on it drive play.
- Rot at the Top (The king is the source of the danger the dragon is guarding against.). Expected: The authority will be confronted, deposed or exposed. Ways to complicate it: Make the authority's fall dangerous to the people it was harming. Give the authority loyal, decent servants who are not complicit.
- Misunderstood Monster (The feared dragon is not the threat it appears to be.). Expected: Fear will give way to understanding, and the real threat will surface. Ways to complicate it: Keep the creature genuinely dangerous even after it is understood. Give the people who feared it a reasonable cause to keep fearing it.
Thin or missing structure:
- escalation (thin): The premise establishes opposing forces but does not say how the conflict worsens over time.
- choices (thin): The discovery implies divided loyalties, but no specific decision or trade-off is stated.
Reveal dependency: Once the dragon’s protective role is known, tension can remain in how the knight confronts the king and whether the kingdom will believe the truth.
What the audience will expect:
- The knight will have to decide whether to side with the dragon or the king.
- The king’s threat will be revealed in greater detail.
- The kingdom may continue to fear or oppose the dragon.
- The knight’s disgrace may affect whether anyone trusts their discovery.
Where it differs: The premise combines a disgraced protector’s discovery with a feared dragon that is guarding the kingdom from its own ruler. The pattern combination is clear, though the underlying shapes are familiar.
```

#### What is compelling

The premise turns a familiar threat on its head: the dragon terrorising the kingdom may be the kingdom’s last protection from its king. The disgraced knight is an especially compelling witness because their past may make the truth harder to trust—and because discovering it does not automatically settle whom they should support.

#### The core to preserve

- The central character is a disgraced knight.
- A dragon is terrorising the kingdom.
- The dragon is, in fact, protecting the kingdom from the king.
- The discovery puts the knight’s understanding of the threat into question.

#### Things to stress-test

- The premise’s central reversal depends on what “protecting” means. Is the dragon guarding people from a specific threat posed by the king, or preserving the kingdom in some broader, possibly costly way?
- The dragon may risk becoming clearly trustworthy once its role is revealed. Consider whether its conduct remains genuinely dangerous or morally difficult, and why frightened people might still reject its protection.
- The king’s threat could become so obviously villainous that the choice of sides feels settled. What makes people loyal to him, and what might be lost if his rule ends?
- The discovery promises divided loyalties, but the knight’s disgrace and the dragon’s reputation could make the truth difficult to establish. Decide what evidence is available and what would make others believe—or doubt—it.

#### Questions for you

- What did the knight do to earn their disgrace, and is it connected to a choice they still believe was right?
- What is the dragon protecting the kingdom from, and what real costs or dangers does its protection impose?
- What does the king want that makes him a threat, and why do otherwise decent people support or serve him?
- What evidence could persuade the kingdom that the dragon is protecting it, especially given the knight’s reputation?
- What should escalate if the characters hesitate: the king’s actions, the dragon’s response, or the harm caused by their conflict?

---

## dragon-parts-town · assess

_static lore with a mystery and no conflict yet_

> A town where everything is made from dragon parts, but there are no dragons nearby.

### baseline (calls: 1, 6630 ms, models: luna-fast)

#### What is compelling

The contrast is immediately evocative: dragon parts are ordinary enough to form the town’s buildings and belongings, yet dragons are nowhere nearby. That gap invites curiosity about the town’s history, its relationship with these materials, and what their presence means to daily life.

#### The core to preserve

- A town where everything is made from dragon parts
- No dragons are nearby
- The striking contrast between everyday life and materials from immense, unusual creatures

#### Gaps worth checking

- What does “everything” mean in practice? If taken literally, the premise may leave little room for ordinary materials or variation.
- Are the dragon parts ancient, recently acquired, renewable, or in some other state? The answer will shape the town’s history and the significance of its absence of dragons.
- How do residents understand or feel about living among dragon remains? If everyone responds the same way, the premise may offer less social texture.
- Does “no dragons nearby” mean dragons are known to exist elsewhere, or is their existence itself uncertain?

#### Questions for you

- What first drew you to the image of a town made entirely from dragon parts?
- How did the town get so many dragon parts?
- Are the parts still recognisably draconic, or have generations of use made them seem ordinary?
- How do the townspeople feel about the absence of living dragons?
- What aspect interests you most: the town’s origins, its everyday culture, or the mystery of where the dragons went?

### assisted (calls: 2, 13192 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed living-off-the-beast; wrong none._

#### Pattern analysis

```text
Thin or missing structure:
- conflict (missing): The premise gives no clashing wants or immediate problem.
- escalation (missing): It does not say how the situation might worsen over time.
- agency (missing): No protagonists or actions they could take are specified.
- opposition (missing): No one or nothing is actively pushing back.
- stakes (thin): The town's reliance on dragon parts hints at something to lose, but the consequences are unstated.
- choices (missing): No decisions or trade-offs appear in the setup.
- payoff (thin): The absence of nearby dragons raises a question about where the parts came from.
What the audience will expect:
- An explanation for where the dragon parts came from.
- A reason the town uses dragon parts for everything.
- Consequences of having no dragons nearby.
Where it differs: The setup pairs a town built from dragon remains with the notable absence of dragons, but does not yet establish a familiar pattern or a plot around that contrast.
```

#### What is compelling

The vivid contradiction is immediately intriguing: dragon parts are so abundant and useful that they make up an entire town, yet no dragons live nearby. It invites questions about the town’s history, its dependence on these materials, and what their absence means now.

#### The core to preserve

- A town where everything is made from dragon parts
- There are no dragons nearby
- The contrast between the town’s everyday reliance on dragon parts and the dragons’ absence

#### Gaps worth checking

- Clarify where the dragon parts came from, and whether their origin is common knowledge, disputed, or concealed.
- Consider why the town uses dragon parts for everything: are they unusually practical, culturally important, or simply what the town has available?
- Decide whether the absence of nearby dragons is just a mystery, a source of loss, or a practical problem for the town.
- The premise hints at a valuable resource and a history, but does not yet establish who might be affected by a change or what demands attention now.

#### Questions for you

- How did the town acquire enough dragon parts to build and furnish itself?
- What makes dragon parts preferable to other materials for the people who live there?
- Do the townspeople know why there are no dragons nearby, and do they want dragons to return?
- What might the town stand to lose if its supply of dragon parts, or its way of life, were threatened?

---

## dragon-parts-town · challenge

_static lore with a mystery and no conflict yet_

> A town where everything is made from dragon parts, but there are no dragons nearby.

### baseline (calls: 1, 6443 ms, models: luna-fast)

#### What is compelling

The contrast is immediately intriguing: dragon parts are ordinary enough to make up a whole town, yet dragons are nowhere nearby. That raises questions about the town’s history, identity and dependence without deciding what the answers must be.

#### The core to preserve

- A town, rather than just an isolated building or landmark
- Everything in the town is made from dragon parts
- There are no dragons nearby

#### Things to stress-test

- “Everything” is striking but potentially hard to interpret literally. Does it include food, clothing, tools and living things, or is it an exaggeration for the town’s buildings and goods?
- The idea implies a supply of dragon parts, but not where they came from or how the town gets them. Leaving that unexplained can create useful mystery, but may frustrate play if players need practical answers.
- “No dragons nearby” could mean dragons are extinct, distant, hidden or simply absent at present. The intended scope affects how surprising the town’s materials feel.
- If dragon parts are commonplace, consider whether they are mundane, sacred, dangerous or valuable. Without some shared understanding, players may not know how to read the town’s customs or stakes.

#### Questions for you

- Is “everything” meant literally, or does it mainly describe the town’s buildings and crafted goods?
- Do you already know where the dragon parts come from, or would you like that to remain a mystery?
- What does the town believe about the dragons whose parts it uses?
- Should the dragon-made town feel wondrous, unsettling, practical, or something else?

### assisted (calls: 2, 14207 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed living-off-the-beast; wrong none._

#### Pattern analysis

```text
Thin or missing structure:
- conflict (thin): The contrast between dragon-made goods and no nearby dragons hints at a problem but gives no competing wants.
- escalation (missing): No worsening situation or sequence of events is described.
- agency (missing): The premise does not identify protagonists or actions they can take.
- opposition (missing): No person, force or obstacle is actively pushing back.
- stakes (thin): The town’s reliance on dragon parts is clear, but what is at risk is not.
- choices (missing): No decisions or trade-offs are established.
- payoff (thin): The absence of nearby dragons raises a question that could later be answered.
What the audience will expect:
- An explanation for where the dragon parts come from.
- A town shaped by its reliance on dragon-derived materials.
- Consequences if the supply of dragon parts becomes uncertain.
Where it differs: The setup pairs a town built from dragon parts with the absence of dragons nearby. It does not yet establish the conflict or dependency needed to match a familiar pattern clearly.
```

#### What is compelling

The striking contradiction: a whole town is built from dragon parts, yet no dragons are nearby. It invites curiosity about the town’s history and supply without explaining either away.

#### The core to preserve

- A town is made from dragon parts.
- Dragon parts are visible throughout everyday life, not just rare curiosities.
- There are no dragons nearby.

#### Things to stress-test

- The premise strongly invites the question of where the dragon parts come from. Decide how much the creator knows, and how much should remain a mystery for players.
- “Everything” could mean literally every object or be a vivid exaggeration. Clarifying the scope will help the town feel coherent and make its reliance legible.
- No dragons being nearby could mean they are extinct, absent, hidden, or simply far away. If the distinction matters, establish what locals believe and what evidence supports it.
- The town’s dependence is suggested but not yet defined: consider whether dragon parts are essential, prestigious, practical, or mainly part of the town’s identity.

#### Questions for you

- Where do the dragon parts come from, and is that answer known, disputed, or deliberately unresolved?
- What does “everything” include in this town: buildings and tools, or also clothing, food, and everyday customs?
- What does the absence of nearby dragons mean to the townspeople?
- If the supply of dragon parts changed, what would the town most fear losing?

---

## giant-village · assess

_setting with built-in pressure_

> A village has built its homes inside the ribs of a sleeping giant, and the bones have started to move.

### baseline (calls: 1, 6873 ms, models: luna-fast)

#### What is compelling

The village’s homes are built inside a sleeping giant’s ribs, making its very shelter part of the danger. The bones beginning to move gives the premise an immediate, memorable source of change without explaining what caused it.

#### The core to preserve

- A village has built its homes inside a giant’s ribs.
- The giant is sleeping.
- The bones have started to move.

#### Gaps worth checking

- Clarify what “the bones have started to move” looks and feels like in everyday village life, so the danger is legible at the table.
- Consider how much the villagers know about the giant and why they chose to build there; either mystery could be compelling, but they create different kinds of play.
- Check what makes the situation playable beyond survival: the premise establishes danger, but not yet what decisions or aims could draw the characters in.

#### Questions for you

- What first sign of movement tells the villagers that something has changed?
- Do the villagers understand that their home is a giant’s body, and how do they explain its sleeping state?
- What makes this village worth saving, leaving, or otherwise engaging with for the characters?
- What tone do you want the image to carry: wonder, dread, intimacy, or something else?

### assisted (calls: 2, 18948 ms, models: luna-fast, luna-fast)

_Pattern score: found safe-haven-falls; missed none; wrong none._

#### Pattern analysis

- **Safe Haven Falls**: The village's homes are inside the giant's ribs, and the bones have started to move.

```text
Familiar patterns in play:
- Safe Haven Falls (The village's homes are inside the giant's ribs, and the bones have started to move.). Expected: The haven will be breached, and its people will scatter or make a last stand. Ways to complicate it: Make the threat come partly from inside the haven. Force a choice about who the haven can still protect.
Thin or missing structure:
- escalation (thin): The bones have started moving, but no further worsening is specified.
- agency (thin): The premise leaves open what the villagers or protagonists can do.
- choices (missing): No decisions or trade-offs are specified.
What the audience will expect:
- The villagers will try to protect their homes or find somewhere safer.
- The giant's movements will grow more dangerous.
- The village's survival may depend on understanding why the giant is moving.
Where it differs: The premise combines a settlement-as-shelter setup with a threat that is also the physical structure of the village. It follows the threatened-haven shape closely, while leaving the giant's nature and the villagers' response open.
```

#### What is compelling

The village’s shelter is also the source of its danger: even small movements in the giant’s bones could threaten homes, while the people may have nowhere else to go. That makes the setting immediately vivid and gives the villagers’ connection to their home real weight.

#### The core to preserve

- A village has built its homes inside a giant’s ribs.
- The giant is sleeping.
- The giant’s bones have started to move.

#### Gaps worth checking

- Clarify what “started to move” looks and feels like in play: a subtle shift, a sudden lurch, or a change with an uncertain cause. The scale and pattern of the movement will shape how urgent the danger feels.
- Consider whether the movement is already affecting the village’s homes, routes, or inhabitants. If the threat only promises future danger, it may be harder to establish why people must respond now.
- The village may not agree on what safety means. Are there limits to how many people can be protected, or would leaving some homes behind endanger people who cannot easily move?
- The giant is both the village’s structure and a possible source of danger. Decide how much the villagers know about the giant, its sleep, and the consequences of trying to understand or affect its movements.

#### Questions for you

- What does the giant’s first movement mean to the villagers: a warning, a familiar phenomenon, or something they have never seen before?
- How did the village come to live inside the ribs, and what makes this home worth protecting or difficult to leave?
- Who in the village is most afraid of what the movement means, and who sees an opportunity in it?
- What do you want the players to be able to influence: the village’s survival, its understanding of the giant, its response to the movement, or something else?

---

## giant-village · challenge

_setting with built-in pressure_

> A village has built its homes inside the ribs of a sleeping giant, and the bones have started to move.

### baseline (calls: 1, 9566 ms, models: luna-fast)

#### What is compelling

The image is immediately vivid: a village depends on shelter inside a sleeping giant, while the very structure keeping it safe begins to move. It creates a strong tension between home, danger and the unknown without explaining what the giant is or why it is stirring.

#### The core to preserve

- There is a village whose homes are built inside a giant’s ribs.
- The giant is sleeping.
- The bones have started to move.
- The village’s relationship to the giant’s body is the central source of the premise’s appeal.

#### Things to stress-test

- Clarify what “the bones have started to move” looks and feels like at the table. Small, gradual shifts may be eerie but hard to act on; sudden movement may make the village’s immediate danger dominate everything else.
- Consider what the villagers know about the giant. If they have lived there for generations, players may expect customs, explanations or practical ways of coping with its body; leaving these entirely undefined could make the village feel like a backdrop rather than a community.
- The sleeping giant invites questions about awareness and agency. If it is truly asleep, decide how much the village can infer about its condition; if it may be waking, take care not to make that interpretation feel settled before play.
- The premise establishes danger but not the intended scale of play. Is the focus on a household or neighbourhood, the whole village, or the giant itself? Any of these could work, but the answer affects how personal and immediate the danger feels.

#### Questions for you

- What first observable sign tells the villagers that the bones are moving?
- How long has the village lived inside the giant, and what do its people believe about their home?
- Are the movements a threat to everyone, or do they affect some homes and residents more than others?
- Do you want the giant’s nature and intentions to remain mysterious, or should the villagers be able to learn something meaningful about them?

### assisted (calls: 2, 17053 ms, models: luna-fast, luna-fast)

_Pattern score: found safe-haven-falls; missed none; wrong none._

#### Pattern analysis

- **Safe Haven Falls**: The village has built its homes inside the giant's ribs, and the bones have started to move, threatening their shelter.
- _off-list_ **Life inside a colossal creature**: The village has built its homes inside the ribs of a sleeping giant.

```text
Familiar patterns in play:
- Safe Haven Falls (The village has built its homes inside the giant's ribs, and the bones have started to move, threatening their shelter.). Expected: The haven will be breached, and its people will scatter or make a last stand. Ways to complicate it: Make the threat come partly from inside the haven. Force a choice about who the haven can still protect.
- Life inside a colossal creature (The village has built its homes inside the ribs of a sleeping giant.).
Thin or missing structure:
- conflict (thin): The moving bones threaten the village, but no competing wants are specified.
- agency (thin): The premise leaves room for villagers or protagonists to respond, but gives no actions yet.
- choices (missing): No decisions or trade-offs are described.
What the audience will expect:
- The villagers will have to respond before the giant's movement destroys their homes.
- The giant may wake, or its movement may have a cause the villagers can discover.
- Living inside the ribs will shape how the community understands and navigates the danger.
Where it differs: The premise centres on a village inhabiting a giant's body, so the threatened haven is also part of the danger itself. It follows the safe-haven-under-threat shape closely, while leaving the giant's nature and the villagers' relationship to it open.
```

#### What is compelling

The village’s shelter is also part of the danger: the same ribs that make a home for its people are beginning to move. That creates an immediate, vivid tension while leaving the giant’s nature and the villagers’ relationship to it open.

#### The core to preserve

- There is a village.
- Its homes are built inside the ribs of a giant.
- The giant is sleeping.
- The bones have started to move.

#### Things to stress-test

- Clarify what ‘the bones have started to move’ looks or feels like in play. If the movement is too slight, the threat may not feel urgent; if it is immediately catastrophic, the village may seem to have little room to respond.
- Consider how much the villagers understand about their home. Do they know the ribs belong to a sleeping giant, or is that belief uncertain? The answer affects what they can investigate and what they might fear.
- The premise suggests the giant could wake, but that expectation may narrow attention towards a single outcome. Consider whether the movement could matter even if the giant never fully wakes.
- The village is threatened as a whole, but its people may not all face the same risks. If everyone wants the same response, there may be little conflict or meaningful choice within the community.

#### Questions for you

- What have the villagers built or relied on that makes living among the ribs feel like home?
- How do the villagers interpret the movement, and how certain are they that the giant is asleep?
- What could the bones’ movement endanger first: people, homes, or something the village depends on?
- Are there differences within the village about what should be protected or risked?

---

## vague-moon · assess

_too thin to classify safely_

> Something is wrong with the moon.

### baseline (calls: 1, 6916 ms, models: luna-fast)

#### What is compelling

The premise is brief, unsettling, and immediately evocative: the moon is familiar enough that even a subtle change could feel uncanny. Its openness invites many possible tones and kinds of play without committing to one.

#### The core to preserve

- The moon is central to the idea.
- Something about it is wrong.
- The nature and cause of the wrongness are unspecified.

#### Gaps worth checking

- The premise’s ambiguity is evocative, but may need one distinctive sign of wrongness to give players something concrete to notice or investigate.
- Consider whether the moon’s wrongness is visible to everyone, or whether uncertainty about who can perceive it is part of the appeal.
- The idea does not yet indicate whether the focus is mystery, danger, wonder, or social upheaval; choosing a tone could help guide development.

#### Questions for you

- What is the first thing someone notices that makes them think the moon is wrong?
- Who is affected by the change, and who might deny or misinterpret it?
- What kind of experience do you want this to create: eerie mystery, urgent crisis, cosmic wonder, or something else?
- Is the moon’s wrongness something the characters could meaningfully respond to, or is the uncertainty itself the heart of the idea?

### assisted (calls: 2, 14244 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed none; wrong none._

#### Pattern analysis

```text
Thin or missing structure:
- conflict (thin): The moon being wrong suggests a problem, but no opposing wants are stated.
- escalation (missing): No progression or worsening of the situation is described.
- agency (missing): The premise does not identify protagonists or how they might act.
- opposition (missing): No person, force or circumstance is shown actively pushing back.
- stakes (thin): The moon's condition is flagged, but its consequences for anyone are unspecified.
- choices (missing): No decisions or trade-offs are presented.
- payoff (thin): The unexplained lunar problem offers a question, but no specific setup for a later payoff.
What the audience will expect:
- The nature of what is wrong with the moon will be investigated.
- The lunar anomaly may have consequences for the world or its inhabitants.
- The cause or meaning of the anomaly will eventually be revealed.
Where it differs: The premise is too brief to establish a recognisable pattern or combination of patterns. Its only specific element is an unexplained problem with the moon.
```

#### What is compelling

The plain, unsettling claim makes the moon itself the mystery. It invites players to notice what has changed, investigate why, and wonder whether the anomaly matters to anyone on the ground.

#### The core to preserve

- The moon is the focus.
- Something about it is wrong.
- The nature and meaning of the problem are unexplained.

#### Gaps worth checking

- If the moon's wrongness is meant to be investigated, what can people observe or verify, and what remains uncertain?
- Does the anomaly have consequences for the world or its inhabitants, or is its significance initially unknown? Either choice will shape what makes the mystery urgent.
- If the cause or meaning is eventually revealed, what kinds of explanations would feel satisfying without making the anomaly seem less strange?

#### Questions for you

- What, specifically, makes the moon seem wrong to someone looking at it?
- Who notices first, and why do they have reason or ability to investigate?
- What might be affected by the anomaly, and who would care most about those effects?
- Do you already have an explanation in mind, or do you want the mystery to remain open during play?

---

## vague-moon · challenge

_too thin to classify safely_

> Something is wrong with the moon.

### baseline (calls: 1, 7821 ms, models: luna-fast)

#### What is compelling

The idea makes a familiar, visible part of the world feel suddenly unreliable. Its vagueness is a strength at this stage: the problem could be physical, perceptual, supernatural, or something else, without committing to any one explanation.

#### The core to preserve

- The moon is central to the premise.
- Something about it is wrong.
- The nature and cause of the wrongness are not yet specified.

#### Things to stress-test

- If the wrongness is visible to everyone, consider how people and institutions respond; if it is noticed only by some, clarify what makes those observations credible.
- A mystery about what is wrong may be compelling, but play could stall if there are no observable clues, changes, or consequences to investigate.
- Decide whether the moon's condition affects everyday life, or whether its importance is primarily symbolic or uncanny; either choice can work, but players may expect the stakes to match the emphasis.
- The moon is a broad image. Without a tone or scale in mind, players may make very different assumptions about whether this is intimate, cosmic, frightening, or wondrous.

#### Questions for you

- What is the first unmistakable sign that something is wrong with the moon?
- Who notices it first, and why might others doubt them?
- Do you want the central appeal to be investigating the cause, coping with the effects, or confronting what the moon means to people?
- What tone do you want the premise to suggest: eerie, wondrous, alarming, intimate, or something else?

### assisted (calls: 2, 12861 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed none; wrong none._

#### Pattern analysis

```text
Thin or missing structure:
- conflict (thin): The moon's abnormal state hints at a problem, but no opposing wants are given.
- escalation (missing): No worsening sequence or deadline is described.
- agency (thin): The anomaly invites investigation, but no protagonist actions are specified.
- opposition (missing): Nothing is shown actively resisting anyone.
- stakes (thin): The moon may matter greatly, but what is at risk is unstated.
- choices (missing): No decisions or trade-offs are described.
- payoff (thin): The moon anomaly is a setup, but no later consequence is indicated.
What the audience will expect:
- An investigation into what is wrong with the moon.
- The anomaly may have effects on the world or its inhabitants.
- An explanation for how the moon became abnormal.
Where it differs: The premise is too brief to establish a recognisable pattern or show how patterns might combine. Its only defined element is a celestial anomaly.
```

#### What is compelling

The plain, unsettling certainty of the premise invites curiosity: the moon is familiar, visible, and important, yet something about it is wrong. Its exact nature is left open, so the idea can support many kinds of investigation without losing its central image.

#### The core to preserve

- The moon is the focus.
- Something is genuinely wrong with it.
- The nature and cause of the anomaly remain unspecified.

#### Things to stress-test

- The anomaly’s appearance may be vivid but ambiguous. Consider what people can directly observe, and what remains uncertain, so investigation has something to work with without giving away an explanation.
- The premise invites questions about effects on the world. If the moon’s condition has no noticeable consequences, players may not know why they should investigate; if the effects are immediately catastrophic, it may narrow their options.
- An investigation needs room for player agency. Consider what kinds of evidence or approaches could reveal different parts of the problem, rather than making one explanation or method the only path forward.
- The idea currently gives no indication of urgency, opposition, or stakes. These need not be settled now, but deciding whether the problem is worsening, contested, or personally consequential will shape the kind of play it supports.

#### Questions for you

- What is the first unmistakable sign that something is wrong with the moon?
- Who notices the anomaly first, and why do the players become involved?
- What might change for people or the world if the moon’s condition continues?
- Do you want the mystery to have a discoverable cause, or is the uncertainty itself central to the appeal?
- What would make investigating the moon difficult or contentious?

---

## water-rights-heist · assess

_clear job, unclear opposition_

> The crew must steal back a desert colony's water rights from the corporation that bought them at auction.

### baseline (calls: 1, 6151 ms, models: luna-fast)

#### What is compelling

The crew’s target is not simply a physical resource but a colony’s water rights: stealing them back makes the job a heist with communal stakes and raises questions about ownership, legitimacy, and who gets to decide how water is shared.

#### The core to preserve

- A crew is responsible for carrying out the theft.
- The target is a desert colony’s water rights.
- A corporation bought those rights at auction.
- The crew’s aim is to take the rights back, not merely to steal water.

#### Gaps worth checking

- Clarify what the water rights consist of in this setting: legal documents, control of infrastructure, access to a supply, or some combination.
- Establish why the auction’s outcome is considered wrong or illegitimate, and whether the colony’s residents agree on what should happen next.
- Consider what makes taking the rights back a heist rather than a straightforward legal, political, or military dispute.
- Decide what the corporation’s ownership lets it do in practice, so the stakes are more specific than the abstract idea of ownership.

#### Questions for you

- Who hired the crew, and what do they want the rights used for once recovered?
- What makes the auction, or the corporation’s purchase, objectionable to the colony?
- What exactly must the crew steal or seize to reclaim the rights?
- Are the colony’s residents united about who should control the water?
- What tone do you want the heist to have: desperate, adventurous, morally tangled, or something else?

### assisted (calls: 2, 13869 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed dwindling-lifeline; wrong none._

#### Pattern analysis

- _off-list_ **Heist**: The crew must steal back the water rights.
- _off-list_ **Corporate exploitation**: A corporation bought the desert colony's water rights at auction.

```text
Familiar patterns in play:
- Heist (The crew must steal back the water rights.).
- Corporate exploitation (A corporation bought the desert colony's water rights at auction.).
Thin or missing structure:
- escalation (thin): The premise gives no indication of how the conflict might worsen over time.
- choices (thin): The premise does not yet specify difficult decisions or trade-offs.
What the audience will expect:
- A heist involving a plan, obstacles and a risky execution.
- The colony's dependence on the water rights will make the outcome consequential.
- The corporation will use its resources or influence to resist the crew.
Where it differs: The premise follows a familiar heist shape, but centres the target on water rights rather than portable valuables. The corporation's auction purchase makes the conflict about control of a vital resource as well as theft.
```

#### What is compelling

The crew’s target is not a portable prize but control over a resource a desert colony depends on. The auction gives the conflict a sharp edge: the corporation may claim it owns the rights, while the colony may see their sale as an injustice to undo.

#### The core to preserve

- A crew must take action to regain the colony’s water rights.
- The rights were bought by a corporation at auction.
- The story centres on a desert colony and its dependence on water.

#### Gaps worth checking

- Clarify what “water rights” grant in practice: control of a source, access to infrastructure, authority to allocate water, or something else. That will shape what the crew must actually steal back.
- Consider how the auction happened and who recognises its legitimacy. If the colony itself is divided about the sale, reclaiming the rights may not automatically resolve the dispute.
- The heist premise invites planning, obstacles and a risky execution. What makes the corporation difficult to outmanoeuvre, and what might change if it notices the crew’s efforts?
- The colony’s dependence makes the stakes vivid, but consider who bears the consequences of a failed or delayed attempt—and whether those costs fall evenly across the community.

#### Questions for you

- What does regaining the water rights let the colony do that it cannot do now?
- Does the crew see this as reclaiming something stolen, breaking an unjust deal, or taking a risk on the colony’s behalf?
- Who in the colony supports the crew, and is anyone worried about the consequences of challenging the corporation?
- What kind of resistance would make the heist feel difficult without making its outcome predetermined?
- What worsening circumstance, if any, would make the crew feel they cannot put this off?

---

## water-rights-heist · challenge

_clear job, unclear opposition_

> The crew must steal back a desert colony's water rights from the corporation that bought them at auction.

### baseline (calls: 1, 7480 ms, models: luna-fast)

#### What is compelling

The premise pairs a clear, urgent goal—recovering water rights—with a morally charged target: a corporation that bought them at auction. It invites questions about who can claim ownership of a vital resource and what “stealing back” justice might cost.

#### The core to preserve

- A crew is central to the premise.
- The colony is in a desert.
- The colony’s water rights were sold at auction.
- A corporation bought those rights.
- The crew’s goal is to steal the rights back.

#### Things to stress-test

- Clarify what “water rights” mean in practice: control of a source, legal authority to distribute water, access to infrastructure, or something else. The theft’s stakes and possible approaches depend on this.
- The auction could be a legitimate sale, a corrupt process, or something in between. If the premise leaves this unclear, players may not know whether they are correcting an injustice or overriding a contested agreement.
- “Steal back” suggests a specific approach, but the crew may want to pursue legal, political, or public routes instead. Decide whether it is the crew’s chosen plan or the campaign’s required method.
- Consider what the colony wants and whether its residents agree about the rights, the corporation, or the crew’s intervention. Treating the colony as a single voice could flatten the conflict.

#### Questions for you

- What exactly did the corporation acquire at auction, and how does that control affect the colony’s access to water?
- Why does the crew believe the rights should be returned to the colony?
- Is stealing the rights the crew’s chosen strategy, or is it a fixed premise they must follow?
- How divided, if at all, are the colony’s residents about the sale and what should happen next?

### assisted (calls: 2, 15203 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed dwindling-lifeline; wrong none._

#### Pattern analysis

- _off-list_ **Heist**: The crew must steal back the colony's water rights.
- _off-list_ **Corporate exploitation**: A corporation bought the colony's water rights at auction.

```text
Familiar patterns in play:
- Heist (The crew must steal back the colony's water rights.).
- Corporate exploitation (A corporation bought the colony's water rights at auction.).
Thin or missing structure:
- escalation (thin): The premise gives no indication of how the conflict might worsen over time.
- choices (thin): The premise does not yet specify difficult trade-offs for the crew.
- payoff (thin): The water rights set up a clear goal, but no later payoff is specified.
What the audience will expect:
- A plan to break into or otherwise infiltrate the corporation's operation.
- Obstacles that complicate the theft.
- Consequences for the colony and its residents if the crew succeeds or fails.
Where it differs: The setup follows a straightforward heist shape, with control of water rights as the prize and a corporation as the opposition. It does not yet combine that premise with a twist or a second narrative pattern.
```

#### What is compelling

The crew’s goal is both a heist and a direct challenge to a system that has made a desert colony’s water subject to corporate ownership. The stakes are tangible: success could change who controls an essential resource.

#### The core to preserve

- A crew is trying to steal something back.
- The thing they are reclaiming is a desert colony’s water rights.
- A corporation bought those rights at auction.
- The central conflict is about who controls access to water.

#### Things to stress-test

- Clarify what ‘steal back the water rights’ means in practice. Are the rights represented by a document, a digital record, control of infrastructure, or something else? The form of the prize will shape what infiltration and obstacles make sense.
- The auction establishes how the corporation acquired the rights, but not whether the sale was legal, coercive, or accepted by the colony. That distinction could affect whether the crew is seen as reclaiming stolen property, breaking the law, or both.
- The colony’s residents may not all want the same outcome. Consider whether people depend on the corporation’s current water supply, fear retaliation, or disagree about who should control the rights after the heist.
- The goal is clear, but the likely fallout is not yet defined. Decide what could worsen if the crew fails, and what new problems success might create, so the stakes extend beyond getting past the corporation’s security.

#### Questions for you

- What exactly can the crew take or change to reclaim the water rights?
- How did the corporation win the auction, and how do the colony’s residents understand that sale?
- Who in the colony might oppose the heist, even if they want fair access to water?
- What would make the crew’s success costly or complicated for the colony?

---

## drowned-city-ferry · assess

_investigation hook with no listed pattern_

> A detective in a half-drowned city realises every missing person she has looked for this year rode the same night ferry.

### baseline (calls: 1, 7372 ms, models: luna-fast)

#### What is compelling

The ferry turns a series of separate missing-person cases into a striking shared pattern, giving the detective a concrete lead without explaining what it means. The half-drowned city makes the route feel especially evocative: the ferry may be ordinary transport, a lifeline, or something more unsettling.

#### The core to preserve

- A detective investigating missing people
- A half-drowned city
- The missing people she has sought this year
- Their shared connection: each rode the same night ferry

#### Gaps worth checking

- Clarify whether the ferry connection is a clue to a deliberate pattern, an uncanny coincidence, or something that remains ambiguous.
- Decide how much the detective already knows about the ferry and its passengers; too little may make her feel passive, while too much may collapse the mystery early.
- Consider what makes the half-drowned city matter to this investigation beyond atmosphere, and how prominently it should shape events.
- The idea centres on a detective. If this is for a group game, consider how other player characters can meaningfully contribute without displacing her role.

#### Questions for you

- What does the detective personally stand to lose if she follows this lead?
- What, if anything, do the missing people have in common besides riding the ferry?
- What makes this particular night ferry distinctive to the people who rely on it?
- Do you want the mystery to lean towards crime, the uncanny, social conflict, or leave its nature open?
- Is the detective the player character, or is she one important figure in a wider group’s story?

### assisted (calls: 2, 15151 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed none; wrong none._

#### Pattern analysis

- _off-list_ **Linked Disappearances**: Every missing person the detective has investigated rode the same night ferry.

```text
Familiar patterns in play:
- Linked Disappearances (Every missing person the detective has investigated rode the same night ferry.).
Thin or missing structure:
- conflict (thin): The detective has uncovered a connection, but no clash of wants is yet established.
- escalation (thin): The disappearances span a year, but no worsening threat or deadline is specified.
- opposition (missing): No person or force is shown resisting the investigation.
- stakes (thin): People have gone missing, but who else is at risk and what can be lost remain unclear.
- choices (missing): The premise does not yet present a decision with competing costs.
Reveal dependency: The connection between the missing people and the ferry is the central reveal so far; once known, tension can remain in discovering what happened to them and whether it will happen again.
What the audience will expect:
- The detective will investigate the night ferry and its passengers or crew.
- The disappearances share a cause or circumstance tied to the ferry.
- The half-drowned city will shape the investigation or its dangers.
Where it differs: The premise combines a linked-disappearances mystery with a striking urban setting and a specific transit route. It does not yet establish a broader narrative pattern from the supplied list.
```

#### What is compelling

The connection is vivid and immediately playable: a detective’s cases from across a whole year converge on one night ferry in a half-drowned city. The ferry offers a focused place to investigate, while the flooded setting promises to shape what can be reached, remembered and uncovered.

#### The core to preserve

- A detective investigating missing people
- Every missing person she has looked for this year rode the same night ferry
- The ferry runs at night
- The city is half-drowned

#### Gaps worth checking

- What does the ferry connection mean in practice: did the missing people travel together, take the same route on different nights, or share some other link?
- How does the half-drowned city affect the investigation beyond atmosphere—for example, access to places, evidence, witnesses or the ferry’s route?
- What makes this discovery urgent now, and what could be lost if the detective cannot act quickly?
- Is anyone actively obstructing the investigation, or does the mystery’s opposition come from the city, the ferry’s conditions or the difficulty of tracing what happened?

#### Questions for you

- What first led the detective to compare the missing people’s journeys, and what evidence confirms they all rode this ferry?
- What is distinctive about this particular night ferry and its passengers, crew or route?
- What does the detective personally stand to lose or hope to learn through this investigation?
- Do you imagine the disappearances as connected by a deliberate cause, an unexpected circumstance, or something the detective has not yet considered?
- How do you want the half-drowned city to shape the mystery as well as its mood?

---

## drowned-city-ferry · challenge

_investigation hook with no listed pattern_

> A detective in a half-drowned city realises every missing person she has looked for this year rode the same night ferry.

### baseline (calls: 1, 6937 ms, models: luna-fast)

#### What is compelling

The premise links intimate investigative work to a striking, repeatable clue: every missing person the detective has searched for this year rode the same night ferry. The half-drowned city makes that route feel central to daily life, while the pattern invites suspicion without yet explaining what it means.

#### The core to preserve

- A detective is looking into missing people.
- The city is half-drowned.
- Every missing person she has looked for this year rode the same night ferry.
- The ferry connection is the discovery that changes how she understands the cases.

#### Things to stress-test

- Clarify whether the detective is a player character or a central NPC; that choice affects how much of the mystery the players can investigate directly.
- Consider how the detective established the pattern. If the ferry manifests are incomplete, unreliable, or hard to access, make clear what evidence she has and how certain she is.
- The phrase “this year” gives the pattern a useful boundary, but may prompt questions about why these cases are grouped together and whether earlier disappearances matter.
- Decide how the half-drowned city affects ferry travel and the investigation in concrete terms, so it feels integral rather than only atmospheric.

#### Questions for you

- Who is the detective in relation to the players: one of them, an ally, or someone they encounter?
- What makes this particular night ferry distinctive in the city’s ordinary life?
- How certain is the detective that every missing person rode it, and what evidence supports that conclusion?
- Do you want the shared ferry ride to suggest a deliberate connection, an unsettling coincidence, or leave that open?

### assisted (calls: 2, 14606 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed none; wrong none._

#### Pattern analysis

- _off-list_ **Investigative mystery**: A detective connects the missing persons she has investigated to the same night ferry.

```text
Familiar patterns in play:
- Investigative mystery (A detective connects the missing persons she has investigated to the same night ferry.).
Thin or missing structure:
- conflict (thin): The detective is pursuing a connection between the disappearances, but no opposing want is specified.
- escalation (thin): The missing persons share a striking link, but no worsening event or pressure is described.
- opposition (missing): No person, force or obstacle is shown pushing back against the investigation.
- stakes (thin): People have gone missing, but the consequences for them or the city are not specified.
- choices (missing): The premise gives no decision with competing costs.
What the audience will expect:
- The detective will investigate the ferry and its passengers or crew.
- The disappearances will prove to share a cause or connection.
- The half-drowned city will shape the investigation's atmosphere or practical challenges.
Where it differs: The setup pairs a detective’s recurring missing-person cases with one shared transit route in a half-drowned city. It establishes a mystery hook, but not yet the broader familiar patterns of a hidden conspiracy, a threatened community or a dwindling resource.
```

#### What is compelling

A detective noticing that every missing person she has pursued this year rode the same night ferry is a clean, compelling hook. The half-drowned city gives that route an evocative setting and raises the possibility that the ferry is more than a backdrop.

#### The core to preserve

- The protagonist is a detective.
- The city is half-drowned.
- She has investigated multiple missing-person cases this year.
- Every person she has looked for rode the same night ferry.

#### Things to stress-test

- Clarify what counts as a connection: did the missing people ride the ferry on the same night, on different nights, or simply share a route? Each version implies a different scale and shape of investigation.
- The ferry is an obvious place to look. Consider what might make investigating it difficult or uncertain, without making the connection feel arbitrary—for example, unreliable records, changing routes, or passengers who remember events differently.
- The city’s flooding is distinctive; check whether it actively affects the search, the ferry service, or the fate of missing people, rather than functioning only as atmosphere.
- The missing people establish stakes, but their significance and the urgency of the investigation are not yet clear. Consider whose absence matters now, and what could change if the detective delays.

#### Questions for you

- What first makes the detective realise that every missing person she has pursued rode this ferry—and how certain is she of that pattern?
- What does the night ferry provide that other routes in the half-drowned city cannot?
- What obstacle, person, or competing priority could complicate an investigation of the ferry without simply shutting it down?
- Are the missing people connected to one another, or is their shared ferry ride the only link the detective has found?
- What would make the next step urgent for the detective: a new disappearance, a change to the ferry service, or something else you have in mind?

---

## lighthouse-log · assess

_horror premise built on a single eerie fact_

> A lighthouse keeper's logbook records every ship that will sink, in her own handwriting, dated a century ago.

### baseline (calls: 1, 6066 ms, models: luna-fast)

#### What is compelling

The eerie contradiction is immediately compelling: a keeper’s own handwriting records future shipwrecks, yet the entries are dated a century ago. It raises questions about fate, authorship and whether knowing a disaster can change it, while offering a strong mystery without dictating its answer.

#### The core to preserve

- A lighthouse keeper
- A logbook in her own handwriting
- The logbook records ships that will sink
- The entries are dated a century ago

#### Gaps worth checking

- How legible and specific are the entries? If they name ships and dates precisely, that may make the mystery feel like a puzzle with a single solution; if they are vague, players may struggle to act on them.
- What does the century-old date mean in this story: an impossible clue, a known local fact, or something whose meaning is itself uncertain?
- How much can the keeper’s identity and circumstances be established without resolving the mystery too early?
- Consider what keeps the premise engaging after the first revelation, especially if players prevent a recorded sinking or choose not to intervene.

#### Questions for you

- Who is the lighthouse keeper, and what makes the handwriting unmistakably hers?
- How do people first discover the logbook, and who else knows what it contains?
- Can the recorded sinkings be prevented, or is that uncertainty central to the idea?
- What tone do you want the mystery to have: eerie, tragic, hopeful, or something else?
- What would you most like players to investigate or decide because of the logbook?

### assisted (calls: 2, 14973 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed prophecy-trap; wrong none._

#### Pattern analysis

- _off-list_ **Anachronistic Record**: The logbook is dated a century ago but is written in the keeper's own handwriting.
- _off-list_ **Foreknowledge of Disaster**: The logbook records every ship that will sink.

```text
Familiar patterns in play:
- Anachronistic Record (The logbook is dated a century ago but is written in the keeper's own handwriting.).
- Foreknowledge of Disaster (The logbook records every ship that will sink.).
Thin or missing structure:
- conflict (thin): The record implies danger, but no clash of wants is specified.
- escalation (thin): Future sinkings suggest worsening danger, but no progression is described.
- agency (thin): The keeper might act on the logbook, but her role and choices are unstated.
- opposition (missing): No person or force is shown resisting the keeper.
- stakes (thin): Ships are at risk, but who is aboard and what their loss means is unknown.
- choices (missing): The premise gives no decisions or trade-offs.
Reveal dependency: If the handwriting’s impossible date is explained, tension can remain in whether the keeper can prevent the recorded sinkings.
What the audience will expect:
- The keeper will investigate how the century-old logbook bears her handwriting.
- The listed ships will face danger, possibly in an order or pattern.
- The keeper may try to warn or save their crews.
- Her actions may affect whether the logbook's predictions come true.
Where it differs: The premise links foreknowledge of maritime disasters to an impossible personal artefact, rather than to a prophecy or an outside oracle. It leaves open whether the logbook is warning the keeper or drawing her into the events it records.
```

#### What is compelling

The logbook joins an intimate impossibility—the keeper recognises her own handwriting in a book dated a century ago—to a concrete, looming danger: ships are destined to sink. It raises a compelling uncertainty about whether the book is a warning, a record of events that cannot be changed, or somehow part of what causes them.

#### The core to preserve

- The central figure is a lighthouse keeper.
- A logbook records every ship that will sink.
- The logbook is dated a century ago.
- The handwriting is unmistakably the keeper’s own.

#### Gaps worth checking

- How certain is the logbook’s information? If it names ships but not dates, causes, or locations, consider whether that uncertainty is an intended source of investigation or frustration.
- What makes the first recorded sinking urgent now? Without a near-term event, the keeper’s discovery may feel intriguing but not yet demand action.
- How much can the keeper’s actions change what the book records? If the sinkings are unavoidable, what meaningful questions or choices remain for play?
- Does every entry concern ships and crews the keeper can plausibly reach or affect? The scale of the list will shape whether the story feels intimate, communal, or vast.

#### Questions for you

- What first convinces the keeper that the handwriting is hers, and that the logbook really is a century old?
- What is the next ship at risk, and what makes its fate matter to the keeper or the people around her?
- Does the logbook record only that a ship will sink, or does it offer details that could help someone intervene?
- What would make the keeper doubt the book, resist acting on it, or fear that trying to prevent a sinking might bring it about?

---

## lighthouse-log · challenge

_horror premise built on a single eerie fact_

> A lighthouse keeper's logbook records every ship that will sink, in her own handwriting, dated a century ago.

### baseline (calls: 1, 5688 ms, models: luna-fast)

#### What is compelling

The logbook’s impossible combination of precise prediction and familiar handwriting makes the mystery intimate as well as uncanny. The century-old dates raise questions about fate, identity and whether recording a disaster helps bring it about.

#### The core to preserve

- A lighthouse keeper
- A logbook that records ships that will sink
- The entries are in the keeper’s own handwriting
- The entries are dated a century ago

#### Things to stress-test

- Clarify what “her own handwriting” means if the keeper is living in the present: does she recognise it, and is she the same person who wrote the entries a century ago?
- Decide how definite the records are. Do they name ships and dates, or leave room for mistaken identities and ambiguous predictions?
- Consider what makes this playable beyond uncovering an explanation: can characters affect a listed sinking, or is the tension chiefly in interpreting the logbook?
- The premise implies many recorded disasters over a century. Establish whether the logbook covers every ship, a particular stretch of sea, or only a select few, so its scope feels legible.

#### Questions for you

- Is the keeper alive in the present, or is the logbook discovered after her time?
- What does the keeper herself believe about the entries?
- Can a ship listed in the book be saved, and what might that change?
- What tone do you want the mystery to invite: eerie, tragic, investigative, or something else?

### assisted (calls: 2, 18146 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed prophecy-trap; wrong none._

#### Pattern analysis

- _off-list_ **Foreknowledge of disaster**: The logbook records ships that will sink before their sinkings occur.

```text
Familiar patterns in play:
- Foreknowledge of disaster (The logbook records ships that will sink before their sinkings occur.).
Thin or missing structure:
- conflict (thin): The predicted sinkings imply a problem, but no character's wants or response is specified.
- escalation (thin): The logbook could record further sinkings, but no worsening sequence is established.
- agency (thin): The keeper may be able to act on the records, but her choices are not described.
- opposition (missing): No person or force is shown resisting anyone's efforts.
- stakes (thin): Sinking ships imply loss of life or vessels, but whose lives or interests are at risk is unspecified.
- choices (missing): No decision or trade-off is yet presented.
Reveal dependency: Once the logbook's origin or predictive power is explained, tension can remain in whether the keeper can prevent the recorded sinkings and what intervening might cost.
What the audience will expect:
- The keeper will investigate how the logbook came to bear her handwriting a century ago.
- The recorded sinkings will occur, or the keeper will try to change their outcomes.
- The logbook's predictions will place the keeper before difficult decisions.
Where it differs: The premise centres the mystery on a mundane record in the keeper's own handwriting, rather than on a public prophecy or an established supernatural authority. It has not yet established whether the predictions shape events or can be resisted.
```

#### What is compelling

The image is strikingly specific: a century-old logbook records future shipwrecks in the lighthouse keeper’s own handwriting. The handwriting makes the mystery personal, while the ships’ fates give it an immediate human cost.

#### The core to preserve

- A lighthouse keeper
- A logbook recording ships that will sink
- The entries are in the keeper’s own handwriting
- The logbook is dated a century ago

#### Things to stress-test

- Clarify what makes the logbook demand attention now. If a recorded sinking is imminent, its timing can create urgency; if not, the opening may need another reason for the keeper or players to investigate.
- Decide how reliable the entries are, and what counts as a match. If names, dates, or ship descriptions are ambiguous, that can create doubt, but too much uncertainty may make it hard to judge whether an intervention worked.
- Consider whether the keeper can plausibly affect a ship’s fate, and what limits that ability. If every sinking can be prevented easily, the predictions may lose tension; if nothing can change, player agency may feel constrained.
- The handwriting and century-old date invite investigation into the keeper’s connection to the past. Consider how much of that origin needs an answer, and whether discovering it should resolve the mystery or deepen the choices around the ships.

#### Questions for you

- Who is the keeper in relation to the players, and what makes them care about the logbook’s predictions?
- How soon is the next recorded sinking, and what makes this entry feel credible—or doubtful?
- Can the keeper’s actions change a recorded fate, or do they affect the circumstances and costs instead?
- What would make the keeper recognise the handwriting as hers: a distinctive detail, a name, or something she has not written yet?
- Do you want the central mystery to be where the logbook came from, whether the sinkings can be prevented, or how much the keeper should risk trying?

---

## bridge-toll · assess

_political premise with several familiar shapes_

> Two rival guilds share the only bridge across the river, and its architect has died without saying who inherits the toll.

### baseline (calls: 1, 5820 ms, models: luna-fast)

#### What is compelling

The premise pairs a tangible, shared resource—the only bridge across the river—with a personal mystery: its architect died without naming an heir to the toll. The rival guilds make the inheritance question immediately contentious, while the bridge gives the dispute practical stakes.

#### The core to preserve

- Two rival guilds
- The only bridge across the river
- Both guilds share it
- The architect has died
- The architect left the toll's inheritance unresolved

#### Gaps worth checking

- What makes the bridge the only crossing, and how does that shape the consequences of a dispute?
- What does inheriting the toll mean in practice: income, authority over the bridge, or both?
- Why did the architect's death leave the inheritance unresolved, and is that ambiguity intentional?
- What makes the guilds rivals, and what do they currently gain from sharing the bridge?

#### Questions for you

- What sort of play do you want this premise to invite: negotiation, investigation, civic problem-solving, or something else?
- Who are the players in relation to the guilds and the architect?
- Is the unresolved inheritance a genuine uncertainty, a deliberate choice by the architect, or a mystery with a discoverable answer?
- What makes each guild's claim feel understandable or compelling?

### assisted (calls: 2, 13650 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed empty-throne, fragile-truce; wrong none._

#### Pattern analysis

- _off-list_ **Contested succession**: The architect has died without saying who inherits the toll.
- _off-list_ **Chokepoint control**: The two rival guilds share the only bridge across the river.

```text
Familiar patterns in play:
- Contested succession (The architect has died without saying who inherits the toll.).
- Chokepoint control (The two rival guilds share the only bridge across the river.).
Thin or missing structure:
- escalation (thin): The dispute could sharpen, but no worsening event or deadline is stated.
- agency (thin): The protagonists' role in deciding or influencing the inheritance is not specified.
- stakes (thin): Control of the toll is at stake, but its consequences for the guilds or others are unclear.
- choices (thin): The inheritance creates a dispute, but no consequential decisions or trade-offs are described.
What the audience will expect:
- The guilds will compete or negotiate over the toll.
- The bridge's control will affect movement or trade across the river.
- The architect's unspoken decision, if any, may become important.
Where it differs: The setup combines a rivalry with a disputed inheritance over a shared chokepoint. It currently follows the familiar shape of a contest over succession and control, without yet specifying a twist or wider consequence.
```

#### What is compelling

The bridge makes the guild rivalry concrete: both sides depend on the same crossing, so control of the toll could affect more than prestige or money. The architect’s death leaves an appealing unanswered question without deciding whether there was a hidden plan.

#### The core to preserve

- Two rival guilds share the only bridge across the river.
- The bridge is a crucial chokepoint.
- Its architect has died.
- The architect left no clear word about who inherits the toll.

#### Gaps worth checking

- Clarify what inheriting the toll means in practice: who collects it, sets its amount, and is responsible for maintaining the bridge?
- Consider who else relies on the crossing, and whether the toll dispute affects ordinary travellers, trade, or communities on either bank.
- The guilds’ rivalry is clear, but what distinguishes their aims or methods beyond wanting control of the toll?
- The architect’s silence invites speculation. Decide whether the uncertainty is simply unresolved, or whether there are clues, records, or people who claim to know the architect’s wishes.

#### Questions for you

- What makes these two guilds rivals, and what does each stand to gain or lose from control of the toll?
- Who currently collects the toll, and what happens to that income while the inheritance is disputed?
- How much do travellers and nearby communities depend on the bridge, and can they influence the dispute?
- Do you want the architect’s unspoken decision to remain a mystery, or might the architect have left evidence that can be interpreted in different ways?
- What role would you like the players to have in the dispute: interested outsiders, representatives of a guild, mediators, or something else?

---

## bridge-toll · challenge

_political premise with several familiar shapes_

> Two rival guilds share the only bridge across the river, and its architect has died without saying who inherits the toll.

### baseline (calls: 1, 6893 ms, models: luna-fast)

#### What is compelling

A single piece of infrastructure gives the rivalry a clear, tangible focus, while the architect’s death leaves an unresolved question of authority. The toll can make the dispute matter to ordinary travellers as well as the guilds.

#### The core to preserve

- There are two rival guilds.
- They share the only bridge across the river.
- The bridge’s architect has died.
- The architect did not say who inherits the toll.

#### Things to stress-test

- Why does the architect’s decision determine who inherits the toll: did they own the bridge, hold a legal appointment, or have some other recognised authority? Clarifying this can make the dispute legible without requiring a single obvious answer.
- What does sharing the bridge mean in practice? If both guilds already collect or control parts of the toll, the inheritance question may need a sharper definition.
- If this is the only bridge, why has nobody built, repaired, bypassed, or forcibly taken it? The answer could establish the bridge’s importance and the limits on each guild’s power.
- Will the toll dispute affect travellers, nearby communities, or the guilds’ members? If not, consider what makes the question urgent enough to draw attention now.

#### Questions for you

- What makes the two guilds rivals, and what do they have in common that lets them share the bridge?
- What kind of authority did the architect have over the bridge and its toll?
- Who relies on the bridge, and what happens to them while the guilds dispute the inheritance?
- What tone do you want for the dispute: a tense negotiation, a public scandal, a dangerous standoff, or something else?

### assisted (calls: 2, 16101 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed empty-throne, fragile-truce; wrong none._

#### Pattern analysis

- _off-list_ **Contested succession**: The architect has died without saying who inherits the toll.

```text
Familiar patterns in play:
- Contested succession (The architect has died without saying who inherits the toll.).
Thin or missing structure:
- escalation (thin): The rivalry could intensify, but no worsening event or deadline is specified.
- agency (thin): The unresolved inheritance leaves room to influence the outcome, though no protagonists are identified.
- stakes (thin): Control of the bridge toll is at stake, but its importance to either guild or the wider community is unstated.
- choices (missing): No decisions or trade-offs for the protagonists are yet described.
What the audience will expect:
- The guilds will compete to claim the toll or influence its inheritance.
- Control of the only bridge will give its holder leverage over river crossings.
- The architect's unspoken decision, if there was one, may become a point of investigation or dispute.
Where it differs: The premise centres a succession dispute over a shared piece of infrastructure rather than a vacant seat of government. Its main tension comes from the combination of rival guilds and a single crossing, with the architect's silence leaving the outcome open.
```

#### What is compelling

The only bridge makes control of a seemingly simple toll consequential, while the architect’s silence leaves the rival guilds with room to argue, investigate, or negotiate over what comes next.

#### The core to preserve

- There are two rival guilds.
- They share the only bridge across the river.
- The bridge’s architect has died.
- The architect left no stated heir to the toll.

#### Things to stress-test

- What does control of the toll actually give a guild: income, authority over crossings, or leverage over trade? If those stakes are unclear, the rivalry may feel abstract.
- How has the bridge been shared up to now, and what makes the architect’s death change that arrangement? Without a prior agreement or custom, the dispute’s trigger may be hard to grasp.
- Why can’t the guilds simply agree on a temporary toll-keeper or keep sharing the revenue? A credible obstacle to compromise will help the conflict hold up.
- Does the architect’s silence mean there is genuinely no decision, or might evidence of their wishes exist? If investigation matters, consider what could plausibly count as evidence and who might trust it.

#### Questions for you

- What does each guild stand to gain or lose beyond the toll money?
- Who depends on the bridge, and how might the guilds’ dispute affect them?
- Was there a known custom or agreement for sharing the bridge before the architect died?
- Do you want the architect’s unspoken wishes to be a mystery to investigate, or is the uncertainty itself the point?
- Who are the protagonists in relation to the guilds and the bridge, and what gives them a reason to get involved?

---

## bakery-caravan · assess

_low-conflict, character-led premise_

> A travelling bakery caravan follows a festival circuit across the desert, and this year the festivals are being cancelled one by one.

### baseline (calls: 1, 6509 ms, models: luna-fast)

#### What is compelling

The contrast between a dependable travelling bakery and a festival circuit becoming unreliable gives the caravan an immediate reason to keep moving—and makes each cancellation potentially reveal a wider change in the desert. The bakery also gives the premise a distinctive, tangible centre: its work and relationships are tied to the places it visits.

#### The core to preserve

- A travelling bakery caravan
- A circuit of festivals across the desert
- The festivals are being cancelled one by one
- The cancellations are happening this year

#### Gaps worth checking

- What makes the caravan’s festival route important to its survival or purpose, beyond providing a backdrop for travel?
- Are the cancellations connected, or is their apparent pattern a mystery, coincidence, or mistaken assumption?
- What does a festival cancellation mean for the people who rely on the caravan, and for those who would rather it moved on?
- How much of the campaign’s appeal should come from the bakery and its community, versus investigating the cancellations?

#### Questions for you

- Who runs the caravan, and what makes this particular bakery meaningful to them?
- What do the festivals provide—customers, community, cultural significance, or something else?
- Does the caravan have a personal stake in finding out why the festivals are being cancelled?
- What tone or genre do you want the desert journey and the cancellations to suggest?

### assisted (calls: 2, 13090 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed none; wrong none._

#### Pattern analysis

- _off-list_ **Disrupted Circuit**: The caravan depends on a festival circuit, and this year the festivals are being cancelled one by one.

```text
Familiar patterns in play:
- Disrupted Circuit (The caravan depends on a festival circuit, and this year the festivals are being cancelled one by one.).
Thin or missing structure:
- conflict (thin): The caravan's route and work are disrupted, but no specific clash of wants is stated.
- agency (thin): The caravan could respond to the cancellations, but no actions or decisions are specified.
- opposition (missing): No person or force causing the cancellations or actively resisting the caravan is identified.
- stakes (thin): The cancellations threaten the caravan's festival work, but what its members stand to lose is unstated.
- choices (missing): The premise presents no decisions with competing costs.
What the audience will expect:
- The caravan will try to discover why the festivals are being cancelled.
- Each cancellation will create a new obstacle or change the caravan's plans.
- The caravan's livelihood or relationships may depend on keeping the circuit going.
Where it differs: The premise centres on a travelling bakery and a sequence of cancelled festivals, rather than clearly invoking any of the listed patterns. Its setup is currently a disruption without a specified cause, opposition or response.
```

#### What is compelling

A travelling bakery gives the festival circuit a vivid, tangible centre: its work, supplies and fortunes are tied to the places it visits. The cancellations create a clear change to that familiar rhythm and invite curiosity about what the caravan will do next, without yet dictating why it is happening.

#### The core to preserve

- A travelling bakery caravan
- A circuit of festivals across the desert
- The festivals are being cancelled one by one this year

#### Gaps worth checking

- What makes the cancellations urgent for the caravan beyond disrupting its route: lost income, spoilage, promised deliveries, or something else?
- Will the cancellations have a shared cause, or might each festival have different reasons? Either approach could shape how much investigation the premise invites.
- What can the caravan do in response, and what might those options cost it? Without a consequential choice, the cancellations may remain background trouble rather than playable pressure.
- How directly should the caravan’s members, festival organisers, or local communities be involved in the problem? A clear point of contact could make the disruption easier to engage with.

#### Questions for you

- What does the caravan stand to lose if the festival circuit fails this year?
- Is the caravan mainly trying to keep its business going, uncover why the festivals are being cancelled, or pursue another goal?
- Do you imagine the cancellations having one underlying cause, or arising from separate local circumstances?
- Who travels with the bakery, and what personal or shared ties make this circuit matter to them?
- How much of the appeal should come from the warmth and everyday life of the caravan, and how much from the mystery or danger behind the cancellations?

---

## bakery-caravan · challenge

_low-conflict, character-led premise_

> A travelling bakery caravan follows a festival circuit across the desert, and this year the festivals are being cancelled one by one.

### baseline (calls: 1, 5744 ms, models: luna-fast)

#### What is compelling

The contrast between the warm, practical life of a travelling bakery and the growing absence of festivals gives the premise an immediate human scale. The cancellations create a mystery or crisis without dictating its cause, while the desert circuit naturally connects distinct communities.

#### The core to preserve

- A travelling bakery caravan
- A festival circuit across the desert
- Festivals are being cancelled one by one
- This is happening during the current year’s circuit

#### Things to stress-test

- Clarify what a festival means to the caravan beyond a place to sell baked goods: is it chiefly income, community, tradition, or something else?
- Consider how cancellations are communicated and whether they share a noticeable pattern. If there is no pattern, players may struggle to tell a mystery from a series of unrelated setbacks.
- Establish what keeps the caravan travelling despite cancellations, and how soon its supplies, finances, or morale become strained.
- Check that the desert’s distances and travel times leave room for meaningful choices without making each cancellation feel like the same obstacle repeated.

#### Questions for you

- What makes this particular bakery caravan worth following: its people, its recipes, its history, or something else?
- What do festivals provide to the communities that host them?
- Do you picture the cancellations as connected, or is the uncertainty about whether they are connected part of the appeal?
- What tone do you want the caravan’s predicament to have: cosy, tense, mournful, comic, or a mix?

### assisted (calls: 2, 12592 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed none; wrong none._

#### Pattern analysis

- _off-list_ **Disrupted circuit**: The caravan follows a festival circuit, and the festivals are being cancelled one by one.

```text
Familiar patterns in play:
- Disrupted circuit (The caravan follows a festival circuit, and the festivals are being cancelled one by one.).
Thin or missing structure:
- conflict (thin): The caravan's route and livelihood may clash with the wave of cancellations, but no specific wants are stated.
- agency (thin): The caravan could respond to the cancellations, but no actions or aims are specified.
- opposition (missing): No person, force or cause behind the cancellations is identified.
- stakes (thin): The caravan's festival circuit is threatened, but what its members stand to lose is not stated.
- choices (missing): The premise presents no decisions with competing costs.
What the audience will expect:
- The caravan will investigate why the festivals are being cancelled.
- Each cancellation will complicate the caravan's route or plans.
- The remaining festivals may face a growing threat.
Where it differs: The setup centres on a travelling bakery caravan and a festival circuit rather than a conventional expedition or settlement in danger. Its pattern is currently a disrupted journey, with no stated cause or active opposition yet.
```

#### What is compelling

A bakery caravan depends on a sequence of festivals for its livelihood, so each cancellation threatens both its route and the communal occasions that give its work purpose. The desert festival circuit offers a natural way for a travelling story to gather momentum without requiring a single fixed destination.

#### The core to preserve

- A travelling bakery caravan
- A desert setting
- A circuit of festivals
- Festivals being cancelled one by one
- The cancellations happening this year

#### Things to stress-test

- The cancellations invite an investigation, but it may not be clear whether discovering their cause is essential, optional, or even possible. Decide how much of the appeal rests on solving a mystery versus coping with its effects.
- If every cancellation is simply another lost stop, the pattern could feel repetitive. Consider what might make each one matter differently to the caravan, its members, or the people who would have attended.
- The caravan's livelihood is under threat, but the scale of the stakes is open: could it lose money, relationships, a home, a tradition, or something else? Clarifying what is at risk can give the cancellations more weight.
- The premise suggests growing urgency, but does not yet say what the caravan can do about it. If players are expected to investigate or intervene, consider what kinds of action are available and whether there are reasons they might choose otherwise.

#### Questions for you

- What does the caravan stand to lose if the festival circuit collapses, beyond its next source of income?
- Do you imagine a discoverable cause behind the cancellations, or do you want the focus to be on how people respond to them?
- What makes the festivals important to the caravan: business, community, tradition, personal ties, or something else?
- How varied do you want the cancellations to be, and what might make each one affect the caravan differently?
- Should the caravan be able to influence whether any remaining festivals go ahead, or is its main challenge adapting to events?

---

## retired-chosen-one · assess

_premise that already subverts a familiar pattern_

> The chosen one fulfilled the prophecy twenty years ago; she now runs a tax office, and the dark lord she defeated is suing for compensation.

### baseline (calls: 1, 7233 ms, models: luna-fast)

#### What is compelling

The premise puts epic fantasy consequences into an unexpectedly mundane setting: the chosen one has moved on to tax administration, while her defeated enemy is using the legal system to challenge the victory. The contrast invites humour, but also leaves room for questions about responsibility, justice, and what happens after a prophecy is fulfilled.

#### The core to preserve

- The prophecy was fulfilled twenty years ago.
- The chosen one is a woman who now runs a tax office.
- The dark lord she defeated is suing her for compensation.
- The collision between legendary history and mundane bureaucracy.

#### Gaps worth checking

- Decide how seriously the world treats the lawsuit: is the humour in the absurdity, or does the case expose a genuine dispute about the costs of the victory?
- Clarify what the dark lord claims compensation for, and why the claim has a chance of being heard.
- Consider who the players are in relation to the former chosen one and the lawsuit, so they have a meaningful reason to engage without assuming they must solve the case in one particular way.
- Explore whether the prophecy and the defeat still shape the chosen one’s life, or whether her present-day office is deliberately separate from that past.

#### Questions for you

- What does the dark lord say he is owed, and what makes his claim more than a joke?
- Is the tone primarily comic, serious, or a blend of both?
- Who are the players in this story, and what connects them to the chosen one or the case?
- What does the chosen one want now, apart from dealing with the lawsuit?

### assisted (calls: 2, 16584 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed none; wrong none._

#### Pattern analysis

- _off-list_ **After the Quest**: The chosen one fulfilled the prophecy twenty years ago and now runs a tax office.
- _off-list_ **The Villain Seeks Redress**: The dark lord she defeated is suing for compensation.

```text
Familiar patterns in play:
- After the Quest (The chosen one fulfilled the prophecy twenty years ago and now runs a tax office.).
- The Villain Seeks Redress (The dark lord she defeated is suing for compensation.).
Thin or missing structure:
- escalation (thin): The lawsuit could sharpen the conflict, but no worsening developments are specified.
- agency (thin): The former hero may have choices in the case, but her role in events is not yet clear.
- stakes (thin): Compensation is sought, but what either side stands to lose or gain is unspecified.
- choices (missing): The premise does not yet show a decision with meaningful trade-offs.
What the audience will expect:
- The lawsuit will revisit the consequences of the old prophecy and the dark lord’s defeat.
- The former hero’s ordinary bureaucratic life will collide with her legendary past.
- The dark lord may present a case that complicates the usual account of the victory.
Where it differs: The premise shifts the chosen-one story into its aftermath, making a tax office and a compensation suit the arena for the old conflict. It does not yet establish whether the dark lord has a just claim or what the lawsuit could change.
```

#### What is compelling

The epic conflict has become an ordinary legal dispute: the chosen one who saved the world now runs a tax office, while the defeated dark lord is seeking compensation. The contrast is funny, but it also invites a more complicated look at what the victory cost and whose version of events became official.

#### The core to preserve

- The prophecy was fulfilled twenty years ago.
- The chosen one is now a tax-office worker.
- The dark lord she defeated is suing for compensation.
- The story’s contrast between legendary history and everyday bureaucracy.

#### Gaps worth checking

- What does the dark lord claim compensation for, and what makes the claim more than a joke?
- How might the lawsuit challenge the familiar account of the prophecy and the victory without simply declaring that the dark lord was secretly right?
- What could change for the former chosen one, the dark lord, or the public if the case succeeds or fails?
- If the former chosen one is central to the case, what choices can she make, and what might each choice cost her?

#### Questions for you

- Is the dark lord’s claim sincere, opportunistic, or some mixture of the two?
- What does the former chosen one make of her old victory now, and how does her tax-office life matter beyond the contrast?
- Who is bringing this lawsuit to life: the former hero, the dark lord, the people affected by their old conflict, or someone else?
- What would be at stake beyond the compensation itself if the case changed how the victory is remembered?

---

## retired-chosen-one · challenge

_premise that already subverts a familiar pattern_

> The chosen one fulfilled the prophecy twenty years ago; she now runs a tax office, and the dark lord she defeated is suing for compensation.

### baseline (calls: 1, 8646 ms, models: luna-fast)

#### What is compelling

The idea puts epic fantasy consequences into an ordinary bureaucratic setting: the prophecy is already fulfilled, the hero has a day job, and the defeated dark lord is pursuing compensation through the courts. The shift from legendary conflict to legal dispute creates room for humour, but also for questions about accountability and what victory cost.

#### The core to preserve

- The chosen one fulfilled the prophecy twenty years ago.
- She now runs a tax office.
- The dark lord she defeated is suing for compensation.
- The premise contrasts legendary events with mundane civic life.

#### Things to stress-test

- Clarify what the dark lord says he was compensated for: injuries, lost property, wrongful imprisonment, or something stranger. The claim’s basis will strongly shape the tone.
- Decide how literal the prophecy and the dark lord are in the present day. If either is more symbolic or disputed than the premise suggests, make that legible to players.
- Consider why the chosen one runs the tax office and what that means for her role in the lawsuit. If she has authority over the process, the potential conflict of interest may need addressing.
- Establish whether the joke is mainly the absurdity of the lawsuit or whether the case raises serious questions about the aftermath of victory. A clear balance will help set expectations.

#### Questions for you

- What does the dark lord believe the chosen one owes him, and why does he think a court might agree?
- Is the chosen one content with her post-prophecy life, or does the case reopen something she would rather leave behind?
- What tone do you want at the table: farce, legal drama, melancholy fantasy, or a blend?
- Who are the player characters in relation to the chosen one, the tax office, or the lawsuit?

### assisted (calls: 2, 15150 ms, models: luna-fast, luna-fast)

_Pattern score: found none; missed none; wrong none._

#### Pattern analysis

- _off-list_ **The Aftermath of the Chosen One's Quest**: The chosen one fulfilled the prophecy twenty years ago and now runs a tax office.
- _off-list_ **The Villain Takes Legal Action**: The dark lord she defeated is suing for compensation.

```text
Familiar patterns in play:
- The Aftermath of the Chosen One's Quest (The chosen one fulfilled the prophecy twenty years ago and now runs a tax office.).
- The Villain Takes Legal Action (The dark lord she defeated is suing for compensation.).
Thin or missing structure:
- escalation (thin): The lawsuit could sharpen the dispute, but no further complications or deadline are specified.
- agency (thin): The former chosen one is central to the dispute, but her actions and goals are not yet stated.
- stakes (thin): Compensation is at stake, but its scale and consequences are unspecified.
- choices (missing): No decision or trade-off for the former hero is described.
What the audience will expect:
- The former chosen one will have to confront the consequences of her past victory.
- The dark lord's claim will challenge the accepted account of the defeat or its aftermath.
- The tax-office setting will bring mundane bureaucracy into conflict with legendary events.
Where it differs: The premise centres the story on the aftermath of a completed prophecy, pairing a former hero's ordinary administrative life with her defeated enemy's legal claim. It does not closely follow any one listed pattern.
```

#### What is compelling

The prophecy’s climactic victory is already history, but its consequences have landed in an unexpectedly ordinary place: a tax office. The dark lord’s compensation claim could make the accepted story of that victory legally, morally, or practically contentious without undoing the premise.

#### The core to preserve

- The prophecy was fulfilled twenty years ago.
- The chosen one is a woman who now runs a tax office.
- The dark lord she defeated is the one bringing the claim.
- The claim is for compensation.

#### Things to stress-test

- Clarify what the dark lord says he is owed, and why: damages from the defeat, lost property, a broken agreement, or something else would each make the dispute mean something different.
- Decide how much of the old victory is genuinely in question. If the lawsuit merely reopens settled history, it may feel like a pretext; if it challenges the account of what happened, establish what evidence or testimony could make that challenge matter.
- The tax-office setting is a distinctive source of contrast, but its role may need definition: is the office where the case is heard, where the chosen one works amid the dispute, or part of the substance of the claim?
- The premise has a compelling conflict but no stated deadline, scale of compensation, or goal for the chosen one. Without one or more of these, the lawsuit may not generate pressure or meaningful choices at the table.

#### Questions for you

- What does the dark lord believe the chosen one or the world owes him, and does he have a sincere grievance?
- What part of the accepted story of the defeat, if any, could the lawsuit credibly call into question?
- Why is the chosen one still running a tax office, and what does she want from her life now?
- Who is the dispute likely to affect beyond the two central figures, and what would make its outcome matter to them?
- What makes the case urgent: a hearing date, a threat to the tax office, the size of the claim, or another consequence?
