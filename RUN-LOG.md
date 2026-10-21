# Run log

One entry per generation. Record what happened, including the dull parts.

| Date | Tool / model | Clean session? | Checker (first → after harness fix) | Gate | Caught by checker | Caught only by human review | Hand edits |
|---|---|---|---|---|---|---|---|
| 21 Oct 2026 | ChatGPT 6.1 Sol, medium | Yes — single upload of `generate-kit.md` | 95 → 100 | HOLD → GO | Nothing real (the HOLD was a harness flaw, M5) | Near-invisible focus ring (1.36:1 / 1.05:1); "1 … findings" grammar; footer shown even with 0 hidden | None |
| 21 Oct 2026 | Claude Opus 5.5, medium | Yes — single upload of `generate-kit.md` | 100 → 100 | GO | — | Loading state not announced to screen readers; `aria-pressed` on non-toggle actions; added local decision state the brief didn't ask for | None |

Both generations were accepted as-is: no repair loop was needed for structural checks. The review and repair prompts (`02`, `03`) haven't been exercised yet. The human review below was done by me, not by an independent reviewer.

## 21 Oct 2026 — ChatGPT 6.1 Sol (medium)

Files: `runs/2026-10-21-gpt-6.1-sol/` (code, model notes, raw response, both checker reports). Screenshots: `out/…` via `QUICKSTART.md` §4.

- **Got right:** every structural rule on the first attempt — tokens, the four states, confidence policy, incomplete evidence disables Confirm, list semantics. Explicit card padding, so it renders well even on the stub components. Honest notes: it said contrast and interactions weren't tested.
- **Got wrong:** it overrode the components' focus ring with `outline-[var(--color-primary-border)]`, which is nearly invisible (1.36:1 light, 1.05:1 dark; minimum 3:1). The instruction file never mentions focus, so this is a gap in my instructions as much as a model error. Also: "1 low-confidence findings hidden", and the footer renders "0 … hidden" when nothing is hidden.
- **Defensible choice that exposed a harness flaw:** it disables Confirm/Dismiss when no `onDecision` handler is passed. My harness passed none, so the first check said HOLD (M5).
- **Design read:** calm and readable; generous spacing; long page. Severity counts as coloured text in the header.
- **Change to make:** add focus rules to `AI-INSTRUCTIONS.md` (don't override component focus rings; if you must, use a token pair that meets 3:1).

## 21 Oct 2026 — Claude Opus 5.5 (medium)

Files: `runs/2026-10-21-claude-opus-5.5/`.

- **Got right:** every structural rule on the first attempt; kept the components' focus styling and left a `// NOTE:` asking for a focus-ring token; anticipated that the checker might match exact wording and flagged it; correct pluralisation; hover uses `fill-active` as instructed.
- **Got wrong / questionable:** loading text isn't in a live region (relies on `aria-busy` alone); `aria-pressed` on Confirm/Dismiss treats one-time decisions as toggles; adds local "Confirmed/Dismissed" state that isn't in the brief (scope creep, harmless).
- **Can't judge from my preview:** card padding. It relies on the real `CardHeader`/`CardContent` padding, which my stubs don't reproduce, so the preview looks cramped. A limitation of the harness, not evidence against the model.
- **Design read:** denser; strong left severity accent; coloured dots for counts.

## What this run says

- On this one brief, both models met every structural rule first time. The checker didn't separate them; human review did.
- The one serious defect found (GPT's focus ring) was in an area the instruction file didn't cover. The cheapest fix is a rule in the instructions, not a new check.
- One run per model at one setting. This isn't a model comparison; it's a first observation.
