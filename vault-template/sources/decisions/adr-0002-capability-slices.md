---
type: adr
sdpd-layer: source
status: current
updated: 2026-08-30
tags: [process, parallelism]
---

# ADR-0002: Capability Slices, Not Layer Lanes

## Status

Accepted

## Context

ADR-0001 established contract-first development for checkout ([[EPIC-101-checkout-redesign/srs]]), but left open *how* the epic splits into story tickets. The original split was one backend story, one frontend story, one QA story — the obvious cut, since it maps onto how the team is organized. It has a real cost: each lane only ever validates its own layer against a mock or a stub. The pieces are proven to fit only at integration, after all three lanes report done — which is exactly the deferred-integration risk contract-first parallelism is supposed to remove, just moved later in the timeline. It's a worse fit still once AI agents are doing the building: an agent can produce a full layer's implementation in minutes, so three agents finishing their three layers in parallel converges on an integration problem *faster*, not a working feature faster.

## Decision

Split epics into **capability slices** by default: each story owns a disjoint set of `operationId`s end-to-end — UI, route implementation, and that operation's STD scenarios automated and green — rather than one layer across every operation. A slice is done when it can prove itself correct on its own, against the contract and its own tests, with every operation it doesn't own resolved to mock. Any seam a slice needs that other in-flight slices will also depend on is split out as its own small serial ticket (a "seam ticket") that blocks its consumers, rather than being decided inside whichever slice found it first.

Layer-based splitting remains available as a documented fallback (README §5.5) for teams where ownership genuinely is one layer per team — separate repos, separate on-call — used deliberately, with its cost stated rather than hidden.

## Consequences

- Cutting by capability requires the SRS to draw disjoint operation boundaries before the fan-out (README §5 Step 2) — this front-loads seam design the same way ADR-0001 front-loads contract design, for the same reason.
- Some capabilities won't cut disjointly — two slices may need the same operation to grow in different directions in the same window. The answer is a blocking edge or a seam ticket, not two branches editing the same contract entry independently.
- QA no longer runs as its own parallel automation lane; each slice automates its own STD scenarios as part of its own PR. QA's authored-STD-before-fan-out role (README §5 Step 2) is unchanged.
- This SRS ([[EPIC-101-checkout-redesign/srs]]) and its STD ([[EPIC-101-checkout-redesign/std]]) were rewritten to this decision on 2026-08-30, replacing the original backend/frontend/QA split.
