---
id: spiral
name: The Spiral
order: 1
signature: "The same question, revisited at increasing depth, each pass folding in what the last pass learned."
degenerate_name: The Loop
transitions: [excavation, ladder]
viz_params:
  - {key: depthGain, label: "Depth per pass", min: 0, max: 1, default: 0.6, degenerate_at: 0}
  - {key: passes, label: "Passes", min: 2, max: 9, default: 5}
palette: warm
---

## Signature

A question is asked, answered, and then asked again — not because the first answer was rejected, but because the second pass can only be taken from where the first one landed. The topic doesn't move outward, it moves *down*. Viewed from above, the conversation traces a spiral: the same angle, visited again and again, each time a little further from the center.

## Genesis

Spirals form around questions too large to answer in a single pass — questions of value, identity, or design intent, where a first answer is necessarily provisional. They also form when one party is teaching and deliberately re-asks a settled-sounding question to test whether the other has actually internalized it, or when a decision needs to survive contact with several different framings before anyone trusts it.

## Healthy & Degenerate

**Healthy — the Spiral.** Each revisit is licensed by something the previous pass produced: a distinction, a counterexample, a tightened constraint. The question sounds similar each time it returns, but the answer space it's asked against has visibly narrowed.

**Degenerate — the Loop.** The question returns, but nothing about how it's being asked has changed. Passes accumulate without depth accumulating; repetition gets mistaken for rigor. Turn count rises, insight doesn't.

## Inside View

From inside a live conversation, depth is hard to self-assess in the moment — but a few signals are checkable turn by turn:

- Can you name, in one sentence, what *this* pass knows that the *last* pass didn't? If not, depth likely isn't accruing.
- Is the question being re-asked in the same words, or in words sharpened by the previous answer?
- Are earlier answers being explicitly revised or narrowed, or just restated with more confidence?
- Would collapsing the last two passes into one lose any information? If not, one of them was a Loop pass.

## Transitions

A Spiral resolves into an **Excavation** when a pass finally exposes that the real question was never the one being spiraled on. It resolves into a **Ladder** when a pass stops adding depth and instead jumps to a governing principle that closes the whole line at once.

## Specimen

```specimen
A: What should the pricing model be?
B: Probably usage-based — it scales with the value delivered.
A: Usage-based relative to what unit, though? Compute? Seats? Outcomes?
B: Compute is measurable but doesn't track value. Outcomes track value but are hard to define per-customer.
A: So the real constraint is: whatever the unit is, both sides have to be able to audit it without a dispute.
B: Right — auditability, not just correlation-with-value, is the binding constraint.
A: Given that, seats is the only unit both sides can independently count today.
B: Which means the "ideal" usage-based model is off the table until instrumentation catches up.
A: So we ship seats now, and treat usage-based as a roadmap item gated on shipping the audit trail first.
```

> @turn 3: First revisit — same topic (pricing unit), but now scoped by "measurable vs. tracks value," a distinction turn 1–2 didn't have.
> @turn 5: Second revisit reframes the constraint entirely (auditability) — this is the depth-gain: the question hasn't moved, but what's being optimized for has.
> @turn 9: The spiral closes by landing on an actionable rung — note the resemblance to a Ladder resolution.
