# SDPD Contract Discipline

This file governs how you write code in **this repo** under Spec-Driven Parallel Development (SDPD). It is not the vault's `CLAUDE.md` — that one governs wiki maintenance inside `sdpd-vault/`; this one governs what you're allowed to decide on your own while implementing code here. If you're not sure which file you're reading: this one is about code, the vault's is about markdown.

Fill in the variables below for this repo, then delete this line.

```
{{VAULT_PATH}}   e.g. ../sdpd-vault              (multi-repo feature: sibling checkout)
                 or   sdpd/vault                  (single-repo feature: subfolder of this repo)
{{ROLE}}         frontend | backend | infra | qa | interfaces
{{MOCK_PORT}}    e.g. 4010   (frontend only)
```

The scripts (`sdpd-resolve`, `sdpd-fetch`, `check-coverage`) take the vault as a plain directory argument — they don't care which topology you're in. What changes is only `{{VAULT_PATH}}` above and whether `sdpd fetch`'s `git pull` targets a separate git root (multi-repo — essential, since your own repo's pull never touches it) or is effectively a no-op inside your own pull (single-repo — harmless).

Gitignore `.sdpd/` in this repo — it holds your local resolve state (`local.json`, the generated `resolved.json`/proxy config, the last-seen readiness snapshot), which is machine- and branch-specific by design (root `README.md` §7) and must never be committed.

## Critical Boundaries

1. Before writing or changing any code that touches an API, read the contract:
   `@{{VAULT_PATH}}/sources/contracts/openapi.yaml`
2. Do not invent, guess, or modify endpoints, headers, payload shapes, status codes, or field types. If it's not in the contract, it doesn't exist yet.
3. Before assuming an endpoint is real, read:
   `@{{VAULT_PATH}}/sources/contracts/readiness.json`
   If the operation isn't `live`, treat it as mocked — don't debug a mock response as if it were a backend defect.
4. If the work you're asked to do requires the contract to change shape, **stop and say so.** The contract changes first, in the vault, in the open — never implicitly, never just in this repo to make something compile. If the seam you need will also be consumed by other in-flight work, that's a **seam ticket**: a small, serial ticket for just the contract addition + its readiness seed + its STD rows, that blocks its consumers — not a change folded into whatever you're working on (root `README.md` §5 Step 4).
5. Never edit anything under `{{VAULT_PATH}}/sources/`. That includes `readiness.json` and any `external/*.readiness.json` — those are flipped by a human (declared mode) or written by a CI pipeline from a conformance run (derived mode), never by you, regardless of which mode this vault uses (root `README.md` §7). Your obligation when work is done is to **report** it ("getOrder is complete and passing its STD scenarios — ready to flip to `live`") or, in derived mode, to make sure your STD scenario IDs are tagged on your tests so the pipeline can compute it — never to flip or write the file yourself.

The rule isn't "don't be creative." It's that your creativity ends at the contract boundary — anything inside it is yours, anything that would cross it needs a human or a spec change first.

## Roles Are Hats, Not Lanes

A story's default shape is a **capability slice**: it owns a disjoint set of operations end-to-end — UI, route, and that operation's STD scenarios, automated and green — not one layer across every operation (root `README.md` §5.5). The role below describes what you're allowed to decide *while doing your slice's work in a given layer*, not a standing lane you run in parallel with the rest of the slice. If your repo only ever touches one layer (a genuinely separate frontend repo, say), your story is still one capability's slice through that layer, and its scenarios still land in your PR before it's done.

## Role: {{ROLE}}

**If frontend:**
- API clients resolve per-endpoint routing from `sdpd-resolve`'s canonical output, `.sdpd/resolved.json` — some operations proxy to a real service, others to the mock gateway (Prism, default port `{{MOCK_PORT}}`), depending on `readiness.json`. If you're on Vite, `scripts/adapters/vite-proxy.mjs` turns that into `.sdpd/generated.proxy.json` for `server.proxy`; other stacks read `resolved.json` directly. Don't hardcode a base URL; use the generated config either way.
- Treat mock responses as ground truth for anything not yet `live`.
- Run `sdpd fetch` to pull the latest readiness state and regenerate your routing when told an endpoint has landed.

**If backend:**
- Implement routes to match the contract exactly — same paths, same operationIds, same schemas. A route that almost matches is a bug, not a close-enough implementation.
- When an endpoint is functionally complete and passing its STD scenarios, report it as ready for `implemented`, then report it again as ready for `live` once verified against the contract (manually, or via a CI conformance run) — `implemented` and `live` are different claims; don't collapse them, and don't flip either yourself (see Critical Boundary 5).

**If infra:**
- Own the shared environments listed in `{{VAULT_PATH}}/sources/contracts/environments.json`. Changes to those base URLs are infra's call, not something to patch around in a consuming repo.

**If qa:**
- Author `{{VAULT_PATH}}/sources/testing-specs/<EPIC-KEY-slug>/std.md` from the contract, before the fan-out — not from the implementation. If a scenario needs behavior the STD doesn't describe, that's a gap in the STD to raise, not a detail to infer.
- You are not a separate automation lane for every slice's scenarios — each slice automates its own STD scenarios as part of its own PR (root `README.md` §5.5). Your ongoing role is cross-slice journeys that span more than one capability, and STD quality generally: reviewer attention on scenario adequacy stays load-bearing even when readiness is derived from test results (root `README.md` §7, §12).

**If interfaces:**
- You own the boundary between our system and a third-party API we don't control. That API's contract is fundamentally different from ours: it's not a commitment anyone on this team made, it's an **observation** of what a vendor currently does, transcribed into `{{VAULT_PATH}}/sources/contracts/external/*.openapi.yaml` with a provenance stamp. It carries no guarantee of staying accurate — the vendor can change it without anyone here doing anything.
- You may decide alone: the adapter's internals, the stub/sandbox server's implementation, retry/timeout/idempotency-key mechanics, and vendor-error-code → our-error-code mapping when the SRS specifies the mapping.
- You must escalate, never resolve silently: any discrepancy you notice between `{{VAULT_PATH}}/sources/reference/` (the vendor's actual docs) and the transcribed contract — do not "fix" the transcription yourself, that's a `sources/` edit and needs the same human/PR process as any other. Also escalate anything that would require *our* `openapi.yaml` to change, and any outbound network call beyond the agreed stub/sandbox.
- Readiness for external operations uses a different vocabulary than ours (`counterparty: stubbed|sandbox|production`, plus `descriptionVerified`) — see `external/*.readiness.json`. The safety default is inverted from our own: never resolve to `production` without an explicit, deliberate local opt-in.
- **Vendor vocabulary must not leak across the adapter.** Our domain objects (e.g. `Order`) never contain a vendor-specific field name (e.g. no `payment_intent_id`) — translate at the adapter boundary, every time.

## Optional: Hard Enforcement via Hook

Prose above is sufficient for most teams — treat it as the default. If your team wants a harder guarantee that the contract is actually read before code is written or changed, a `PreToolUse` hook can block `Edit`/`Write` calls until the contract file has been read in the current session. This is opt-in infrastructure your team maintains, not something SDPD requires. Sketch (adapt to your hook runner):

```jsonc
// .claude/settings.json (excerpt) — illustrative, not copy-paste-ready
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "scripts/require-contract-read.sh"
      }
    ]
  }
}
```

`require-contract-read.sh` would check whether a `Read` on `{{VAULT_PATH}}/sources/contracts/openapi.yaml` has already occurred this session (e.g. via a session-scoped marker file) and exit non-zero — blocking the edit — if not. Only add this if prose-plus-review genuinely isn't holding; it's one more script your team now owns.
