---
type: reference
sdpd-layer: source
status: current
updated: 2026-08-30
tags: [interfaces, payments, acme]
---

# Acme Payments API — Vendor Notes

**Provenance:** transcribed from Acme's public API docs (`https://docs.acme-payments.example/v1/payment-intents`) on 2026-08-30 by the `interfaces` role. This is Acme's description of their own API, not a commitment made by anyone on this team — Acme can change it without anyone here doing anything. See `sources/contracts/external/acme-payments.openapi.yaml` for our transcription of this into OpenAPI, and `vault-template/CLAUDE.md` §1 for the drift-escalation rule between the two.

## `POST /v1/payment_intents`

Creates a payment intent for a given amount and currency. Vendor's own field names, kept verbatim here (do **not** let these leak past the adapter boundary into our domain objects — consumer-rules `interfaces` role):

- `amount` — integer, smallest currency unit (cents for USD).
- `currency` — ISO 4217 lowercase code, e.g. `"usd"`.
- `payment_method` — vendor-issued token, opaque to us.

Returns `payment_intent_id` (vendor's identifier — our `Order` model must never store this field name directly; the adapter maps it to our own `paymentReference`) and `status`, one of Acme's own vocabulary: `requires_action`, `succeeded`, `failed`. Acme's docs note `status` may add new values "without a major version bump" — treat any value we haven't explicitly mapped as an error to escalate, not one to guess a mapping for.

## `GET /v1/payment_intents/{id}`

Retrieves a payment intent's current status. No changes noted from the above.

## Open questions for a human, not to resolve here

- Acme's docs don't state a timeout SLA. The adapter's retry/timeout mechanics are ours to decide (consumer-rules `interfaces` role), but the *absence* of a vendor SLA is worth flagging once, not re-discovering per adapter change.
