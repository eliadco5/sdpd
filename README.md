# SDPD — Spec-Driven Parallel Development

**A methodology for cross-team collaboration in the AI-agent era.**

> The contract is the single source of truth. Everyone — human or AI — builds against it, not against each other.

**Scope note:** this repo is the methodology plus a small (~300-line), dependency-free reference implementation and one worked example (`EPIC-101-checkout-redesign`). The doctrine is the product; the scripts exist to make the doctrine concrete, not to be the only valid implementation of it — see §12 for where the reference tooling is known to be thin.

---

## 1. The Problem

AI coding agents made individual engineers dramatically faster at writing code. They did not make teams faster at *shipping together*. The bottleneck moved: it used to be "how fast can I write this endpoint," now it's "is the backend ready yet," "did the frontend guess the payload shape right," "why did QA write tests against an API that changed yesterday."

Cross-team coordination is now the slowest part of the loop — and it's the one part that hasn't been redesigned for a world where every team has an AI agent that can produce a full implementation in minutes, but will happily hallucinate an endpoint, a header, or a status code if nobody tells it otherwise.

SDPD is a response to that specific failure mode: **fast individual agents, uncoordinated collective output.**

## 2. The Core Idea

Think of a feature as a jigsaw puzzle. Historically, teams built their pieces sequentially — backend first, then frontend integrates against whatever backend produced, then QA tests whatever shipped. Every handoff was a point of drift and a point of waiting.

SDPD puts a **contract** at the center of the puzzle board first. The contract defines the exact shape of every piece — the interface, not the implementation. Backend, frontend, infrastructure, and QA then build their own pieces **in parallel**, independently, each one only responsible for matching the shape it was given. When every piece is built to spec, they click together without an integration phase.

The contract isn't documentation of what was built. It's a commitment about what *will* be built, made before anyone starts, that both humans and AI agents are bound to.

## 3. Principles

1. **Contract before code.** No implementation — human or agent-generated — starts until the interface it depends on exists in written, versioned form.
2. **The spec is authoritative, not aspirational.** If reality needs to diverge from the spec, the spec changes first, in a place everyone can see, before the code that diverges from it is written.
3. **Agents are treated as team members, not tools.** An AI coding agent working in a repo needs the same boundary a new hire needs: what it owns, what it must not touch, and where to go when the spec doesn't cover its case.
4. **Parallel by default, sequential only by necessity.** Any two workstreams that both depend only on the contract — not on each other — should run at the same time.
5. **Drift is a bug.** If backend and frontend disagree about a payload shape, that's not a bug in one of them — it's a bug in the process that let them build without checking the same contract.
6. **Every workstream must be able to prove itself end-to-end.** A workstream that can only validate its own layer hasn't been de-risked by the contract, only unblocked by it — the mock made it *possible* to keep moving, not *proof* that the pieces will click together. How this shapes the way work gets split is §5.5.

## 4. The SDPD Vault

SDPD is operationalized through a **vault** — a shared repository (or shared section of a monorepo) that every team and every agent reads from before writing code. It is the orchestrator: it doesn't run code, it defines the shape of what everyone else's code must satisfy.

The vault has three layers, borrowed from Andrej Karpathy's [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and mapped directly onto SDPD's needs:

- **Sources** — the PRD, the contract, the test design, the ADRs. Immutable to any LLM. Human-authored, versioned, normative. This is what the contract-first principle actually protects.
- **Wiki** — LLM-generated markdown: summaries, overviews, syntheses, a changelog distilled from contract history. The LLM owns this layer entirely — it's derived and regenerable, never authoritative.
- **Schema** — a `CLAUDE.md` at the vault root that tells the agent how the wiki is structured and, critically, where its authority ends.

