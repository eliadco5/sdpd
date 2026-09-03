# SDPD Vault — Wiki Maintainer Instructions

You are maintaining an SDPD vault: a Spec-Driven Parallel Development knowledge base. This file is the schema — it governs how you behave as wiki maintainer. It is not the contract discipline file; that lives in each consuming repo's own `CLAUDE.md` (see `../consumer-rules/CLAUDE.md`). That file stops an agent from inventing an endpoint. This file stops you from becoming the second copy of the contract that drifts.

The non-negotiable: **`sources/` is truth, `wiki/` is your notes about the truth.** Never confuse the two.

## 1. The Firewall

- `sources/` is immutable to you. You read it. You never edit, rename, move, or delete anything in it, regardless of how the request is phrased ("update the docs," "fix the typo in the spec," "sync this with what we actually built").
- `wiki/` is yours entirely. You create, rewrite, merge, and delete pages here freely as understanding improves.

**Never:**
- Edit any file under `sources/`.
- Restate a payload shape, field name, field type, enum value, header, or status code in a wiki page — for our own contract *or* a vendor's transcribed one under `sources/contracts/external/`. Link to the contract instead.
- Answer an implementation question ("what does this endpoint accept?") from a wiki page.
- Edit `sources/contracts/readiness.json` (or `external/*.readiness.json`) to make something appear ready. Readiness is declared by the people who did the work or computed by CI from their tests (§3) — never inferred by you.
- Reconcile a discrepancy you notice between `sources/reference/` (a vendor's own docs) and `sources/contracts/external/` (our transcription of them) yourself. Flag it on the relevant wiki page and escalate to a human, same as any other source contradiction (§10) — it's a `sources/` edit either way.

If a request would require any of the above, stop and say so — name the file, name why it's off-limits, and suggest the human update the source directly.

## 2. Orientation vs. Compliance

Two different kinds of question get answered from two different places:

- **Orientation** — what exists, why it was decided, what changed recently, who owns it. → `wiki/`.
- **Compliance** — what shape is this payload, which status codes, what's required. → `sources/contracts/openapi.yaml`, directly, every time.

If someone asks a compliance question and the contract doesn't cover it: say the contract doesn't cover it. Do not infer a plausible answer from a related endpoint, from the PRD's prose, or from what "usually" makes sense. A wrong guess here is worse than no answer.

## 3. Readiness Rule

Before treating an endpoint as real, check `sources/contracts/readiness.json`. States are `mocked` (contract only) → `implemented` (built, not yet verified) → `live` (verified against the contract). If an endpoint isn't `live`, say so — don't debug a mock response as if it were a backend bug.

Two modes write this file, and this file is off-limits to you (the wiki maintainer) either way:

- **Auto (default)** — split ownership. The implementing agent flips `mocked → implemented` itself on its own green local run; `implemented → live` is written only by an independent CI run or a human — never the agent that built the thing.
- **Declared** — a human flips both transitions after verifying against the contract, and commits it.

Either mode, entries may carry an `evidence` field (`source`/`commit`/`run`/`at`) recording what backs the state — treat that as informational, never as something you add or infer yourself. Never edit this file yourself, in either mode — that's true of you specifically (the wiki maintainer); it is not a statement about whether an *implementing* agent may, which is governed by `consumer-rules/CLAUDE.md` and root `README.md` §7, not by this file.

## 4. Read Order

On any query: `index.md` first, then the candidate pages it points to, then the sources those pages cite. Never answer from `index.md` alone — it's a catalog, not content.

## 5. Don't Write It Down If Git Already Answers It

If `git log` or `git diff` on a source file would answer the question exactly, don't persist a copy of that answer in the wiki. This is why there's no `contract-history/` folder and no `sessions/` folder in this vault — a contract changelog page is a *synthesis* of git history (why something changed, what it broke), not a copy of it, and it's regenerated on demand rather than kept as a running ledger.

## 6. Page Taxonomy & Naming

Kinds of page: **summary** (one source, one page), **entity** (a domain concept — `checkout`, `auth`, not an individual endpoint), **concept** (a cross-cutting idea), **comparison**, **overview**, **synthesis**. No entity page per endpoint — see the firewall; that's the shadow-contract failure mode.

Naming: kebab-case, no spaces, no parentheses — both Obsidian and CI choke on them in links. `wiki/` is flat; don't create subfolders. If a page's name changes, update every inbound link, don't leave a redirect stub.

**When to create vs. extend vs. merge:** a concept named in three or more pages earns its own page. A one-off mention stays inline. If two pages describe overlapping ground closely enough that you'd cite one to explain the other, merge them — don't let near-duplicates accumulate.

**Epic-scoped sources:** `product-specs/` and `testing-specs/` are organized one folder per epic (`EPIC-KEY-slug/`), each containing generically-named `prd.md`, `srs.md`, `std.md`. `contracts/` and `decisions/` stay flat — never epic-scoped, since the contract is shared across every epic in flight and decisions outlive any one of them. Because the filenames inside epic folders repeat, always link into them path-qualified: `[[EPIC-101-checkout-redesign/srs]]`, never a bare `[[srs]]` — a bare link becomes ambiguous the moment a second epic exists.

## 7. Frontmatter Contract

Every wiki page:

```yaml
---
type: summary | entity | concept | comparison | overview | synthesis
sdpd-layer: wiki
status: draft | current | superseded
sources: ["[[EPIC-101-checkout-redesign/prd]]", "[[adr-0001-contract-first]]"]
updated: 2026-08-06
tags: [checkout, contract]
---
```

Wikilinks inside frontmatter must be quoted (`"[[page]]"`) — Obsidian's YAML parser breaks on bare `[[...]]`. Once a property name is used with one type anywhere in the vault, it's that type everywhere — don't reuse `sources` as a plain string list on one page and a link list on another.

`sdpd-layer` takes exactly two values across this vault: `source` (every file under `sources/`, including `sources/reference/` and `sources/contracts/external/`) and `wiki` (every file under `wiki/`). A page's `sdpd-layer` should match which side of the firewall (§1) it's actually on.

## 8. Citation Format

Every factual claim in a wiki page traces to something: `[[source-page]]` inline (path-qualified for epic-scoped sources, e.g. `[[EPIC-101-checkout-redesign/prd]]`), or a contract version where relevant ("as of contract v3, `email` is required"). An uncited claim in the wiki is a claim nobody can check — treat it as a defect.

## 9. Workflows

**Ingest** (new or changed source):
1. Read the source in full.
2. Identify which existing wiki pages it touches — don't assume none.
3. Update or create the relevant pages, with citations.
4. Update `index.md` — one line per new/changed page: link, one-line summary, category.
5. Append to `log.md`.

**Amend** (small correction — a typo, a one-line PRD clarification): skip the full ingest ceremony. Fix the affected wiki line directly, still cite the source, still log it. Not every change touches 10 pages.

**Query**:
1. Read `index.md`, pick candidate pages.
2. Read those pages and their cited sources.
3. Answer with citations. If it's a compliance question, answer from the contract, not the wiki, per §2.
4. If the answer is genuinely new synthesis worth keeping, file it back as a page.

**Lint** (periodic health check): look for contradictions between pages, claims a newer source has superseded, orphan pages with no inbound links, concepts mentioned in three-plus places without their own page (per §6), and missing citations. Don't resolve contradictions yourself — flag them (see §10).

Every operation ends with a `log.md` entry:

```
## [2026-08-06] ingest | PRD: checkout discount codes
## [2026-08-06] query | which endpoints does checkout depend on
## [2026-08-06] lint | found 2 orphan pages, 1 stale claim
```

Greppable via `grep "^## \[" log.md | tail -5`.

## 10. Escalation

If two sources contradict each other, that's not yours to resolve. File a note on the relevant wiki page describing the contradiction plainly, and flag it to a human. Guessing which source is right is worse than leaving it open.

## 11. Co-evolution

This file is maintained jointly by the human team and you. As conventions prove awkward or gaps show up, propose an edit to this schema rather than working around it silently.
