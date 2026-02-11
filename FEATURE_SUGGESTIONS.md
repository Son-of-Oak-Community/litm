# Legend in the Mist — Feature Suggestions

A collection of potential UX improvements for the Legend in the Mist Foundry VTT system. These are informed by the Core Book (v1.01) and aim to bring more of the tabletop experience into the digital system.

Vote on the features you'd most like to see! Your feedback helps prioritize development.

---

## Gameplay Flow

### Reaction Rolls
**Priority: High**

When the Narrator delivers Consequences after a roll, Heroes can sometimes make a **reaction roll** to lessen the effects (Core Book p.171). Currently, there's no dedicated support for this — the Narrator and player have to handle it entirely through conversation.

**What this would add:**
- A "React" button on roll result chat messages (visible when the result includes Consequences)
- Opens a roll dialog pre-framed as a reaction, with the lessen/spend flow built in
- Makes the Action → Consequence → Reaction loop faster and less error-prone

---

### Camping & Sojourn Mode
**Priority: High**

Camping (Core Book p.179) is a structured phase that happens nearly every session. The Fellowship rests, recovers, and prepares — but the sequence has several steps that are easy to forget or do out of order:

1. The Narrator expires story tags
2. The place of stay is established
3. Each Hero takes **two periods** of activity: Rest, Reflect, or a camp action
4. The Fellowship theme recovers its tags

**What this would add:**
- A "Begin Camp" button or scene mode that walks through each step
- Automatic fellowship tag recovery
- Per-hero activity selection (Rest: recover scratched tags on one theme; Reflect: mark Improve on a theme; Camp Action: take a narrative action)
- Clear tracking of who has used their two periods

---

### Consequence Delivery Helper
**Priority: High**

After a roll results in Consequences (9 or less, or double ones), the Narrator chooses and applies effects. This is the most repetitive GM task and currently requires manually editing actor sheets.

**What this would add:**
- GM-only quick-action buttons on roll result chat messages
- Common consequence types available in one click: Scratch a tag, Inflict a status (with tier selector), Create a story tag, Expire a tag, Introduce a new threat
- Drag-to-target application for applying effects to specific actors
- Would also work for the "Success and Consequences" (7-9) mixed results

---

## Hero Development

### Theme Evolution & Replacement Wizard
**Priority: High**

When a theme reaches 3 Milestones, it **evolves** into a stronger version (Core Book p.190). When it reaches 3 Abandons, it's **replaced** entirely (p.192). Both processes are complex and involve multiple decisions:

- **Evolution:** Choose new theme type, optionally change Might level, trade tags/improvements for Promise
- **Replacement:** Create a nascent theme (title tag + weakness + quest only), calculate Promise earned from excess power tags, weakness tags, and special improvements

**What this would add:**
- A guided wizard that triggers when Milestone or Abandon reaches 3
- Step-by-step walkthrough of the evolution/replacement process
- Automatic Promise calculation based on what's being traded in
- Template for nascent themes (replacement) with the correct starting structure

---

### Quintessence Selection & Tracking
**Priority: Medium**

When a Hero achieves a Moment of Fulfillment (5 Promise), they can choose a **Quintessence** — a powerful permanent ability from a list of ~15 options (Core Book p.194-195). Examples include *Beyond Luck*, *Nine Lives*, *Virtuoso*, and *The Bearer*.

**What this would add:**
- A dedicated Quintessence field on the hero sheet
- A selection dialog presenting all Quintessence options with their full descriptions
- Persistent tracking of chosen Quintessences and their effects
- Visual display on the hero card alongside Moments of Fulfillment

---

### Promise Auto-Calculation on Theme Changes
**Priority: Lower**

When evolving or replacing a theme, Promise is earned based on what's being given up: extra power tags (beyond the first 3), extra weakness tags (beyond the first), and each special improvement. Calculating this by hand is tedious and error-prone.

**What this would add:**
- Automatic counting of Promise-eligible elements when a theme change begins
- Clear display of "You will gain X Promise from this change"
- Integrated into the Theme Evolution/Replacement Wizard

---

## Narrator Tools

### Spotlight Tracker
**Priority: Medium**

The game loop explicitly rotates a **spotlight** between Heroes each turn: the Narrator Establishes the scene, gives one Hero the spotlight, they take an Action, and the Narrator delivers Consequences (Core Book p.148). In online play, it's easy to lose track of whose turn it is.

**What this would add:**
- A visible indicator showing which Hero currently has the spotlight
- GM toggle to pass the spotlight to the next Hero
- Visible to all players so everyone knows who's "up"
- Optional integration with the Story Tags sidebar

---

### Tag Relevance Marking in Roll Dialog
**Priority: Medium**

A core Narrator responsibility is deciding which tags are **relevant** to the current action (Core Book p.152). Broad tags like *clever* or *rich* may require a prep action, while specific tags like *whirlwind slash* can be used directly. Currently, the roll dialog shows all tags without distinguishing relevance.

**What this would add:**
- GM ability to mark tags as "relevant," "indirect" (needs prep), or "not relevant" for the current action directly in the roll dialog
- Visual distinction between direct and indirect tags
- Helps new Narrators learn the relevance system
- Mirrors the table conversation about which tags apply

---

### Narration Prompts on Roll Results
**Priority: Lower**

Different roll outcomes call for different narrative responses from the Narrator. New Narrators especially can benefit from contextual reminders of their options.

**What this would add:**
- GM-visible prompts on chat roll results, tailored to the outcome:
  - **Success (10+):** "Describe the success. Consider positive Effects: create tags, give statuses, discover details."
  - **Success & Consequences (7-9):** "Describe partial success. Choose Consequences: scratch a tag, inflict a status, introduce a threat."
  - **Consequences (6-):** "Describe the setback. Consequences can include: harm, loss, new challenges, story complications."
- Collapsible/dismissable for experienced Narrators
- Could be toggled off in system settings

---

## Visual & Polish

### Critical Roll Visual Feedback
**Priority: Medium**

Rolling **double ones** (always Consequences, regardless of Power) and **double sixes** (always Success) are dramatic moments at the table (Core Book p.151). The system already detects these mechanically, but the chat display doesn't visually distinguish them.

**What this would add:**
- Special visual treatment for snake eyes (double 1s) — e.g., a red glow, shake animation, or distinct border
- Special visual treatment for boxcars (double 6s) — e.g., a golden glow or celebratory styling
- Makes these rare, dramatic moments feel impactful in the digital space
- No mechanical changes — purely visual flair

---

## Automation & Quality of Life

### Power Spending Direct-to-Actor
**Priority: Lower**

When spending Power from a Detailed roll or camp action, the Spend Power dialog creates tag text in chat but doesn't directly modify actors. The player or GM still needs to manually create the story tag or status effect.

**What this would add:**
- "Create Tag" spending option directly creates the story tag as an ActiveEffect on the target actor
- "Inflict/Reduce Status" directly modifies the status tier on the target
- Eliminates the manual step of translating chat text into actual game state
- Drag-and-drop targeting for applying to specific actors

---

### Camping Rest Recovery
**Priority: Lower**

During a Rest activity at camp, a Hero recovers all scratched power tags on **one theme** (Core Book p.179). Currently this means individually unscratching each tag.

**What this would add:**
- A "Rest" action button per theme that batch-recovers all scratched power tags at once
- Integrated into the Camping Mode flow (if implemented)
- Quick and satisfying one-click recovery

---

## Have a suggestion?

If you have a feature idea that isn't listed here, open an issue at:
https://github.com/aMediocreDad/litm/issues
