#!/usr/bin/env node
/* run-evals.mjs — the public eval suite (OS-P3, Karpathy K1 made public).
   Runs every catalog method against the LIVE engine and grades the result
   against its DOCUMENTED verified value (ARCHITECTURE.md A2 table / the
   golden suite bands — sources cited per row). Emits evals.json, which
   evals.html renders and the portal strip summarises.

   Integrity rules:
   - evals.json is NEVER hand-edited (K5). A red row is information.
   - Bands come only from documented verified values; methods whose verified
     tuple doesn't pin a full config get honest INVARIANT checks (still
     failable: wrong shape, non-finite, instability, wrong verdict).
   - Async-only methods (ksg_te, ksg_robustness) run truly via the tower
     job-server when --async is passed and 127.0.0.1:3030 answers; otherwise
     they are honest "async_pending" rows, never faked.

   Usage: node evals/run-evals.mjs [--async] [--only=m1,m2] [--out=path]
   Env:   ENGINE_URL (override; the dead-URL red-path eval uses this) */
import { writeFileSync } from "node:fs";

const ENGINE = process.env.ENGINE_URL || "https://shssm-compute-b7ui3oxaqq-el.a.run.app";
const JOBS = process.env.JOBS_URL || "http://127.0.0.1:3030";
const args = process.argv.slice(2);
const WITH_ASYNC = args.includes("--async");
const ONLY = (args.find(a => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const OUT = (args.find(a => a.startsWith("--out=")) || "").slice(6) || new URL("../evals.json", import.meta.url).pathname;

const inBand = (v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi;
const num = v => (v == null ? NaN : Number(v));

/* ── the suite: one row per method; source cited; every check can fail ── */
const SUITE = [
  { m: "unit_root", p: { series: ["India"] }, expected: "India ADF stat in [-55,-45] (verified -49.18)", src: "A2 + golden",
    check: r => ({ value: num(r.adf && r.adf.statistic), pass: inBand(num(r.adf && r.adf.statistic), -55, -45) }) },
  { m: "var_irf", p: { series: ["India", "USA", "UK"] }, expected: "stable VAR: max companion root < 1, finite", src: "A2 invariant (verified tuple: lag 7, root 0.705)",
    check: r => { const v = num(r.max_root ?? r.maxroot ?? (r.stability && r.stability.max_root)); return { value: v, pass: inBand(v, 0.01, 0.999) }; } },
  { m: "dfa_hurst", p: { series: ["India"] }, expected: "India Hurst in [0.45,0.65] (verified 0.542)", src: "A2 + golden",
    check: r => { const v = num(r.hurst ?? r.H); return { value: v, pass: inBand(v, 0.45, 0.65) }; } },
  { m: "garch", p: { series: ["India"] }, expected: "India GARCH persistence in [0.95,1.0] (verified 0.991)", src: "A2 + golden",
    check: r => ({ value: num(r.persistence), pass: inBand(num(r.persistence), 0.95, 1.0) }) },
  { m: "wavelet", p: { series: ["India"] }, expected: "India d1 share of variance in [35,60]% (verified 47.07)", src: "A2 + golden",
    check: r => { const v = num(r.scales && r.scales[0] && r.scales[0].pct_of_total); return { value: v, pass: inBand(v, 35, 60) }; } },
  { m: "wqte", p: { series: ["USA", "India"], tau: 0.05 }, expected: "USA→India tau.05 aggregate spillover in [0.02,0.06] (verified 0.039)", src: "A2",
    check: r => { const v = num(r.aggregate_qte); return { value: v, pass: inBand(v, 0.02, 0.06) }; } },
  { m: "soch_profile", p: { series: ["USA", "India"], tau: 0.05 }, expected: "USA→India aggregate in [0.03,0.05] (verified 0.0391, peak d4)", src: "A2",
    check: r => { const v = num(r.aggregate_forward); return { value: v, pass: inBand(v, 0.03, 0.05) && r.peak_scale_forward === "d4" }; } },
  { m: "channel_attribution", p: { episodes: ["GFC"] }, expected: "GFC: Trade 27.9% (Table 5, 0.000pp) and dominant == Trade", src: "A2 + arXiv:2604.26546",
    check: r => { const e = (r.episodes || []).find(x => (x.period || x.episode) === "GFC") || {}; const v = num(e.trade ?? e.Trade ?? (e.shares && e.shares.Trade)); return { value: v, pass: inBand(v, 27.8, 28.0) && /trade/i.test(String(e.dominant)) }; } },
  { m: "namh_hurst", p: {}, expected: "g20_24 Gold H_mean in [0.4889,0.4909] (bit-exact verified 0.4899)", src: "A2 #45",
    check: r => { const g = (r.per_series || []).find(s => s.market === "Gold") || {}; return { value: num(g.H_mean), pass: inBand(num(g.H_mean), 0.4889, 0.4909) }; } },
  { m: "namh_te", p: { window_index: 1 }, expected: "g20_24 window-1 te_mean in [-0.2242,-0.2222] (bit-exact verified -0.223222)", src: "A2 #45",
    check: r => { const w = (r.per_window || [])[0] || {}; const v = num(w.te_mean); return { value: v, pass: inBand(v, -0.2242, -0.2222) }; } },
  { m: "vecm", p: { series: ["India", "USA", "UK"] }, expected: "Johansen rank 3 (verified trace 7265.97→1851.19)", src: "A2",
    check: r => { const v = num(r.rank ?? r.cointegration_rank); return { value: v, pass: v === 3 }; } },
  { m: "granger", p: { series: ["India", "USA", "UK", "China"] }, expected: "6 significant directed edges (verified; USA out-degree 3)", src: "A2",
    check: r => { const v = num(r.n_edges ?? (r.edges && r.edges.length)); return { value: v, pass: v === 6 }; } },
  { m: "panel_unit_root", p: { series: ["India", "USA", "UK", "China", "Japan"] }, expected: "panel stationarity rejected: IPS and LLC < -10, p ≈ 0 (this exact 5-market panel: IPS -77.26, LLC -51.79)", src: "A2 invariant — series set resolved 2026-06-11: the documented tuple is the {India,USA,UK,China,Japan} panel (live re-run -77.2594/-51.7933, exact)",
    check: r => { const i = num(r.ips && (r.ips.statistic ?? r.ips.stat)), l = num(r.llc && (r.llc.statistic ?? r.llc.stat)); return { value: i, pass: i < -10 && l < -10 }; } },
  { m: "connectedness", p: { series: ["India", "USA", "UK"] }, expected: "total connectedness in [25,35]% (verified TCI 30.25)", src: "A2",
    check: r => { const v = num(r.tci ?? r.total_connectedness ?? r.total); return { value: v, pass: inBand(v, 25, 35) }; } },
  { m: "network", p: { series: ["India", "USA", "UK", "China", "Brazil", "Japan"] }, expected: "6-node graph, density in (0,1], communities ≥ 1", src: "A2 invariant",
    check: r => { const d = num(r.density), n = num(r.n_nodes ?? (r.nodes && r.nodes.length)); return { value: d, pass: n === 6 && inBand(d, 0.000001, 1) }; } },
  { m: "rolling_dcc", p: { series: ["India", "USA"] }, expected: "India–USA mean dynamic correlation in [0.15,0.31] (verified 0.23)", src: "A2",
    check: r => { const p = (r.pairs || [])[0] || {}; const v = num(p.mean_corr); return { value: v, pass: inBand(v, 0.15, 0.31) }; } },
  { m: "wavelet_coherence", p: { series: ["USA", "India"] }, expected: "mean coherence in [0.2,0.3] (verified 0.249, peak d6)", src: "A2",
    check: r => { const cs = (r.per_scale || []).map(s => num(s.coherence)).filter(isFinite); const v = cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : NaN; const peak = (r.per_scale || []).slice().sort((a, b) => num(b.coherence) - num(a.coherence))[0]; return { value: v, pass: inBand(v, 0.2, 0.3) && peak && peak.scale === "d6" }; } },
  { m: "spillover_rolling", p: { series: ["India", "USA", "UK"] }, expected: "mean rolling TCI in [20,35]% (verified 28.4)", src: "A2",
    check: r => { const v = num(r.mean_tci ?? r.tci_mean ?? (r.summary && r.summary.mean)); return { value: v, pass: inBand(v, 20, 35) }; } },
  { m: "quantile_var", p: { series: ["India", "USA", "UK"], tau: 0.05 }, expected: "USA is the top tail driver with positive net score (verified +0.70)", src: "A2",
    check: r => { const top = (r.directional || []).slice().sort((a, b) => num(b.net) - num(a.net))[0] || {}; return { value: num(top.net), pass: /usa/i.test(String(top.market)) && num(top.net) > 0 }; } },
  { m: "live_unit_root", p: { symbol: "^GSPC", transform: "both" }, expected: "live S&P: levels non-stationary, returns stationary (the stationarity gate)", src: "A2 + invariant 4 (TE on I(0) returns, never levels)",
    check: r => ({ value: NaN, pass: /non-?stationary/i.test(String(r.levels && r.levels.verdict)) && /^stationary/i.test(String(r.returns && r.returns.verdict).trim()) }) },
  { m: "sri_daily", p: {}, expected: "static-panel SRI = 0.00849 exactly ±1e-5 (first honest point, 306 pairs)", src: "A2 Phase 30",
    check: r => { const v = num(r.sri); return { value: v, pass: inBand(v, 0.00848, 0.00850) }; } },
  { m: "ksg_te", p: { series: ["USA", "Japan"] }, async: true, expected: "USA→Japan full-sample KSG TE in [0.150,0.158] (verified 0.1542)", src: "A2 + #39 anchor",
    check: r => { const e = (r.edges || r.pairs || []).find(x => /usa/i.test(x.from) && /japan/i.test(x.to)) || {}; const v = num(e.te ?? e.TE); return { value: v, pass: inBand(v, 0.150, 0.158) }; } },
  { m: "ksg_robustness", p: {}, async: true, expected: "USA→Japan rank-1 in 8/8 (k,lag) configs; mean Spearman in [0.6,0.85] (verified 0.728)", src: "A2 G.3",
    check: r => { const ranks = (r.stability && r.stability.headline_edge && r.stability.headline_edge.ranks_across_grid) || []; const rk = ranks.filter(x => x === 1).length; const sp = num(r.mean_spearman ?? (r.stability && r.stability.mean_spearman)); return { value: sp, pass: rk === 8 && inBand(sp, 0.6, 0.85) }; } },
];

async function postJSON(url, body, timeoutMs) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  const j = await r.json().catch(() => null);
  return { http: r.status, j };
}
async function runSync(t, attempt = 1) {
  const t0 = Date.now();
  try {
    const { http, j } = await postJSON(`${ENGINE}/api/compute/run`, { method: t.m, params: t.p }, 120000);
    if (!j || !j.ok) return { status: "fail", note: `engine HTTP ${http}: ${(j && (j.message || j.error)) || "no body"}`, ms: Date.now() - t0 };
    const c = t.check(j.result || {});
    return { status: c.pass ? "pass" : "fail", value: c.value, ms: j.ms ?? (Date.now() - t0), cached: !!j.cached,
      note: c.pass ? "" : `got ${c.value} (keys: ${Object.keys(j.result || {}).slice(0, 8).join(",")})` };
  } catch (e) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 4000)); return runSync(t, attempt + 1); }   // transient resets: bounded retry
    return { status: "fail", note: `network: ${e.message} (${attempt} attempts)`, ms: Date.now() - t0 };
  }
}
/* 429-aware wrapper: the engine rate-limits /api/compute/run at 20/min — the
   suite waits politely instead of recording a self-inflicted red. */
