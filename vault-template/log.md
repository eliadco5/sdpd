# Vault Log

Append-only. Format: `## [YYYY-MM-DD] op | Title`. Greppable via `grep "^## \[" log.md | tail -5`.

## [2026-08-06] ingest | EPIC-101 PRD: checkout & order management
## [2026-08-06] ingest | EPIC-101 SRS: checkout & order management architecture
## [2026-08-06] ingest | ADR-0001: contract-first for checkout
## [2026-08-06] ingest | Contract: checkout & orders v1.0.0
## [2026-08-30] ingest | EPIC-101 SRS/STD rewritten to capability slices (Slice 0/A/B/C), replacing the backend/frontend/QA split
## [2026-08-30] ingest | ADR-0002: capability slices, not layer lanes
## [2026-08-30] ingest | External contract: Acme Payments v1 (createPaymentIntent, getPaymentIntent) + vendor reference notes
## [2026-09-03] ingest | ADR-0003: auto readiness by default (agent flips implemented, CI/human confirms live)
## [2026-09-03] ingest | EPIC-102 PRD/SRS/STD: bulk order management (bulkCancelOrders, Order.cancelledAt seam)
## [2026-09-03] ingest | ADR-0004: seam ticket — Order.cancelledAt for EPIC-102
## [2026-09-03] ingest | Contract: bulkCancelOrders added, Order.cancelledAt added (additive)
## [2026-09-03] lint | added [[bulk-order-management]] and [[order-schema-evolution]]; EPIC-101 srs/overview cross-linked to EPIC-102
