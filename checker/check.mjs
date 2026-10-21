#!/usr/bin/env node
/**
 * Structural checker for AI-generated FindingsReviewPanel candidates.
 *
 * Implements the structural layer of DC Drift (.dc-drift/rules.md):
 * check-based score = checks passed / checks run × 100, HIGH/MEDIUM/LOW severities.
 * Adds two categories DC Drift doesn't define: accessibility and evidence integrity.
 *
 * Usage:
 *   node checker/check.mjs path/to/FindingsReviewPanel.tsx [--out dir] [--json]
 *
 * What it does NOT do: visual comparison, contrast measurement, interaction testing.
 * See EVIDENCE.md → Limitations.
 */
import { build } from "esbuild";
import { parse } from "node-html-parser";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STUBS = path.join(ROOT, "checker", "stubs");
const CONTRACT = path.join(ROOT, "contract");
const TOKENS_CSS = path.join(ROOT, "tokens", "foundry-tokens.css");
const TMP = path.join(ROOT, "checker", ".tmp");

export const ALLOWED_IMPORTS = [
  "react",
  "lucide-react",
  "./types",
  "@/components/ui/button",
  "@/components/ui/badge",
  "@/components/ui/card",
  "@/components/ui/input",
  "@/components/ui/label",
  "@/components/ui/separator",
  "@/components/ui/scroll-area",
];

/** Every check, in report order. Category names follow DC Drift where one exists. */
export const CHECKS = {
  "TOK-1": { severity: "MEDIUM", category: "Color tokens", title: "No raw colour values (hex, rgb/hsl/oklch, Tailwind palette)" },
  "TOK-2": { severity: "HIGH", category: "Color tokens", title: "Every --color-* token referenced exists in Foundry's token file" },
  "TOK-3": { severity: "MEDIUM", category: "Color tokens", title: "Severity indicators use the matching semantic family (high→error, medium→warning, low→info)" },
  "TOK-4": { severity: "MEDIUM", category: "Color tokens", title: "No colour utilities from the shadcn contract (bg-primary, text-muted-foreground…)" },
  "CMP-1": { severity: "HIGH", category: "Component variants", title: "Imports only from the allowed component list" },
  "CMP-2": { severity: "MEDIUM", category: "Component variants", title: "No raw <button>/<input>/<select>/<textarea> — use Foundry components" },
  "MIS-1": { severity: "HIGH", category: "Missing elements", title: "Ready state has a labelled filter control" },
  "STA-1": { severity: "HIGH", category: "Missing elements", title: "Loading state: aria-busy, loading text, no findings rendered" },
  "STA-2": { severity: "HIGH", category: "Missing elements", title: "Error state: role=alert with the error message and a Retry button" },
  "STA-3": { severity: "HIGH", category: "Missing elements", title: "Empty state: 'No findings' message, no alert" },
  "STA-4": { severity: "HIGH", category: "Missing elements", title: "Ready state renders every visible finding exactly once" },
  "CNF-1": { severity: "MEDIUM", category: "Evidence & confidence", title: "Findings below 0.50 confidence are hidden and the hidden count is disclosed" },
  "CNF-2": { severity: "MEDIUM", category: "Evidence & confidence", title: "Findings 0.50–0.74 are marked for human review (and only those)" },
  "EVD-1": { severity: "HIGH", category: "Evidence & confidence", title: "Complete evidence (expected, observed, source) is shown for each finding" },
  "EVD-2": { severity: "HIGH", category: "Evidence & confidence", title: "Incomplete evidence is called out and Confirm is unavailable for that finding" },
  "A11Y-1": { severity: "HIGH", category: "Accessibility", title: "Every button has an accessible name" },
  "A11Y-2": { severity: "HIGH", category: "Accessibility", title: "Every form control has a label" },
  "A11Y-3": { severity: "MEDIUM", category: "Accessibility", title: "Panel is a named region (section + aria-labelledby/aria-label)" },
  "A11Y-4": { severity: "LOW", category: "Accessibility", title: "Findings use list semantics (ul/ol > li)" },
  "A11Y-5": { severity: "MEDIUM", category: "Accessibility", title: "Severity is written as text, not colour alone" },
  "ORD-1": { severity: "LOW", category: "Alignment & order", title: "Findings are ordered HIGH → MEDIUM → LOW" },
};