async function runSyncPolite(t) {
  for (let i = 0; i < 4; i++) {
    const r = await runSync(t);
    if (!(r.note || "").includes("429")) return r;
    await new Promise(res => setTimeout(res, 25000));
  }
  return runSync(t);
}
async function runAsync(t) {
  const t0 = Date.now();
  try {
    const sub = await postJSON(`${JOBS}/api/jobs/submit`, { workspace: "avishekb", method: t.m, params: t.p }, 8000);
    if (!sub.j || !sub.j.job_id) return { status: "fail", note: "job submit refused", ms: 0 };
    for (let i = 0; i < 720; i++) {            // poll up to 1h
      await new Promise(r => setTimeout(r, 5000));
      const g = await fetch(`${JOBS}/api/jobs/${sub.j.job_id}`).then(r => r.json()).catch(() => null);
      if (!g) continue;
      if (g.status === "succeeded") { const c = t.check(g.result || {}); return { status: c.pass ? "pass" : "fail", value: c.value, ms: Date.now() - t0, cached: false, note: (c.pass ? "" : `got ${c.value} (keys: ${Object.keys(g.result || {}).slice(0, 8).join(",")})`) + ` job ${sub.j.job_id}` }; }
      if (g.status === "failed") return { status: "fail", note: `job failed: ${String(g.error).slice(0, 140)}`, ms: Date.now() - t0 };
    }
    return { status: "fail", note: "job poll timeout (1h)", ms: Date.now() - t0 };
  } catch (e) { return { status: "fail", note: `job-server unreachable: ${e.message}`, ms: Date.now() - t0 }; }
}

