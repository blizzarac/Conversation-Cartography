---
id: delta
name: The River Delta
order: 2
signature: "One question fans into many parallel threads, the way a river fans into distributaries before the sea."
degenerate_name: The Sprawl
transitions: [constellation, cul_de_sac]
viz_params:
  - {key: pruning, label: "Pruning discipline", min: 0, max: 1, default: 0.7, degenerate_at: 0}
  - {key: branchGenerations, label: "Branch generations", min: 1, max: 4, default: 3}
palette: warm
---

## Signature

A single question turns out to have several independent sub-questions hiding inside it, and the conversation opens all of them at once. Each branch runs for a while on its own logic. The shape isn't a line but a fan — one trunk, many distributaries, each carrying part of the original current.

## Genesis

Deltas form at genuine forks: a design decision with several independently-variable dimensions, a bug report that turns out to implicate three unrelated subsystems, a planning conversation where "what should we build" silently contains "for whom," "by when," and "with what budget." They also form when a participant free-associates rather than commits to one thread — the fork is real, but nobody chose it.

## Healthy & Degenerate

**Healthy — the River Delta.** Branches are opened deliberately, and each is either resolved or explicitly deferred — pruned back to the trunk with a stated reason. The delta has a visible shape because most of it has been cut away.

**Degenerate — the Sprawl.** Branches keep forking and nothing gets pruned. Nobody returns to the trunk; nobody can restate what the original question was. The conversation ends wide and shallow instead of resolved.

## Inside View

- Count open threads right now. Can you list them from memory, or did you have to scroll up?
- For each branch still open, is there a reason it's still open, or has it just not been closed?
- Could you currently restate the original question in one sentence? If it takes a paragraph, the trunk has been lost.
- Has any branch been explicitly abandoned ("we're not doing X"), or have they only ever been added to?

## Transitions

A Delta becomes a **Constellation** when the branches, examined together, turn out to share one underlying cause. It becomes a **Cul-de-sac** when a single branch is chased to a dead end and the conversation has to explicitly back out of it before returning to the fan.

## Specimen

```specimen
A: We need to redesign the onboarding flow.
B: Is that a UX problem, a copy problem, or a funnel-instrumentation problem?
A: Could be any of the three, honestly. Let's take them one at a time.
B: UX first: where do people actually drop off in the current flow?
A: Step 3, the permissions screen — but we don't know if that's UX or comprehension.
B: That's actually the copy question then. Let's park UX and check the copy on step 3.
A: The copy's fine, tested it separately. So it is UX — the permissions screen needs a preview of what happens after.
B: Good, that one's resolved. Back to instrumentation: do we even have step-level funnel data elsewhere?
A: No — and that's a bigger, separate project. Parking it, not solving it today.
B: Then today's scope is just the step-3 redesign. The other two branches are explicitly closed or deferred.
```

> @turn 3: The fork is named explicitly — three branches opened on purpose, not by accident.
> @turn 6: A branch (copy) is pruned with a stated finding, not just dropped.
> @turn 9: Trunk is explicitly restated at the end — this is what keeps a Delta from becoming a Sprawl.
