# Prompt 3 — Repair

Attach: `AI-INSTRUCTIONS.md`, the candidate file, the checker report, and the review table from Prompt 2.

After repair, run the checker again. A repair is only done when the checker passes **and** no check that previously passed now fails.

---

You are repairing a component so it meets the Foundry contract in `AI-INSTRUCTIONS.md`.

Inputs:
- `FindingsReviewPanel.tsx` — current version
- `checker-report.md` — failed structural checks
- `review.md` — findings from a reviewer, in DC Drift format

Fix, in this order:
1. Every HIGH, then MEDIUM, from the checker report.
2. Reviewer findings with confidence ≥ 0.75, HIGH first.
3. Reviewer findings below 0.75 only if the fix is obvious and contained. Otherwise list them as unresolved.

Constraints:
- Smallest change that fixes each finding. Don't restructure, rename or restyle what isn't failing.
- Don't introduce imports, tokens or props that aren't in AI-INSTRUCTIONS.md.
- Don't "fix" a failure by gaming the check (e.g. adding hidden text, a fake `aria-label` that doesn't describe the control, or a marker on every item). If a check seems wrong, leave the code and say so.

Return:
- The complete updated file in one code block.
- A table: | Finding ID | Fixed? | What changed (one line) |
- Anything left unresolved and why.
