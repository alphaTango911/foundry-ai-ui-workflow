#!/usr/bin/env node
/**
 * Runs the checker over every case in evals/cases and compares observed
 * failures with expected.json.
 *
 *   node checker/run-evals.mjs            → evals/RESULTS.md + evals/results.json
 *   node checker/run-evals.mjs --previews → also writes out/<case>/*.html
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCheck, loadFixtures, writePreviews } from "./check.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CASES = path.join(ROOT, "evals", "cases");
const previews = process.argv.includes("--previews");

const { fixtureFindings, fixtureErrorMessage } = await loadFixtures();
const fixtures = { findings: fixtureFindings, errorMessage: fixtureErrorMessage };

const rows = [];
for (const name of fs.readdirSync(CASES).sort()) {
  const dir = path.join(CASES, name);
  const file = path.join(dir, "FindingsReviewPanel.tsx");
  if (!fs.existsSync(file)) continue;
  const exp = JSON.parse(fs.readFileSync(path.join(dir, "expected.json"), "utf8"));
  const r = await runCheck(file, { fixtures });
  if (previews) writePreviews(path.join(ROOT, "out", name), r);
  const expected = new Set(exp.shouldFail);
  const observed = new Set(r.failed);
  const missed = [...expected].filter((x) => !observed.has(x));
  const extra = [...observed].filter((x) => !expected.has(x));
  rows.push({
    case: name,
    description: exp.description,
    expectedFail: [...expected],
    observedFail: [...observed],
    missed,
    extra,
    detectionMatch: missed.length === 0 && extra.length === 0,
    score: r.score,
    checkerGate: r.gate,
    trueGate: exp.trueGate,
    gateMatch: r.gate === exp.trueGate,
    humanOnly: exp.humanOnly ?? [],
    details: Object.fromEntries(r.rows.filter((x) => !x.pass).map((x) => [x.id, x.detail])),
  });
}

const n = rows.length;
const detection = rows.filter((r) => r.detectionMatch).length;
const gates = rows.filter((r) => r.gateMatch).length;
const fn = rows.reduce((a, r) => a + r.missed.length, 0);
const fp = rows.reduce((a, r) => a + r.extra.length, 0);

const md = [
  "# Eval results",
  "",
  `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by \`npm run eval\`. Do not edit by hand.`,
  "",
  `- **Detection matched expectations:** ${detection}/${n} cases`,
  `- **Release gate matched the true verdict:** ${gates}/${n} cases`,
  `- **Missed failures (false negatives):** ${fn} · **Unexpected failures (false positives):** ${fp}`,
  "",
  "| Case | Expected to fail | Observed failing | Score | Checker gate | True gate | Match |",
  "|---|---|---|---|---|---|---|",
  ...rows.map((r) =>
    `| ${r.case} | ${r.expectedFail.join(", ") || "—"} | ${r.observedFail.join(", ") || "—"} | ${r.score} | ${r.checkerGate} | ${r.trueGate}${r.humanOnly.length ? ` (${r.humanOnly.join(", ")} human)` : ""} | ${r.detectionMatch && r.gateMatch ? "✅" : r.detectionMatch ? "⚠️ gate" : "❌"} |`
  ),
  "",
  "## Failure details",
  "",
  ...rows.flatMap((r) => [
    `### ${r.case}`,
    "",
    r.description,
    "",
    ...(Object.keys(r.details).length ? Object.entries(r.details).map(([id, d]) => `- **${id}** — ${d}`) : ["- No checks failed."]),
    ...(r.missed.length ? [`- ❌ Missed: ${r.missed.join(", ")}`] : []),
    ...(r.extra.length ? [`- ❌ Unexpected: ${r.extra.join(", ")}`] : []),
    "",
  ]),
].join("\n");

fs.writeFileSync(path.join(ROOT, "evals", "RESULTS.md"), md);
fs.writeFileSync(path.join(ROOT, "evals", "results.json"), JSON.stringify(rows, null, 2));
console.log(md.split("## Failure details")[0]);
