```tsx
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  Category,
  FindingsReviewPanelProps,
  Severity,
} from "./types";

const severityOrder: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const severityLabels: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const severityStyles: Record<Severity, string> = {
  high:
    "border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
  medium:
    "border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
  low:
    "border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
};

const accentStyles: Record<Severity, string> = {
  high: "border-l-[var(--color-error-border)]",
  medium: "border-l-[var(--color-warning-border)]",
  low: "border-l-[var(--color-info-border)]",
};

const categoryLabels: Record<Category, string> = {
  "color-tokens": "Colour tokens",
  spacing: "Spacing",
  typography: "Typography",
  "component-variants": "Component variants",
  "missing-elements": "Missing elements",
  alignment: "Alignment",
};

const evidenceFields = [
  { key: "expected", label: "Expected" },
  { key: "observed", label: "Observed" },
  { key: "source", label: "Source" },
] as const;

const focusStyles =
  "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-border)]";

const secondaryActionStyles = [
  focusStyles,
  "border-[var(--color-neutral-border-strong)]",
  "bg-[var(--color-neutral-surface)]",
  "text-[var(--color-neutral-text-strong)]",
  "hover:bg-[var(--color-neutral-surface-hover)]",
  "hover:text-[var(--color-neutral-text-strong)]",
  "shadow-none disabled:opacity-100",
].join(" ");

const confirmStyles = [
  focusStyles,
  "border border-[var(--color-primary-fill)]",
  "bg-[var(--color-primary-fill)]",
  "text-[var(--color-primary-contrast-text)]",
  "hover:border-[var(--color-primary-fill-active)]",
  "hover:bg-[var(--color-primary-fill-active)]",
  "hover:text-[var(--color-primary-contrast-text)]",
  "disabled:border-[var(--color-neutral-border)]",
  "disabled:bg-[var(--color-neutral-surface)]",
  "disabled:text-[var(--color-neutral-text-muted)]",
  "shadow-none disabled:opacity-100",
].join(" ");

export function FindingsReviewPanel(
  props: FindingsReviewPanelProps,
): JSX.Element {
  const { status, findings, errorMessage, onDecision, onRetry } = props;
  const instanceId = useId();
  const headingId = `${instanceId}-heading`;
  const filterId = `${instanceId}-filter`;
  const filterHelpId = `${instanceId}-filter-help`;
  const [query, setQuery] = useState("");

  const eligibleFindings = findings
    .filter((finding) => finding.confidence >= 0.5)
    .sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

  const hiddenCount = findings.filter(
    (finding) => finding.confidence < 0.5,
  ).length;

  const normalizedQuery = query.trim().toLowerCase();
  const visibleFindings = eligibleFindings.filter((finding) =>
    finding.title.toLowerCase().includes(normalizedQuery),
  );

  const counts = eligibleFindings.reduce(
    (result, finding) => {
      result[finding.severity] += 1;
      return result;
    },
    { high: 0, medium: 0, low: 0 } as Record<Severity, number>,
  );

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={status === "loading"}
      className="mx-auto w-full max-w-4xl rounded-xl border border-[var(--color-neutral-border)] bg-[var(--color-neutral-background)] text-[var(--color-neutral-text)]"
    >
      <header className="space-y-3 border-b border-[var(--color-neutral-border)] px-5 py-5 sm:px-6">
        <div>
          <h2
            id={headingId}
            className="text-xl font-semibold tracking-tight text-[var(--color-neutral-text-strong)]"
          >
            Findings review
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--color-neutral-text-muted)]">
            Check the evidence, then confirm real drift or dismiss a false
            positive.
          </p>
        </div>

        {status === "ready" && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-[var(--color-error-text)]">
              {counts.high} High
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--color-warning-text)]">
              {counts.medium} Medium
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--color-info-text)]">
              {counts.low} Low
            </span>
          </p>
        )}

        {status === "empty" && (
          <p className="text-sm text-[var(--color-neutral-text-muted)]">
            0 High · 0 Medium · 0 Low
          </p>
        )}
      </header>

      {status === "loading" && (
        <div role="status" className="px-5 py-12 text-center sm:px-6">
          <p className="font-medium text-[var(--color-neutral-text-strong)]">
            Loading…
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 p-5 sm:p-6">
          <div
            role="alert"
            className="rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-[var(--color-error-text)]"
          >
            <p className="font-semibold">Could not load findings</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {errorMessage || "Please try again."}
            </p>
          </div>
          <Button
            variant="outline"
            className={secondaryActionStyles}
            disabled={!onRetry}
            onClick={() => onRetry?.()}
          >
            Retry
          </Button>
        </div>
      )}

      {status === "empty" && (
        <div className="px-5 py-12 text-center sm:px-6">
          <p className="font-medium text-[var(--color-success-text)]">
            No findings to review
          </p>
        </div>
      )}

      {status === "ready" && (
        <>
          <div className="space-y-2 px-5 pt-5 sm:px-6">
            <Label
              htmlFor={filterId}
              className="text-sm font-medium text-[var(--color-neutral-text-strong)]"
            >
              Filter findings by title
            </Label>
            <Input
              id={filterId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search finding titles"
              aria-describedby={filterHelpId}
              className={[
                focusStyles,
                "w-full border-[var(--color-neutral-border-strong)]",
                "bg-[var(--color-neutral-surface)]",
                "text-[var(--color-neutral-text-strong)]",
                "placeholder:text-[var(--color-neutral-text-muted)]",
                "selection:bg-[var(--color-primary-fill)]",
                "selection:text-[var(--color-primary-contrast-text)]",
                "shadow-none",
              ].join(" ")}
            />
            <p
              id={filterHelpId}
              role="status"
              className="text-xs text-[var(--color-neutral-text-muted)]"
            >
              Showing {visibleFindings.length} of {eligibleFindings.length}{" "}
              reviewable findings. Severity counts include all reviewable
              findings.
            </p>
          </div>

          <div className="p-5 sm:p-6">
            {visibleFindings.length === 0 ? (
              <p
                className={`rounded-lg border border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface)] p-8 text-center text-sm ${
                  eligibleFindings.length === 0
                    ? "text-[var(--color-success-text)]"
                    : "text-[var(--color-neutral-text-muted)]"
                }`}
              >
                {eligibleFindings.length === 0
                  ? "No findings to review"
                  : "No findings match your search. Try a different title."}
              </p>
            ) : (
              <ul className="m-0 list-none space-y-4 p-0">
                {visibleFindings.map((finding) => {
                  const missingFields = evidenceFields.filter(
                    ({ key }) => !finding.evidence?.[key]?.trim(),
                  );
                  const evidenceComplete = missingFields.length === 0;
                  const needsReview =
                    finding.confidence >= 0.5 &&
                    finding.confidence < 0.75;

                  // Confidence policy uses the original value, not its display.
                  const confidencePercent =
                    Math.floor(finding.confidence * 1000) / 10;

                  const findingTitleId = `${instanceId}-${finding.id}-title`;
                  const evidenceNoticeId = `${instanceId}-${finding.id}-evidence`;

                  return (
                    <li key={finding.id}>
                      <Card
                        className={`gap-0 overflow-hidden border border-l-4 border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface)] py-0 text-[var(--color-neutral-text)] shadow-none ${accentStyles[finding.severity]}`}
                      >
                        <CardContent className="space-y-5 p-4 sm:p-5">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge
                                variant="outline"
                                className={severityStyles[finding.severity]}
                              >
                                {severityLabels[finding.severity]}
                              </Badge>
                              <span className="text-[var(--color-neutral-text-muted)]">
                                {categoryLabels[finding.category]}
                              </span>
                              <span className="text-[var(--color-neutral-text-muted)]">
                                Confidence {confidencePercent}%
                              </span>
                              {needsReview && (
                                <Badge
                                  variant="outline"
                                  className="border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
                                >
                                  Needs human review
                                </Badge>
                              )}
                            </div>

                            <h3
                              id={findingTitleId}
                              className="break-words text-base font-semibold leading-6 text-[var(--color-neutral-text-strong)]"
                            >
                              {finding.title}
                            </h3>
                          </div>

                          {!evidenceComplete && (
                            <div
                              id={evidenceNoticeId}
                              className="rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning-text)]"
                            >
                              <p className="font-semibold">
                                Evidence incomplete
                              </p>
                              <p className="mt-1">
                                Missing:{" "}
                                {missingFields
                                  .map(({ label }) => label)
                                  .join(", ")}
                                . Request evidence before confirming.
                              </p>
                            </div>
                          )}

                          <dl className="space-y-3 text-sm">
                            {evidenceFields.map(({ key, label }) => (
                              <div
                                key={key}
                                className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4"
                              >
                                <dt className="font-medium text-[var(--color-neutral-text-muted)]">
                                  {label}
                                </dt>
                                <dd className="m-0 min-w-0 whitespace-pre-wrap break-words text-[var(--color-neutral-text-strong)]">
                                  {finding.evidence?.[key]?.trim() ||
                                    "Not provided"}
                                </dd>
                              </div>
                            ))}
                          </dl>

                          <div
                            role="group"
                            aria-labelledby={findingTitleId}
                            className="flex flex-wrap items-center gap-2 border-t border-[var(--color-neutral-border)] pt-4"
                          >
                            <Button
                              variant="default"
                              size="sm"
                              className={confirmStyles}
                              disabled={!evidenceComplete || !onDecision}
                              aria-describedby={
                                !evidenceComplete
                                  ? evidenceNoticeId
                                  : undefined
                              }
                              onClick={() => {
                                if (evidenceComplete) {
                                  onDecision?.(finding.id, "confirm");
                                }
                              }}
                            >
                              Confirm
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className={secondaryActionStyles}
                              disabled={!onDecision}
                              onClick={() =>
                                onDecision?.(finding.id, "dismiss")
                              }
                            >
                              Dismiss
                            </Button>

                            {!evidenceComplete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={secondaryActionStyles}
                                disabled={!onDecision}
                                onClick={() =>
                                  onDecision?.(
                                    finding.id,
                                    "request-evidence",
                                  )
                                }
                              >
                                Request evidence
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="border-t border-[var(--color-neutral-border)] px-5 py-4 text-xs leading-5 text-[var(--color-neutral-text-muted)] sm:px-6">
            {hiddenCount} low-confidence findings hidden
          </footer>
        </>
      )}
    </section>
  );
}
```

- Checked AC-1–12 and AC-15 by source inspection against the fixture: five findings appear, High first; f4 receives the review marker; f3 cannot be confirmed; f5 is hidden.
- AC-13 requires rendered contrast checks with Foundry’s light and dark tokens.
- AC-14 follows the requested hierarchy but needs visual review. Compilation and browser interactions were not tested.