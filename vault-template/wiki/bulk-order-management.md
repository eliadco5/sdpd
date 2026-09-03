---
type: overview
sdpd-layer: wiki
status: current
sources: ["[[EPIC-102-bulk-order-management/prd]]", "[[EPIC-102-bulk-order-management/srs]]", "[[adr-0004-epic-102-order-seam]]"]
updated: 2026-09-03
tags: [orders, support-ops]
---

# Overview: Bulk Order Management

Support ops needed to cancel many orders in one action instead of one at a time ([[EPIC-102-bulk-order-management/prd|PRD]]), and to know when each cancellation actually happened. The SRS ([[EPIC-102-bulk-order-management/srs]]) splits this into a seam ticket (`Order.cancelledAt`, shared with [[EPIC-101-checkout-redesign/srs|EPIC-101]]) plus one capability slice (`bulkCancelOrders` end to end) — see its "Story Split" section for the current boundary.

This epic is also the vault's worked example of the flat-contract collision root `README.md` §4 describes: it needed a field on a schema another epic already shipped operations against. See [[adr-0004-epic-102-order-seam]] for how that was resolved, and [[order-schema-evolution]] for the cross-epic synthesis of what `Order` has gained and why.

For what `bulkCancelOrders` accepts and returns, read `sources/contracts/openapi.yaml` directly — this page won't repeat it. For whether it's live yet, read `sources/contracts/readiness.json`.
