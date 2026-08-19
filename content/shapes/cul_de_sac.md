---
id: cul_de_sac
name: The Cul-de-sac
order: 7
signature: "A path is followed, discovered to be terminal, and deliberately backed out of to the last real fork."
degenerate_name: The Sunk Cost
transitions: [delta, spiral]
viz_params:
  - {key: retreatClarity, label: "Retreat clarity", min: 0, max: 1, default: 1, degenerate_at: 0}
  - {key: loops, label: "Circles at the dead end", min: 1, max: 5, default: 1}
palette: cool
---

## Signature

A path gets followed in good faith — an approach, an argument, a plan — and turns out to dead-end: no amount of further elaboration gets it anywhere new. The healthy move is to notice this, say so, retreat to the last point where a different choice was available, and take the other branch. The shape is an out-and-back spur off the main path, not a detour that rejoins it seamlessly.

## Genesis

Cul-de-sacs form constantly in exploratory work — trying an implementation approach, pursuing an argument to its logical end, chasing a hypothesis during debugging. They are not failures; a path worth trying is often only provably terminal after you've walked it. What matters is what happens at the end.

## Healthy & Degenerate

**Healthy — the Cul-de-sac.** The dead end is named explicitly ("this doesn't work because—"), and the conversation retreats cleanly to the fork and takes the other branch. The visit wasn't wasted: it eliminated an option and often explains *why* the other branch is right.

**Degenerate — the Sunk Cost.** The path is recognized as terminal, or should be, but gets walked again anyway — extended, re-argued, re-tried with minor variations — because backing out feels like discarding the effort already spent. The circling at the dead end gets longer, not the path.

## Inside View

- Has anyone said out loud "this isn't going to work," and if so, did the conversation change direction afterward?
- Is the current turn adding genuinely new information, or is it a variation on an approach already shown not to work?
- If you imagine explaining to a third party why you're still on this path, does the honest answer involve "we already spent time on it"?
- Can you name the fork you'd retreat to if you abandoned this path right now? If not, you may have forgotten it was ever a choice.

## Transitions

A Cul-de-sac becomes a **River Delta** the moment the retreat is completed and the other branch is actually taken up. It becomes a **Spiral** if the dead end itself turns out to be worth revisiting later, at more depth, once new information makes it look viable again.

## Specimen

```specimen
A: Let's try caching the whole response at the edge.
B: Worth a shot — but user-specific data is in every response, so the cache key would need to include the user.
A: Fine, key by user then.
B: That gives us basically per-user cache entries with a near-zero hit rate — no better than no cache.
A: ...yeah, that defeats the purpose. Edge caching the full response doesn't work here.
B: Agreed, let's back out. Going back to the fork: what if we split static and per-user parts of the response?
A: That's the branch we skipped earlier. Cache the static shell at the edge, fetch user data client-side.
B: That actually gets us a real hit rate. Let's spec that instead.
```

> @turn 4: The dead end is named explicitly and specifically — this is the tell that separates a Cul-de-sac from a Sunk Cost.
> @turn 5-6: Clean retreat to the exact fork, not a vague pivot — the other branch is named, not rediscovered from scratch.
> @turn 7-8: The alternate branch resolves quickly, because the failed attempt already did the work of ruling out the first option.
