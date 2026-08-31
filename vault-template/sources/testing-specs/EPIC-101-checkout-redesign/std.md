---
type: std
sdpd-layer: source
status: current
updated: 2026-08-06
tags: [checkout, orders, testing]
---

# STD: Checkout & Order Management

Scenarios below map to `operationId`s in `sources/contracts/openapi.yaml`. Every operation in the contract must have at least one scenario here — enforced by `scripts/check-coverage.mjs`'s existence check. Each scenario also carries a stable ID (`STD-101-<operation>-<n>`); in derived-readiness mode (README §7), a test asserting that ID is what promotes the operation from `mocked` to `implemented` to `live` — see `scripts/sdpd-readiness.mjs`. Each operation's scenarios are automated by the slice that owns it (see `srs.md` §Story Split), not by a separate QA lane.

## createCheckout — owned by Slice A

- **STD-101-createCheckout-01 — Happy path**: valid cart + valid email → `201`, order returned with `status: pending`.
- **STD-101-createCheckout-02 — Empty cart**: cart has zero items → `400`.
- **STD-101-createCheckout-03 — Missing email**: `email` omitted → `400`.

## listOrders — owned by Slice B

- **STD-101-listOrders-01 — Happy path**: customer with orders → `200`, array of orders belonging only to that customer.
- **STD-101-listOrders-02 — No orders**: customer with none → `200`, empty array (not `404`).

## getOrder — owned by Slice B

- **STD-101-getOrder-01 — Happy path**: valid `orderId` → `200`, full order detail.
- **STD-101-getOrder-02 — Not found**: unknown `orderId` → `404`.
- **STD-101-getOrder-03 — Not yours**: `orderId` belongs to a different customer → `404` (not `403` — don't confirm existence to a non-owner).

## cancelOrder — owned by Slice C

- **STD-101-cancelOrder-01 — Happy path**: `pending` order → `200`, `status: cancelled`.
- **STD-101-cancelOrder-02 — Already shipped**: order not in `pending` → `409`.
- **STD-101-cancelOrder-03 — Not found**: unknown `orderId` → `404`.