const SEVERITY_FAMILY = { high: "error", medium: "warning", low: "info" };

// ─── Helpers ─────────────────────────────────────────────

export function loadTokenNames(cssPath = TOKENS_CSS) {
  const css = fs.readFileSync(cssPath, "utf8");
  return new Set([...css.matchAll(/(--color-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
}

function stripComments(src) {
  // Good enough for component files: removes /* */ and // comments not inside strings.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
    .replace(/\{\s*\}/g, "{}");
}

const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim();

function accessibleName(el, doc) {
  const label = el.getAttribute("aria-label");
  if (label && norm(label)) return norm(label);
  const by = el.getAttribute("aria-labelledby");
  if (by) {
    const t = by.split(/\s+/).map((id) => doc.getElementById(id)?.text ?? "").join(" ");
    if (norm(t)) return norm(t);
  }
  const clone = parse(el.toString());
  clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return norm(clone.text) || norm(el.getAttribute("title"));
}

function controlHasLabel(el, doc) {
  if (norm(el.getAttribute("aria-label"))) return true;
  const by = el.getAttribute("aria-labelledby");
  if (by && by.split(/\s+/).some((id) => norm(doc.getElementById(id)?.text))) return true;
  const id = el.getAttribute("id");
  if (id && doc.querySelectorAll("label").some((l) => l.getAttribute("for") === id && norm(l.text))) return true;
  let p = el.parentNode;
  while (p) {
    if (p.rawTagName === "label" && norm(p.text)) return true;
    p = p.parentNode;
  }
  return false;
}

function styleBlobs(doc) {
  return doc
    .querySelectorAll("*")
    .flatMap((el) => [el.getAttribute("class"), el.getAttribute("style")])
    .filter(Boolean);
}

const RAW_COLOUR = [
  { re: /#[0-9a-fA-F]{3,8}\b/, what: "hex literal" },
  { re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/, what: "colour function" },
  {
    re: /\b(?:bg|text|border|ring|fill|stroke|outline|divide|decoration|shadow|accent|caret|placeholder|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    what: "Tailwind palette class",
  },
  { re: /\b(?:bg|text|border|ring|fill|stroke)-(?:white|black)\b/, what: "Tailwind white/black class" },
];

const FOREIGN_CONTRACT =
  /(?:^|\s|:)(?:bg|text|border|ring|fill|stroke)-(?:primary|secondary|muted|accent|destructive|card|popover|foreground|background|input|border|ring)(?:-foreground)?(?:\/\d+)?(?=\s|$)/;

/** Find the <li> (or nearest block) that represents a finding, by its title text. */
function findingNode(doc, title) {
  const candidates = doc.querySelectorAll("li, article, [role=listitem]").filter((el) => norm(el.text).includes(title));
  // innermost match
  return candidates.sort((a, b) => norm(a.text).length - norm(b.text).length)[0] ?? null;
}

function severityIndicator(node, severity) {
  const word = severity.toLowerCase();
  const hits = node
    .querySelectorAll("*")
    .filter((el) => norm(el.text).toLowerCase() === word || norm(el.text).toLowerCase() === `${word} severity`);
  return hits.sort((a, b) => a.toString().length - b.toString().length)[0] ?? null;
}

function familiesOn(el, stopAt) {
  const fams = new Set();
  let cur = el;
  while (cur && cur !== stopAt?.parentNode) {
    const blob = `${cur.getAttribute?.("class") ?? ""} ${cur.getAttribute?.("style") ?? ""}`;
    for (const m of blob.matchAll(/--color-(primary|success|warning|error|info|neutral)-/g)) fams.add(m[1]);
    if (fams.size || cur === stopAt) break;
    cur = cur.parentNode;
  }
  return fams;
}

// ─── Bundle + render ─────────────────────────────────────

async function renderCandidate(candidatePath) {
  fs.mkdirSync(TMP, { recursive: true });
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const harness = path.join(TMP, `harness-${stamp}.tsx`);
  const outfile = path.join(TMP, `bundle-${stamp}.cjs`);
  fs.writeFileSync(
    harness,
    `import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Candidate from ${JSON.stringify(path.resolve(candidatePath))};
import { fixtureFindings, fixtureErrorMessage } from ${JSON.stringify(path.join(CONTRACT, "fixtures.ts"))};
const Panel = Candidate.FindingsReviewPanel ?? Candidate.default;
// Handlers are always passed, as a real app would. (Run 1 omitted them, which made a
// candidate that disables actions without a handler look broken — see EVIDENCE.md M5.)
const handlers = { onDecision: () => {}, onRetry: () => {} };
const cases = {
  loading: { status: "loading", findings: [], ...handlers },
  error: { status: "error", findings: [], errorMessage: fixtureErrorMessage, ...handlers },
  empty: { status: "empty", findings: [], ...handlers },
  ready: { status: "ready", findings: fixtureFindings, ...handlers },
};
export function renderAll() {
  const out = {};
  for (const [k, props] of Object.entries(cases)) {
    try {
      if (typeof Panel !== "function") throw new Error("Candidate does not export FindingsReviewPanel");
      out[k] = { html: renderToStaticMarkup(React.createElement(Panel, props)) };
    } catch (e) { out[k] = { error: String(e && e.message || e) }; }
  }
  return out;
}`
  );

  const placeholder = (args) => {
    const src = args.importer && fs.existsSync(args.importer) ? fs.readFileSync(args.importer, "utf8") : "";
    const names = new Set();
    let hasDefault = false;
    const esc = args.path.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    for (const m of src.matchAll(new RegExp(`(?:^|;|\\n)\\s*import\\s+([^;]*?)\\s+from\\s+["']${esc}["']`, "g"))) {
      const clause = m[1];
      const named = clause.match(/\{([\s\S]*?)\}/);
      if (named) named[1].split(",").map((x) => x.trim().split(/\s+as\s+/)[0]).filter((x) => x && !x.startsWith("type ")).forEach((x) => names.add(x));
      const head = clause.replace(/\{[\s\S]*?\}/, "").replace(/,/g, " ").trim();
      if (head && !head.startsWith("*")) hasDefault = true;
    }
    return { path: args.path, namespace: "disallowed", pluginData: { names: [...names], hasDefault } };
  };

  const resolver = {
    name: "contract-resolver",
    setup(b) {
      b.onResolve({ filter: /^@\/components\/ui\/(.+)$/ }, (args) => {
        const name = args.path.replace("@/components/ui/", "");
        const p = path.join(STUBS, `${name}.tsx`);
        return fs.existsSync(p) ? { path: p } : placeholder(args);
      });
      b.onResolve({ filter: /^\.\/types$/ }, () => ({ path: path.join(CONTRACT, "types.ts") }));
      b.onResolve({ filter: /^[^./]/ }, (args) => {
        const allowedPkg = ["react", "react-dom", "react-dom/server", "lucide-react", "react/jsx-runtime"];
        if (allowedPkg.includes(args.path)) return { path: args.path, external: true };
        return placeholder(args);
      });
      // Disallowed modules become placeholders that render <div data-disallowed>, keep className and
      // children, and export exactly the names the candidate imports — so the rest of the panel can
      // still be checked. CMP-1 is what reports the violation.
      b.onLoad({ filter: /.*/, namespace: "disallowed" }, (args) => {
        const { names, hasDefault } = args.pluginData;
        const make = (n) => `(p) => React.createElement("div", { "data-disallowed": ${JSON.stringify(`${args.path}:${n}`)}, className: p && p.className }, p && p.children)`;
        const lines = ['import * as React from "react";', ...names.map((n) => `export const ${n} = ${make(n)};`)];
        if (hasDefault) lines.push(`export default ${make("default")};`);
        return { contents: lines.join("\n"), loader: "js", resolveDir: ROOT };
      });
    },
  };

  try {
    await build({
      entryPoints: [harness],
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      jsx: "automatic",
      logLevel: "silent",
      plugins: [resolver],
    });
  } catch (e) {
    const msg = e.errors?.map((x) => x.text).join("; ") ?? String(e);
    return { buildError: msg };
  } finally {
    fs.rmSync(harness, { force: true });
  }
  const require = createRequire(path.join(ROOT, "package.json"));
  const mod = require(outfile);
  const rendered = mod.renderAll();
  fs.rmSync(outfile, { force: true });
  return { rendered };
}

// ─── Checks ──────────────────────────────────────────────

export async function runCheck(candidatePath, { tokens = loadTokenNames(), fixtures } = {}) {
  const source = fs.readFileSync(candidatePath, "utf8");
  const code = stripComments(source);
  const results = {};
  const fail = (id, detail) => (results[id] = { pass: false, detail });
  const pass = (id, detail = "") => (results[id] = { pass: true, detail });

  // Source-level checks
  const imports = [...code.matchAll(/^\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gm)].map((m) => m[1]);
  const badImports = imports.filter((i) => !ALLOWED_IMPORTS.includes(i));
  badImports.length ? fail("CMP-1", `Disallowed imports: ${badImports.join(", ")}`) : pass("CMP-1");

  // Blank out string contents so "<button>" in a string or title attribute isn't mistaken for JSX.
  const codeNoStrings = code.replace(/(["'`])(?:\\.|(?!\1)[^\\\n])*\1/g, (m, q) => q + q);
  const raw = [...codeNoStrings.matchAll(/<(button|input|select|textarea)\b/g)].map((m) => m[1]);
  raw.length ? fail("CMP-2", `Raw elements in source: ${[...new Set(raw)].map((r) => `<${r}>`).join(", ")}`) : pass("CMP-2");

  // Render-level checks
  const { rendered, buildError } = await renderCandidate(candidatePath);
  const renderIds = Object.keys(CHECKS).filter((id) => !["CMP-1", "CMP-2"].includes(id));
  if (buildError) {
    renderIds.forEach((id) => fail(id, `Not evaluated — build failed: ${buildError}`));
    return finalise(results, { buildError });
  }

  const docs = {};
  const renderErrors = {};
  for (const [state, r] of Object.entries(rendered)) {
    if (r.error) renderErrors[state] = r.error;
    // Space between tags so text from adjacent elements doesn't fuse ("Dismiss" + "1 hidden" → "Dismiss1 hidden").
    else docs[state] = parse(r.html.replace(/></g, "> <"));
  }

  // Token checks across every rendered state
  const blobs = Object.values(docs).flatMap(styleBlobs);
  const rawHits = [];
  for (const b of blobs) for (const { re, what } of RAW_COLOUR) { const m = b.match(re); if (m) rawHits.push(`${what} "${m[0]}"`); }
  rawHits.length ? fail("TOK-1", [...new Set(rawHits)].slice(0, 6).join("; ")) : pass("TOK-1");

  const referenced = new Set(blobs.flatMap((b) => [...b.matchAll(/var\((--color-[a-z0-9-]+)/g)].map((m) => m[1])));
  const unknown = [...referenced].filter((t) => !tokens.has(t));
  if (referenced.size === 0) fail("TOK-2", "No Foundry --color-* tokens referenced at all");
  else unknown.length ? fail("TOK-2", `Unknown tokens: ${unknown.join(", ")}`) : pass("TOK-2", `${referenced.size} tokens, all valid`);

  const foreign = [...new Set(blobs.flatMap((b) => b.split(/\s+/)).filter((c) => FOREIGN_CONTRACT.test(` ${c} `)))];
  foreign.length ? fail("TOK-4", `shadcn colour utilities: ${foreign.slice(0, 6).join(", ")}`) : pass("TOK-4");

  // States
  const S = (state) => docs[state];
  const stateErr = (id, state) => (renderErrors[state] ? (fail(id, `Render error in ${state}: ${renderErrors[state]}`), true) : false);
  const allTitles = fixtures.findings.map((f) => f.title);

  if (!stateErr("STA-1", "loading")) {
    const d = S("loading");
    const root = d.querySelector("*");
    const busy = d.querySelector('[aria-busy="true"]');
    const titles = allTitles.filter((t) => norm(d.text).includes(t));
    const problems = [];
    if (!busy) problems.push("no aria-busy=\"true\"");
    if (!/loading/i.test(d.text)) problems.push("no 'loading' text");
    if (titles.length) problems.push("renders findings while loading");
    if (!root) problems.push("renders nothing");
    problems.length ? fail("STA-1", problems.join("; ")) : pass("STA-1");
  }

  if (!stateErr("STA-2", "error")) {
    const d = S("error");
    const alert = d.querySelector('[role="alert"]');
    const problems = [];
    if (!alert) problems.push("no role=\"alert\"");
    else if (!norm(alert.text).includes(fixtures.errorMessage)) problems.push("alert does not show errorMessage");
    const retry = d.querySelectorAll("button").some((b) => /retry|try again/i.test(accessibleName(b, d)));
    if (!retry) problems.push("no Retry button");
    problems.length ? fail("STA-2", problems.join("; ")) : pass("STA-2");
  }

  if (!stateErr("STA-3", "empty")) {
    const d = S("empty");
    const problems = [];
    if (!/no findings/i.test(d.text)) problems.push("no 'No findings' message");
    if (d.querySelector('[role="alert"]')) problems.push("empty state uses role=alert");
    problems.length ? fail("STA-3", problems.join("; ")) : pass("STA-3");
  }

  const readyIds = ["STA-4", "MIS-1", "CNF-1", "CNF-2", "EVD-1", "EVD-2", "TOK-3", "A11Y-3", "A11Y-4", "A11Y-5", "ORD-1"];
  if (renderErrors.ready) {
    readyIds.forEach((id) => fail(id, `Render error in ready: ${renderErrors.ready}`));
  } else {
    const d = S("ready");
    const text = norm(d.text);
    const visible = fixtures.findings.filter((f) => f.confidence >= 0.5);
    const hidden = fixtures.findings.filter((f) => f.confidence < 0.5);
    const nodes = Object.fromEntries(visible.map((f) => [f.id, findingNode(d, f.title)]));

    // STA-4
    const missing = visible.filter((f) => !text.includes(f.title));
    const dupes = visible.filter((f) => text.split(f.title).length - 1 > 1);
    missing.length || dupes.length
      ? fail("STA-4", [missing.length && `missing: ${missing.map((f) => f.id).join(", ")}`, dupes.length && `duplicated: ${dupes.map((f) => f.id).join(", ")}`].filter(Boolean).join("; "))
      : pass("STA-4", `${visible.length} findings rendered`);

    // MIS-1
    const controls = d.querySelectorAll("input, select, textarea").filter((el) => el.getAttribute("type") !== "hidden");
    controls.length ? pass("MIS-1") : fail("MIS-1", "No filter control in ready state");

    // CNF-1
    const leaked = hidden.filter((f) => text.includes(f.title));
    const disclosed = /\b1\b[^.]{0,60}(hidden|suppressed)|(hidden|suppressed)[^.]{0,60}\b1\b/i.test(text);
    leaked.length ? fail("CNF-1", `Low-confidence finding shown: ${leaked.map((f) => f.id).join(", ")}`)
      : !disclosed ? fail("CNF-1", "Hidden correctly, but the hidden count isn't disclosed")
      : pass("CNF-1");

    // CNF-2
    const reviewRe = /human review|needs review/i;
    const band = visible.filter((f) => f.confidence < 0.75);
    const sure = visible.filter((f) => f.confidence >= 0.75);
    const unmarked = band.filter((f) => !nodes[f.id] || !reviewRe.test(nodes[f.id].text));
    const overmarked = sure.filter((f) => nodes[f.id] && reviewRe.test(nodes[f.id].text));
    unmarked.length || overmarked.length
      ? fail("CNF-2", [unmarked.length && `not marked: ${unmarked.map((f) => f.id).join(", ")}`, overmarked.length && `marked without reason: ${overmarked.map((f) => f.id).join(", ")}`].filter(Boolean).join("; "))
      : pass("CNF-2");

    // EVD-1 / EVD-2
    const complete = visible.filter((f) => f.evidence?.expected && f.evidence?.observed && f.evidence?.source);
    const incomplete = visible.filter((f) => !complete.includes(f));
    const evdMissing = [];
    for (const f of complete) {
      const n = nodes[f.id];
      const t = n ? norm(n.text) : "";
      const lacks = ["expected", "observed", "source"].filter((k) => !t.includes(f.evidence[k]));
      if (!n) evdMissing.push(`${f.id}: no finding element`);
      else if (lacks.length) evdMissing.push(`${f.id}: missing ${lacks.join(", ")}`);
    }
    evdMissing.length ? fail("EVD-1", evdMissing.join("; ")) : pass("EVD-1");

    const confirmEnabled = (n) =>
      n.querySelectorAll("button").some((b) => /confirm/i.test(accessibleName(b, d)) && b.getAttribute("disabled") === undefined && b.getAttribute("aria-disabled") !== "true");
    const evd2 = [];
    for (const f of incomplete) {
      const n = nodes[f.id];
      if (!n) { evd2.push(`${f.id}: no finding element`); continue; }
      if (!/evidence[^.]{0,20}(incomplete|missing)|(incomplete|missing)[^.]{0,20}evidence/i.test(n.text)) evd2.push(`${f.id}: incompleteness not called out`);
      if (confirmEnabled(n)) evd2.push(`${f.id}: Confirm still enabled`);
    }
    const anyCompleteConfirmable = complete.some((f) => nodes[f.id] && confirmEnabled(nodes[f.id]));
    if (!anyCompleteConfirmable) evd2.push("no finding with complete evidence can be confirmed (Confirm missing or disabled everywhere)");
    evd2.length ? fail("EVD-2", evd2.join("; ")) : pass("EVD-2");

    // TOK-3 + A11Y-5
    const tok3 = [];
    const a11y5 = [];
    for (const f of visible) {
      const n = nodes[f.id];
      if (!n) { a11y5.push(`${f.id}: no finding element`); tok3.push(`${f.id}: no finding element`); continue; }
      const ind = severityIndicator(n, f.severity);
      if (!ind) { a11y5.push(`${f.id}: no "${f.severity}" text`); tok3.push(`${f.id}: severity indicator not found`); continue; }
      const fams = familiesOn(ind, n);
      const want = SEVERITY_FAMILY[f.severity];
      if (!fams.has(want)) tok3.push(`${f.id} (${f.severity}): uses ${fams.size ? [...fams].join("/") : "no Foundry family"}, expected ${want}`);
    }
    tok3.length ? fail("TOK-3", tok3.join("; ")) : pass("TOK-3");
    a11y5.length ? fail("A11Y-5", a11y5.join("; ")) : pass("A11Y-5");

    // A11Y-3
    const root = d.childNodes.find((n) => n.nodeType === 1);
    const isRegion = root && (root.rawTagName === "section" || root.getAttribute("role") === "region");
    const named = root && (norm(root.getAttribute("aria-label")) || (root.getAttribute("aria-labelledby") && d.getElementById(root.getAttribute("aria-labelledby"))));
    isRegion && named ? pass("A11Y-3") : fail("A11Y-3", !isRegion ? `Root is <${root?.rawTagName ?? "nothing"}>, not a section/region` : "Region has no accessible name");

    // A11Y-4
    const notLi = visible.filter((f) => nodes[f.id] && !(nodes[f.id].rawTagName === "li" && ["ul", "ol"].includes(nodes[f.id].parentNode?.rawTagName)));
    const noNode = visible.filter((f) => !nodes[f.id]);
    notLi.length || noNode.length ? fail("A11Y-4", `Not in ul/ol > li: ${[...notLi, ...noNode].map((f) => f.id).join(", ")}`) : pass("A11Y-4");

    // ORD-1
    const rank = { high: 0, medium: 1, low: 2 };
    const order = visible.map((f) => ({ f, i: d.toString().indexOf(f.title) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
    const ordered = order.every((x, k) => k === 0 || rank[order[k - 1].f.severity] <= rank[x.f.severity]);
    ordered ? pass("ORD-1") : fail("ORD-1", `Rendered order: ${order.map((x) => `${x.f.id}(${x.f.severity})`).join(" → ")}`);
  }

  // A11Y-1 / A11Y-2 across all rendered states
  const unnamed = [];
  const unlabelled = [];
  for (const [state, d] of Object.entries(docs)) {
    d.querySelectorAll("button").forEach((b) => { if (!accessibleName(b, d)) unnamed.push(`${state}: <button>${b.innerHTML.slice(0, 40)}`); });
    d.querySelectorAll("input, select, textarea").forEach((c) => {
      if (c.getAttribute("type") === "hidden") return;
      if (!controlHasLabel(c, d)) unlabelled.push(`${state}: <${c.rawTagName} ${c.getAttribute("type") ?? ""}${c.getAttribute("placeholder") ? ` placeholder="${c.getAttribute("placeholder")}"` : ""}>`);
    });
  }
  unnamed.length ? fail("A11Y-1", `${unnamed.length} unnamed button(s) — e.g. ${unnamed[0]}`) : pass("A11Y-1");
  unlabelled.length ? fail("A11Y-2", `Unlabelled: ${[...new Set(unlabelled)].join("; ")}`) : pass("A11Y-2");

  return finalise(results, { renderErrors, html: Object.fromEntries(Object.entries(rendered).map(([k, v]) => [k, v.html ?? null])) });
}

function finalise(results, extra) {
  const ids = Object.keys(CHECKS);
  const rows = ids.map((id) => ({ id, ...CHECKS[id], ...(results[id] ?? { pass: false, detail: "Not evaluated" }) }));
  const passed = rows.filter((r) => r.pass).length;
  const score = Math.round((passed / rows.length) * 100);
  const failed = rows.filter((r) => !r.pass);
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  failed.forEach((r) => counts[r.severity]++);
  // Gate: DC Drift thresholds, tightened so HIGH always holds and MEDIUM always needs review.
  let gate = score >= 80 ? "GO" : score >= 60 ? "REVIEW" : "HOLD";
  if (counts.MEDIUM > 0 && gate === "GO") gate = "REVIEW";
  if (counts.HIGH > 0) gate = "HOLD";
  return { score, passed, run: rows.length, gate, counts, failed: failed.map((r) => r.id), rows, ...extra };
}

// ─── Reporting ───────────────────────────────────────────

export function toMarkdown(name, r) {
  const lines = [
    `## ${name}`,
    "",
    `**Structural score ${r.score}/100** (${r.passed}/${r.run} checks) · **${r.gate}** · ${r.counts.HIGH} high, ${r.counts.MEDIUM} medium, ${r.counts.LOW} low`,
    "",
  ];
  if (r.buildError) lines.push(`> Build failed: ${r.buildError}`, "");
  const failed = r.rows.filter((x) => !x.pass).sort((a, b) => ["HIGH", "MEDIUM", "LOW"].indexOf(a.severity) - ["HIGH", "MEDIUM", "LOW"].indexOf(b.severity));
  if (failed.length) {
    lines.push("| Check | Severity | What failed |", "|---|---|---|");
    failed.forEach((x) => lines.push(`| ${x.id} ${x.title} | ${x.severity} | ${x.detail.replace(/\|/g, "\\|")} |`));
  } else lines.push("All checks passed.");
  return lines.join("\n");
}

/**
 * Writes one static HTML preview per state, styled with Foundry tokens and a
 * locally compiled Tailwind stylesheet. The stubs approximate Foundry's
 * Button/Input/Badge base styles; they are not the real components.
 */
export function writePreviews(outDir, r) {
  if (!r.html) return;
  fs.mkdirSync(outDir, { recursive: true });
  for (const [state, html] of Object.entries(r.html)) {
    if (!html) continue;
    fs.writeFileSync(
      path.join(outDir, `${state}.html`),
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preview — ${state}</title><link rel="stylesheet" href="preview.css"></head><body>${html}</body></html>`
    );
  }
  const input = path.join(TMP, "preview-input.css");
  fs.writeFileSync(
    input,
    `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n${fs.readFileSync(TOKENS_CSS, "utf8")}
@layer components{
body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--color-neutral-surface);padding:32px;display:flex;justify-content:center}
[data-slot=button]{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:8px;font-size:13px;font-weight:500;border:1px solid transparent}
[data-slot=button][data-variant=default]:not([class*="bg-"]){background:var(--color-primary-fill);color:var(--color-primary-contrast-text)}
[data-slot=button][data-variant=outline]{border-color:var(--color-neutral-border);background:var(--color-neutral-background)}
[data-slot=button][data-variant=ghost]{background:transparent}
[data-slot=button][disabled]{opacity:.5;cursor:not-allowed} [data-slot=button] svg{width:14px;height:14px}
[data-slot=input]{height:32px;width:100%;border-radius:8px;border:1px solid var(--color-neutral-border);padding:0 10px;font-size:14px;background:var(--color-neutral-background)}
[data-slot=badge]{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:12px;font-weight:500}
[data-slot=label]{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:500;line-height:1}
}`
  );
  const bin = path.join(ROOT, "node_modules", ".bin", "tailwindcss");
  if (fs.existsSync(bin)) {
    execFileSync(bin, ["-i", input, "-o", path.join(outDir, "preview.css"), "--content", path.join(outDir, "*.html")], { stdio: "ignore" });
  }
}

// ─── CLI ─────────────────────────────────────────────────

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("Usage: node checker/check.mjs <candidate.tsx> [--out dir] [--json]");
    process.exit(2);
  }
  const outIdx = args.indexOf("--out");
  const { fixtureFindings, fixtureErrorMessage } = await loadFixtures();
  const r = await runCheck(file, { fixtures: { findings: fixtureFindings, errorMessage: fixtureErrorMessage } });
  if (outIdx >= 0) writePreviews(args[outIdx + 1], r);
  if (args.includes("--json")) console.log(JSON.stringify({ ...r, html: undefined }, null, 2));
  else console.log(toMarkdown(path.basename(file), r));
  process.exit(r.gate === "HOLD" ? 1 : 0);
}

export async function loadFixtures() {
  fs.mkdirSync(TMP, { recursive: true });
  const out = path.join(TMP, "fixtures.mjs");
  await build({ entryPoints: [path.join(CONTRACT, "fixtures.ts")], outfile: out, bundle: true, format: "esm", platform: "node", logLevel: "silent" });
  const mod = await import(`${out}?t=${Date.now()}`);
  return mod;
}
