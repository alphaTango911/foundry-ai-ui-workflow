```tsx
import { useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type {
  Category,
  Decision,
  Evidence,
  Finding,
  FindingsReviewPanelProps,
  Severity,
} from "./types";

/* ------------------------------------------------------------------ */
/* Policy                                                              */
/* ------------------------------------------------------------------ */

const HIDE_BELOW = 0.5;
const REVIEW_BELOW = 0.75;

/* Full literal class strings so Tailwind can see them at build time. */
const SEVERITY: Record<
  Severity,
  { label: string; rank: number; badge: string; accent: string }
> = {
  high: {
    label: "High",
    rank: 0,
    badge:
      "border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
    accent: "var(--color-error-fill)",
  },
  medium: {
    label: "Medium",
    rank: 1,
    badge:
      "border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
    accent: "var(--color-warning-fill)",
  },
  low: {
    label: "Low",
    rank: 2,
    badge:
      "border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
    accent: "var(--color-info-fill)",
  },
};

const SEVERITY_ORDER: Severity[] = ["high", "medium", "low"];

const CATEGORY_LABEL: Record<Category, string> = {
  "color-tokens": "Colour tokens",
  spacing: "Spacing",
  typography: "Typography",
  "component-variants": "Component variants",
  "missing-elements": "Missing elements",
  alignment: "Alignment",
};

const EVIDENCE_FIELDS: { key: keyof Evidence; label: string; missingLabel: string }[] = [
  { key: "expected", label: "Expected", missingLabel: "expected value" },
  { key: "observed", label: "Observed", missingLabel: "observed value" },
  { key: "source", label: "Source", missingLabel: "source" },
];

const DECISION_LABEL: Record<Decision, string> = {
  confirm: "Confirmed",
  dismiss: "Dismissed",
  "request-evidence": "Evidence requested",
};

const isFilled = (value?: string) =>
  typeof value === "string" && value.trim().length > 0;

/* ------------------------------------------------------------------ */
/* Shared styles                                                       */
/* ------------------------------------------------------------------ */

// NOTE: focus rings come from Button/Input's own styles; I'd want a Foundry focus-ring token to set them here.
const neutralButton =
  "border-[var(--color-neutral-border-strong)] bg-[var(--color-neutral-surface)] text-[var(--color-neutral-text-strong)] hover:bg-[var(--color-neutral-surface-hover)] hover:text-[var(--color-neutral-text-strong)]";

const primaryButton =
  "border-transparent bg-[var(--color-primary-fill)] text-[var(--color-primary-contrast-text)] hover:bg-[var(--color-primary-fill-active)] hover:text-[var(--color-primary-contrast-text)] disabled:border-[var(--color-neutral-border)] disabled:bg-[var(--color-neutral-surface-hover)] disabled:text-[var(--color-neutral-text-muted)]";

const warningButton =
  "border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] hover:border-[var(--color-warning-border-hover)] hover:bg-[var(--color-warning-bg-hover)] hover:text-[var(--color-warning-text-hover)]";

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function FindingsReviewPanel(props: FindingsReviewPanelProps) {
  const { status, findings, errorMessage, onDecision, onRetry } = props;

  const headingId = useId();
  const filterId = useId();
  const [query, setQuery] = useState("");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const { reviewable, hiddenCount } = useMemo(() => {
    const shown = findings.filter((f) => f.confidence >= HIDE_BELOW);
    const sorted = shown
      .map((finding, index) => ({ finding, index }))
      .sort(
        (a, b) =>
          SEVERITY[a.finding.severity].rank - SEVERITY[b.finding.severity].rank ||
          b.finding.confidence - a.finding.confidence ||
          a.index - b.index,
      )
      .map(({ finding }) => finding);
    return { reviewable: sorted, hiddenCount: findings.length - shown.length };
  }, [findings]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
    for (const f of reviewable) c[f.severity] += 1;
    return c;
  }, [reviewable]);

  const normalizedQuery = query.trim().toLowerCase();
  const visible = normalizedQuery
    ? reviewable.filter((f) => f.title.toLowerCase().includes(normalizedQuery))
    : reviewable;

  const decide = (findingId: string, decision: Decision) => {
    setDecisions((prev) => ({ ...prev, [findingId]: decision }));
    onDecision?.(findingId, decision);
  };

  const isLoading = status === "loading";
  const isEmpty = status === "empty" || (status === "ready" && findings.length === 0);

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={isLoading ? "true" : undefined}
      className="flex w-full flex-col gap-5 rounded-xl border border-[var(--color-neutral-border)] bg-[var(--color-neutral-background)] p-4 text-[var(--color-neutral-text)] sm:p-6"
    >
      {/* Header */}
      <header className="flex flex-col gap-2">
        <h2
          id={headingId}
          className="text-lg font-semibold text-[var(--color-neutral-text-strong)]"
        >
          Findings review
        </h2>
        <p className="text-sm text-[var(--color-neutral-text-muted)]">
          Confirm drift that’s real, dismiss false positives. A finding without an
          expected value, observed value and source can’t be confirmed.
        </p>
        {status === "ready" && reviewable.length > 0 && (
          <ul
            aria-label="Findings by severity"
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-[var(--color-neutral-text-strong)]"
          >
            {SEVERITY_ORDER.map((sev) => (
              <li key={sev} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: SEVERITY[sev].accent }}
                />
                {counts[sev]} {SEVERITY[sev].label}
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm text-[var(--color-neutral-text-muted)]">
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            Loading…
          </p>
          {/* NOTE: no Skeleton component in the allowed list; plain placeholder blocks instead. */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-28 animate-pulse rounded-xl border border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface)] motion-reduce:animate-none"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="flex flex-col items-start gap-3">
          <div
            role="alert"
            className="flex w-full items-start gap-3 rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-[var(--color-error-text)]"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Findings couldn’t be loaded</p>
              <p className="text-sm">{errorMessage ?? "Something went wrong."}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={!onRetry}
            className={neutralButton}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Empty */}
      {isEmpty && <EmptyMessage />}

      {/* Ready */}
      {status === "ready" && findings.length > 0 && (
        <>
          {reviewable.length > 0 ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={filterId}
                  className="text-sm font-medium text-[var(--color-neutral-text-strong)]"
                >
                  Filter by title
                </Label>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-neutral-text-muted)]"
                  />
                  <Input
                    id={filterId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Pay button"
                    className="border-[var(--color-neutral-border-strong)] bg-[var(--color-neutral-surface)] pl-8 text-[var(--color-neutral-text-strong)] placeholder:text-[var(--color-neutral-text-muted)]"
                  />
                </div>
                <p
                  aria-live="polite"
                  className="text-xs text-[var(--color-neutral-text-muted)]"
                >
                  {normalizedQuery
                    ? `Showing ${visible.length} of ${reviewable.length} findings`
                    : ""}
                </p>
              </div>

              {visible.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {visible.map((finding) => (
                    <li key={finding.id}>
                      <FindingCard
                        finding={finding}
                        decision={decisions[finding.id]}
                        onDecide={decide}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-[var(--color-neutral-border-strong)] p-4 text-sm text-[var(--color-neutral-text)]">
                  <p>No findings match “{query.trim()}”.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuery("")}
                    className="text-[var(--color-neutral-text-strong)] hover:bg-[var(--color-neutral-surface-hover)]"
                  >
                    Clear filter
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyMessage />
          )}

          {hiddenCount > 0 && (
            <footer className="flex items-center gap-2 border-t border-[var(--color-neutral-border)] pt-3 text-sm text-[var(--color-neutral-text-muted)]">
              <EyeOff aria-hidden="true" className="size-4 shrink-0" />
              <p>
                {hiddenCount} low-confidence {hiddenCount === 1 ? "finding" : "findings"}{" "}
                hidden (below 50% confidence).
              </p>
            </footer>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function EmptyMessage() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4 text-[var(--color-success-text)]">
      <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
      <p className="font-medium">No findings to review</p>
    </div>
  );
}

interface FindingCardProps {
  finding: Finding;
  decision?: Decision;
  onDecide: (findingId: string, decision: Decision) => void;
}

function FindingCard({ finding, decision, onDecide }: FindingCardProps) {
  const titleId = useId();
  const noteId = useId();
  const sev = SEVERITY[finding.severity];

  const missing = EVIDENCE_FIELDS.filter((f) => !isFilled(finding.evidence?.[f.key]));
  const complete = missing.length === 0;
  const needsReview =
    finding.confidence >= HIDE_BELOW && finding.confidence < REVIEW_BELOW;
  const confidencePct = Math.round(finding.confidence * 100);

  return (
    <Card
      className="gap-3 border border-l-4 border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface)] text-[var(--color-neutral-text)]"
      style={{ borderLeftColor: sev.accent }}
    >
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-neutral-text-muted)]">
          <Badge variant="outline" className={`font-semibold ${sev.badge}`}>
            {sev.label}
          </Badge>
          <span>{CATEGORY_LABEL[finding.category] ?? finding.category}</span>
          <span aria-hidden="true">·</span>
          <span>{confidencePct}% confidence</span>
          {needsReview && (
            <Badge
              variant="outline"
              className="border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
            >
              Needs human review
            </Badge>
          )}
        </div>
        <CardTitle className="text-base font-semibold leading-snug text-[var(--color-neutral-text-strong)]">
          <h3 id={titleId}>{finding.title}</h3>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {!complete && (
          <div
            id={noteId}
            className="flex items-start gap-2 rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-warning-text)]"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              <span className="font-semibold">Evidence incomplete.</span> Missing{" "}
              {missing.map((m) => m.missingLabel).join(", ")}. Confirm is unavailable
              until it’s provided.
            </p>
          </div>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {EVIDENCE_FIELDS.map(({ key, label }) => {
            const value = finding.evidence?.[key];
            return (
              <div key={key} className="contents">
                <dt className="text-[var(--color-neutral-text-muted)]">{label}</dt>
                <dd
                  className={
                    isFilled(value)
                      ? key === "source"
                        ? "break-all font-mono text-xs leading-5 text-[var(--color-neutral-text)]"
                        : "text-[var(--color-neutral-text-strong)]"
                      : "italic text-[var(--color-neutral-text-muted)]"
                  }
                >
                  {isFilled(value) ? value : "Not provided"}
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>

      <Separator className="bg-[var(--color-neutral-border)]" />

      <CardFooter className="flex flex-wrap items-center gap-2">
        <Button
          variant="default"
          size="sm"
          disabled={!complete}
          aria-pressed={decision === "confirm"}
          aria-describedby={complete ? titleId : `${titleId} ${noteId}`}
          onClick={() => onDecide(finding.id, "confirm")}
          className={primaryButton}
        >
          Confirm
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={decision === "dismiss"}
          aria-describedby={titleId}
          onClick={() => onDecide(finding.id, "dismiss")}
          className={neutralButton}
        >
          Dismiss
        </Button>
        {!complete && (
          <Button
            variant="outline"
            size="sm"
            aria-pressed={decision === "request-evidence"}
            aria-describedby={`${titleId} ${noteId}`}
            onClick={() => onDecide(finding.id, "request-evidence")}
            className={warningButton}
          >
            Request evidence
          </Button>
        )}
        <p
          role="status"
          className="ml-auto text-xs font-medium text-[var(--color-neutral-text-muted)]"
        >
          {decision ? DECISION_LABEL[decision] : ""}
        </p>
      </CardFooter>
    </Card>
  );
}
```

- **NOTEs left:** focus rings rely on Button/Input's built-in styles (I'd want a Foundry focus-ring token), and loading placeholders are plain divs because there's no Skeleton in the allowed list.
- **AC-7 wording:** the footer pluralises, so the fixture renders "1 low-confidence finding hidden". If CNF-1 matches the literal string "findings hidden", it will fail. Drop the pluralisation if the checker is strict.
- **AC-13 (unverified):** Confirm's hover uses `primary-fill-active` as the rules require. I haven't measured `-text` on `-bg` contrast, or neutral-muted on surface, in either theme.
- **Ready-state decisions (my choices, not in the brief):** the severity counts cover only the shown findings (≥0.50) and ignore the filter. A ready status with an empty `findings` array renders the empty state.
- **Extra behaviour (AC-15 still needs an interaction test):** the card keeps a local, non-persisted decision label and sets `aria-pressed` so the reviewer sees what they chose. `onDecision` is still called on every click.