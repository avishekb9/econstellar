#!/usr/bin/env node
// macro-vitals-lab.test.mjs — the answer key for the Classroom macro module.
//
// WHY THIS EXISTS. Every other page on this site can be wrong in a way a reader
// notices. A teaching instrument cannot: a student who is told the wrong answer
// confidently has no way to detect it, and will carry it into an exam. So the
// economics in classroom/macro-vitals-lab.html is written as pure functions,
// exported on window.__macro, and driven here against the three chapters the
// module is built from (Mankiw, Principles of Macroeconomics 6e, Ch. 10, 12, 13).
//
// The bands are not invented for the test. Where the chapter states a worked
// number, the number is asserted; where it states only a direction, only the
// direction is asserted, and the test says which of the two it is doing.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dirname, "..", "classroom", "macro-vitals-lab.html"), "utf8");
const TEXT = HTML.replace(/<[^>]+>/g, " ");

let pass = 0, fail = 0;
const ok = (cond, name) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-9 : tol);

// ── the page loads with no DOM: only the pure layer is exercised ──
const script = (HTML.match(/<script>([\s\S]*?)<\/script>/g) || []).map(s => s.replace(/<\/?script>/g, "")).join("\n");
const stubEl = () => ({
  innerHTML: "", textContent: "", dataset: {}, hidden: false, disabled: false,
  classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
  setAttribute() {}, getAttribute: () => null, addEventListener() {},
  querySelector: () => stubEl(), querySelectorAll: () => [], closest: () => null,
});
const sandbox = {
  window: {},
  document: {
    documentElement: { setAttribute() {}, removeAttribute() {}, getAttribute: () => null },
    querySelector: () => stubEl(), querySelectorAll: () => [], getElementById: () => stubEl(),
  },
  localStorage: { getItem: () => null, setItem() {} },
  console, String, Number, Array, Object, Math, JSON, isFinite, isNaN, Set,
};
sandbox.document.documentElement = { setAttribute() {}, removeAttribute() {}, getAttribute: () => null };
vm.createContext(sandbox);
vm.runInContext(script, sandbox, { filename: "macro-vitals-inline.js" });
const M = sandbox.window.__macro;
ok(!!M, "pure economics exposed on window.__macro");

// ══ Ch. 10 — GDP and its components ═══════════════════════════════════════
// Every scenario's stated verdict must follow from its own ledger. This is the
// check that catches an answer key disagreeing with the arithmetic beside it.
let mismatched = [];
for (const sc of M.LANDS) {
  if (M.landsVerdict(sc) !== sc.dy) mismatched.push(sc.mkt + " (ledger says " + M.landsVerdict(sc) + ", key says " + sc.dy + ")");
}
ok(mismatched.length === 0, "Ch10: every scenario's GDP verdict follows from its own C/I/G/NX entries"
  + (mismatched.length ? " — " + mismatched.join("; ") : ""));

// Worked cases the chapter states outright (Active Learning 1).
const byName = t => M.LANDS.find(x => new RegExp(t, "i").test(x.mkt));
const imported = byName("publishing firm");
ok(imported && imported.p.I === 90000 && imported.p.NX === -90000 && M.landsDelta(imported.p) === 0,
   "Ch10: an imported business laptop raises I, lowers NX by the same amount, leaves GDP unchanged");
const cars = byName("car plant");
ok(cars && near(M.landsDelta(cars.p), 5e9) && cars.p.I === 3e8,
   "Ch10: unsold output is inventory investment — GDP rises by production, not by sales");
const transfer = byName("transfer");
ok(transfer && M.landsDelta(transfer.p) === 0, "Ch10: a transfer payment is not a government purchase");
const shares = byName("Shares");
ok(shares && M.landsDelta(shares.p) === 0, "Ch10: buying a financial asset is not investment in GDP");
ok(M.LANDS.some(s => M.landsVerdict(s) === "part") && M.LANDS.some(s => M.landsVerdict(s) === "fall"),
   "Ch10: the 'partly' and 'falls' answers are both actually reachable, not decoys");

