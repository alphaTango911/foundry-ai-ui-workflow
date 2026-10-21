# Quick start

About 15 minutes to run the checks; about 30 for one full generate → review → repair loop.

## 1. Set up

Requires Node 20+. Screenshots also need Python 3 with Playwright (optional).

```bash
npm install
# optional, for screenshots:
pip install playwright && python3 -m playwright install chromium
```

## 2. Check the reference panel

```bash
node checker/check.mjs reference/FindingsReviewPanel.tsx --out out/reference
```

Expected: `Structural score 100/100 (21/21 checks) · GO`.
`out/reference/` now has one HTML preview per state. Open `ready.html`, or screenshot all states:

```bash
python3 checker/screenshot.py out/reference          # light
python3 checker/screenshot.py out/reference --dark   # dark
```

## 3. Run the eval set

```bash
npm run eval
```

Expected: detection 11/11, gate 9/11 (cases 10 and 11 are known blind spots — see `EVIDENCE.md`). Results are written to `evals/RESULTS.md`.

## 4. Run the workflow on a new generation

Use any AI coding tool (Claude, Cursor, Copilot…). Use a **new chat** for each step.

1. **Generate.** Paste `prompts/01-generate.md` and attach `AI-INSTRUCTIONS.md`, `BRIEF.md`, `contract/types.ts`, `contract/fixtures.ts`. Don't attach the reference or the eval cases. Save the result as `runs/<date>-<tool>/FindingsReviewPanel.tsx`.
2. **Check.**
   ```bash
   node checker/check.mjs runs/<date>-<tool>/FindingsReviewPanel.tsx --out out/<date>-<tool> > runs/<date>-<tool>/checker-report.md
   python3 checker/screenshot.py out/<date>-<tool>
   ```
3. **Review.** New chat. Paste `prompts/02-review.md`; attach the instructions, brief, candidate, `checker-report.md` and screenshots. Save the reply as `review.md`.
4. **Repair.** New chat. Paste `prompts/03-repair.md`; attach the instructions, candidate, checker report and review. Save as `FindingsReviewPanel.repaired.tsx` and run step 2 again on it.
5. **Log it** in `RUN-LOG.md`: tool and model, score before and after, what the checker missed that the review caught, anything you had to fix by hand.

A run is done when the checker says GO **and** you've looked at the screenshots yourself. The checker doesn't see contrast or visual hierarchy.

## 5. Add an eval case

1. Add a mutation to `evals/make-cases.py` (or a folder under `evals/cases/` with a `FindingsReviewPanel.tsx`).
2. Write `expected.json` **before** running it: `shouldFail` (check IDs), `trueGate`, `note`.
3. `python3 evals/make-cases.py && npm run eval`. A mismatch is either a checker bug or a wrong expectation — write down which in `EVIDENCE.md`.

## Check IDs at a glance

| Prefix | Covers |
|---|---|
| TOK | Foundry colour tokens: raw values, unknown names, semantic family, foreign contract |
| CMP | Allowed components and imports |
| MIS, STA | Required elements and the four states |
| CNF, EVD | DC Drift confidence policy and evidence completeness |
| A11Y | Names, labels, region, list semantics, severity as text |
| ORD | Severity ordering |

Gate: any failed HIGH → **HOLD**; any failed MEDIUM → **REVIEW**; otherwise DC Drift's thresholds (≥80 GO, 60–79 REVIEW, <60 HOLD).

## If something goes wrong

- `Build failed: …` — the candidate has a syntax error or imports something with no matching export. The message names it.
- `Render error in <state>` — the component throws for that state; usually unhandled `undefined` (e.g. `findings` empty, `evidence` missing).
- Previews look unstyled — `preview.css` is compiled locally with Tailwind 3; run `npm install` again.
- Screenshots fail — set `PLAYWRIGHT_BROWSERS_PATH` if Chromium is installed somewhere non-standard.
