---
type: overview
sdpd-layer: wiki
status: current
sources: ["[[EPIC-101-checkout-redesign/prd]]", "[[EPIC-101-checkout-redesign/srs]]", "[[adr-0001-contract-first]]", "[[adr-0002-capability-slices]]"]
updated: 2026-08-30
tags: [checkout, orders]
---

# Overview: Checkout & Orders

The checkout feature ([[EPIC-101-checkout-redesign/prd|PRD]], [[EPIC-101-checkout-redesign/srs|SRS]]) is built contract-first ([[adr-0001-contract-first]]): the contract at `sources/contracts/openapi.yaml` defines four operations — `createCheckout`, `listOrders`, `getOrder`, `cancelOrder` — before any implementation existed. The SRS splits the epic into four capability slices, not a backend/frontend/QA split ([[adr-0002-capability-slices]]) — see its "Story Split" section for the current Slice 0/A/B/C boundaries.

Note on linking: `prd.md`/`srs.md`/`std.md` are generic filenames repeated per epic folder, so links into `product-specs/` or `testing-specs/` must be path-qualified (`[[EPIC-101-checkout-redesign/prd]]`), not bare (`[[prd]]`) — this isn't hypothetical, [[bulk-order-management]] is the second epic that made bare links ambiguous.

For what each operation accepts and returns, read the contract directly — this page won't repeat it, and if it drifts from the contract, the contract wins (see `CLAUDE.md` §2).

For whether a given operation is actually live yet, read `sources/contracts/readiness.json` — this page won't track that either, since it changes far more often than this summary should.

`Order` gained a field after this epic shipped — see [[order-schema-evolution]] for what changed and why, without this page or that one restating the schema itself.