```
sdpd-vault/
├── CLAUDE.md                            the schema — governs the LLM's behavior as wiki maintainer
├── index.md                              content catalog, updated on every ingest
├── log.md                                append-only history of ingests, queries, lint passes
├── sources/                              immutable · normative · human-authored
│   ├── product-specs/
│   │   └── EPIC-101-checkout-redesign/   one folder per epic — prd.md + srs.md
│   ├── contracts/                        FLAT and GLOBAL, not epic-scoped — see below
│   │   ├── openapi.yaml                  the one contract every epic contributes to
│   │   ├── readiness.json                keyed by operationId, regardless of which epic added it
│   │   └── environments.json
│   ├── testing-specs/
│   │   └── EPIC-101-checkout-redesign/   std.md — scenarios for what this epic added
│   ├── decisions/                        FLAT — ADRs are cross-cutting, not epic-scoped
│   └── reference/                        external material: standards, prior art, articles
└── wiki/                                  LLM-owned · derived · regenerable
    └── overview.md, and whatever else compounds as sources accumulate
```

Product work usually arrives as an **epic** (a Jira epic, one PRD) that the dev team splits into several **story tickets** (§5.5 covers how SDPD recommends cutting those). `product-specs/` and `testing-specs/` are scoped **per epic** because that's genuinely what a PRD and its SRS are; several epics are often in flight at once, and each needs its own PRD/SRS pair without colliding.

`contracts/` stays flat and global on purpose: it's the one place every epic's proposed interface changes land, so if two epics in flight touch the same endpoint, that surfaces as a shared review instead of two contract files silently diverging. `vault-template/` has a worked instance of exactly this: `EPIC-102-bulk-order-management` needed a field on `Order`, a schema `EPIC-101-checkout-redesign` already shipped four operations against — see `adr-0004-epic-102-order-seam.md` for how that collision was resolved instead of silently forked. Story tickets themselves live in Jira — don't duplicate them into the vault, same principle as not duplicating git history (§5).

| Artifact | Lives in | Written by | Read by |
|---|---|---|---|
| PRD / SRS | `sources/product-specs/<EPIC>/` | PM (PRD) / Tech Lead (SRS) | Tech Leads, AI architects, the devs assigned to that epic's stories |
| Contract (OpenAPI/AsyncAPI) | `sources/contracts/` | Tech Lead or AI architect, derived from the SRS | Every downstream team and agent |
| STD (test scenarios) | `sources/testing-specs/<EPIC>/` | QA, derived from the contract | QA engineers, automation agents |
| ADRs | `sources/decisions/` | Whoever made the call | Whole team, continuously |
| Wiki pages | `wiki/` | The LLM, from the sources above | Anyone orienting themselves — never for compliance (see §6) |

**A sizing note, so this doesn't read as more ceremony than it is:** the wiki layer starts paying for itself above roughly 15–20 sources, three-plus teams, or a couple of months of project age — where "where did we land on X" becomes a real question. Below that, the vault is just `sources/` plus a one-page `wiki/overview.md`, and that's fine. The rule that matters from day one is the contract boundary in §8, not a populated wiki.

## 5. The Lifecycle

**Step 1 — Genesis (Day 0, before sprint planning)**
Product delivers a PRD at the **epic** level — what's being built and why. It lands in `sources/product-specs/<EPIC-KEY-slug>/prd.md`. The tech lead (or an AI architect) writes the companion **SRS** into `sources/product-specs/<EPIC-KEY-slug>/srs.md` — not what, but *which components, which interfaces, which API surface* each will expose or consume. The SRS is what determines how the epic splits into story tickets: story boundaries should follow the interface boundaries the SRS already drew, not cut across them. If the PRD's feature list doesn't split cleanly along the SRS's components, that mismatch is worth an ADR now, before three branches diverge on it. Nothing downstream starts yet.

**Step 2 — Orchestrator Translation (Day 1 morning)**
The SRS gets translated into engineering schema: the contract (`sources/contracts/openapi.yaml` — flat and global, shared across every epic in flight) and the test design (`sources/testing-specs/<EPIC-KEY-slug>/std.md`). Every new or changed `operationId` gets seeded into `readiness.json` at `mocked`. This is the one deliberately sequential step in SDPD — everything after it fans out in parallel, one story ticket per developer, branching from the same contract.

