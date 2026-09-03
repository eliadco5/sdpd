---
type: adr
sdpd-layer: source
status: current
updated: 2026-09-03
tags: [process, readiness]
---

# ADR-0003: Auto Readiness by Default

## Status

Accepted

## Context

Readiness (root `README.md` §7) originally had one writer: a human, hand-flipping `mocked → implemented → live` after verifying an endpoint. That's a manual step on every promotion, for every operation, and it's a second source of truth beside whatever CI already knows — a hand-edited file can say `live` for reasons nobody can check. An earlier iteration added a fully CI-derived alternative (compute both transitions from a conformance run) as an opt-in, but that still requires a team to have CI wired up before *any* of the manual cost goes away, and it treats `mocked → implemented` — a low-stakes, purely informational bookkeeping step — with the same ceremony as `implemented → live`, which is the claim everything downstream actually trusts.

## Decision

Split ownership by stakes, and make the split the default (**Auto** mode):

- **`mocked → implemented`** — the agent that just built the operation may flip this itself, the moment its own STD scenarios pass locally (`scripts/sdpd-readiness.mjs --source agent --write`). Cheap to get wrong, cheap to notice it's wrong, and removing this is most of what "the manual work" used to be.
- **`implemented → live`** — stays gated behind an independent signal: a CI run against `main` (`--source ci`), or a human. Never the same actor that built the thing. `--source agent` is hard-capped at `implemented` even when every scenario passes locally, and can never downgrade an operation already at `live`.

**Declared** mode (a human flips both transitions by hand, no CI required) remains a fully-supported, equal opt-in — not a legacy fallback — for teams that want a person's eyes on every promotion rather than just the terminal one.

## Consequences

- An agent can mis-flip `implemented` from a wrong local environment (stale mock, misconfigured base URL). This is accepted risk, not eliminated risk — mitigated entirely by keeping `implemented` non-terminal: nothing downstream should ever resolve an operation as real because it's `implemented`; only `live` means that (see root `README.md` §12).
- Teams with no CI at all still get the everyday bookkeeping automated; they simply never reach `live` automatically, which is honest — nothing *should* claim `live` without an independent check.
- `evidence.source` (`agent` | `ci` | `human`) makes every entry's writer identifiable after the fact, regardless of mode.
