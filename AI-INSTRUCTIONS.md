# AI instructions — building UI on Foundry

Give this file to the model with every generation, review or repair prompt. It is the contract the checker enforces. If a rule here and a request conflict, follow this file and say so.

## Output

- One file: `FindingsReviewPanel.tsx`, exporting `function FindingsReviewPanel(props: FindingsReviewPanelProps)`.
- Import types from `"./types"` (see `contract/types.ts`). Don't redefine them.
- TypeScript + React 18 function components. No default export needed.

## Allowed imports — nothing else

| Import | Exports |
|---|---|
| `react` | anything |
| `lucide-react` | icons (decorative icons get `aria-hidden="true"`) |
| `@/components/ui/button` | `Button` — `variant`: default · outline · secondary · ghost · destructive · link; `size`: default · xs · sm · lg · icon · icon-xs · icon-sm · icon-lg |
| `@/components/ui/badge` | `Badge` — `variant`: default · secondary · destructive · outline · ghost · link |
| `@/components/ui/card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` |
| `@/components/ui/input` | `Input` |
| `@/components/ui/label` | `Label` |
| `@/components/ui/separator` | `Separator` |
| `@/components/ui/scroll-area` | `ScrollArea` |
| `./types` | contract types |

Never write raw `<button>`, `<input>`, `<select>` or `<textarea>`. Use `Button` and `Input`.

## Colour: Foundry tokens only

Apply colour with Tailwind arbitrary values or inline styles that reference a Foundry CSS variable:

```tsx
className="bg-[var(--color-neutral-surface)] text-[var(--color-neutral-text-strong)]"
```

Forbidden: hex values, `rgb()/hsl()/oklch()`, Tailwind palette classes (`bg-red-500`, `text-white`), and the shadcn colour utilities (`bg-primary`, `text-muted-foreground`, `bg-destructive`, `border-border`). Those belong to a different token contract.

### Token names (complete list — any other `--color-*` name doesn't exist)

Action families `primary`, `success`, `warning`, `error`, `info` each have:
`bg`, `bg-hover`, `border`, `border-hover`, `fill`, `fill-hover`, `fill-active`, `text`, `text-hover`, `text-active`, `contrast-text`
→ e.g. `--color-error-bg`, `--color-warning-text`, `--color-primary-contrast-text`.

Neutral: `--color-neutral-background`, `--color-neutral-surface`, `--color-neutral-surface-hover`, `--color-neutral-border`, `--color-neutral-border-strong`, `--color-neutral-text-muted`, `--color-neutral-text`, `--color-neutral-text-strong`.

There is no `danger`, `destructive`, `gray`, numbered shade (`--color-primary-500`) or `foreground` token.

### Semantic rules

| Meaning | Family |
|---|---|
| HIGH severity | `error` |
| MEDIUM severity, warnings, "needs review", incomplete evidence | `warning` |
| LOW severity, informational | `info` |
| Primary action (Confirm) | `primary` |
| Positive/empty-success | `success` |
| Everything structural | `neutral` |

- Tinted surfaces: `-bg` with `-text` and `-border` of the same family.
- Text on a filled surface: `-fill` with `-contrast-text`.
- **Hover on a filled button: use `-fill-active`, not `-fill-hover`.** In Foundry's light theme `fill-hover` is lighter than `fill`, and `contrast-text` is calculated against `fill` only. White on `primary-fill-hover` measures 3.76:1, below WCAG AA.

## Accessibility (WCAG 2.2 AA)

- The panel root is a `<section>` with `aria-labelledby` pointing at its heading.
- Every button has a visible text label or `aria-label`. Icon-only buttons need `aria-label`.
- Every input has a `<Label htmlFor>` (placeholder is not a label).
- Severity is written as a word ("High", "Medium", "Low"); colour is supplementary.
- Findings are `<ul>`/`<li>`.
- Loading: root gets `aria-busy="true"`, plus visible "Loading…" text.
- Error: message inside `role="alert"`.
- Disabled actions use the `disabled` attribute, not just styling.
- **Keep the components' own focus rings.** Don't override them with `focus-visible:ring-0` or a custom outline. If you must, the focus indicator needs at least 3:1 contrast against its background in both themes — `--color-primary-border` does not qualify (1.36:1 light, 1.05:1 dark). *(Added 21 Oct 2026 after a real generation hid its focus ring.)*

## Behaviour rules (from DC Drift's confidence policy)

- `confidence < 0.50` → don't render the finding. Show "n low-confidence findings hidden".
- `0.50 ≤ confidence < 0.75` → render with a "Needs human review" marker.
- `confidence ≥ 0.75` → render normally, no marker.
- Evidence is complete only when `expected`, `observed` and `source` are all non-empty.
  - Complete → show all three, labelled.
  - Incomplete → say "Evidence incomplete" and which fields are missing; disable Confirm; offer "Request evidence".
- Order: HIGH, then MEDIUM, then LOW.

## States

All four are required: `loading`, `error` (show `errorMessage` + Retry calling `onRetry`), `empty` ("No findings to review"), `ready`.

## When you're unsure

Don't invent a token, component or prop. Use the closest allowed option and leave a one-line `// NOTE:` comment saying what you'd want instead.