// ── real vs nominal: the identities the base year forces ──
const flat = M.gdpSeries({ pg: [0, 0], qg: [4, 7], base: 0 });
ok(flat.every(r => near(r.nom, r.real, 1e-6)) && flat.every(r => near(r.defl, 100, 1e-6)),
   "Ch10: with zero price growth, nominal equals real and the deflator is pinned at 100");
for (const b of [0, 1, 2]) {
  const rows = M.gdpSeries({ pg: [8, -4], qg: [3, 22], base: b });
  if (!(near(rows[b].defl, 100, 1e-6) && near(rows[b].nom, rows[b].real, 1e-6))) { ok(false, "Ch10: base year " + b + " has deflator 100"); break; }
  if (b === 2) ok(true, "Ch10: whichever year is the base has deflator exactly 100 and nominal = real");
}
const moved = [0, 1, 2].map(b => M.gdpSeries({ pg: [8, -4], qg: [3, 22], base: b }));
ok(moved.every(rows => near(rows[2].nom, moved[0][2].nom, 1e-6)),
   "Ch10: moving the base year changes real GDP and never touches nominal GDP");
// Inflation without growth: prices up, quantities down, nominal up while real falls.
const rot = M.gdpSeries({ pg: [15, 15], qg: [-5, -5], base: 0 });
ok(rot[2].nom > rot[0].nom && rot[2].real < rot[0].real,
   "Ch10: nominal GDP can rise across a period in which the economy produced less of everything");
ok(near(rot[2].defl, 100 * rot[2].nom / rot[2].real, 1e-9), "Ch10: deflator is exactly 100 × nominal / real");

// ── what GDP misses ──
const unequal = M.MISSES.find(m => m.k === "split");
ok(unequal && unequal.add === 0, "Ch10: a purely distributional change adds nothing to measured GDP");
ok(M.missTotal(100, {}) === 100, "Ch10: with nothing switched on, measured GDP is the starting figure");

// ══ Ch. 12 — production and growth ════════════════════════════════════════
ok(M.EXP.k + M.EXP.h + M.EXP.n < 1,
   "Ch12: the exponents sum to less than one — without this there are no diminishing returns and no catch-up");
// Constant returns to scale: double every input, double the output.
const y1 = M.perWorker(1, 20, 20, 20);
const scaled = M.perWorker(1, 40, 40, 40) / y1;
ok(scaled > 1 && scaled < 2, "Ch12: doubling capital, human capital and resources per worker less than doubles output per worker");
// Diminishing marginal product of capital, stated as the chapter states it.
ok(M.mpk(1, 5, 40, 40) > M.mpk(1, 50, 40, 40),
   "Ch12: an extra unit of capital does more for a worker who has little than for one who has lots");
ok(M.perWorker(1.5, 30, 40, 40) > M.perWorker(1, 30, 40, 40),
   "Ch12: better technology raises output from the same inputs");
// Resources are neither necessary nor sufficient.
ok(M.perWorker(1.6, 80, 80, 2) > M.perWorker(1, 20, 20, 90),
   "Ch12: a resource-poor economy with capital, skills and technology out-produces a resource-rich one without them");

// ── catch-up, and the caveat that kills it ──
const cfg = { A: 1, hl: 40, nl: 40, s: 20, d: 5, years: 60 };
const poor = M.growPath({ ...cfg, k0: 5 });
const rich = M.growPath({ ...cfg, k0: 50 });   // same k0 the page uses
ok(M.avgGrowth(poor.g, 10) > M.avgGrowth(rich.g, 10),
   "Ch12: same saving rate, same technology — the country starting with less capital grows faster");
