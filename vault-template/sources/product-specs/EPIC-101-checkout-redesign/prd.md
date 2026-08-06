---
type: prd
sdpd-layer: source
status: current
updated: 2026-08-06
tags: [checkout, orders]
---

# PRD: Checkout & Order Management

## Problem

Customers can add items to a cart but have no way to complete a purchase or review past orders. We need a minimal checkout flow: create an order, look up an order, list a customer's orders, and cancel an order before it ships.

## Goals

- A customer can convert a cart into an order.
- A customer can view any of their own orders.
- A customer can cancel an order while it's still `pending`.
- Order state is visible enough that support doesn't need to query the database directly.

## Non-Goals

- Payment processing itself (assumed handled by an existing payment provider integration, out of scope here).
- Order editing after creation — cancel and recreate instead.

## Scope for This Iteration

Four operations: create a checkout (which produces an order), list a customer's orders, get a single order, cancel an order. Anything beyond this — partial refunds, order editing, multi-currency — is future work and not implied by this PRD.

## Open Questions

- Should cancellation be allowed after an order leaves `pending`? Deferred to the contract design — if the answer changes the API shape, that's a contract decision, not a PRD amendment.
