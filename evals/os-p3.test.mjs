#!/usr/bin/env node
// os-p3.test.mjs — OS-P3 eval (K1): evals.json carries all 23 method rows with
// self-consistent summary counts (hand-edit tripwire), evals.html renders them,
// and a deliberately failed run (dead engine URL) shows red honestly — verified
// by actually invoking run-evals.mjs against a dead URL.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let pass = 0, fail = 0;
const ok = (cond, name) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

// ── evals.json: 23 rows, self-consistent, machine-written ──
ok(existsSync(join(ROOT, "evals.json")), "evals.json exists (published with the pages)");
const ev = JSON.parse(readFileSync(join(ROOT, "evals.json"), "utf8"));
ok(ev.results.length === 23, `23 method rows (got ${ev.results.length})`);
const names = new Set(ev.results.map(r => r.method));
ok(names.size === 23, "23 distinct methods");
for (const m of ["unit_root", "soch_profile", "channel_attribution", "namh_hurst", "ksg_te", "sri_daily"])
  ok(names.has(m), `row present: ${m}`);
const re = { pass: 0, fail: 0, async_pending: 0 };
ev.results.forEach(r => { re[r.status] = (re[r.status] || 0) + 1; });
ok(re.pass === ev.summary.pass && re.fail === ev.summary.fail && (re.async_pending || 0) === ev.summary.async_pending,
  "summary counts match recomputation from rows (hand-edit tripwire)");
ok(ev.results.every(r => r.expected && r.source), "every row states its expected band AND its source (no unexplained numbers)");
ok(/never hand-edited/i.test(ev.suite), "suite self-declares the K5 rule");

// ── evals.html renders the real rows (vm) ──
const HTML = readFileSync(join(ROOT, "evals.html"), "utf8");
const SRC = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes("buildTable"));
const sandbox = { window: {}, console, Number, String, isFinite, Math, JSON };
vm.createContext(sandbox);
vm.runInContext(SRC, sandbox, { filename: "evals-inline.js" });
const E = sandbox.window.__evals;
const table = E.buildTable(ev);
// data rows only — <tr><td …; the <thead> header row is <tr><th …
ok((table.match(/<tr><td/g) || []).length === 23, "table renders all 23 rows");
ok(table.includes('man/unit_root.html'), "method cells link to the man pages");
const redFixture = E.buildTable({ results: [{ method: "x", status: "fail", value: 1, expected: "y", source: "s", note: "boom" }] });
ok(redFixture.includes('chip fail'), "a failed row renders the red chip (red is shown, not hidden)");
const sum = E.buildSummary(ev);
ok(sum.includes(String(ev.summary.pass)) && sum.includes((ev.run_at || "").slice(0, 10)), "summary shows pass count + run date");

// ── dead-engine red path: actually run the runner against a dead URL ──
let deadOut = null, deadExit = 0;
try {
  execFileSync(process.execPath, [join(__dirname, "run-evals.mjs"), "--only=unit_root", "--out=/tmp/evals-dead.json"],
    { env: { ...process.env, ENGINE_URL: "https://dead.invalid" }, timeout: 120000, encoding: "utf8" });
} catch (e) { deadExit = e.status; }
deadOut = JSON.parse(readFileSync("/tmp/evals-dead.json", "utf8"));
ok(deadExit !== 0, "dead engine → runner exits non-zero (red is loud)");
ok(deadOut.results[0].status === "fail" && /network|HTTP/i.test(deadOut.results[0].note), "dead engine → row honestly red with the reason");
ok(deadOut.engine.ok === false, "dead engine → engine.ok recorded false (strip will show stale/unreachable)");

console.log(`\n${pass}/${pass + fail} OS-P3 checks passed`);
process.exit(fail ? 1 : 0);