ok(M.avgGrowth(poor.g, 10) > M.avgGrowth(poor.g.slice(40), 10),
   "Ch12: that faster growth is temporary — it fades as capital accumulates");
const gapPoor = M.growPath({ ...cfg, k0: 5 });
const gapRich = M.growPath({ ...cfg, k0: 50, A: 1.35 });
const closedGap = gapRich.y[60] / gapPoor.y[60];
ok(closedGap > 1.2, "Ch12: with a permanent technology gap the poor country never converges, however much it saves");
// Convergence is real and SLOW, and the slowness is not a defect to be tuned
// away — it is why "poor countries catch up" and "poor countries are still poor
// after forty years" are both true statements about the same model.
const longCfg = { ...cfg, years: 200 };
const lp = M.growPath({ ...longCfg, k0: 5 }), lr = M.growPath({ ...longCfg, k0: 60 });
const gapAt = t => lr.y[t] / lp.y[t];
ok(gapAt(10) > gapAt(30) && gapAt(30) > gapAt(60) && gapAt(60) > gapAt(150),
   "Ch12: without a technology gap the two paths converge — the ratio falls monotonically");
ok(gapAt(10) > 1.4 && gapAt(60) < 1.10 && gapAt(150) < 1.01,
   "Ch12: and convergence is slow — still a 6% gap after sixty years, effectively closed only after a century and a half");
// A higher saving rate raises the level, not the long-run growth rate.
const lowS = M.growPath({ ...cfg, k0: 20, s: 10 });
const highS = M.growPath({ ...cfg, k0: 20, s: 35 });
ok(highS.y[60] > lowS.y[60], "Ch12: a higher investment share ends at a higher level of output per worker");
ok(M.avgGrowth(highS.g.slice(50), 10) < 0.5 && M.avgGrowth(lowS.g.slice(50), 10) < 0.5,
   "Ch12: and both growth rates approach zero — saving harder does not buy permanent growth");

// ── the policy bench: every policy classified, no orphans ──
const dKeys = new Set(M.DETERM.map(d => d.k));
const hKeys = new Set(M.HORIZON.map(h => h.k));
ok(M.POLICIES.every(p => dKeys.has(p.d) && hKeys.has(p.h)), "Ch12: every policy's answer is one of the offered options");
ok(M.POLICIES.filter(p => p.d === "A").every(p => p.h === "rate"),
   "Ch12: technology policies are the ones that can raise the growth rate — the chapter's central claim");
ok(M.POLICIES.filter(p => p.d === "K" || p.d === "H").every(p => p.h === "level"),
   "Ch12: capital and human-capital policies raise the level; diminishing returns retire the growth");
ok(M.POLICIES.some(p => p.d === "BAD" && p.h === "down"), "Ch12: the inward-oriented policy is classified as lowering growth");
ok([...dKeys].every(k => M.POLICIES.some(p => p.d === k)), "Ch12: no offered determinant is a decoy that is never correct");

// ══ Ch. 13 — saving, investment and the financial system ══════════════════
// The chapter's own worked exercise (Active Learning 1A), in its own units:
// Y = 10.0, C = 6.5, G = 2.0, deficit 0.3 ⇒ T = 1.7, private 1.8, public −0.3, national 1.5.
const AL1 = M.savingAccounts(10.0, 6.5, 2.0, 1.7);
ok(near(AL1.pub, -0.3, 1e-9), "Ch13 (worked): public saving = T − G = −0.3");
ok(near(AL1.priv, 1.8, 1e-9), "Ch13 (worked): private saving = Y − T − C = 1.8");
ok(near(AL1.nat, 1.5, 1e-9), "Ch13 (worked): national saving = Y − C − G = 1.5");
ok(near(AL1.I, 1.5, 1e-9), "Ch13 (worked): investment = national saving = 1.5");
ok(near(AL1.priv + AL1.pub, AL1.nat, 1e-9), "Ch13: private + public saving is identically national saving");
// Active Learning 1B — a 0.2 tax cut, both scenarios.
const base = { Y: 10.0, C: 6.5, G: 2.0, T: 1.7 };
const saveAll = M.taxCut(base, 0.2, 1);
const a1 = M.savingAccounts(saveAll.Y, saveAll.C, saveAll.G, saveAll.T);
ok(near(a1.pub, -0.5, 1e-9), "Ch13 (worked): the tax cut takes public saving to −0.5, a deficit of 0.5");
ok(near(a1.nat, 1.5, 1e-9) && near(a1.I, 1.5, 1e-9),
   "Ch13 (worked): if households save the whole cut, national saving and investment do not move");
