import type { Finding } from "./types";

/**
 * The fixture every candidate is rendered with in the "ready" state.
 * Deliberately unordered and deliberately covers every rule the brief sets:
 *  - two HIGH, two MEDIUM, two LOW
 *  - one finding with incomplete evidence (f3: no observed value)
 *  - one finding in the 0.50–0.74 human-review band (f4)
 *  - one finding below 0.50 that must be suppressed (f5)
 */
export const fixtureFindings: Finding[] = [
  {
    id: "f1",
    title: "Status badge offset from card corner",
    severity: "low",
    category: "alignment",
    confidence: 0.91,
    evidence: {
      expected: "Badge aligned to 16px card padding",
      observed: "Badge sits at 12px from top edge",
      source: "Checkout_v1_Approved / OrderSummary",
    },
  },
  {
    id: "f2",
    title: "Primary CTA uses a hardcoded colour",
    severity: "high",
    category: "color-tokens",
    confidence: 0.96,
    evidence: {
      expected: "var(--color-primary-fill)",
      observed: "#2563eb set inline on PayButton",
      source: "src/checkout/PayButton.tsx",
    },
  },
  {
    id: "f3",
    title: "Card number field missing error state",
    severity: "medium",
    category: "component-variants",
    confidence: 0.82,
    evidence: {
      expected: "Input renders aria-invalid + error message on invalid card",
      source: "src/checkout/CardForm.tsx",
    },
  },
  {
    id: "f4",
    title: "Section heading one step smaller than spec",
    severity: "medium",
    category: "typography",
    confidence: 0.62,
    evidence: {
      expected: "text-lg / 18px",
      observed: "text-base / 16px",
      source: "src/checkout/OrderSummary.tsx",
    },
  },
  {
    id: "f5",
    title: "Possible shadow difference on summary card",
    severity: "low",
    category: "component-variants",
    confidence: 0.42,
    evidence: {
      expected: "No shadow",
      observed: "Faint shadow visible in screenshot",
      source: "Checkout_v1_Implementation.png",
    },
  },
  {
    id: "f6",
    title: "Pay button has no disabled state while submitting",
    severity: "high",
    category: "missing-elements",
    confidence: 0.88,
    evidence: {
      expected: "Button disabled + spinner during submit",
      observed: "Button stays enabled; double-submit possible",
      source: "src/checkout/PayButton.tsx",
    },
  },
];

export const fixtureErrorMessage = "Could not load findings for run 3.";
