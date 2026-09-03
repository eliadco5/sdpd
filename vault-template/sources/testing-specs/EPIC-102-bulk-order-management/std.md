---
type: std
sdpd-layer: source
status: current
updated: 2026-09-03
tags: [orders, support-ops, testing]
---

# STD: Bulk Order Management

Scenarios map to `operationId`s in `sources/contracts/openapi.yaml`. Every operation must have at least one scenario here — enforced by `scripts/check-coverage.mjs`. Owned end-to-end by Slice A (see `srs.md` §Story Split); IDs follow `STD-102-<operation>-<n>`.

## bulkCancelOrders — owned by Slice A

- **STD-102-bulkCancelOrders-01 — Happy path**: all `orderIds` are `pending` → `200`, each result `status: cancelled`, and each order's `cancelledAt` set.
- **STD-102-bulkCancelOrders-02 — Partial failure**: a mix of `pending` and already-`shipped` orders → `200`, mixed per-order results (`cancelled` / `already-shipped`); no single order's failure blocks the others.
- **STD-102-bulkCancelOrders-03 — Empty list**: `orderIds` is `[]` → `400`.
- **STD-102-bulkCancelOrders-04 — Unknown order**: an `orderId` that doesn't exist → that entry's result is `not-found`; other entries in the same request still process normally.
