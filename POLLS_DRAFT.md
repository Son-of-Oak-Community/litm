# GitHub Discussions Polls — Draft

Instructions: Create two Discussion posts in the "Polls" category.
Copy everything between the --- markers for each poll.
The ```[POLL]``` block is GitHub's special poll syntax.

---

## Poll 1: High & Medium Priority Features

### Title:
Which features would you most like to see? (Core Gameplay & Tools)

### Body:

We're considering a number of new features for the Legend in the Mist system. Help us prioritize by voting for the ones you'd find most valuable at your table!

**Pick up to 3** that matter most to you. Details on each feature below the poll.

```[POLL]
# Which features would you most like to see?
- Reaction Rolls — dedicated roll type for lessening Consequences
- Camping & Sojourn Mode — guided walkthrough of the camp phase
- Consequence Delivery Helper — GM quick-actions to apply Consequences from chat
- Theme Evolution & Replacement Wizard — guided flow when themes hit 3 Milestones or 3 Abandons
- Spotlight Tracker — visible indicator of which Hero has the spotlight
- Tag Relevance Marking — GM can flag tags as relevant/indirect in the roll dialog
- Critical Roll Visual Feedback — special visuals for double ones and double sixes
- Quintessence Selection & Tracking — dedicated UI for choosing and tracking Quintessences
```

### Feature Details

<details>
<summary><strong>Reaction Rolls</strong> (Core Book p.171)</summary>

When the Narrator delivers Consequences, Heroes can sometimes make a **reaction roll** to lessen the effects. Currently there's no dedicated support for this.

This would add:
- A "React" button on roll result chat messages when the result includes Consequences
- Opens a roll dialog pre-framed as a reaction, with the lessen/spend flow built in
- Makes the Action → Consequence → Reaction loop smoother
</details>

<details>
<summary><strong>Camping & Sojourn Mode</strong> (Core Book p.179)</summary>

Camping is a structured phase that happens nearly every session, with several steps that are easy to forget:

1. Narrator expires story tags
2. Place of stay is established
3. Each Hero takes two periods of activity (Rest, Reflect, or camp action)
4. Fellowship theme recovers its tags

This would add a guided walkthrough of each step, automatic fellowship tag recovery, and per-hero activity selection.
</details>

<details>
<summary><strong>Consequence Delivery Helper</strong></summary>

After a roll results in Consequences (9 or less, or double ones), the Narrator manually edits actor sheets to apply effects. This is the most repetitive GM task.

This would add GM-only quick-action buttons on roll result chat messages for common consequence types: scratch a tag, inflict a status (with tier selector), create a story tag, expire a tag, or introduce a new threat.
</details>

<details>
<summary><strong>Theme Evolution & Replacement Wizard</strong> (Core Book p.190-192)</summary>

When a theme reaches 3 Milestones it evolves; at 3 Abandons it's replaced. Both processes involve multiple decisions and Promise calculations that are easy to get wrong.

This would add a guided wizard that triggers automatically, walks through each step, and calculates Promise earned from traded tags/improvements.
</details>

<details>
<summary><strong>Spotlight Tracker</strong> (Core Book p.148)</summary>

The game loop explicitly rotates a spotlight between Heroes each turn. In online play, it's easy to lose track of whose turn it is.

This would add a visible indicator showing which Hero has the spotlight, with a GM toggle to pass it along.
</details>

<details>
<summary><strong>Tag Relevance Marking</strong> (Core Book p.152)</summary>

A core Narrator task is deciding which tags are relevant to the current action. Broad tags may need a prep action, while specific tags can be used directly.

This would let the GM mark tags as "relevant," "indirect," or "not relevant" directly in the roll dialog, with visual distinction for each.
</details>

<details>
<summary><strong>Critical Roll Visual Feedback</strong> (Core Book p.151)</summary>

Double ones (always Consequences) and double sixes (always Success) are dramatic moments, but the chat display doesn't visually distinguish them.

This would add special visual treatment — animations, glows, or distinct borders — for these rare, impactful rolls.
</details>

<details>
<summary><strong>Quintessence Selection & Tracking</strong> (Core Book p.194-195)</summary>

When a Hero achieves a Moment of Fulfillment, they can choose a Quintessence — a powerful permanent ability from ~15 options like *Beyond Luck*, *Nine Lives*, or *Virtuoso*.

This would add a dedicated field on the hero sheet, a selection dialog with full descriptions, and persistent tracking.
</details>

---

## Poll 2: Automation & Quality of Life

### Title:
Which quality-of-life improvements interest you? (Automation & Polish)

### Body:

A second set of feature ideas focused on automation and reducing manual bookkeeping. These are smaller in scope but can smooth out common pain points.

**Pick any that appeal to you.**

```[POLL]
# Which QoL improvements interest you?
- Power Spending Direct-to-Actor — spending Power creates tags/statuses on actors automatically
- Promise Auto-Calculation — automatic Promise counting when evolving or replacing themes
- Narration Prompts on Roll Results — GM-visible reminders of consequence/success options on chat messages
- Camping Rest Recovery — one-click "Rest" button to recover all scratched tags on a theme
```

### Feature Details

<details>
<summary><strong>Power Spending Direct-to-Actor</strong></summary>

When spending Power from a Detailed roll or camp action, the Spend Power dialog creates tag text in chat but doesn't modify actors. The player or GM still needs to manually create the story tag or status effect.

This would connect spending options directly to actors — "Create Tag" creates the ActiveEffect, "Inflict Status" modifies the tier — eliminating the manual translation step.
</details>

<details>
<summary><strong>Promise Auto-Calculation</strong></summary>

When evolving or replacing a theme, Promise is earned from excess power tags (beyond 3), excess weakness tags (beyond 1), and each special improvement. Calculating this by hand is easy to get wrong.

This would automatically count Promise-eligible elements and display "You will gain X Promise from this change."
</details>

<details>
<summary><strong>Narration Prompts on Roll Results</strong></summary>

Different outcomes call for different narrative responses. New Narrators especially benefit from contextual reminders.

This would add collapsible GM-visible prompts on chat results, e.g. on a mixed result: "Describe the success, then choose Consequences: scratch a tag, inflict a status, introduce a threat." Toggleable in settings for experienced groups.
</details>

<details>
<summary><strong>Camping Rest Recovery</strong> (Core Book p.179)</summary>

During Rest at camp, a Hero recovers all scratched power tags on one theme. Currently this means individually unscratching each tag.

This would add a "Rest" button per theme that batch-recovers all scratched power tags in one click.
</details>

---

## Free-form Discussion (optional third post)

### Title:
Feature Requests & Ideas — What's missing from your table?

### Body:

The polls above cover features we've identified from the Core Book, but we'd love to hear what **you** think is missing.

**What would make playing Legend in the Mist on Foundry better for your group?**

Whether it's a small annoyance, a missing automation, or a big feature idea — share it here. If you can, reference the relevant Core Book page so we can understand the context.

Some prompts to get you thinking:
- What part of the rules do you most often forget or get wrong during play?
- Where do you spend the most time on bookkeeping instead of storytelling?
- What works great at a physical table but feels clunky in Foundry?
- Are there any Ways of Magic (Alchemy, Runic Invocation, Shapeshifting, etc.) that could use dedicated system support?
