# Idea Developer pattern analysis: GPT-6 Luna comparison transcript (#3466)

Excerpt of the real model output from `bun scripts/idea-pattern-ab.ts --modes assess,challenge --json` against the deployed worker on 23 October 2026, after GPT-6 Luna was deployed (PR 4363). Every call was answered by `luna-fast` (GPT-6 Luna); no Gemini fallbacks. One run per idea and mode. Rendered with the harness's own `toMarkdown`. See [the write-up](./3466-idea-pattern-analysis.md).

Only the pairs the write-up quotes are kept: dragon-protector (both modes), bridge-toll (Assess) and retired-chosen-one (Challenge). The full run covered 10 ideas × 2 modes; rerun the command above with `--markdown` to reproduce it.

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
