---
id: switchback
name: The Switchback
order: 3
signature: "Two positions alternate turn by turn, each pass narrowing the gap between them like a trail switchbacking up a slope."
degenerate_name: The Trench
transitions: [relay, ladder]
viz_params:
  - {key: convergence, label: "Convergence per turn", min: 0, max: 1, default: 0.65, degenerate_at: 0}
  - {key: turns, label: "Turns", min: 3, max: 10, default: 7}
palette: warm
---

## Signature

Two parties hold different positions and take turns restating them — but each restatement concedes something to the other side, or sharpens exactly where the disagreement lives. The path zigzags between the two poles, but the zigzags get shorter. It's argument as switchback trail: still climbing, even while crossing back and forth.

## Genesis

Switchbacks form in negotiation, code review, and any disagreement where both parties are arguing in good faith and neither has unilateral authority to just decide. They require that both sides are actually listening between turns — a switchback needs the trail to bend in response to the last turn, not just alternate on a fixed schedule.

## Healthy & Degenerate

**Healthy — the Switchback.** Each turn narrows the gap: the amplitude of disagreement visibly shrinks pass over pass, even if the direction keeps alternating. The two positions are converging on a boundary they can both name.

**Degenerate — the Trench.** The same two positions restate themselves, turn after turn, at the same distance apart. Alternation continues; movement doesn't. Each side is now optimizing for not-losing rather than for closing the gap.

## Inside View

- Compare this turn to the one two turns ago from the same speaker — is it a materially different position, or the same claim with different words?
- Has either side named a boundary they'd accept, or only boundaries the other side must accept?
- Is the *amplitude* (how far apart the two claims are) shrinking, or just the *frequency* of turns rising?
- Would a neutral reader, given only turns N and N+2, be able to tell them apart?

## Transitions

A Switchback becomes a **Relay** once the positions converge enough that the conversation shifts from arguing a shared question to jointly producing one artifact. It becomes a **Ladder** if convergence happens by both sides jumping to a shared higher-order principle rather than by narrowing turn over turn.

## Specimen

```specimen
A: We should ship this behind a feature flag, full stop.
B: Flags add permanent complexity for a temporary rollout — I'd rather just ship it.
A: Fine, but only if we can revert with one commit, not a flag toggle.
B: A revert commit works for me, as long as it's pre-written and tested before we ship.
A: Agreed — write the revert PR first, merge the feature only once the revert is staged and green.
B: One more thing: who has authority to pull the revert trigger without a meeting?
A: On-call does, unilaterally, for the first 24 hours. After that it needs the two of us.
B: That's a boundary I can commit to. Same page.
```

> @turn 1-2: Full amplitude — flag vs. no-flag, no shared ground yet.
> @turn 3-4: Amplitude shrinks — both sides now agree ship-without-flag is fine, disagreement narrows to revert mechanics.
> @turn 7-8: Convergence complete — a named, mutually-accepted boundary ends the switchback.
