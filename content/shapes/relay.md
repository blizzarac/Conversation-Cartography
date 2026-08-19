---
id: relay
name: The Relay
order: 6
signature: "A task handoff structure — each turn transforms one shared artifact, draft into critique into revision."
degenerate_name: The Ping-Pong
transitions: [switchback, delta]
viz_params:
  - {key: convergence, label: "Artifact convergence", min: 0, max: 1, default: 0.75, degenerate_at: 0}
  - {key: handoffs, label: "Handoffs", min: 3, max: 8, default: 5}
palette: warm
---

## Signature

There's one artifact — a document, a plan, a piece of code — and the conversation is entirely in service of moving it forward. Each turn takes the baton, changes the artifact, and passes it back. Unlike a Switchback, the parties aren't disagreeing about a position; they're jointly authoring a thing, and the thing itself is the record of progress.

## Genesis

Relays form around drafting, code review, and any workflow with an explicit critique-then-revise loop. They need a artifact concrete enough that "did this turn improve it" is answerable — a spec, a draft, a diff — rather than an abstract position that can't be checked against anything external.

## Healthy & Degenerate

**Healthy — the Relay.** Each handoff moves the artifact measurably closer to something both parties would sign off on. Later versions are visibly different from — and better than — earlier ones.

**Degenerate — the Ping-Pong.** Edits oscillate. Version N looks a lot like version N−2: a change gets made, then reverted in spirit two turns later, then remade. Nobody is accumulating; they're trading the artifact back and forth without moving it.

## Inside View

- Diff version N against version N−2. If they're substantially the same, you're in a Ping-Pong, not a Relay.
- Is each handoff responding to specific feedback from the last one, or reopening a decision that was already made?
- Could you point to the exact turn where the artifact become good enough to ship? If every turn looks equally "almost done," it isn't converging.
- Is disagreement about the artifact being resolved *in* the artifact, or is it spilling into a parallel argument that never gets encoded into a revision?

## Transitions

A Relay reverts to a **Switchback** when the disagreement stops being about the artifact and becomes about the underlying position the artifact is supposed to encode. It becomes a **Delta** when a single revision request turns out to require several independent changes that fork into their own sub-threads.

## Specimen

```specimen
A: Here's a first draft of the API spec.
B: Looks reasonable, but the error codes are ad hoc — let's use a consistent taxonomy.
A: Updated — every error now maps to one of four categories: client, auth, rate-limit, server.
B: Better. One gap: what does a client see on a rate-limit error specifically?
A: Added a retry-after header requirement and an example response body.
B: This is close. Only nit left: the auth category should distinguish expired vs. invalid tokens.
A: Split into two subcodes under auth — expired_token and invalid_token.
B: Ship it — this version is sign-off ready.
```

> @turn 2: First real transformation — ad hoc codes become a taxonomy.
> @turn 4-6: Each handoff narrows scope (rate-limit detail, then one auth subcode split) rather than reopening earlier decisions.
> @turn 8: Explicit convergence signal — "sign-off ready" names the artifact as done, which a Ping-Pong never reaches.
