/* ════════════════════════════════════════════════════════════════════════════
   assets/os.js — the Econstellar OS layer (zero-dep vanilla JS, self-contained)

   OS-P0  System status strip : renders into <div id="os-strip"> where present.
          Cells: ENGINE (GET /health: methods + revision) · SRI (GET /api/sri/current)
          · TICK (last SRI date vs expected trading day, weekend-aware) · EVALS
          (same-origin evals.json, the OS-P3 artifact).
          Rules: ONE fetch per page-load + manual ↻ only (no polling loops);
          on failure render cached-last-good from localStorage with an explicit
          "stale" tag; with no cache, an honest "unreachable". Fixed strip height
          (no CLS); script is `defer`ed (no FCP cost).

   OS-P1  Command palette : Ctrl/Cmd+K (or the nav ⌘K button) opens a fuzzy
          palette over the 23 engine methods (deep-link research-engine.html
          #method=<name>), the site's pages, and two actions (copy engine URL,
          open the latest SRI point). Keyboard-only operable: ↑/↓ move, Enter
          activates, Esc closes; listbox/option roles + aria-activedescendant.
          Method list comes from GET /api/compute/catalog on first open (the
          catalog is the truth — K5), with a static name fallback if offline.

   Test hooks: window.__os exposes the pure pieces (fuzzy, tickState, render
   functions, palette state) so evals/os-p0.test.mjs and evals/os-p1.test.mjs
   can drive this exact file inside node:vm with stubbed fetch/DOM. Evals are
   never hand-edited to pass.
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var CE = "https://shssm-compute-b7ui3oxaqq-el.a.run.app";
  var LS_KEY = "os_strip_v1";
  /* pages under man/ set window.__manbase=1 before this script loads (defer):
     all same-site links + the evals.json fetch get a ../ prefix there */
  var BASE = (typeof window !== "undefined" && window.__manbase) ? "../" : "";

  /* ── tiny utils ─────────────────────────────────────────────────────────── */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fetchJSON(url, ms) {
    return new Promise(function (resolve, reject) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; reject(new Error("timeout")); } }, ms || 8000);
      Promise.resolve()
        .then(function () { return fetch(url); })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (j) { if (!done) { done = true; clearTimeout(t); resolve(j); } })
        .catch(function (e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
    });
  }
  function lsGet() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) { return null; } }
  function lsSet(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch (e) { } }

  /* ── trading-day state (weekend-aware; holidays settle on the next tick) ── */
  function prevWeekday(iso) {
    var d = new Date(iso + "T00:00:00Z");
    do { d.setUTCDate(d.getUTCDate() - 1); } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
    return d.toISOString().slice(0, 10);
  }
  /* lastDate = newest SRI point; todayIso = today (UTC). Returns {cls,label}.
     The nightly tick appends only SETTLED real closes (never fabricated), so
     being one trading day behind while the latest close settles is normal. */
  function tickState(lastDate, todayIso) {
    if (!lastDate) return { cls: "bad", label: "no data" };
    var expected = prevWeekday(todayIso);
    if (lastDate >= expected) return { cls: "ok", label: "current · " + lastDate };
    var gap = 0, d = expected;
    while (d > lastDate && gap < 9) { gap++; d = prevWeekday(d); }
    if (gap === 1) return { cls: "warn", label: "awaiting " + expected + " settle" };
    return { cls: "bad", label: "lagging " + gap + " trading days" };
  }

  /* ── strip rendering (pure: data → HTML) ────────────────────────────────── */
  function cellHTML(name, body, cls, href) {
    var inner = '<span class="os-k">' + name + '</span> <span class="os-v ' + (cls || "") + '">' + body + "</span>";
    return href ? '<a class="os-cell" href="' + href + '">' + inner + "</a>" : '<span class="os-cell">' + inner + "</span>";
  }
  function renderStrip(d, todayIso) {
    var hs = d.health, sri = d.sri, ev = d.evals, parts = [];
    if (hs && hs.ok) {
      var rev = hs.revision ? String(hs.revision).replace(/^shssm-compute-/, "") : null;
      parts.push(cellHTML("engine", (hs.methods != null ? hs.methods + " methods" : "?") + (rev ? " · " + esc(rev) : ""), "ok"));
    } else parts.push(cellHTML("engine", "unreachable", "bad"));
    if (sri && sri.status === "ok") {
      parts.push(cellHTML("sri", esc(sri.date) + " · " + esc(Number(sri.sri).toFixed(5)), "ok", BASE + "observatory.html"));
      var ts = tickState(sri.date, todayIso);
      parts.push(cellHTML("tick", esc(ts.label), ts.cls, BASE + "observatory.html"));
    } else {
      parts.push(cellHTML("sri", "unreachable", "bad"));
      parts.push(cellHTML("tick", "unknown", "bad"));
    }
    if (ev && ev.results && ev.results.length) {
      var pass = ev.results.filter(function (r) { return r.status === "pass"; }).length;
      var cls = pass === ev.results.length ? "ok" : "warn";
      parts.push(cellHTML("evals", pass + "/" + ev.results.length + " pass · " + esc((ev.run_at || "").slice(0, 10)), cls, BASE + "evals.html"));
    } else parts.push(cellHTML("evals", "—", "", BASE + "evals.html"));
    if (d.stale) parts.push('<span class="os-cell os-stale" title="engine unreachable — showing last good reading">stale · cached ' + esc((d.cachedAt || "").slice(0, 16).replace("T", " ")) + "Z</span>");
    parts.push('<button class="os-refresh" aria-label="Refresh status" title="Refresh">↻</button>');
    return parts.join('<span class="os-sep">·</span>');
  }

  /* one load (or manual refresh): fetch all three, fall back per-call to cache */
  function loadStrip(force) {
    var el = document.getElementById("os-strip");
    if (!el) return Promise.resolve(null);
    var todayIso = new Date().toISOString().slice(0, 10);
    var cached = lsGet() || {};
    return Promise.all([
      fetchJSON(CE + "/health", 8000).catch(function () { return null; }),
      fetchJSON(CE + "/api/sri/current", 8000).catch(function () { return null; }),
      fetchJSON(BASE + "evals.json", 8000).catch(function () { return null; })
    ]).then(function (r) {
      var fresh = { health: r[0], sri: r[1], evals: r[2] };
      var d = {
        health: fresh.health || cached.health || null,
        sri: fresh.sri || cached.sri || null,
        evals: fresh.evals || cached.evals || null,
        stale: (!fresh.health || !fresh.sri),
        cachedAt: cached.t
      };
      if (fresh.health && fresh.sri) lsSet({ t: new Date().toISOString(), health: fresh.health, sri: fresh.sri, evals: fresh.evals || cached.evals || null });
      el.innerHTML = renderStrip(d, todayIso);
      var b = el.querySelector(".os-refresh");
      if (b) b.addEventListener("click", function () { loadStrip(true); });
      return d;
    });
  }

  /* ── OS-P1: command palette ─────────────────────────────────────────────── */
  /* subsequence fuzzy match; higher = better, -1 = no match */
  function fuzzy(q, s) {
    q = q.toLowerCase(); s = s.toLowerCase();
    if (!q) return 0;
    var score = 0, si = 0, run = 0;
    for (var qi = 0; qi < q.length; qi++) {
      var found = -1;
      for (var j = si; j < s.length; j++) if (s[j] === q[qi]) { found = j; break; }
      if (found < 0) return -1;
      run = (found === si && qi > 0) ? run + 1 : 0;            // consecutive bonus
      score += 1 + run * 2 + (found === 0 ? 4 : (/\W/.test(s[found - 1] || "") ? 2 : 0));
      score -= (found - si) * 0.05;                            // gap penalty
      si = found + 1;
    }
    return score;
  }

  var PAGES = [
    { label: "Workbench — run any method", href: BASE + "research-engine.html", kind: "page" },
    { label: "The Engine — how it works", href: BASE + "engine.html", kind: "page" },
    { label: "Observatory — daily systemic-risk index", href: BASE + "observatory.html", kind: "page" },
    { label: "Eval suite — public regression checks", href: BASE + "evals.html", kind: "page" },
    { label: "Methods manual — generated from the catalog", href: BASE + "man/index.html", kind: "page" },
    { label: "Reproduce the paper", href: BASE + "reproduce.html", kind: "page" },
    { label: "Changelog — what's new", href: BASE + "changelog.html", kind: "page" },
    { label: "Research Station", href: BASE + "research-station.html", kind: "page" },
    { label: "Notebooks (in the Workbench bar)", href: BASE + "research-engine.html", kind: "page" }
  ];
  var ACTIONS = [
    { label: "Copy engine URL", kind: "action", run: function () { try { navigator.clipboard.writeText(CE); } catch (e) { } } },
    { label: "Open latest SRI point", kind: "action", run: function () { location.href = BASE + "observatory.html"; } }
  ];
  /* static fallback so the palette works offline; the live catalog replaces it on first open */
  var METHOD_NAMES = ["unit_root", "var_irf", "dfa_hurst", "garch", "wavelet", "wqte", "soch_profile", "channel_attribution", "namh_hurst", "namh_te", "vecm", "granger", "panel_unit_root", "connectedness", "network", "rolling_dcc", "wavelet_coherence", "spillover_rolling", "quantile_var", "live_unit_root", "ksg_te", "ksg_robustness", "sri_daily"];
  var methodItems = METHOD_NAMES.map(function (n) { return { label: n, sub: "method", href: BASE + "research-engine.html#method=" + n, kind: "method" }; });
  var catalogLoaded = false;
  function loadCatalogItems() {
    if (catalogLoaded) return;
    catalogLoaded = true;
    fetchJSON(CE + "/api/compute/catalog", 8000).then(function (j) {
      if (j && j.methods) methodItems = Object.keys(j.methods).map(function (n) {
        return { label: n, sub: j.methods[n].label || "method", href: BASE + "research-engine.html#method=" + n, kind: "method" };
      });
    }).catch(function () { /* fallback list stays */ });
  }

  var pal = { open: false, q: "", sel: 0, results: [] };
  function allItems() { return methodItems.concat(PAGES, ACTIONS); }
  function filterItems(q) {
    var scored = [];
    allItems().forEach(function (it) {
      var s = fuzzy(q, it.label + " " + (it.sub || ""));
      if (s >= 0) scored.push([s, it]);
    });
    scored.sort(function (a, b) { return b[0] - a[0]; });
    return scored.slice(0, 12).map(function (x) { return x[1]; });
  }
  function paletteDOM() {
    var w = document.getElementById("os-palette");
    if (w) return w;
    w = document.createElement("div");
    w.id = "os-palette";
    w.innerHTML = '<div class="osp-box" role="dialog" aria-modal="true" aria-label="Command palette">' +
      '<input class="osp-in" type="text" role="combobox" aria-expanded="true" aria-controls="osp-list" aria-activedescendant="" aria-label="Search methods, pages, actions" placeholder="Type a method, page, or action…  (Esc closes)" autocomplete="off" spellcheck="false">' +
      '<div class="osp-list" id="osp-list" role="listbox" aria-label="Results"></div>' +
      '<div class="osp-hint">↑↓ select · Enter open · Esc close · methods open in the Workbench</div></div>';
    document.body.appendChild(w);
    w.addEventListener("mousedown", function (e) { if (e.target === w) closePalette(); });
    var inp = w.querySelector(".osp-in");
    inp.addEventListener("input", function () { pal.q = inp.value; pal.sel = 0; renderPalette(); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { pal.sel = Math.min(pal.sel + 1, pal.results.length - 1); renderPalette(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { pal.sel = Math.max(pal.sel - 1, 0); renderPalette(); e.preventDefault(); }
      else if (e.key === "Enter") { activate(pal.results[pal.sel]); e.preventDefault(); }
      else if (e.key === "Escape") { closePalette(); e.preventDefault(); }
    });
    return w;
  }
  function renderPalette() {
    var w = paletteDOM(), list = w.querySelector(".osp-list");
    pal.results = filterItems(pal.q);
    list.innerHTML = pal.results.map(function (it, i) {
      return '<div class="osp-it' + (i === pal.sel ? " sel" : "") + '" id="osp-it-' + i + '" role="option" aria-selected="' + (i === pal.sel) + '" data-i="' + i + '">' +
        '<span class="osp-kind">' + esc(it.kind) + "</span>" + esc(it.label) +
        (it.sub && it.sub !== "method" ? ' <span class="osp-sub">' + esc(it.sub) + "</span>" : "") + "</div>";
    }).join("") || '<div class="osp-empty">no match</div>';
    var inp = w.querySelector(".osp-in");
    inp.setAttribute("aria-activedescendant", pal.results.length ? "osp-it-" + pal.sel : "");
    Array.prototype.forEach.call(list.querySelectorAll(".osp-it"), function (n) {
      n.addEventListener("click", function () { activate(pal.results[Number(n.getAttribute("data-i"))]); });
    });
  }
  function activate(it) {
    if (!it) return;
    closePalette();
    if (it.kind === "action") it.run();
    else if (it.href) location.href = it.href;
  }
  function openPalette() {
    loadCatalogItems();
    var w = paletteDOM();
    pal.open = true; pal.q = ""; pal.sel = 0;
    w.style.display = "flex";
    var inp = w.querySelector(".osp-in");
    inp.value = "";
    renderPalette();
    try { inp.focus(); } catch (e) { }
  }
  function closePalette() {
    var w = document.getElementById("os-palette");
    if (w) w.style.display = "none";
    pal.open = false;
  }
  function onGlobalKey(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); pal.open ? closePalette() : openPalette(); }
    else if (e.key === "Escape" && pal.open) closePalette();
  }

  /* ── self-contained CSS (injected; no FCP-blocking stylesheet) ──────────── */
  var CSS = "#os-strip{display:flex;flex-wrap:wrap;align-items:center;gap:.45rem .55rem;min-height:30px;padding:.4rem 20px;border-bottom:1px solid rgba(255,255,255,.06);font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#6b7280}" +
    "#os-strip .os-cell{color:#c9d1d9;text-decoration:none}#os-strip a.os-cell:hover{text-decoration:underline}" +
    "#os-strip .os-k{color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-size:.62rem}" +
    "#os-strip .os-v.ok{color:#00ff88}#os-strip .os-v.warn{color:#f59e0b}#os-strip .os-v.bad{color:#ef4444}" +
    "#os-strip .os-sep{color:#374151}#os-strip .os-stale{color:#f59e0b;border:1px solid rgba(245,158,11,.4);border-radius:6px;padding:0 .4rem}" +
    "#os-strip .os-refresh{margin-left:auto;background:none;border:1px solid rgba(0,212,255,.25);color:#00d4ff;border-radius:6px;cursor:pointer;font-size:.72rem;padding:.05rem .45rem}" +
    "#os-strip .os-refresh:focus,.osp-in:focus,.osp-it.sel{outline:2px solid #00d4ff;outline-offset:1px}" +
    "#os-palette{display:none;position:fixed;inset:0;background:rgba(0,0,0,.66);z-index:99;align-items:flex-start;justify-content:center;padding-top:12vh}" +
    ".osp-box{width:min(560px,92vw);background:#0a0d12;border:1px solid rgba(0,212,255,.35);border-radius:12px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.7)}" +
    ".osp-in{width:100%;box-sizing:border-box;background:#06080b;border:none;border-bottom:1px solid rgba(255,255,255,.08);color:#fff;font-family:'JetBrains Mono',monospace;font-size:.92rem;padding:.85rem 1rem}" +
    ".osp-list{max-height:46vh;overflow-y:auto}" +
    ".osp-it{padding:.55rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#c9d1d9;cursor:pointer;display:flex;gap:.6rem;align-items:baseline}" +
    ".osp-it.sel{background:rgba(0,212,255,.12);color:#fff}" +
    ".osp-kind{font-size:.62rem;text-transform:uppercase;letter-spacing:1px;color:#00d4ff;min-width:52px}" +
    ".osp-sub{color:#6b7280;font-size:.72rem}.osp-empty{padding:.8rem 1rem;color:#6b7280;font-size:.8rem}" +
    ".osp-hint{padding:.45rem 1rem;border-top:1px solid rgba(255,255,255,.06);color:#6b7280;font-size:.66rem;font-family:'JetBrains Mono',monospace}" +
    ".os-kbtn{font-family:'JetBrains Mono',monospace;font-size:.7rem;background:none;border:1px solid rgba(0,212,255,.25);color:#00d4ff;border-radius:6px;cursor:pointer;padding:.1rem .5rem}";

  function boot() {
    try {
      var st = document.createElement("style");
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) { }
    document.addEventListener("keydown", onGlobalKey);
    var kb = document.getElementById("os-kbtn");
    if (kb) kb.addEventListener("click", function () { openPalette(); });
    loadStrip(false);
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  /* test hooks (driven by evals/os-p0.test.mjs + evals/os-p1.test.mjs in node:vm) */
  if (typeof window !== "undefined") window.__os = {
    CE: CE, fuzzy: fuzzy, tickState: tickState, prevWeekday: prevWeekday,
    renderStrip: renderStrip, loadStrip: loadStrip, filterItems: filterItems,
    openPalette: openPalette, closePalette: closePalette, activate: activate,
    pal: pal, boot: boot
  };
})();
