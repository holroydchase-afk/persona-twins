# PTW-M3.1: Wire to studio-agents (agent-prompt fallback, qa-tdd enforced, thread opening)

Status: doing. One PR on `claude/project-thread-rnaovm`. Docs and CI only; no change to `stakeholder-twins.html`,
`personas/` or `cli/`, and no republish. Source: the studio-agents intake (sync.sh + install-rules.sh, already in the tree).

## Bet
Cloud project threads start above the repo, so the Agent tool can't load studio agents and the hook writes no log;
`agents-check` then fails agents that really ran (HANDOFF known issue). Signal: this PR passes `agents-check` with
qa-tdd red then green, logged via `--as`. Stop: if `--as` logs can't satisfy `check-agent-runs.sh` on CI, ship nothing
and file the gap upstream in studio-agents.

## Acceptance criteria
- **PTW-WIRE-1 (auto)** Given the tree, when `bash scripts/agent-prompt.sh qa-tdd "test"` runs, then it exits 0 and
  prints a prompt containing the qa-tdd role body, the task "test" and `log-agent-run.sh --as qa-tdd`.
- **PTW-WIRE-2 (auto)** Given `bash scripts/log-agent-run.sh --as qa-tdd`, then `.claude/agent-runs/<branch>.log` gains
  one line ending ` qa-tdd via-general-purpose` (time and name only); a bad name (`--as "Bad Name"`) exits non-zero.
- **PTW-WIRE-3 (auto)** Given a fixture log with ` qa-tdd via-general-purpose`, when `check-agent-runs.sh` reads an
  Agents: line naming qa-tdd, then it passes; with qa-tdd absent from the log, it fails naming qa-tdd.
- **PTW-WIRE-4 (auto)** Given a PR body `Agents: qa-tdd skipped: busy` on a PR touching a non-docs file, then the
  agents-check "qa-tdd cannot be skipped" step fails; with `qa-tdd skipped: docs only` on a docs-only PR it passes.
- **PTW-WIRE-5 (auto)** `bash scripts/check-agents.sh` exits 0: the CLAUDE.md table (incl. `release-captain`) matches
  `.claude/agents/`, which equals the studio-agents copy byte for byte (no hand edits).
- **PTW-WIRE-6 (auto)** CLAUDE.md's Studio agents section equals `templates/CLAUDE-agents.md` except the product name
  in the intro ("Stakeholder Twins' chief of staff"); hard rules and stack sections unchanged; no line says
  `check-agent-runs.sh` "is not wired yet" (grep CLAUDE.md, HANDOFF.md, docs/).
- **PTW-WIRE-7 (auto)** `git diff main --stat` touches no file under `personas/` or `stakeholder-twins.html`, and under `cli/` only
  the new `cli/test/studio-wiring.test.ts` (QA-R2);
  `cd cli && npm ci && npx tsc --noEmit` passes.
- **PTW-WIRE-8 (manual)** HANDOFF.md: the "no `.claude/agent-runs` log in cloud sessions" known issue is replaced by
  how it's fixed now (`agent-prompt.sh` + `--as`), and the state section names this PR.
- **PTW-WIRE-9 (manual)** The PR body's `Agents:` line shows `staff-pm scoped; qa-tdd red then green, 3x`, every name
  matches the committed log, CI agents-check is green, and the thread's first message was the chief-of-staff intro.

- **QA-R1 (auto, P1)** `.claude/agent-runs/<branch>.log` is not gitignored (`*.log` had hidden it), so the run log commits.

## Not doing
Re-syncing other studio files, the check-logs.mjs findings (next code PR), any page or CLI change.