**Step 3 — Local Sync & Parallel Execution (Day 1 afternoon onward)**
Every developer branches (e.g. `feature/JIRA-XXX`) and pulls the current vault state, working independently against it. Each story owns a disjoint set of `operationId`s **end-to-end** — its own UI, its own route implementation, its own STD scenarios automated and green before the PR is done — and resolves every operation it doesn't own to mock, per §7. A story is never "the frontend for this feature" or "the backend for this feature"; it's "checkout" or "order cancellation," built through every layer it touches.

Anything outside a developer's own story's operationIds resolves to mock, so nobody blocks on a teammate's unfinished ticket. The contract removes the *blocking*. It does not remove the question of whether a given endpoint is real yet — that's a separate concern, covered in §7. Resolve-with-fallback matters *more* under this cut, not less: it's what lets a story run and validate itself end-to-end on day one, before any of its neighbors land.

**Step 4 — Seam Tickets (ongoing, whenever a new shared seam appears)**
Step 2 makes the epic-wide contract translation the one deliberately sequential step *before* the fan-out. But a story sometimes discovers mid-epic that it needs a seam — a new `operationId`, a changed shape — that other in-flight stories will also depend on. That discovery is never folded into the discovering story's own branch. It becomes its own small, serial ticket: the contract addition, its readiness seed, its STD rows — nothing else — and it blocks every story that consumes the seam until it lands. This is Critical Boundary 4 in `consumer-rules/CLAUDE.md` ("stop and say so") given a concrete next action instead of just a stop.

### 5.5 Choosing the Cut

§5's steps assume the default cut below. It's worth naming explicitly, because the obvious way to split a feature — one lane per layer — is usually the wrong one once agents are involved.

- **Default: capability slices.** One story owns a disjoint set of `operationId`s end-to-end (UI + route + STD scenarios for those operations), same rule the SRS already uses ("no two stories touch the same operationId") — it just now cuts vertically instead of by layer. Each slice can prove itself correct on its own, against the contract and its own STD scenarios, without waiting for a sibling slice to land.
- **Fallback: layer split** (backend story / frontend story / infra story), for teams where ownership genuinely is one layer per team — separate repos, separate on-call, a backend team that doesn't touch frontend code. Use it deliberately, not by default, and be honest about its cost: each lane only proves its own layer; end-to-end correctness is discovered at integration, not before it.
- **Anti-pattern: QA as its own parallel lane.** Writing the STD up front stays QA's job (it's a source, authored before the fan-out per Step 2). *Automating* a scenario against a live implementation belongs to the slice that owns the operation — a slice's PR isn't done until its own STD scenarios are green. A separate QA lane that automates everyone's scenarios means nothing gates any slice until QA catches up, which quietly reintroduces the sequential handoff SDPD exists to remove.

## 6. Orientation vs. Compliance

This is the rule that makes the vault's split in §4 do actual work, not just organize files:

- **Orientation** — what exists, why it was decided, what changed recently, who owns it. Answered from `wiki/`.
- **Compliance** — what shape is this payload, which status codes, what headers, what's required vs. optional. Answered **only** from `sources/contracts/openapi.yaml` directly — never from a wiki page that summarizes it.

The reason this has to be a hard rule and not a preference: a wiki page that restates "the checkout endpoint accepts email and amount" is a second copy of the contract. Second copies drift. An agent that reads the summary instead of the source will eventually build against a payload shape the summary got slightly wrong — which is exactly the failure SDPD exists to prevent, just relocated one layer up. So the wiki is free to explain a contract; it is never allowed to *restate* one. If a compliance question isn't answered by the contract, the correct response is "the contract doesn't cover this" — not a best guess, and not an answer sourced from the wiki.

## 7. Readiness: Is It Real Yet?

