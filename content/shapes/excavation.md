---
id: excavation
name: The Excavation
order: 5
signature: "The stated question is progressively revealed to be covering a different, deeper one, layer by layer."
degenerate_name: The False Floor
transitions: [spiral, delta]
viz_params:
  - {key: depthReached, label: "Depth reached", min: 0, max: 1, default: 1, degenerate_at: 0}
  - {key: layers, label: "Layers", min: 3, max: 8, default: 5}
palette: cool
---

## Signature

The conversation starts by answering the question as asked, and each answer turns out to be sitting on top of an unstated assumption worth questioning. Peeling one layer back doesn't end the conversation, it exposes the next one — until, if it goes all the way, the *actual* question surfaces and turns out to be different from the one originally asked.

## Genesis

Excavations form whenever the stated question is a proxy for something harder to say directly: "can you review this PR" standing in for "I'm not confident in this approach," a scheduling question standing in for a priorities disagreement, a technical question standing in for an unstated deadline pressure. They require one party willing to keep asking "is that really it, though" past the point of a socially adequate answer.

## Healthy & Degenerate

**Healthy — the Excavation.** Each layer removed changes what's being discussed, and the process terminates: the real question surfaces, is named, and gets addressed on its own terms.

**Degenerate — the False Floor.** Layers get peeled — the conversation *looks* like it's excavating — but the last layer is never removed. The surface question gets a satisfying, complete-sounding answer, and everyone leaves believing something was resolved. It wasn't; the real question is still under the floor.

## Inside View

- After the "final" answer, does it actually address what was worrying anyone, or just what was literally asked?
- Was there a moment where someone almost said the real concern and then reframed it as something safer? That reframe is the false floor forming.
- Count how many times "actually, the real issue is..." appeared. Did the *last* one get addressed, or just the second-to-last?
- If you told the stated question to someone with no context, would they be surprised by how the conversation actually ended?

## Transitions

An Excavation becomes a **Spiral** once the real question surfaces and turns out to need its own multi-pass treatment. It becomes a **Delta** if the newly-surfaced question immediately fans into several independent sub-questions of its own.

## Specimen

```specimen
A: Can you review this PR when you get a chance?
B: Sure — is there a deadline I should know about?
A: Not really, just want it in before the sprint ends.
B: Okay. Is there a part of it you're less sure about, or should I just review it broadly?
A: I guess... the caching layer. I copied the pattern from the last service without fully checking it fits here.
B: Got it — so you want me to specifically sanity-check whether that pattern is even the right one here, not just style-review it.
A: Yeah, honestly. I don't fully trust it and wanted a second opinion before it ships.
B: That's a different review than "check my PR" — let's pair on the caching layer directly instead of an async review.
```

> @turn 3: Surface answer ("not really, just the sprint") is socially adequate but not the real constraint.
> @turn 5: First real layer removed — the actual worry (an unverified pattern) surfaces.
> @turn 8: The excavation reaches bottom — the response changes to match the real question, not the stated one.
