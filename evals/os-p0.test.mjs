#!/usr/bin/env node
// os-p0.test.mjs — OS-P0 eval (K1): the status strip renders all four cells from
// (stubbed) live-endpoint payloads, and shows an honest "stale" tag when the
// engine is unreachable (simulated by a dead fetch), falling back to cached-last-good.
// Runs assets/os.js — the exact shipped file — inside node:vm with a DOM stub.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeEnv, jsonResponse, failResponse } from "./_dom-stub.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(__dirname, "..", "assets", "os.js"), "utf8");

const HEALTH = { ok: true, sandbox: "timeout", methods: 23, timeout_s: 90, revision: "shssm-compute-00031-test" };
const SRI = { status: "ok", date: "2026-06-08", sri: "0.007286", n_markets: "17", n_pairs: "272" };
const EVALS = { run_at: "2026-06-10T07:00:00Z", results: Array.from({ length: 23 }, (_, i) => ({ method: "m" + i, status: i ? "pass" : "fail" })) };

function run(fetchImpl, store) {
  const { env, byId, El, hrefSink } = makeEnv({ fetchImpl, store });
  const strip = El("div"); env.document.register("os-strip", strip);
  const ctx = vm.createContext(env);
  vm.runInContext(SRC, ctx, { filename: "os.js" });
  return { env, strip, os: env.window.__os, hrefSink };
}

let pass = 0, fail = 0;
const ok = (cond, name) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

// ── live path: all four cells render from endpoint payloads ──
{
  const store = {};
  const { strip, os } = run(url => {
    if (String(url).endsWith("/health")) return jsonResponse(HEALTH);
    if (String(url).includes("/api/sri/current")) return jsonResponse(SRI);
    if (String(url).includes("evals.json")) return jsonResponse(EVALS);
    return failResponse();
  }, store);
  await os.loadStrip(false);
  const h = strip.innerHTML;
  ok(h.includes("23 methods"), "cell 1: engine methods rendered");
  ok(h.includes("00031-test"), "cell 1: engine revision rendered (shssm- prefix stripped)");
  ok(h.includes("2026-06-08") && h.includes("0.00729"), "cell 2: latest SRI date + value rendered");
  ok(h.includes("tick"), "cell 3: tick cell rendered");
  ok(h.includes("22/23 pass"), "cell 4: eval-suite cell rendered honestly (22/23, not all-pass)");
  ok(!h.includes("os-stale"), "no stale tag on the live path");
  ok(store["os_strip_v1"] && JSON.parse(store["os_strip_v1"]).sri.date === "2026-06-08", "last-good reading cached");
}

// ── tick-state math (weekend-aware, honest labels) ──
{
  const { os } = run(() => failResponse(), {});
  ok(os.tickState("2026-06-09", "2026-06-10").cls === "ok", "tick ok when last == expected (Tue seen Wed)");
  ok(os.tickState("2026-06-08", "2026-06-10").cls === "warn", "tick warn at T-1 (close settling)");
  ok(os.tickState("2026-06-08", "2026-06-10").label.includes("2026-06-09"), "warn label names the awaited date");
  ok(os.tickState("2026-06-05", "2026-06-08").cls === "ok", "Friday point is current on Monday (weekend-aware)");
  ok(os.tickState("2026-06-03", "2026-06-10").cls === "bad", "tick bad when lagging several trading days");
}

// ── dead engine + cache: stale tag, cached values still shown ──
{
  const cached = { t: "2026-06-10T05:00:00Z", health: HEALTH, sri: SRI, evals: EVALS };
  const store = { os_strip_v1: JSON.stringify(cached) };
  const { strip, os } = run(() => failResponse(), store);
  await os.loadStrip(false);
  const h = strip.innerHTML;
  ok(h.includes("os-stale") && h.includes("stale"), "dead engine → honest stale tag shown");
  ok(h.includes("2026-06-08"), "dead engine → cached-last-good SRI still rendered");
}

// ── dead engine + no cache: honest unreachable, no fabricated values ──
{
  const { strip, os } = run(() => failResponse(), {});
  await os.loadStrip(false);
  const h = strip.innerHTML;
  ok(h.includes("unreachable"), "dead engine + no cache → honest 'unreachable'");
  ok(!h.includes("2026-06"), "dead engine + no cache → no fabricated dates/values");
}

console.log(`\n${pass}/${pass + fail} OS-P0 checks passed`);
process.exit(fail ? 1 : 0);