The contract tells you the *shape* of an endpoint. It says nothing about whether that endpoint is actually implemented, and reachable from where you're sitting. That's a second, independent fact:

| | Shared fact | Local fact |
|---|---|---|
| Question | Has the backend team implemented and verified this endpoint? | Can *my* machine reach a real implementation right now? |
| Same for everyone? | Yes | No — differs per developer, per branch, per VM |
| Changes | Rarely | Constantly |
| Lives in | The vault, travels with git | A local, gitignored file — never committed |

Conflating these two is where "mock vs. real" setups usually break down, especially once a team isn't all on one machine: an endpoint can be verified-done on `main` while your VM still needs a mock because it can't reach any backend. The vault only ever records the shared fact — `sources/contracts/readiness.json`, keyed by `operationId`, with states `mocked → implemented → live`. What each developer's machine actually talks to is resolved locally, in order: a local override (I'm running that service myself) → a branch preview, if one's deployed → a shared environment → the mock, which is always the final fallback. An endpoint that isn't `live` in the vault resolves to mock regardless of what's reachable — readiness is declared before it's trusted.

**Two ways to declare it — and two different writers even within the default.** Either way, the shape of `readiness.json` and the fallback order above are unchanged — only *who writes each transition* differs:

- **Auto (default).** Split ownership, matched to the stakes of each transition. The moment its own STD scenarios pass locally, the agent that just built the operation may flip `mocked → implemented` itself — that's the low-stakes, everyday bookkeeping, and removing it is most of what "declared" used to cost. `implemented → live` stays gated behind an independent signal: a CI run against `main` (`--source ci`), or a human — never the same actor that built the thing, because the whole point of a readiness fact is that it isn't self-certified. The reference implementation is `scripts/sdpd-readiness.mjs --source agent|ci`; run without `--source`, it infers `ci` from `CI`/`GITHUB_ACTIONS` env vars and otherwise defaults to `agent` — a stray manual invocation should never accidentally mint a `live`.
- **Declared (opt-in).** A human flips *both* transitions by hand and commits it — no CI, no tagged scenarios required. Fully equivalent to how this worked before Auto existed; some teams will prefer a person's eyes on every promotion, not just the terminal one.

Either mode, every entry should carry an **`evidence`** field recording what backs the state — `{ "source": "agent" | "ci" | "human", "commit": "...", "run": "...", "at": "2026-08-30" }` — so a flip is auditable regardless of who or what wrote it. A hand-flipped file without evidence is a claim; with it, it's a checkable claim.

Pulling the vault (`sdpd fetch` in the reference tooling) is what closes the loop: it diffs the readiness manifest, tells you what flipped (`createCheckout: mocked → live`), and regenerates your local routing so exactly the endpoints that are ready get proxied to something real. Nothing auto-switches mid-session — you see the diff, then restart.

## 8. Governing AI Agents Under SDPD

The distinct thing about SDPD is that it treats an AI coding agent's tendency to *guess* as the primary risk to guard against — more so than a human's, because an agent will confidently fabricate a plausible-looking endpoint or payload shape rather than say "I don't know," and it will do it fast enough to be halfway through an implementation before anyone notices.

