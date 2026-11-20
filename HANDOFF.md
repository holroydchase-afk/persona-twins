# Handoff

Last updated: 2026-11-20

## Where things stand

- **Main demo:** `persona-twins.html`, published as a Claude page at
  https://claude.ai/artifact/PUZwvGNNfsNYdbN57KKoFc. Runs on the viewer's Claude account (`sample` capability
  with images, `tts` for voice, `dictation` for the mic). No API key.
- **Docs:** README with usage and persona format; MIT license (copyright holder set to the GitHub login, change it to a full name if wanted).
- **Optional CLI:** `cli/twin.ts`, Claude API with prompt caching. Needs `ANTHROPIC_API_KEY`.
- **Personas:** `personas/customer.md` (Maya), `sales.md` (Marcus), `legal.md` (Elena). Placeholders.
  The page keeps its own copy in the `PERSONAS` array; keep the two in sync.

## Known issues

- The demo page is private until Chase shares it from the page's Share menu. Until then, the demo link only works for Chase.
- Voices: the platform doesn't say which voices sound male. Marcus uses "Default (original)", which named no voice in v1 and sounded male. Not yet confirmed after the latest change.
- Nobody has run the CLI end to end yet (no API key in the build environment).

## Plan

1. Make the Claude page the main demo. Done (PR #1).
2. README with a one-line description, usage, MIT license and demo link. **This PR.**
3. Sharpen the customer, sales and legal personas into a shareable template pack.
4. Portfolio card line and LinkedIn line for Product Studio (pasted by Chase, not committed to other repos).
