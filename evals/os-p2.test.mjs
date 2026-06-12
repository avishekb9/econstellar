#!/usr/bin/env node
// os-p2.test.mjs — OS-P2 eval (K1): the Observatory chart renders ≥56 points,
// the latest point's provenance opens (with edges + method stamp), and the
// honesty note (connectivity ≠ MCPFM SRI / no AUC transfer / Russia excluded)
// is present in the DOM. Pure builders are driven in node:vm from the shipped
// observatory.html; the live series shape is smoke-checked when the network
// allows (honest SKIP otherwise — the golden.test.mjs convention).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dirname, "..", "observatory.html"), "utf8");

let pass = 0, fail = 0;
const ok = (cond, name) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

// ── static DOM honesty checks (what every reader sees, JS or not) ──
ok(/connectivity index/i.test(HTML), "honesty: page says it is a connectivity index");
ok(/not.*the validated MCPFM/i.test(HTML.replace(/<[^>]+>/g, "")), "honesty: explicitly NOT the validated MCPFM SRI");
ok(/no AUC claim transfers/i.test(HTML), "honesty: AUC non-transfer stated");
ok(/Russia.*excluded/i.test(HTML.replace(/<[^>]+>/g, "")), "honesty: Russia exclusion stated");
ok(/regime note|static research panel/i.test(HTML), "honesty: 306-pair static origin labeled (no silent splice)");
ok(/settled real closes/i.test(HTML), "honesty: settled-closes append rule stated");

// ── extract the inline script and drive the pure builders in vm ──
const scripts = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const SRC = scripts.find(s => s.includes("buildChart"));
ok(!!SRC, "inline observatory script found");
const sandbox = { window: {}, console, Math, Number, String, JSON, Array, Object, Set, location: { hash: "" } };
vm.createContext(sandbox);
vm.runInContext(SRC, sandbox, { filename: "observatory-inline.js" });
const obs = sandbox.window.__obs;
ok(!!obs && typeof obs.buildChart === "function", "__obs test hooks exposed");

// 58-point fixture (shape of /api/sri/history)
const series = Array.from({ length: 58 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 2, 18) + i * 86400000 * 1.45);
  return { date: d.toISOString().slice(0, 10), sri: (0.007 + 0.004 * Math.sin(i / 7)).toFixed(6) };
});
const svg = obs.buildChart(series);
const ptCount = (svg.match(/class="pt"/g) || []).length;
ok(ptCount >= 56, `chart renders >=56 clickable points (got ${ptCount})`);
ok(svg.includes('stroke="#0072B2"'), "Okabe-Ito blue line (data colour mandate)");
ok(svg.includes('#D55E00'), "latest point highlighted in Okabe-Ito vermillion");
ok(svg.includes('tabindex="0"') && svg.includes('role="button"'), "points keyboard-operable (a11y)");
ok(svg.includes(series[57].date), "latest date labeled on the chart");

// provenance: latest point opens with edges + method stamp + honest unavailable path
const NET = { status: "ok", date: series[57].date, sri: "0.007146", edges: [{ from: "USA", to: "Japan", te: "0.152356" }, { from: "Germany", to: "India", te: "0.105226" }] };
const prov = obs.buildProvenance(series[57].date, NET);
ok(prov.includes(series[57].date) && prov.includes("USA") && prov.includes("0.152356"), "provenance opens with date + directed edges");
ok(prov.includes("sri_daily"), "provenance names the computing method (traceability)");
ok(/window 250.*k 4.*lag 1/.test(prov), "provenance states the estimator config");
ok(/log-returns/.test(prov) && /never levels/.test(prov), "provenance restates the stationarity rule");
const provBad = obs.buildProvenance("2026-01-01", { status: "unavailable", reason: "no SRI point for that date" });
ok(provBad.includes("unavailable") || provBad.includes("no SRI point"), "provenance honest when a date has no record");

// network builder: deterministic, directed, TE in tooltips
const net1 = obs.buildNetwork(NET), net2 = obs.buildNetwork(NET);
ok(net1 === net2, "network layout deterministic (no RNG — reproducible render)");
ok(net1.includes("marker-end") && net1.includes("→"), "network edges directed (arrowheads + from→to titles)");
ok(net1.includes("0.152356"), "exact TE in the edge tooltip");
ok(obs.buildNetwork({ status: "unavailable" }).includes("unavailable"), "network honest when unavailable");

// ── live smoke (skips honestly offline) ──
try {
  const r = await fetch("https://shssm-compute-b7ui3oxaqq-el.a.run.app/api/sri/history", { signal: AbortSignal.timeout(20000) });
  const j = await r.json();
  ok(j.status === "ok" && j.series.length >= 56, `LIVE /api/sri/history serves >=56 points (got ${j.series.length})`);
} catch (e) {
  console.log(`SKIP  live history check (offline: ${e.message})`);
}

console.log(`\n${pass}/${pass + fail} OS-P2 checks passed`);
process.exit(fail ? 1 : 0);
