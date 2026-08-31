---
type: reference
sdpd-layer: source
status: current
updated: 2026-08-30
tags: [reference]
---

# Reference

External material this vault's sources cite: vendor API docs, standards, prior art, articles — anything normative that we didn't write and don't control.

The one thing everything in here needs is a **provenance stamp**: where it came from, and when it was captured, right at the top of the file. Vendor docs go stale silently — nobody tells you when a page changes — so the capture date is what lets a later reader (human or agent) judge whether a transcription might have drifted.

This folder is `sources/`, so the usual firewall applies: it's human-curated and immutable to the wiki-maintainer LLM (`vault-template/CLAUDE.md` §1), same as every other `sources/` subfolder.

**Relationship to `sources/contracts/external/`:** a file here is the vendor's own description, kept as close to verbatim as practical. A file under `contracts/external/` is *our* transcription of that description into OpenAPI, for our own tooling to resolve against (README §4, consumer-rules `interfaces` role). They're expected to say the same thing; if they don't, that's a drift to flag to a human, never to silently reconcile — see `vault-template/CLAUDE.md` §1.

See `acme-payments-api-notes.md` for a worked example.
