# PTW-LIC: License audit (intake LIC-1)

Status: todo. One docs-only PR. No change to `stakeholder-twins.html`, `cli/`, `personas/` or `LICENSE`. Nothing is
republished. `qa-tdd skipped: docs-only` (no code, config or persona text changes; agents-check allows it).

## Bet
Anyone who opens this public repo (hiring manager, engineer, would-be contributor) can tell in one click what they may
reuse and what is someone else's. Signal: every license fact below is checkable with one command or one link. Stop: if
the audit finds a bundled third-party asset with an incompatible or unknown license, do not ship the notice; raise it to
Chase as a P0 and remove or replace the asset in a separate PR.

## Already true (verified 2026-11-25, no work)
- `LICENSE` is MIT, `Copyright (c) 2026 Chase Holroyd`.
- `README.md` has `## License` / `MIT. See [LICENSE](LICENSE).`
- `cli/package.json` has `"license": "MIT"`. No root `package.json` or `pyproject.toml` exists, so no other field to set.

## Acceptance criteria
- **LIC-1 (manual)** Given `LICENSE`, then line 1 is `MIT License` and it contains `Copyright (c) 2026 Chase Holroyd`;
  `git diff main -- LICENSE` is empty.
- **LIC-2 (manual)** Given `README.md`, then the `## License` section is at most 3 lines, says MIT, links
  `[LICENSE](LICENSE)` and links `[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)`; both links resolve on GitHub.
- **LIC-3 (manual)** Given every `package.json` in the repo (`find . -name package.json -not -path '*/node_modules/*'`),
  then each has `"license": "MIT"`; `git diff main -- cli/` is empty.
- **LIC-4 (manual)** Given `THIRD_PARTY_NOTICES.md`, then it exists and lists, each with name, source, license and how
  it reaches users:
  - Atkinson Hyperlegible Next (Braille Institute), SIL Open Font License 1.1, loaded at runtime from Google Fonts by
    `stakeholder-twins.html`, not bundled.
  - npm dependencies `@anthropic-ai/sdk`, `yaml` (runtime) and `tsx`, `typescript`, `@types/node` (dev), each with the
    license from its installed `package.json`, marked "installed by npm, not vendored".
  - `examples/sample-signup.png` and the page's embedded `EXAMPLE_SHOT`: original fictional mock made for this project
    with Claude, project-owned, MIT.
  - A statement that no third-party code, fonts or images are vendored in the repo.
- **LIC-5 (manual)** Given `grep -nE 'https?://' stakeholder-twins.html` and `git ls-files` (fonts, images, minified
  or vendored JS), then every external load (today `fonts.googleapis.com`, `fonts.gstatic.com`) and every non-project
  asset appears in `THIRD_PARTY_NOTICES.md`; nothing is unlisted. Plain outbound links (e.g. the author's own site) are
  not loads and need no entry.
- **LIC-6 (manual)** Given `personas/*.md` and `personas/audience/*.md`, then privacy-security confirms each is
  fictional (invented first names, no real person, no real company, email, phone or URL), backed by the existing
  PTW-AUD-5 test passing; `THIRD_PARTY_NOTICES.md` says "Personas are fictional; any resemblance to real people is
  unintended." Any hit is a P0 fixed in its own PR, not this one.
- **LIC-7 (manual)** Given the PR, then `HANDOFF.md` names it and this spec, `git diff main --stat` touches only
  `README.md`, `THIRD_PARTY_NOTICES.md`, `HANDOFF.md`, this spec and `.claude/agent-runs/`, and the `Agents:` line reads
  `staff-pm scoped LIC-1; qa-tdd skipped: docs-only; privacy-security <verdict>`. No accuracy or user-result claims.

## Not doing
- Changing the license, adding SPDX headers or a CLA: not asked, no blocker.
- Self-hosting the font: removes the Google Fonts call but adds a binary to license; not now.
- Auto license scanner in CI: one-time audit; revisit if a dependency is ever vendored.
