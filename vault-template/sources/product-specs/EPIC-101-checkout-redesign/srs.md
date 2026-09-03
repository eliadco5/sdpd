---
type: srs
sdpd-layer: source
status: current
updated: 2026-08-06
tags: [checkout, orders, architecture]
---

# SRS: Checkout & Order Management (EPIC-101)

Derived from [[EPIC-101-checkout-redesign/prd]] (this epic's PRD). Where the PRD says *what* and *why*, this says *which components, which interfaces, which API surface* — the input the tech lead uses to write `sources/contracts/openapi.yaml`. Story tickets are split along the boundaries drawn here, not around them.

## Components

- **Order Service** (backend) — owns order state, exposes the checkout/orders API below.
- **Checkout UI** (frontend) — consumes the API below, no direct data access.
- **Notification Service** (existing, unchanged) — consumed by Order Service on order state transitions; out of scope for this epic beyond the existing event contract.

## API Surface for This Epic

| Operation | Method + Path | Owning slice |
|---|---|---|
| — | `Order` schema (shared) | Slice 0 — seam |
| `createCheckout` | `POST /checkout` | Slice A — create |
| `listOrders` | `GET /orders` | Slice B — view |
| `getOrder` | `GET /orders/{orderId}` | Slice B — view |
| `cancelOrder` | `POST /orders/{orderId}/cancel` | Slice C — cancel |

All four operations are net-new for this epic — see `sources/contracts/openapi.yaml` for the formal shapes and `sources/contracts/readiness.json` for current build status.

## Story Split

This SRS is written so the epic can be broken into disjoint story tickets without any two touching the same operationId — cut vertically, by capability, not by layer (see root `README.md` §5.5 for why):

- **Slice 0 — seam (serial, blocks A–C).** The shared `Order` schema in the contract, plus `readiness.json` seeded at `mocked` for all four operations. Nothing in A–C starts until this lands, per README §5 Step 2 — it's the one deliberately sequential step, not a fourth parallel lane.
- **Slice A — create.** `createCheckout` end to end: the checkout form, the route implementation, and the three `createCheckout` scenarios in `std.md` automated and green. Everything else it touches (`listOrders`, `getOrder`, `cancelOrder`) resolves to mock.
- **Slice B — view.** `listOrders` + `getOrder` end to end: the order list and detail views, both routes, and their STD scenarios. `createCheckout` and `cancelOrder` resolve to mock.
- **Slice C — cancel.** `cancelOrder` end to end: the cancel action, the route, and its three STD scenarios. The other three operations resolve to mock.

Each slice is a full vertical: UI through route through its own tests. None of them is "the frontend story" or "the backend story" — QA's job here is authoring `std.md` before the fan-out (already done, in Slice 0's wake), not automating everyone else's scenarios in a fourth lane. Automating a slice's scenarios is that slice's job, and its PR isn't done until they're green.

If a future epic needs to touch any of these same four operations, that's a signal for a shared review before either epic's contract changes ship — not something to resolve by editing the contract from two branches independently. If a slice discovers mid-build that it needs a *new* seam none of A–C anticipated, that's a new seam ticket (README §5 Step 4), not a change folded into that slice's own branch.

This isn't hypothetical: [[EPIC-102-bulk-order-management/srs|EPIC-102]] later needed `Order` to grow a `cancelledAt` field. See [[adr-0004-epic-102-order-seam]] for how that collision was resolved as a seam ticket — this epic's four operations and STD scenarios needed no changes as a result.

## Non-Functional Notes

- No new external dependencies.
- Order Service must remain stateless per-request; order state lives in the existing orders datastore (unchanged schema beyond what the contract's `Order` model implies).
