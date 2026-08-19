---
id: ladder
name: The Ladder
order: 4
signature: "A linear escalation of abstraction — concrete to principle, or principle to concrete — one rung per turn."
degenerate_name: The Tower
transitions: [spiral, excavation]
viz_params:
  - {key: grounding, label: "Grounding at the top", min: 0, max: 1, default: 0.7, degenerate_at: 0}
  - {key: rungs, label: "Rungs", min: 3, max: 9, default: 6}
palette: warm
---

## Signature

Each turn moves one level of abstraction away from the last, in one consistent direction. Climbing: "this button" → "this flow" → "our onboarding philosophy." Descending: "we value simplicity" → "so this screen shouldn't ask for a phone number" → "remove the field." Either way, it's a straight line with no branching — a ladder, not a tree.

## Genesis

Ladders form when a concrete disagreement can't be resolved without agreeing on the principle above it, or when a stated principle needs to be tested against a concrete case to see if anyone actually believes it. They're common in design critique, values-alignment conversations, and any debugging session that keeps asking "but *why* does it do that" until it hits an architectural decision.

## Healthy & Degenerate

**Healthy — the Ladder.** The climb (or descent) ends on a rung both parties can actually stand on — a principle concrete enough to act from, or a concrete decision traceable to an agreed principle. The ladder is climbed *and* landed.

**Degenerate — the Tower.** Abstraction keeps outrunning anything actionable. Each rung is higher than the last, but nobody ever climbs back down; the tower gets taller with no floor added at the top. The conversation ends on a principle too general to imply any specific decision.

## Inside View

- At the current turn, could you convert what's being said into a concrete action within one more turn? If it would take three more levels of abstraction to get there, you're climbing a Tower.
- Is each rung strictly more general than the last, with no exceptions? A true ladder doesn't skip levels or double back.
- If the conversation ended right now, is the top rung something both parties could act on tomorrow?
- Has anyone tested the current level of abstraction against a concrete counterexample, or is it floating unchecked?

## Transitions

A Ladder becomes a **Spiral** when the landed principle immediately raises a new version of the original question, now asked with the principle in hand. It becomes an **Excavation** when climbing reveals that the "real" question was one level up from where the conversation started, not several.

## Specimen

```specimen
A: This confirmation dialog is annoying, can we remove it?
B: Depends what it's protecting against — what's the actual risk if we remove it?
A: Accidental deletion of a project, which is unrecoverable right now.
B: So the real question is whether *any* destructive action should be unrecoverable.
A: Framed that way — no. We should have soft-delete everywhere, not per-dialog confirmations.
B: That's a real principle: recoverability, not friction, is the safety mechanism.
A: Given that, we can remove this dialog once soft-delete ships for projects.
B: Agreed — and that's now a tracked prerequisite, not just a nice-to-have.
```

> @turn 2: First rung up — from "this dialog" to "what it protects against."
> @turn 4: Second rung — the risk generalizes into a system-wide principle (recoverability).
> @turn 7: The ladder climbs back down to a concrete, gated action — this is what keeps it from becoming a Tower.
