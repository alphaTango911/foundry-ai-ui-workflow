# Prompt 2 — Review

Run the checker first, then give the model its output. The checker is the source of truth for what it covers; the model reviews what the checker can't see.

```
node checker/check.mjs path/to/FindingsReviewPanel.tsx --out out/candidate
```

Attach: `AI-INSTRUCTIONS.md`, `BRIEF.md`, the candidate file, the checker report, and the screenshots from `out/candidate/` (`python3 checker/screenshot.py out/candidate`, plus `--dark`).

Use a fresh session, not the one that generated the file.

---

You are reviewing a generated component against the Foundry contract. You did not write it.

Inputs:
- `AI-INSTRUCTIONS.md` — the rules
- `BRIEF.md` — acceptance criteria (AC-1…AC-15)
- `FindingsReviewPanel.tsx` — the candidate
- `checker-report.md` — automated structural results
- Screenshots — light and dark, all four states

Do two things.

**1. Confirm the checker's failures.** For each failed check, quote the line(s) of the candidate that cause it. If you think a failure is a false positive, say so and why — don't silently drop it.

**2. Review what the checker can't see.** Only criteria marked † in BRIEF.md, plus anything in the screenshots that contradicts the brief:
- AC-13 contrast, including hover and disabled states and dark mode
- AC-14 visual hierarchy
- AC-15 behaviour you can verify by reading the code (filter logic, `onDecision` arguments)

Return findings as a table in DC Drift format:

| ID | Category | Severity (HIGH/MEDIUM/LOW) | Confidence (0–1) | Expected | Observed | Location |

Rules:
- Every row needs Expected, Observed and Location. If you can't fill all three, give it confidence below 0.75 and say what's missing.
- Use DC Drift severities: HIGH blocks release, MEDIUM must be fixed before release, LOW is for designer judgment.
- Don't restate the checker's passes. Don't suggest stylistic rewrites that no criterion asks for.
- End with one line: GO, REVIEW or HOLD, and the single most important fix.
