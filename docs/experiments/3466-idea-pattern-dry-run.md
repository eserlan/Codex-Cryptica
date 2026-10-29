# Idea Developer pattern analysis: dry-run transcript (#3466)

Claude stood in for the model on every call (classifier, baseline and assisted developer), so this transcript tests the pipeline and the shape of the output, not the production model. Timings are zeroed. Rendered by `scripts/idea-pattern-ab.ts`; see [the write-up](./3466-idea-pattern-analysis.md).

## dragon-protector · assess

_reveal-driven premise (the issue's example)_

> A disgraced knight discovers that the dragon terrorising the kingdom is actually protecting it from the king.

### baseline (calls: 1)

#### What is compelling

The premise flips the obvious threat: the creature everyone fears is the kingdom's defence, and the person everyone serves is the danger. Making the discoverer a disgraced knight gives them a reason to be outside the court and a reason not to be believed.

#### The core to preserve

- The knight is disgraced.
- The dragon is terrorising the kingdom.
- The dragon is protecting the kingdom from the king.

#### Gaps worth checking

- It is not yet clear what the king is doing that needs protecting against, or why the dragon's attacks help.
- Much of the premise rests on the discovery; consider what drives play once the knight knows.
- If the dragon is terrorising the kingdom, ordinary people are being hurt; decide whether that harm is real or staged.

#### Questions for you

- What is the king doing, and does he know the dragon is opposing him?
- Why was the knight disgraced, and is it connected to the king?
- Can the dragon communicate, or must its purpose be inferred?
- Who else in the kingdom suspects the truth?

### assisted (calls: 2)

#### Pattern analysis

- **Disgraced Champion**: "A disgraced knight"
- **Misunderstood Monster**: the dragon terrorising the kingdom is actually protecting it
- **Rot at the Top**: protecting it from the king
- **Truth Behind the Legend**: the knight "discovers" what the dragon is really doing

```text
Familiar patterns in play:
- Disgraced Champion ("A disgraced knight"). Expected: The disgrace will prove unjust or the champion will earn their way back. Ways to complicate it: Make the disgrace deserved, and the redemption something other than reinstatement. Tie the disgrace to a choice the champion would make again.
- Misunderstood Monster (the dragon terrorising the kingdom is actually protecting it). Expected: Fear will give way to understanding, and the real threat will surface. Ways to complicate it: Keep the creature genuinely dangerous even after it is understood. Give the people who feared it a reasonable cause to keep fearing it.
- Rot at the Top (protecting it from the king). Expected: The authority will be confronted, deposed or exposed. Ways to complicate it: Make the authority's fall dangerous to the people it was harming. Give the authority loyal, decent servants who are not complicit.
- Truth Behind the Legend (the knight "discovers" what the dragon is really doing). Expected: The hidden account will be uncovered and will overturn who is trusted. Ways to complicate it: Let the legend be partly true, so neither version is clean. Make someone sympathetic depend on the legend staying believed.
Thin or missing structure:
- escalation (missing): Nothing says how the situation worsens after the discovery.
- agency (thin): The knight discovers the truth but has no stated goal or lever.
- stakes (thin): The kingdom is at risk, but what the king threatens is unstated.
- choices (thin): Siding with the dragon is implied but not yet costly.
Reveal dependency: The premise is carried by the reveal; once the knight knows, tension must come from what it costs to act on it.
What the audience will expect:
- The knight will ally with the dragon against the king.
- No one will believe the disgraced knight at first.
- The king's secret crime will be exposed in a final confrontation.
Where it differs: Each element is familiar; what is distinctive is the three-way relationship in which the knight's disgrace, the dragon's violence and the king's legitimacy all point at each other.
```

#### What is compelling

The premise flips the obvious threat: the creature everyone fears is the kingdom's defence, and the person everyone serves is the danger. The knight's disgrace, the dragon's violence and the king's authority all point at each other, and that three-way knot is the idea's real engine.

#### The core to preserve

- The knight is disgraced.
- The dragon is terrorising the kingdom.
- The dragon is protecting the kingdom from the king.

#### Gaps worth checking

- The discovery carries most of the premise. Once the knight knows, what makes acting on it costly? Without that cost, the rest is a march to the throne room.
- Players will expect the knight to ally with the dragon and expose the king. Consider keeping the dragon genuinely dangerous, so the alliance is uncomfortable rather than a relief.
- If the king falls, who is hurt? A king whose removal endangers the very people he threatens makes the knight's choice harder.
- Nothing yet worsens over time. Decide what the king's plan needs and when it will be ready.

#### Questions for you

- What did the knight do in the king's service that would make siding with the dragon a betrayal of their own past?
- Was the knight's disgrace deserved?
- Are the dragon's attacks still killing people, and does the dragon care?
- Who at court is loyal to the king and also decent?
- What is the king trying to do, and when will it be done?

---

## dragon-parts-town · assess

_static lore with a mystery and no conflict yet_

> A town where everything is made from dragon parts, but there are no dragons nearby.

### baseline (calls: 1)

#### What is compelling

A town visibly built from dragons with none nearby is an instant mystery that players can see and touch. Every wall and tool asks where the materials came from.

#### The core to preserve

- Everything in the town is made from dragon parts.
- There are no dragons nearby.

#### Gaps worth checking

- The premise is a striking image but not yet a situation; nothing is changing.
- Decide whether the absence of dragons is the mystery or simply a fact the town has stopped noticing.
- Without a reason to care, players may admire the town and move on.

#### Questions for you

- Where do the dragon parts come from?
- Do the townsfolk know, and do they talk about it?
- Is the supply running out?
- How do outsiders react to the town?

### assisted (calls: 2)

#### Pattern analysis

- **Living Off the Beast**: "everything is made from dragon parts"
- **The Town Keeps a Secret**: dragon parts with "no dragons nearby" implies an unexplained source

```text
Familiar patterns in play:
- Living Off the Beast ("everything is made from dragon parts"). Expected: The source will run out, fight back, or prove to be something other than assumed. Ways to complicate it: Make the people who profit most also the ones best placed to fix it. Give ordinary residents a reason to defend the trade.
- The Town Keeps a Secret (dragon parts with "no dragons nearby" implies an unexplained source). Expected: Outsiders will uncover the secret, and the community will close ranks. Ways to complicate it: Make the secret protective rather than sinister, at least at first. Split the community over whether to keep hiding it.
Thin or missing structure:
- conflict (missing): No one yet wants something someone else opposes.
- escalation (missing): Nothing is changing in the town.
- agency (thin): Players can investigate, but there is nothing to act on yet.
- opposition (missing): No one is pushing back against anything.
- stakes (missing): Nothing is at risk.
- choices (missing): No decision with trade-offs is present.
Reveal dependency: The premise hinges on where the parts come from; once that is known, the town needs a reason to change.
What the audience will expect:
- The source of the dragon parts will be a dark secret.
- The supply will run out or the dragons will come back.
- The townsfolk will be complicit.
Where it differs: It currently follows its patterns closely; the vivid material culture is its strongest individual feature.
```

#### What is compelling

A town visibly built from dragons with none nearby is an instant mystery that players can see and touch. Every wall and tool asks where the materials came from.

#### The core to preserve

- Everything in the town is made from dragon parts.
- There are no dragons nearby.

#### Gaps worth checking

- It is a striking image rather than a situation: no one wants anything, and nothing is changing.
- Players will assume the source is a dark secret and the townsfolk are complicit. You could make the secret protective, or split the town over keeping it.
- The obvious next beat is that the supply runs out; decide whether you want that or a different pressure.
- Once the source is known, the town needs a reason to change, or the mystery is the whole adventure.

#### Questions for you

- Where do the dragon parts come from, and who in town knows?
- Who profits most from the trade, and are they also the ones who could end it?
- Why would an ordinary resident defend it?
- What changes this year that makes the secret matter now?

---

## vague-moon · assess

_too thin to classify safely_

> Something is wrong with the moon.

### baseline (calls: 1)

#### What is compelling

A single, unsettling line that everyone at the table can see when they look up. It is open enough to suit horror, fantasy or science fiction.

#### The core to preserve

- Something is wrong with the moon.

#### Gaps worth checking

- There is not yet enough here to judge playability; the premise needs at least one concrete effect on people.
- It is unclear whether everyone notices the problem or only a few.
- Without a scale, it could be a one-session oddity or a campaign-ending threat.

#### Questions for you

- What exactly is wrong, and what can people see?
- What genre and tone do you want?
- Who notices first?
- What happens on the ground because of it?

### assisted (calls: 2)

#### Pattern analysis

- _off-list_ **Omen in the Sky**: "Something is wrong with the moon"

```text
Familiar patterns in play:
- Omen in the Sky ("Something is wrong with the moon").
Thin or missing structure:
- conflict (missing): No one's wants are stated.
- escalation (thin): A celestial problem implies it could worsen, but how is unknown.
- agency (missing): No one is positioned to act.
- opposition (missing): There is no opposing force.
- stakes (missing): Nothing specific is at risk.
- choices (missing): No choices are implied.
- payoff (thin): Explaining the moon is a payoff, but nothing is set up yet.
What the audience will expect:
- The moon's change will have effects on the ground.
- Someone will claim to understand it.
Where it differs: Too little is supplied to say; the premise is a mood rather than a pattern.
```

#### What is compelling

A single, unsettling line that everyone at the table can see when they look up. It is open enough to suit horror, fantasy or science fiction.

#### The core to preserve

- Something is wrong with the moon.

#### Gaps worth checking

- There is not yet enough here to judge playability: no one wants anything, nothing is at stake, and no one is placed to act.
- The premise is a mood. Pick one concrete effect on the ground before deciding anything else.
- Scale is open: it could be a one-session oddity or a campaign-ending threat.

#### Questions for you

- What exactly is wrong, and what can people see?
- What changes on the ground because of it?
- Who notices first, and who claims to understand it?
- What genre and tone do you want?

---

## bridge-toll · assess

_political premise with several familiar shapes_

> Two rival guilds share the only bridge across the river, and its architect has died without saying who inherits the toll.

### baseline (calls: 1)

#### What is compelling

A single shared bridge is a natural pressure point, and the architect's death without an heir turns a working arrangement into an open contest overnight.

#### The core to preserve

- Two rival guilds share the only bridge.
- The architect has died.
- No one knows who inherits the toll.

#### Gaps worth checking

- The rivalry needs a cause beyond the toll, or the guilds will feel interchangeable.
- Clarify who enforces inheritance; if there is a law, the contest may be short.
- Make sure the players have a reason to be involved rather than watching two guilds argue.

#### Questions for you

- What does each guild make or trade?
- Did the architect leave anything behind, such as plans, a will or a secret?
- Who else uses the bridge and suffers if it closes?
- Why are the players in town?

### assisted (calls: 2)

#### Pattern analysis

- **Empty Throne**: the architect has died "without saying who inherits the toll"
- **Fragile Truce**: "Two rival guilds share the only bridge"
- **Dwindling Lifeline**: "the only bridge across the river"

```text
Familiar patterns in play:
- Empty Throne (the architect has died "without saying who inherits the toll"). Expected: A contest will escalate until one claimant wins or the seat is abolished. Ways to complicate it: Make the best claimant the one nobody wants. Let the vacancy itself be deliberate.
- Fragile Truce ("Two rival guilds share the only bridge"). Expected: Someone will provoke the incident, and the truce will collapse. Ways to complicate it: Make the people who want war the ones who suffered most from it. Let the truce depend on a lie both sides maintain.
- Dwindling Lifeline ("the only bridge across the river"). Expected: Rationing will breed conflict, and someone will hoard or steal it. Ways to complicate it: Give the protagonists privileged access, so fairness costs them. Make the replacement worse in a way only some people can see.
Thin or missing structure:
- escalation (thin): The contest can sharpen, but no deadline or trigger is given.
- agency (thin): The players' role between the guilds is not set.
- choices (thin): Backing one guild is implied, but its cost is not.
- payoff (thin): The architect's intentions could pay off but are not set up.
What the audience will expect:
- A hidden will or heir will surface.
- The guilds will turn to sabotage.
- The bridge itself will be damaged or closed during the dispute.
Where it differs: It follows the succession-contest shape closely; using infrastructure rather than a throne as the prize is where it differs.
```

#### What is compelling

A single shared bridge is a natural pressure point, and the architect's death without an heir turns a working arrangement into an open contest overnight. Making infrastructure the prize, rather than a throne, gives the contest everyday consequences.

#### The core to preserve

- Two rival guilds share the only bridge.
- The architect has died.
- No one knows who inherits the toll.

#### Gaps worth checking

- Players will expect a hidden will or heir to appear. If one does, consider making the rightful claimant someone neither guild, nor the town, wants.
- Consider whether the architect left the question open deliberately, perhaps to force the guilds to cooperate.
- There is no trigger or deadline yet; the contest needs something that forces a move soon.
- The players' position between the guilds is undefined; give them something to lose on the bridge.

#### Questions for you

- Did the architect intend the toll to go unclaimed?
- What has kept the guilds from fighting until now, and is it a story both sides tell?
- Who else depends on the crossing staying open?
- Why are the players in town?

---

## retired-chosen-one · assess

_premise that already subverts a familiar pattern_

> The chosen one fulfilled the prophecy twenty years ago; she now runs a tax office, and the dark lord she defeated is suing for compensation.

### baseline (calls: 1)

#### What is compelling

The premise starts after the story usually ends and treats an epic victory as a legal and bureaucratic problem. The tone is comic, but there is real material about what heroes owe afterwards.

#### The core to preserve

- The chosen one fulfilled the prophecy twenty years ago.
- She now runs a tax office.
- The dark lord she defeated is suing for compensation.

#### Gaps worth checking

- Decide how seriously the lawsuit is meant to be taken; the comic tone may undercut stakes.
- It is unclear what the players do in a courtroom story.
- The premise depends on the joke landing; plan what sustains it after the first session.

#### Questions for you

- Is the tone comedy, satire or something with a sharper edge?
- What is the dark lord's legal claim?
- Are the players part of the original party, or new?
- Who is judging the case?

### assisted (calls: 2)

#### Pattern analysis

- **Prophecy Trap**: "fulfilled the prophecy twenty years ago"
- **Villain Has the Better Evidence**: the dark lord "is suing for compensation"
- _off-list_ **After the Happy Ending**: "twenty years ago; she now runs a tax office"

```text
Familiar patterns in play:
- Prophecy Trap ("fulfilled the prophecy twenty years ago"). Expected: The prophecy will come true in an unexpected, ironic way. Ways to complicate it: Let rival groups read the same prophecy differently and act on it. Reveal who benefits from people believing the prophecy.
- Villain Has the Better Evidence (the dark lord "is suing for compensation"). Expected: The heroes will learn the facts and face whether to change sides. Ways to complicate it: Make the antagonist right about the problem but wrong about the cure. Show the evidence early and let the cost of acting on it drive play.
- After the Happy Ending ("twenty years ago; she now runs a tax office").
Thin or missing structure:
- escalation (thin): A lawsuit escalates through hearings, but no wider fallout is stated.
- agency (thin): The chosen one is the defendant; the players' role is not set.
- stakes (thin): What she would lose if the suit succeeds is unstated.
- choices (thin): Settling against fighting is implied.
What the audience will expect:
- The lawsuit will expose something the heroes did in the war.
- The comedy will turn serious at some point.
- The prophecy will turn out to have been misread.
Where it differs: It already inverts the chosen-one shape by starting after the victory; the further turn is that the villain uses the institutions the hero saved.
```

#### What is compelling

The premise starts after the story usually ends and treats an epic victory as a legal problem. The villain uses the very institutions the hero saved, which gives the comedy a real edge.

#### The core to preserve

- The chosen one fulfilled the prophecy twenty years ago.
- She now runs a tax office.
- The dark lord she defeated is suing for compensation.

#### Gaps worth checking

- Players will expect the lawsuit to expose something done in the war. Consider making the dark lord right about the harm but wrong about who owes for it.
- It is unclear what she stands to lose if the suit succeeds; without that, the courtroom has no stakes.
- The players' role in a lawsuit is not set.
- The audience may expect the prophecy to have been misread; decide early whether you want that turn or want to avoid it.

#### Questions for you

- What evidence does the dark lord actually have?
- What would she lose if she lost the case?
- Is the tone comedy, satire or something sharper?
- Are the players her old party, or new?
