// _dom-stub.mjs — minimal zero-dep DOM/window stub so assets/os.js can run in node:vm.
// Just enough surface for the strip + palette code paths; not a general DOM.
export function makeEnv({ fetchImpl, store = {}, hrefSink = {} } = {}) {
  function El(tag) {
    const el = {
      tagName: (tag || "div").toUpperCase(), id: "", _html: "", textContent: "",
      style: {}, attrs: {}, children: [], listeners: {}, value: "",
      get innerHTML() { return el._html; },
      set innerHTML(v) { el._html = String(v); el.children = []; },
      setAttribute(k, v) { el.attrs[k] = String(v); },
      getAttribute(k) { return k in el.attrs ? el.attrs[k] : null; },
      appendChild(c) { el.children.push(c); c.parent = el; return c; },
      addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
      dispatch(t, ev) { (el.listeners[t] || []).forEach(fn => fn(ev || {})); },
      // naive selector support for the exact selectors os.js uses
      querySelector(sel) { return findAll(el, sel)[0] || null; },
      querySelectorAll(sel) { return findAll(el, sel); },
      focus() { el.focused = true; },
      classList: { contains: () => false, add() { }, remove() { } },
    };
    return el;
  }
  // os.js sets innerHTML strings; we don't parse them. For querySelector on
  // containers whose content was set via innerHTML, return synthetic elements
  // keyed by class so event wiring doesn't crash.
  function findAll(root, sel) {
    const cls = sel.startsWith(".") ? sel.slice(1) : null;
    const out = [];
    (function walk(n) {
      for (const c of n.children || []) {
        if (cls && (c.className || "").split(/\s+/).includes(cls)) out.push(c);
        walk(c);
      }
    })(root);
    // synthesize one element for class selectors inside innerHTML-only containers
    if (!out.length && cls && root._html && root._html.includes(cls)) {
      const syn = El("div"); syn.className = cls; root.children.push(syn); out.push(syn);
    }
    return out;
  }
  const byId = {};
  const documentStub = {
    readyState: "complete",
    head: El("head"),
    body: El("body"),
    listeners: {},
    createElement: t => El(t),
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
    dispatch(t, ev) { (this.listeners[t] || []).forEach(fn => fn(ev || {})); },
    getElementById(id) { return byId[id] || null; },
    register(id, el) { el.id = id; byId[id] = el; el.querySelector = el.querySelector; return el; },
  };
  // document.body.appendChild registers palette wrapper by id
  const origAppend = documentStub.body.appendChild.bind(documentStub.body);
  documentStub.body.appendChild = el => { if (el.id) byId[el.id] = el; return origAppend(el); };

  const localStorageStub = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
  const windowStub = {};
  const env = {
    window: windowStub,
    document: documentStub,
    localStorage: localStorageStub,
    navigator: { clipboard: { writeText(s) { hrefSink.copied = s; } } },
    location: { get href() { return hrefSink.href || ""; }, set href(v) { hrefSink.href = v; }, hash: "" },
    fetch: fetchImpl || (() => Promise.reject(new Error("no fetch stubbed"))),
    setTimeout, clearTimeout, Promise, Date, JSON, Math, Array, Object, String, Number, RegExp, Error, console,
  };
  windowStub.window = windowStub;
  return { env, byId, El, hrefSink, store };
}

export function jsonResponse(obj) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(obj) });
}
export function failResponse() {
  return Promise.reject(new Error("network down"));
}