const saveQuarter = M.taxCut(base, 0.2, 0.25);
const a2 = M.savingAccounts(saveQuarter.Y, saveQuarter.C, saveQuarter.G, saveQuarter.T);
ok(near(a2.nat, 1.35, 1e-9) && near(a2.I, 1.35, 1e-9),
   "Ch13 (worked): if they save a quarter, national saving and investment each fall by 0.15");
ok(near(a2.pub, a1.pub, 1e-9), "Ch13: public saving falls by the size of the cut either way — behaviour changes only the private side");

// ── loanable funds: the three textbook experiments, on their textbook answers ──
const e0 = M.loanable(0, 0);
ok(near(e0.r, 5, 1e-9) && near(e0.q, 60, 1e-9), "Ch13: the market rests at r = 5% and 60 of funds");
const eSave = M.loanable(20, 0);
ok(near(eSave.r, 4, 1e-9) && near(eSave.q, 70, 1e-9), "Ch13: a saving incentive shifts supply right — r falls to 4%, quantity rises to 70");
const eInv = M.loanable(0, 20);
ok(near(eInv.r, 6, 1e-9) && near(eInv.q, 70, 1e-9), "Ch13: an investment tax credit shifts demand right — r rises to 6%, quantity rises to 70");
const eDef = M.loanable(-20, 0);
ok(near(eDef.r, 6, 1e-9) && near(eDef.q, 50, 1e-9), "Ch13: a budget deficit shifts supply left — r rises to 6%, investment crowded out to 50");
ok(eDef.q < e0.q && eDef.r > e0.r, "Ch13: crowding out is a fall in investment and a rise in the interest rate together");
ok(eSave.q > e0.q && eInv.q > e0.q && eSave.r < e0.r && eInv.r > e0.r,
   "Ch13: the two incentives move investment the same way and the interest rate opposite ways — the identifying difference");
// Supply comes from saving, demand from investment: slopes must have the stated signs.
ok(M.LFS(6, 0) > M.LFS(3, 0), "Ch13: a higher interest rate makes saving more attractive — supply slopes up");
ok(M.LFD(6, 0) < M.LFD(3, 0), "Ch13: a higher interest rate makes borrowing dearer — demand slopes down");
// The policy table must agree with the model about which curve moves.
const pol = k => M.LFPOL.find(x => x.k === k);
ok(pol("save").s > 0 && pol("save").d === 0, "Ch13: the saving incentive is wired to the supply curve");
ok(pol("invest").d > 0 && pol("invest").s === 0, "Ch13: the investment credit is wired to the demand curve");
ok(pol("deficit").s < 0 && pol("deficit").d === 0, "Ch13: the deficit is wired to supply, and leftwards");

// ══ the page tells the student what it is and is not ══════════════════════
ok(/nothing is submitted|ungraded|Nothing here is graded|no marks/i.test(TEXT) || /ungraded/i.test(HTML),
   "page states it is ungraded / nothing collected");
ok(/Ch\. 10, 12, 13/.test(TEXT), "footer names the three chapters the module is built from");
ok(!/Ch\. 15/.test(TEXT), "no leftover references to the chapter that was dropped");
ok(/site-licence\.js/.test(HTML), "licence footer script is present, as on every other page");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
