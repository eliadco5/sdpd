# SDPD — Spec-Driven Parallel Development

**A methodology for cross-team collaboration in the AI-agent era.**

> The contract is the single source of truth. Everyone — human or AI — builds against it, not against each other.

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

## 4. The SDPD Vault

SDPD is operationalized through a **vault** — a shared repository (or shared section of a monorepo) that every team and every agent reads from before writing code. It is the orchestrator: it doesn't run code, it defines the shape of what everyone else's code must satisfy.

```
sdpd-vault/
├── product-specs/        PRD.md, SRS.md — what we're building and why
├── contracts/             openapi.yaml / asyncapi.yaml — the interface, the actual contract
├── testing-specs/         STD.md — scenarios derived from the contract
└── system-architecture/   ADRs — decisions and their rationale, continuously updated
```

| Artifact | Lives in | Written by | Read by |
|---|---|---|---|
| PRD / SRS | `product-specs/` | PM / Tech Lead | Tech Leads, AI architects |
| Contract (OpenAPI/AsyncAPI) | `contracts/` | Tech Lead or AI architect, derived from the PRD | Every downstream team and agent |
| STD (test scenarios) | `testing-specs/` | QA, derived from the contract | QA engineers, automation agents |
| ADRs | `system-architecture/` | Whoever made the call | Whole team, continuously |

## 5. The Lifecycle

**Step 1 — Genesis (Day 0, before sprint planning)**
The PM or architect writes down what's being built and why. This lands in `product-specs/` as plain Markdown. Nothing downstream starts yet.

**Step 2 — Orchestrator Translation (Day 1 morning)**
The PRD gets translated into engineering schema: the contract (`openapi.yaml`) and the test design (`STD.md`). This is the one deliberately sequential step in SDPD — everything after it fans out in parallel. A tech lead or an AI architect can do this translation, but it has to happen before anyone downstream writes implementation code.

**Step 3 — Local Sync & Parallel Execution (Day 1 afternoon onward)**
Every team pulls the current vault state and works independently against it:
- **Frontend** points its API client at a mock server generated from the contract (e.g. Prism) and builds against that mock as if it were production.
- **Backend** implements routes to match the same contract.
- **QA** writes and automates tests straight from the STD, without waiting for either side to finish.

Nobody asks "is the backend ready?" The question doesn't need to exist — the contract already answered it.

## 6. Governing AI Agents Under SDPD

The distinct thing about SDPD is that it treats an AI coding agent's tendency to *guess* as the primary risk to guard against — more so than a human's, because an agent will confidently fabricate a plausible-looking endpoint or payload shape rather than say "I don't know," and it will do it fast enough to be halfway through an implementation before anyone notices.

Each consuming repository (frontend, backend, infra) carries a rules file (e.g. `.clauderules` for Claude Code) that scopes what its agent is allowed to decide on its own:

```markdown
# SDPD Orchestrator Rules for Claude

You are operating under Spec-Driven Parallel Development (SDPD).

CRITICAL BOUNDARIES:
1. Before writing or changing code, read the contract at `../sdpd-vault/contracts/openapi.yaml`.
2. Do not invent, guess, or modify endpoints, headers, payload shapes, or status codes.
3. If the work requires a contract change, stop and say so — the contract changes first, in the vault, not implicitly in this repo.

FRONTEND ENVIRONMENT:
- API clients point at the local SDPD mock gateway (e.g. http://localhost:4000).
- Mock responses are treated as ground truth until the real backend replaces them.
```

The rule isn't "don't be creative." It's "your creativity ends at the contract boundary — anything inside it is yours, anything that would cross it needs a human or a spec change first."

## 7. Why This Matters Specifically Because of AI

Contract-first API design isn't new — this borrows from long-standing API-first and consumer-driven-contract practice. What's new is *why it's suddenly load-bearing*:

- **Agent speed outpaces coordination speed.** A team of agents can produce five divergent implementations of an under-specified feature before a human would have finished the first one. The contract is what keeps that speed pointed in one direction.
- **Agents need an explicit boundary, not tribal knowledge.** A human engineer picks up unwritten conventions by osmosis over months. An agent starts every session with none of that context and will fill the gap with a plausible guess unless the boundary is written down somewhere it's forced to read.
- **Parallelism only pays off if the pieces actually fit.** Running four agents at once across four repos is only a win if their outputs converge without a manual integration pass. That convergence is exactly what the contract buys you.

## 8. Getting Started

1. Create the vault (`sdpd-vault/`) with the four directories above.
2. Write the PRD for your next feature into `product-specs/`.
3. Translate it into a contract in `contracts/` before any implementation work begins.
4. Add a rules file to each consuming repo pointing its agent at the contract and defining what it may and may not decide on its own.
5. Let backend, frontend, and QA start at the same time, against the same contract.
6. Any time reality needs to diverge from the contract, change the contract first — in the open, before the code that depends on the change.