const results = [];
let health = null;
try { health = await fetch(`${ENGINE}/health`, { signal: AbortSignal.timeout(15000) }).then(r => r.json()); } catch (e) { }

for (const t of SUITE) {
  if (ONLY.length && !ONLY.includes(t.m)) continue;
  let row;
  if (t.async && !WITH_ASYNC) row = { status: "async_pending", note: "async-only method; run with --async on the tower (job-server). Documented verified value shown — not re-run here, not faked." };
  else if (t.async) row = await runAsync(t);
  else { row = await runSyncPolite(t); await new Promise(r => setTimeout(r, 3200)); }   // stay under the 20/min engine limit
  results.push({ method: t.m, expected: t.expected, source: t.src, params: t.p, async: !!t.async, ...row });
  console.log(`${(row.status || "?").padEnd(13)} ${t.m.padEnd(20)} ${row.value !== undefined && row.value === row.value ? String(row.value).slice(0, 12) : ""} ${row.note || ""}`);
}

const out = {
  run_at: new Date().toISOString(),
  engine: { url: ENGINE, ok: !!(health && health.ok), methods: health && health.methods, revision: (health && health.revision) || null },
  suite: "evals/run-evals.mjs v1 — bands from documented verified values (ARCHITECTURE.md A2 / golden suite); never hand-edited (K5)",
  results,
  summary: { pass: results.filter(r => r.status === "pass").length, fail: results.filter(r => r.status === "fail").length, async_pending: results.filter(r => r.status === "async_pending").length, total: results.length },
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`\n${out.summary.pass} pass · ${out.summary.fail} fail · ${out.summary.async_pending} async_pending → ${OUT}`);
process.exit(out.summary.fail ? 1 : 0);
