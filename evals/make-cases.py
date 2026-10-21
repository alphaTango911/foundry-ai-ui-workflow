"""Builds the eval cases as targeted mutations of the reference panel.

Each case changes one thing (or one tight cluster), so a failure points at a
single cause. expected.json records what a correct reviewer should conclude,
written before the checker was run on the case.

Run: python3 evals/make-cases.py
Case 10 is not generated here: it is a frozen copy of the reference *before*
the hover-contrast fix (see EVIDENCE.md, mistake M2).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REF = (ROOT / "reference" / "FindingsReviewPanel.tsx").read_text()
CASES = ROOT / "evals" / "cases"


def mutate(src, pairs):
    for old, new in pairs:
        assert old in src, f"mutation anchor not found: {old[:60]!r}"
        src = src.replace(old, new)
    return src


def case(name, src, expected):
    d = CASES / name
    d.mkdir(parents=True, exist_ok=True)
    (d / "FindingsReviewPanel.tsx").write_text(src)
    (d / "expected.json").write_text(json.dumps(expected, indent=2) + "\n")


case("01-compliant", REF, {
    "description": "The reference panel, unchanged.",
    "shouldFail": [],
    "trueGate": "GO",
    "note": "Calibration case. Any failure here is a checker false positive.",
})

case("02-hardcoded-hex", mutate(REF, [
    ('high: "bg-[var(--color-error-bg)]', 'high: "bg-[#fdecec]'),
    ('className="bg-[var(--color-primary-fill)] text-[var(--color-primary-contrast-text)]',
     'className="bg-[#2563eb] text-[var(--color-primary-contrast-text)]'),
]), {
    "description": "HIGH severity background and the Confirm button use hex literals instead of tokens.",
    "shouldFail": ["TOK-1"],
    "trueGate": "REVIEW",
    "note": "rules.md: hardcoded hex that should be a token = MEDIUM.",
})

case("03-wrong-token-names", mutate(REF, [
    ("--color-error-", "--color-danger-"),
    ("--color-neutral-text-muted", "--color-gray-500"),
]), {
    "description": "Plausible-looking token names that don't exist in Foundry (danger family, numbered gray).",
    "shouldFail": ["TOK-2", "TOK-3"],
    "trueGate": "HOLD",
    "note": "Unknown var() resolves to nothing: HIGH severity badges lose their colour. TOK-3 should also fail because HIGH no longer carries the error family.",
})

case("04-wrong-semantic-family", mutate(REF, [
    ('high: "bg-[var(--color-error-bg)] text-[var(--color-error-text)] border-[var(--color-error-border)]"',
     'high: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-[var(--color-warning-border)]"'),
]), {
    "description": "Valid tokens, wrong meaning: HIGH severity styled with the warning family.",
    "shouldFail": ["TOK-3"],
    "trueGate": "REVIEW",
    "note": "rules.md: colour token from wrong semantic category = MEDIUM.",
})

case("05-missing-labels", mutate(REF, [
    ('''            <Label htmlFor="findings-filter" className="text-[var(--color-neutral-text-strong)]">
              Filter findings
            </Label>
''', ""),
    ('''          <X aria-hidden="true" /> Dismiss
''', '''          <X aria-hidden="true" />
'''),
]), {
    "description": "Filter relies on placeholder only; Dismiss becomes an icon-only button with no aria-label.",
    "shouldFail": ["A11Y-1", "A11Y-2"],
    "trueGate": "HOLD",
    "note": "Placeholder is not a label (WCAG 1.3.1/4.1.2). Unnamed buttons are unusable with a screen reader.",
})

case("06-missing-screen", mutate(REF, [
    ('''      {status === "empty" && (''', '''      {false && status === "empty" && ('''),
]), {
    "description": "Empty state removed: status='empty' renders only the header.",
    "shouldFail": ["STA-3"],
    "trueGate": "HOLD",
    "note": "rules.md: missing component state = HIGH.",
})

case("07-incomplete-evidence", mutate(REF, [
    ("const complete = hasCompleteEvidence(f);", "const complete = Boolean(f.evidence);"),
    ("<dd className=\"font-mono text-xs leading-5\">{f.evidence!.observed}</dd>",
     "<dd className=\"font-mono text-xs leading-5\">{f.evidence!.observed ?? \"\"}</dd>"),
]), {
    "description": "Treats any evidence object as complete: f3 shows an empty Observed row and an enabled Confirm.",
    "shouldFail": ["EVD-2"],
    "trueGate": "HOLD",
    "note": "The failure the brief exists to prevent: confirming a finding nobody can verify.",
})

case("08-disallowed-component", mutate(REF, [
    ('import { Badge } from "@/components/ui/badge";', 'import { Chip } from "@mui/material";'),
    ('<Badge className={`border ${SEVERITY_STYLE[f.severity]}`}>{SEVERITY_LABEL[f.severity]}</Badge>',
     '<Chip className={`border ${SEVERITY_STYLE[f.severity]}`} label={SEVERITY_LABEL[f.severity]}>{SEVERITY_LABEL[f.severity]}</Chip>'),
    ('''        <Button size="sm" variant="outline" onClick={() => onDecision?.(f.id, "dismiss")}>
          <X aria-hidden="true" /> Dismiss
        </Button>''',
     '''        <button className="rounded-md border px-2 text-sm" onClick={() => onDecision?.(f.id, "dismiss")}>
          <X aria-hidden="true" /> Dismiss
        </button>'''),
]), {
    "description": "Severity rendered with an MUI Chip; Dismiss is a raw <button>.",
    "shouldFail": ["CMP-1", "CMP-2"],
    "trueGate": "HOLD",
    "note": "The checker renders unknown packages as a placeholder <div> that drops className, so TOK-3 may also fail. That would be a side effect of the harness, not a separate defect.",
})

case("09-false-positive-traps", mutate(REF, [
    ("const SUPPRESS_BELOW = 0.5;",
     '''// Legacy versions hardcoded #2563eb and bg-red-500 here; do not reintroduce. Never use a raw <button>.
const TOKEN_HINT = "Use <button> semantics via the Button component, never #3a5afe directly.";
const SUPPRESS_BELOW = 0.5;'''),
    ('''          <p className="text-sm text-[var(--color-neutral-text-muted)]">
            Confirm real drift, dismiss false positives. Findings without full evidence can't be confirmed.
          </p>''',
     '''          <p className="text-sm text-[var(--color-neutral-text-muted)]" title={TOKEN_HINT}>
            Confirm real drift, dismiss false positives. Findings without full evidence can't be confirmed.
          </p>'''),
    ('''        <Button size="sm" variant="outline" onClick={() => onDecision?.(f.id, "dismiss")}>
          <X aria-hidden="true" /> Dismiss
        </Button>''',
     '''        <Button size="icon-sm" variant="outline" aria-label={`Dismiss: ${f.title}`} onClick={() => onDecision?.(f.id, "dismiss")}>
          <X aria-hidden="true" />
        </Button>'''),
]), {
    "description": "Compliant UI that contains things a naive checker trips on: hex and palette classes in comments, '<button>' and a hex inside a string, an icon-only button with a proper aria-label.",
    "shouldFail": [],
    "trueGate": "GO",
    "note": "Tests for false positives. Every failure here is the checker's fault.",
})

print("cases written:", sorted(p.name for p in CASES.iterdir()))
