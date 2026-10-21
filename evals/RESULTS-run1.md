# Eval results

Generated 2026-10-21 09:50 UTC by `npm run eval`. Do not edit by hand.

- **Detection matched expectations:** 8/10 cases
- **Release gate matched the true verdict:** 8/10 cases
- **Missed failures (false negatives):** 0 · **Unexpected failures (false positives):** 12

| Case | Expected to fail | Observed failing | Score | Checker gate | True gate | Match |
|---|---|---|---|---|---|---|
| 01-compliant | — | — | 100 | GO | GO | ✅ |
| 02-hardcoded-hex | TOK-1 | TOK-1 | 95 | REVIEW | REVIEW | ✅ |
| 03-wrong-token-names | TOK-2, TOK-3 | TOK-2, TOK-3 | 90 | HOLD | HOLD | ✅ |
| 04-wrong-semantic-family | TOK-3 | TOK-3 | 95 | REVIEW | REVIEW | ✅ |
| 05-missing-labels | A11Y-1, A11Y-2 | A11Y-1, A11Y-2 | 90 | HOLD | HOLD | ✅ |
| 06-missing-screen | STA-3 | STA-3 | 95 | HOLD | HOLD | ✅ |
| 07-incomplete-evidence | EVD-2 | EVD-2 | 95 | HOLD | HOLD | ✅ |
| 08-disallowed-component | CMP-1, CMP-2 | TOK-3, CMP-1, CMP-2, MIS-1, STA-4, CNF-1, CNF-2, EVD-1, EVD-2, A11Y-3, A11Y-4, A11Y-5, ORD-1 | 38 | HOLD | HOLD | ❌ |
| 09-false-positive-traps | — | CMP-2 | 95 | REVIEW | GO | ❌ |
| 10-hover-contrast-blind-spot | — | — | 100 | GO | REVIEW (AC-13 human) | ⚠️ gate |

## Failure details

### 01-compliant

The reference panel, unchanged.

- No checks failed.

### 02-hardcoded-hex

HIGH severity background and the Confirm button use hex literals instead of tokens.

- **TOK-1** — hex literal "#fdecec"; hex literal "#2563eb"

### 03-wrong-token-names

Plausible-looking token names that don't exist in Foundry (danger family, numbered gray).

- **TOK-2** — Unknown tokens: --color-gray-500, --color-danger-border, --color-danger-bg, --color-danger-text
- **TOK-3** — f2 (high): uses neutral, expected error; f6 (high): uses neutral, expected error

### 04-wrong-semantic-family

Valid tokens, wrong meaning: HIGH severity styled with the warning family.

- **TOK-3** — f2 (high): uses warning, expected error; f6 (high): uses warning, expected error

### 05-missing-labels

Filter relies on placeholder only; Dismiss becomes an icon-only button with no aria-label.

- **A11Y-1** — 5 unnamed button(s) — e.g. ready: <button> <svg xmlns="http://www.w3.org/2000/svg"
- **A11Y-2** — Unlabelled: ready: <input search placeholder="Search by title">

### 06-missing-screen

Empty state removed: status='empty' renders only the header.

- **STA-3** — no 'No findings' message

### 07-incomplete-evidence

Treats any evidence object as complete: f3 shows an empty Observed row and an enabled Confirm.

- **EVD-2** — f3: incompleteness not called out; f3: Confirm still enabled

### 08-disallowed-component

Severity rendered with an MUI Chip; Dismiss is a raw <button>.

- **TOK-3** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- **CMP-1** — Disallowed imports: @mui/material
- **CMP-2** — Raw elements in source: <button>
- **MIS-1** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- **STA-4** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- **CNF-1** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- **CNF-2** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- **EVD-1** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- **EVD-2** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- **A11Y-3** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- **A11Y-4** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- **A11Y-5** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- **ORD-1** — Render error in ready: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
- ❌ Unexpected: TOK-3, MIS-1, STA-4, CNF-1, CNF-2, EVD-1, EVD-2, A11Y-3, A11Y-4, A11Y-5, ORD-1

### 09-false-positive-traps

Compliant UI that contains things a naive checker trips on: hex and palette classes in comments, '<button>' and a hex inside a string, an icon-only button with a proper aria-label.

- **CMP-2** — Raw elements in source: <button>
- ❌ Unexpected: CMP-2

### 10-hover-contrast-blind-spot

The first version of my reference panel: Confirm hovers to --color-primary-fill-hover with white text (3.76:1).

- No checks failed.
