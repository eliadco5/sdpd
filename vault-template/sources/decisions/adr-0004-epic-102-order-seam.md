---
type: adr
sdpd-layer: source
status: current
updated: 2026-09-03
tags: [orders, process, contract]
---

# ADR-0004: Seam Ticket — Order.cancelledAt for EPIC-102

## Status

Accepted

## Context

[[EPIC-102-bulk-order-management/prd]] needs to know *when* an order was cancelled, and needs a new `bulkCancelOrders` operation. The timestamp belongs on `Order` — the same shared schema [[EPIC-101-checkout-redesign/srs|EPIC-101]] already contributes four operations against (`createCheckout`, `listOrders`, `getOrder`, `cancelOrder`). `sources/contracts/` is flat and global exactly so this shows up as one collision in one file, per root `README.md` §4, rather than two epics quietly diverging on what `Order` means. This is root `README.md` §5 Step 4's seam ticket, made concrete: EPIC-102 could not just add the field on its own branch, because other slices (EPIC-101's, already shipped or shippable) depend on `Order`'s current shape not changing out from under them.

## Decision

Add `Order.cancelledAt` as an **optional, nullable** field — additive, not a breaking change. `cancelOrder` (EPIC-101) and `bulkCancelOrders` (EPIC-102) both set it when they cancel an order; every other existing operation is unaffected because they were never required to populate or validate it. This was landed as its own seam ticket (EPIC-102's Slice 0, see `srs.md`), reviewed before EPIC-102's Slice A started, rather than folded into Slice A's own branch.

Rejected alternative: a separate `CancelledOrder` shape returned only by cancellation operations. Rejected because it would have forced `listOrders`/`getOrder` (EPIC-101, unrelated to this epic) to discriminate between two `Order`-shaped responses depending on status — more surface area for exactly the kind of drift a shared contract is supposed to prevent, to solve a problem a single optional field solves cleanly.

## Consequences

- EPIC-101's four operation *contracts* and their STD scenarios (`sources/testing-specs/EPIC-101-checkout-redesign/std.md`) needed **zero changes** — no renamed field, no new required field, no altered response shape. This is the concrete case root `README.md` §12's "disjoint-capability cutting isn't always possible" caveat describes, resolved via a blocking seam ticket rather than a merge dance across two branches.
- `cancelOrder` (EPIC-101) picked up one implementation-side retrofit — start setting `cancelledAt` — even though EPIC-101 shipped before EPIC-102 existed. Tracked as part of this seam ticket, not silently deferred to EPIC-102: the retrofit is optional (`getOrder`/`listOrders` return whatever's there, `null` for orders cancelled before the retrofit landed), so it carries no urgency, but it's this ADR that owns the decision, not a footnote in EPIC-102's own work.
- Any third epic touching `Order` again goes through the same shared-review path — see [[EPIC-101-checkout-redesign/srs]]'s Story Split note and [[EPIC-102-bulk-order-management/srs]]'s.
