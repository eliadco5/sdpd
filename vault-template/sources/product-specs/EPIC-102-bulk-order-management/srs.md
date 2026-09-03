---
type: srs
sdpd-layer: source
status: current
updated: 2026-09-03
tags: [orders, support-ops, architecture]
---

# SRS: Bulk Order Management (EPIC-102)

Derived from [[EPIC-102-bulk-order-management/prd]]. This epic is the worked instance of the collision root `README.md` §4 promises a flat, global contract will surface: it needs `Order.cancelledAt`, a field the contract already exposes to four operations shipped by [[EPIC-101-checkout-redesign/srs|EPIC-101]]. See [[adr-0004-epic-102-order-seam]] for how that collision was resolved.

## Components

- **Order Service** (backend, same service as EPIC-101) — gains `bulkCancelOrders` and starts populating `cancelledAt`.
- **Bulk Actions UI** (frontend, new) — support-ops surface for selecting orders and triggering the bulk cancel.

## API Surface for This Epic

| Operation | Method + Path | Owning slice |
|---|---|---|
| — | `Order.cancelledAt` (shared field) | Slice 0 — seam |
| `bulkCancelOrders` | `POST /orders/bulk-cancel` | Slice A |

`Order.cancelledAt` is additive and optional — see `sources/contracts/openapi.yaml` and [[adr-0004-epic-102-order-seam]]. `bulkCancelOrders` is net-new for this epic.

## Story Split

Cut vertically, per root `README.md` §5.5 — same rule as EPIC-101, applied to a case where the seam isn't net-new, it's shared:

- **Slice 0 — seam (serial, blocks A).** The `Order.cancelledAt` addition to the shared contract. This is root `README.md` §5 Step 4's seam ticket given a concrete instance, not a hypothetical: EPIC-101 already shipped four operations against `Order` before EPIC-102 existed, so this couldn't be folded into EPIC-102's own branch — it had to be reviewed as a change to a schema another epic's slices depend on. Resolved as additive/nullable specifically so EPIC-101's shipped operations and STD scenarios need zero changes (see [[adr-0004-epic-102-order-seam]]).
- **Slice A — bulk cancel.** `bulkCancelOrders` end to end: the Bulk Actions UI, the route, and its STD scenarios (`sources/testing-specs/EPIC-102-bulk-order-management/std.md`) automated and green. `createCheckout`, `listOrders`, `getOrder`, and single-order `cancelOrder` all resolve to whatever EPIC-101 left them at — this slice doesn't touch them.

If a third epic needs `Order` or `bulkCancelOrders` to grow again, the same rule applies: a shared review before either epic's contract change ships, per [[EPIC-101-checkout-redesign/srs]]'s Story Split note.

## Non-Functional Notes

- No new external dependencies.
- `bulkCancelOrders` is not itself transactional across orders — each `orderId` in the request is evaluated independently, which is why the response is a per-order array rather than a single status.
