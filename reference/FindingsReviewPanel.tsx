import * as React from "react";
import { AlertTriangle, Check, FileSearch, RotateCw, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Finding, FindingsReviewPanelProps, Severity } from "./types";

/**
 * Reference FindingsReviewPanel — hand-built against BRIEF.md and AI-INSTRUCTIONS.md.
 * This is the "known good" answer the eval set is calibrated against.
 */

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

const SEVERITY_STYLE: Record<Severity, string> = {
  high: "bg-[var(--color-error-bg)] text-[var(--color-error-text)] border-[var(--color-error-border)]",
  medium: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-[var(--color-warning-border)]",
  low: "bg-[var(--color-info-bg)] text-[var(--color-info-text)] border-[var(--color-info-border)]",
};

const SEVERITY_LABEL: Record<Severity, string> = { high: "High", medium: "Medium", low: "Low" };

const SUPPRESS_BELOW = 0.5;
const REVIEW_BELOW = 0.75;

function hasCompleteEvidence(f: Finding): boolean {
  return Boolean(f.evidence?.expected && f.evidence?.observed && f.evidence?.source);
}

function missingEvidenceFields(f: Finding): string[] {
  const e = f.evidence ?? {};
  return (["expected", "observed", "source"] as const).filter((k) => !e[k]);
}

export function FindingsReviewPanel({
  status,
  findings,
  errorMessage,
  onDecision,
  onRetry,
}: FindingsReviewPanelProps) {
  const [query, setQuery] = React.useState("");

  const visible = findings
    .filter((f) => f.confidence >= SUPPRESS_BELOW)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.confidence - a.confidence);
  const suppressed = findings.length - visible.length;
  const shown = visible.filter((f) => f.title.toLowerCase().includes(query.trim().toLowerCase()));

  const counts = (["high", "medium", "low"] as const).map((s) => ({
    s,
    n: visible.filter((f) => f.severity === s).length,
  }));

  return (
    <section
      aria-labelledby="findings-review-title"
      aria-busy={status === "loading" ? true : undefined}
      className="flex w-full max-w-3xl flex-col gap-4 rounded-xl border border-[var(--color-neutral-border)] bg-[var(--color-neutral-background)] p-6 text-[var(--color-neutral-text)]"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="findings-review-title" className="text-lg font-semibold text-[var(--color-neutral-text-strong)]">
            Findings review
          </h2>
          <p className="text-sm text-[var(--color-neutral-text-muted)]">
            Confirm real drift, dismiss false positives. Findings without full evidence can't be confirmed.
          </p>
        </div>
        {status === "ready" && visible.length > 0 && (
          <ul aria-label="Findings by severity" className="flex gap-2 text-xs">
            {counts.map(({ s, n }) => (
              <li key={s} className={`rounded-full border px-2 py-0.5 font-medium ${SEVERITY_STYLE[s]}`}>
                {n} {SEVERITY_LABEL[s]}
              </li>
            ))}
          </ul>
        )}
      </header>

      {status === "loading" && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="text-sm text-[var(--color-neutral-text-muted)]">Loading findings…</p>
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true" className="h-20 animate-pulse rounded-lg bg-[var(--color-neutral-surface)]" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-[var(--color-error-text)]"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm font-medium">{errorMessage ?? "Findings could not be loaded."}</p>
            <div>
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RotateCw aria-hidden="true" /> Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      {status === "empty" && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--color-neutral-border-strong)] p-8 text-center">
          <Check aria-hidden="true" className="size-5 text-[var(--color-success-text)]" />
          <p className="text-sm font-medium text-[var(--color-neutral-text-strong)]">No findings to review</p>
          <p className="text-sm text-[var(--color-neutral-text-muted)]">This run found no drift against the approved design.</p>
        </div>
      )}

      {status === "ready" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="findings-filter" className="text-[var(--color-neutral-text-strong)]">
              Filter findings
            </Label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-2 size-4 text-[var(--color-neutral-text-muted)]" />
              <Input
                id="findings-filter"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title"
                className="pl-8"
              />
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="text-sm text-[var(--color-neutral-text-muted)]">No findings match "{query}".</p>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Findings">
              {shown.map((f) => (
                <FindingItem key={f.id} finding={f} onDecision={onDecision} />
              ))}
            </ul>
          )}

          {suppressed > 0 && (
            <p className="text-xs text-[var(--color-neutral-text-muted)]">
              {suppressed} low-confidence {suppressed === 1 ? "finding" : "findings"} hidden (confidence below 0.50).
            </p>
          )}
        </>
      )}
    </section>
  );
}

function FindingItem({
  finding: f,
  onDecision,
}: {
  finding: Finding;
  onDecision?: FindingsReviewPanelProps["onDecision"];
}) {
  const complete = hasCompleteEvidence(f);
  const needsReview = f.confidence < REVIEW_BELOW;
  const titleId = `finding-${f.id}-title`;

  return (
    <li
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-lg border border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface)] p-4"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge className={`border ${SEVERITY_STYLE[f.severity]}`}>{SEVERITY_LABEL[f.severity]}</Badge>
        <span className="text-[var(--color-neutral-text-muted)]">{f.category}</span>
        <span className="text-[var(--color-neutral-text-muted)]">· {Math.round(f.confidence * 100)}% confidence</span>
        {needsReview && (
          <span className="rounded-full border border-[var(--color-warning-border)] px-2 py-0.5 text-[var(--color-warning-text)]">
            Needs human review
          </span>
        )}
      </div>

      <h3 id={titleId} className="text-sm font-semibold text-[var(--color-neutral-text-strong)]">
        {f.title}
      </h3>

      {complete ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-[var(--color-neutral-text-muted)]">Expected</dt>
          <dd className="font-mono text-xs leading-5">{f.evidence!.expected}</dd>
          <dt className="text-[var(--color-neutral-text-muted)]">Observed</dt>
          <dd className="font-mono text-xs leading-5">{f.evidence!.observed}</dd>
          <dt className="text-[var(--color-neutral-text-muted)]">Source</dt>
          <dd className="font-mono text-xs leading-5">{f.evidence!.source}</dd>
        </dl>
      ) : (
        <p className="rounded-md border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning-text)]">
          Evidence incomplete: missing {missingEvidenceFields(f).join(", ")}. This finding can't be confirmed yet.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!complete}
          onClick={() => onDecision?.(f.id, "confirm")}
          className="bg-[var(--color-primary-fill)] text-[var(--color-primary-contrast-text)] hover:bg-[var(--color-primary-fill-active)]"
        >
          <Check aria-hidden="true" /> Confirm
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDecision?.(f.id, "dismiss")}>
          <X aria-hidden="true" /> Dismiss
        </Button>
        {!complete && (
          <Button size="sm" variant="ghost" onClick={() => onDecision?.(f.id, "request-evidence")}>
            <FileSearch aria-hidden="true" /> Request evidence
          </Button>
        )}
      </div>
    </li>
  );
}
