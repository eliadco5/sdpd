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

| Operation | Method + Path | Owning story area |
|---|---|---|
| `createCheckout` | `POST /checkout` | Backend: Order Service |
| `listOrders` | `GET /orders` | Backend: Order Service |
| `getOrder` | `GET /orders/{orderId}` | Backend: Order Service |
| `cancelOrder` | `POST /orders/{orderId}/cancel` | Backend: Order Service |

All four are net-new for this epic — see `sources/contracts/openapi.yaml` for the formal shapes and `sources/contracts/readiness.json` for current build status.

## Story Split

This SRS is written so the epic can be broken into disjoint story tickets without any two touching the same operationId:

- **Backend story** — implement all four operations against the contract above.
- **Frontend story** — build the Checkout UI against the same contract, routed through the vault's readiness/mock resolution (see root `README.md` §7) so it never blocks on the backend story finishing.
- **QA story** — automate `sources/testing-specs/EPIC-101-checkout-redesign/std.md` against the contract, independent of either.

If a future epic needs to touch any of these same four operations, that's a signal for a shared review before either epic's contract changes ship — not something to resolve by editing the contract from two branches independently.

## Non-Functional Notes

- No new external dependencies.
- Order Service must remain stateless per-request; order state lives in the existing orders datastore (unchanged schema beyond what the contract's `Order` model implies).
