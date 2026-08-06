---
type: adr
sdpd-layer: source
status: current
updated: 2026-08-06
tags: [process, contract]
---

# ADR-0001: Contract-First for Checkout

## Status

Accepted

## Context

The checkout PRD and SRS ([[EPIC-101-checkout-redesign/prd]], [[EPIC-101-checkout-redesign/srs]]) require backend, frontend, and QA — each working a separate story ticket under this epic — to work in parallel rather than sequentially. The team is distributed across VMs and branches, so waiting for a working backend before frontend starts is a multi-day cost, not a same-desk conversation.

## Decision

Write the OpenAPI contract (`sources/contracts/openapi.yaml`) before any implementation code. Frontend builds against a mock generated from the contract. Backend implements to match the same contract. Neither side infers the other's intent from Slack or from reading the other repo.

## Consequences

- The contract must be complete enough to mock meaningfully before backend starts — this front-loads design work that would otherwise happen implicitly during implementation.
- Any shape change (a new field, a renamed status code) requires a contract change first, which is slower per-change than editing code directly, in exchange for removing integration surprises later.
- Readiness (`sources/contracts/readiness.json`) becomes a required companion artifact, since "the contract exists" and "the endpoint is real" are now visibly different facts, not implicit ones.
