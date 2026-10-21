# Brief — Findings review panel

## Intended user

A designer or front-end engineer who owns a screen and is deciding whether it can ship. DC Drift has produced a list of findings for one verification run. They are not auditing the tool; they want to get through the list quickly and trust what they confirm.

## Task

Review each finding and make one decision:

- **Confirm** — the drift is real; send it to be fixed.
- **Dismiss** — it's a false positive.
- **Request evidence** — the finding can't be judged because its evidence is incomplete.

The panel must make it hard to confirm something nobody can verify. That is the core design constraint: a finding without expected value, observed value and source is an opinion, not evidence.

## Reference design

`reference/FindingsReviewPanel.tsx` (hand-built, not generated). Screenshots: `docs/reference-ready.png`, `docs/reference-ready-dark.png`.

Layout, top to bottom:

1. **Header** — title "Findings review", one line of guidance, severity counts (n High · n Medium · n Low).
2. **Filter** — labelled search field, filters by title.
3. **Findings list** — one card per finding, HIGH first. Each card: severity badge, category, confidence %, "Needs human review" marker when 0.50–0.74, title, evidence as Expected / Observed / Source, actions.
4. **Footer note** — how many low-confidence findings were hidden.

States: loading, error (with Retry), empty, ready. All four are part of the deliverable — a missing state is a missing screen.

## Inputs

Props contract: `contract/types.ts`. Test data: `contract/fixtures.ts` (six findings covering every rule below).

## Acceptance criteria

Each criterion maps to the check that verifies it. Criteria marked † are not machine-checked and need human review.

| # | Criterion | Check |
|---|---|---|
| AC-1 | Colours come only from Foundry `--color-*` tokens; no hex, colour functions or Tailwind palette classes | TOK-1, TOK-2, TOK-4 |
| AC-2 | Severity uses its semantic family: high → error, medium → warning, low → info | TOK-3 |
| AC-3 | Severity is written as text, never colour alone | A11Y-5 |
| AC-4 | Built only from the allowed components (`AI-INSTRUCTIONS.md`) | CMP-1, CMP-2 |
| AC-5 | Loading, error, empty and ready states all exist and behave as described | STA-1–4 |
| AC-6 | Ready state has a labelled filter | MIS-1, A11Y-2 |
| AC-7 | Findings below 0.50 confidence are hidden, and the panel says how many | CNF-1 |
| AC-8 | Findings 0.50–0.74 are marked "Needs human review" — and only those | CNF-2 |
| AC-9 | Complete evidence shows expected, observed and source | EVD-1 |
| AC-10 | Incomplete evidence is named, and Confirm is unavailable for that finding | EVD-2 |
| AC-11 | Every button has an accessible name; the panel is a named region; findings are a list | A11Y-1, A11Y-3, A11Y-4 |
| AC-12 | HIGH findings appear first | ORD-1 |
| AC-13† | Text and interactive states (including hover) meet WCAG AA contrast in light and dark | human |
| AC-14† | Visual hierarchy: a reviewer can find the HIGH findings and the decision buttons at a glance | human |
| AC-15† | Filter actually filters; decisions call `onDecision` with the right id | human / future interaction test |

## Out of scope

Persisting decisions, bulk actions, pagination, Figma round-trip, real Foundry components (the checker renders against stubs — see `EVIDENCE.md`).
