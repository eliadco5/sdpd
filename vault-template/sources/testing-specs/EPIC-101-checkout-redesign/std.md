---
type: std
sdpd-layer: source
status: current
updated: 2026-08-06
tags: [checkout, orders, testing]
---

# STD: Checkout & Order Management

Scenarios below map to `operationId`s in `sources/contracts/openapi.yaml`. Every operation in the contract must have at least one scenario here — enforced by `scripts/check-coverage.mjs`.

## createCheckout

- **Happy path**: valid cart + valid email → `201`, order returned with `status: pending`.
- **Empty cart**: cart has zero items → `400`.
- **Missing email**: `email` omitted → `400`.

## listOrders

- **Happy path**: customer with orders → `200`, array of orders belonging only to that customer.
- **No orders**: customer with none → `200`, empty array (not `404`).

## getOrder

- **Happy path**: valid `orderId` → `200`, full order detail.
- **Not found**: unknown `orderId` → `404`.
- **Not yours**: `orderId` belongs to a different customer → `404` (not `403` — don't confirm existence to a non-owner).

## cancelOrder

- **Happy path**: `pending` order → `200`, `status: cancelled`.
- **Already shipped**: order not in `pending` → `409`.
- **Not found**: unknown `orderId` → `404`.
