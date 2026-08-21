#!/usr/bin/env node
// loop-integrity.test.mjs — V4 continuation: the autonomy loop is itself an
// element of the learning space, so its WIRING gets a failable eval (K1).
// Static checks over the real files — no network, no BQ. What this catches:
// a renamed suite row silently orphaning a claims-refresh mapping; a loop step
// pointing at a script that moved; the suite and the refresher disagreeing on
// the artifact path; a future edit that makes the nightly path delete claims;
// the system losing honesty about its own install state.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGES = join(__dirname, "..");
const ENGINE = "/home/ecolex/engine-work/compute-engine";

let pass = 0, fail = 0;
const ok = (cond, name) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };
const read = (p) => readFileSync(p, "utf8");

// ── the loop's steps reference scripts that actually exist ──
const LOOP = read(join(ENGINE, "scripts", "nightly-loop.sh"));
for (const s of ["server/job-server.mjs", "scripts/state-refresh.mjs", "scripts/claims-refresh.mjs", "scripts/gen-compute-report.mjs"])
  ok(LOOP.includes(s.split("/").pop()) && existsSync(join(ENGINE, s)), `loop step exists on disk: ${s}`);
ok(existsSync(join(PAGES, "evals", "run-evals.mjs")), "loop step exists on disk: evals/run-evals.mjs");

// ── artifact-path agreement: the suite writes where the refresher reads ──
// (suite rows use `m:`; the loop quotes the script path, so a `"` may sit
//  between the filename and its flags — shapes verified from the real files)
ok(/run-evals\.mjs"? --async --out="\$PAGES_DIR\/evals\.json"/.test(LOOP) &&
   /claims-refresh\.mjs"? --apply --evals="\$PAGES_DIR\/evals\.json"/.test(LOOP),
   "suite --out and claims-refresh --evals point at the SAME artifact");
ok(/gen-compute-report\.mjs"? --evals="\$PAGES_DIR\/evals\.json"/.test(LOOP),
   "report generator reads the SAME artifact (verbatim rendering, never recomputes)");

// ── claims-refresh MAP ⊆ the committed suite's method rows ──
const SUITE = read(join(PAGES, "evals", "run-evals.mjs"));
const suiteMethods = new Set([...SUITE.matchAll(/\{ m:\s*"([a-z0-9_]+)"/g)].map(m => m[1]));
const REFRESH = read(join(ENGINE, "scripts", "claims-refresh.mjs"));
const mapped = [...REFRESH.matchAll(/\{ eval: "([a-z0-9_]+)"/g)].map(m => m[1]);
ok(mapped.length >= 7, `claims-refresh maps ${mapped.length} suite rows (want >= 7)`);
for (const m of mapped) ok(suiteMethods.has(m), `mapped eval row exists in the suite: ${m}`);

// ── the nightly path can never delete a claim; deletes live only in ztest cleanup ──
const nightlyCode = REFRESH.split("function simulationSQL")[0]
  .split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
ok(!/DELETE/.test(nightlyCode), "no DELETE on the nightly code path (comments excluded)");
ok(/LIKE "ztest_%"/.test(REFRESH), "the only DELETE targets ztest_* simulation rows");

// ── gap pipeline: pre-registered rule + PI gate are intact ──
const GAP = read(join(ENGINE, "scripts", "gap-proposals.mjs"));
ok(/THRESHOLD = 5, WINDOW_DAYS = 7/.test(GAP), "gap rule pre-registered (>=5 recurrences / 7d)");
ok(/PI review required — never auto-deploy/.test(GAP), "gap proposals are PI-gated by construction");
ok(existsSync(join(ENGINE, "candidates", "RUNLOG.md")), "gap pipeline has a run record (no-proposal runs are recorded)");

// ── loop non-fatality: a claims/BQ outage must not repaint the night ──
ok(/non-fatal/.test(LOOP) && /exit \$RC/.test(LOOP), "claims-refresh is log-only; state-refresh exit code is the canary");

// ── the system stays honest about its own install state ──
// PASS iff the loop is installed in cron OR the pending one-liner is recorded in
// the STATE ledger. If BOTH disappear, the autonomy layer has lost track of
// itself — that is a red.
let cron = "";
try { cron = execFileSync("crontab", ["-l"], { encoding: "utf8" }); } catch { /* no crontab */ }
const installed = /nightly-loop\.sh/.test(cron);
const STATE = read(join(ENGINE, "STATE.md"));
const recorded = /install the nightly loop in cron/.test(STATE);
ok(installed || recorded, `loop install state is tracked (${installed ? "INSTALLED in crontab" : "pending, one-liner recorded in STATE.md"})`);

console.log(`\n${pass}/${pass + fail} loop-integrity checks passed`);
process.exit(fail ? 1 : 0);
