---
type: prd
sdpd-layer: source
status: current
updated: 2026-09-03
tags: [orders, support-ops]
---

# PRD: Bulk Order Management (EPIC-102)

## Problem

Support ops handles cancellations one order at a time through the existing `cancelOrder` flow (EPIC-101). When a vendor recall or a bad batch hits, that means dozens of individual cancel clicks for one underlying event — slow, and it leaves no record of *when* each order was actually cancelled, only that it currently is.

## What

A bulk-cancel action: support picks a set of orders and cancels all of them in one call. Orders already shipped are reported back as not cancellable rather than silently skipped. Every cancelled order — whether cancelled one at a time via EPIC-101's flow or in bulk here — now records when it happened, so support can answer "was this cancelled before or after the recall notice went out."

## Why now

A recent recall took a support engineer most of an afternoon clicking through individual cancellations. The timestamp gap also meant nobody could later confirm which cancellations happened before the recall email went out versus in response to it.

## Out of scope

- Bulk actions other than cancel (e.g. bulk refund) — future epic if needed.
- Undo/bulk-restore — cancellation remains one-directional, same as EPIC-101.
