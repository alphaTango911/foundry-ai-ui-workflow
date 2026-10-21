/**
 * Props contract for the FindingsReviewPanel.
 *
 * Generated components must export:
 *   export function FindingsReviewPanel(props: FindingsReviewPanelProps): JSX.Element
 * and import these types from "./types" (copied next to the candidate when checked).
 *
 * The shape mirrors DC Drift's finding model (.dc-drift/rules.md):
 * category, severity, confidence, and expected-vs-observed evidence.
 */

export type Severity = "high" | "medium" | "low";

export type Category =
  | "color-tokens"
  | "spacing"
  | "typography"
  | "component-variants"
  | "missing-elements"
  | "alignment";

export interface Evidence {
  /** What the approved design or token contract specifies, e.g. "var(--color-primary-fill)" */
  expected?: string;
  /** What the implementation actually does, e.g. "#2563eb hardcoded" */
  observed?: string;
  /** Where it was found: file path, component name or Figma frame reference */
  source?: string;
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: Category;
  /** 0.00–1.00, per DC Drift confidence thresholds */
  confidence: number;
  evidence?: Evidence;
}

export type Decision = "confirm" | "dismiss" | "request-evidence";

export type PanelStatus = "loading" | "error" | "empty" | "ready";

export interface FindingsReviewPanelProps {
  status: PanelStatus;
  findings: Finding[];
  /** Shown in the error state */
  errorMessage?: string;
  onDecision?: (findingId: string, decision: Decision) => void;
  onRetry?: () => void;
}