Each consuming repository (frontend, backend, infra, interfaces) carries a `CLAUDE.md` that scopes what its agent is allowed to decide on its own. (Not `.clauderules` — that's a convention from other tools; Claude Code specifically reads `CLAUDE.md`.)

```markdown
# SDPD Contract Discipline

You are operating under Spec-Driven Parallel Development (SDPD).

CRITICAL BOUNDARIES:
1. Before writing or changing code, read the contract: @../sdpd-vault/sources/contracts/openapi.yaml
2. Do not invent, guess, or modify endpoints, headers, payload shapes, or status codes.
3. If the work requires a contract change, stop and say so — the contract changes first, in the vault, not implicitly in this repo.
4. Before assuming an endpoint is real, check @../sdpd-vault/sources/contracts/readiness.json. If it's not "live", say so rather than debugging why a response looks fake.

FRONTEND ENVIRONMENT:
- API clients point at locally-resolved routing (see sdpd-resolve) — some endpoints proxy to a real service, others to the mock gateway, per readiness.json.
- Mock responses are treated as ground truth for anything not yet live.
```

The `@../` syntax imports the file into context; Claude Code will prompt for trust on first use since it reaches outside the project root, and `--add-dir` can grant standing access to the vault if you'd rather not be asked each time. Prose is enough for most teams.

**CI, not the hook, is the enforcement point.** `check-coverage` (see `scripts/`, wired up for this repo's own vault in `.github/workflows/vault-ci.yml`) running on every PR — every contract operation has an STD scenario, every operation has a readiness seed — is the actual wall; nothing merges past it. A `PreToolUse` hook that blocks `Edit`/`Write` until the contract has been read in-session is a fast *local* feedback loop that catches the mistake before a PR even exists — see `consumer-rules/` for a documented, opt-in example — but it's a convenience layered on top of the CI gate, not a substitute for it. Most teams won't need the hook; every team adopting SDPD needs the CI gate.

The rule isn't "don't be creative." It's "your creativity ends at the contract boundary — anything inside it is yours, anything that would cross it needs a human or a spec change first."

## 9. Why This Matters Specifically Because of AI

Contract-first API design isn't new — this borrows from long-standing API-first and consumer-driven-contract practice. What's new is *why it's suddenly load-bearing*:

- **Agent speed outpaces coordination speed.** A team of agents can produce five divergent implementations of an under-specified feature before a human would have finished the first one. The contract is what keeps that speed pointed in one direction.
- **Agents need an explicit boundary, not tribal knowledge.** A human engineer picks up unwritten conventions by osmosis over months. An agent starts every session with none of that context and will fill the gap with a plausible guess unless the boundary is written down somewhere it's forced to read.
- **Parallelism only pays off if the pieces actually fit.** Running four agents at once across four slices is only a win if their outputs converge without a manual integration pass. That convergence is exactly what the contract buys you — and each agent proving its own slice end-to-end (§5.5) is what makes "converge" a checked fact instead of a hope.

## 10. Getting Started

1. Clone `vault-template/` as your vault, or create the layout in §4 from scratch. For a single-repo feature, put it in a subfolder of the repo (e.g. `sdpd/vault/`); for a feature spanning multiple repos, put it in its own sibling repo — either way, `{{VAULT_PATH}}` in each consuming repo's `CLAUDE.md` is the only thing that changes (see `consumer-rules/CLAUDE.md`).
2. When a new epic arrives, write its PRD and SRS into `sources/product-specs/<EPIC-KEY-slug>/`.
3. Translate the SRS into the shared contract in `sources/contracts/openapi.yaml` before any implementation work begins — the SRS's component/interface boundaries are what the epic's story tickets should follow. Seed `readiness.json` with every new or changed operation set to `mocked`, and write that epic's scenarios into `sources/testing-specs/<EPIC-KEY-slug>/std.md`.
4. Add a `CLAUDE.md` to each consuming repo (see `consumer-rules/`) pointing its agent at the contract and readiness manifest, and defining what it may and may not decide on its own.
5. Cut stories along capability boundaries by default — disjoint `operationId`s, each owned end-to-end (§5.5) — and have each developer branch per story and start at the same time against the same contract, blocked only on the contract, never on each other.
6. Readiness defaults to Auto (§7): agents self-flip `mocked` → `implemented` on their own green local run; `implemented` → `live` needs an independent CI run or a human. Switch to Declared instead if your team wants a person flipping both transitions by hand. Either way, wire `check-coverage` into CI (§8) so every contract operation has an STD scenario and a readiness seed before a PR can merge.
7. Any time reality needs to diverge from the contract, change the contract first — in the open, before the code that depends on the change; if a new shared seam appears mid-epic, cut it as its own seam ticket (§5 Step 4) rather than folding it into the story that found it.
8. Let the wiki accumulate as sources do; don't force it before there's anything to synthesize.

## 11. Hosting the Vault, and Opening It in Obsidian

Everything in §4–§7 is plain git plus plain markdown/JSON — it doesn't care what hosts it. Two practical notes for actually standing this up across real, separate machines.

**Hosting.** The vault is a git repo like any other; put it wherever your team already hosts code — GitHub, GitLab, an internal server. For a multi-repo feature (§4's "own sibling repo" case), that typically means one extra repo per feature or per long-lived vault, e.g.:

```
gh repo create your-org/feature-vault --private
git -C vault-template remote add origin git@github.com:your-org/feature-vault.git
git -C vault-template push -u origin main
```

Each consuming repo's `CLAUDE.md` still just sets `{{VAULT_PATH}}` — nothing else changes whether that path resolves to a sibling folder on one machine or a fresh `git clone` on someone else's. The one thing that must be genuinely reachable across machines is `sources/contracts/environments.json` — its URLs need to point at a real shared host (`https://api-dev.your-org.internal`), not `localhost`, or the `shared` rung of `sdpd-resolve`'s fallback order silently never succeeds for anyone but the person who wrote it.

**Obsidian.** `vault-template/.obsidian/` ships a minimal starter config — `graph.json` colors `sources/` and `wiki/` differently at a glance, and `bases/all-pages.base` gives a sortable, filterable table view of every page by `type`/`sdpd-layer`/`status` (Bases is core in current Obsidian, no plugin needed). Open any vault clone as a folder in Obsidian and both are there immediately. The `.gitignore` already excludes only `.obsidian/workspace.json`/`workspaces.json` (per Obsidian's own guidance — those churn on every file open and aren't shared conventions); everything else in `.obsidian/` is meant to travel with the vault and render the same way for everyone who opens it.

## 12. Limitations & Known Sharp Edges

Stated plainly, so adopting this doesn't come with surprises later:

- **The OpenAPI parsing is a regex, not a parser.** `sdpd-resolve` and `check-coverage` extract paths and `operationId`s with line-based regex over a single file — deliberately, to stay dependency-free (see `scripts/`). It does not follow `$ref`, does not handle a multi-file contract split across `$ref: './orders.yaml'`, and will silently miss operations defined in a structure it doesn't expect. Keep the contract in one file, or extend the extraction before splitting it.
- **Reachability probing is a bare `fetch`, not a health check.** `sdpd-resolve`'s `isReachable` treats any response — including a `404` or a login redirect — as "reachable" and resolves to it. A shared environment that's up but returning errors for the wrong reason will look `live` to the resolver.
- **Auto mode's `implemented` flip trusts the agent's own local run.** That's intentional — it's why the flip is capped at `implemented` rather than `live` — but a wrong local environment (a stale mock, a misconfigured base URL) can still mark something `implemented` that doesn't really work yet. Treat `implemented` as "claims to work locally," never as a substitute for the independent `live` confirmation.
- **Either readiness mode is only as honest as the STD tagging discipline.** The coverage gate proves a scenario *exists* and, in `--tests` mode, that some test claims its ID — it cannot judge whether that test actually exercises the behavior the STD scenario describes. Reviewer attention on STD quality stays load-bearing regardless of who's writing `readiness.json`.
- **Disjoint-capability cutting isn't always possible.** Two stories sometimes need the same operation to grow in different directions in the same window. The answer is a blocking edge (one story waits) or a seam ticket (§5 Step 4) that splits the shared growth out — not a merge dance across two branches editing the same contract entry.
- **One worked example, no production usage.** `EPIC-101-checkout-redesign` demonstrates the pattern; it hasn't been run at scale across multiple concurrent epics or a large team. Treat the methodology as a starting doctrine to adapt, not a finished, battle-tested system.
