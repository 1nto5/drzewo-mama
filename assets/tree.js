/* Interaktywne drzewo: graf rodziny w SVG, pan + zoom (mysz, kółko, pinch), panel osoby.
   Układ: linia prosta to pionowa oś (mężczyzna po lewej, żona po prawej, najstarsi u góry).
   Rodzeństwo przodków i ich potomkowie rozchodzą się w lewo, rodziny żon w prawo.
   Dzieci-liście (bez małżonków i dzieci) układają się w kolumny jak w `tree`. */
(function () {
  "use strict";
  const A = window.APP, D = A.D;
  const W = 136, H = 56, SG = 14, GX = 16, ROW = 124, STK = 64, STKMAX = 4, IND = 18, BUS = 26, GAPY = 6;
  const TOPGEN = Math.max(...D.generations.map(g => g.n));
  const rowY = level => (TOPGEN - level) * ROW;
  const AXIS = D.generations.slice().sort((a, b) => b.n - a.n);
  const axisSet = new Set(AXIS.flatMap(g => [g.man, g.woman]));
  const NS = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const svg = document.getElementById("tree");
  const stage = document.getElementById("stage");
  const vp = svg.querySelector("#vp");
  const gNodes = svg.querySelector("#nodes");
  let gEdges = svg.querySelector("#edges");
  const ruler = document.getElementById("ruler");
  const panel = document.getElementById("panel");

  /* ── widoczność ─────────────────────────────── */
  function visibleSet(mode) {
    const v = new Set(A.direct);
    if (mode === "prosta") return v;
    if (mode === "rodzenstwo") {
      for (const id of A.direct) for (const c of A.children(id)) v.add(c);
      for (const id of [...v]) if (!A.direct.has(id)) for (const s of A.spouses(id)) v.add(s.id);
      return v;
    }
    return new Set(D.people.map(p => p.id));
  }
  const linkCls = id => { const p = A.byId.get(id); return p.parentsCert || (p.certainty === "ok" ? "" : p.certainty); };

  /* ── układ ──────────────────────────────────── */
  function shift(b, dx) {
    for (const n of b.nodes) n.x += dx;
    for (const e of b.edges) for (const pt of e.pts) pt[0] += dx;
    if (b.attach) for (const a of b.attach) a.x += dx;
  }
  function connect(edges, ax, ay, a) {
    const busY = a.y - (a.bus || BUS);
    edges.push({ cls: a.cls, label: a.label, pts: [[ax, ay], [ax, busY], [a.x, busY], [a.x, a.stackEnd != null ? a.stackEnd : a.y]] });
  }
  function isLeaf(id, vis) {
    return !A.spouses(id).some(s => vis.has(s.id) && !axisSet.has(s.id)) && !A.children(id).some(k => vis.has(k) && !A.direct.has(k));
  }
  function items(kidIds, level, vis) {
    const out = []; let run = [];
    const flush = () => {
      if (run.length === 1) out.push({ root: run[0], block: fam(run[0], level, vis) });
      else for (let i = 0; i < run.length; i += STKMAX) out.push({ stack: run.slice(i, i + STKMAX) });
      run = [];
    };
    for (const c of kidIds) { if (isLeaf(c, vis)) run.push(c); else { if (run.length) flush(); out.push({ root: c, block: fam(c, level, vis) }); } }
    if (run.length) flush();
    return out;
  }
  // rząd dzieci (grupy wg drugiego rodzica); współrzędne względne, x od 0
  function row(groups, level, vis) {
    const nodes = [], edges = [], attach = [];
    const cy = rowY(level);
    let x = 0;
    groups.forEach((g, gi) => {
      for (const it of items(g.kids, level, vis)) {
        if (it.stack) {
          const x0 = x, sx = x0 + 6; let end = cy;
          it.stack.forEach((c, i) => {
            const ny = cy + i * STK;
            nodes.push({ id: c, x: x0 + IND, y: ny });
            edges.push({ cls: linkCls(c), pts: [[sx, ny + H / 2], [x0 + IND, ny + H / 2]] });
            end = ny + H / 2;
          });
          attach.push({ gi, x: sx, y: cy, stackEnd: end, cls: linkCls(it.stack[0]) });
          x += IND + W;
        } else {
          const b = it.block;
          for (const n of b.nodes) nodes.push({ id: n.id, x: n.x + x, y: n.y });
          for (const e of b.edges) edges.push({ cls: e.cls, pts: e.pts.map(([px, py]) => [px + x, py]) });
          attach.push({ gi, x: x + b.rootX + W / 2, y: cy, cls: linkCls(it.root) });
          x += b.w;
        }
        x += GX;
      }
    });
    return { nodes, edges, attach, w: Math.max(0, x - GX) };
  }
  // rodzina: osoba + małżonkowie w jednym rzędzie, dzieci pod spodem
  function fam(id, level, vis) {
    const sp = A.spouses(id).map(s => s.id).filter(s => vis.has(s) && !axisSet.has(s));
    const unit = sp.length === 2 ? [sp[0], id, sp[1]] : [id, ...sp];
    const y = rowY(level);
    const nodes = unit.map((u, i) => ({ id: u, x: i * (W + SG), y }));
    const edges = [];
    for (let i = 0; i < unit.length - 1; i++) edges.push({ cls: "marr", pts: [[(i + 1) * W + i * SG, y + H / 2], [(i + 1) * (W + SG), y + H / 2]] });
    const uw = unit.length * W + (unit.length - 1) * SG;
    const kidsAll = A.children(id).filter(c => vis.has(c) && !A.direct.has(c));
    const other = c => A.parents(c).find(x => x !== id) || null;
    const groups = [];
    for (const s of sp) { const ks = kidsAll.filter(c => other(c) === s); if (ks.length) groups.push({ sp: s, kids: ks }); }
    const rest = kidsAll.filter(c => !sp.includes(other(c)));
    if (rest.length) groups.push({ sp: null, kids: rest });
    if (groups.length) {
      const r = row(groups, level - 1, vis);
      shift(r, uw / 2 - r.w / 2);
      const xOf = u => nodes.find(n => n.id === u).x;
      for (const a of r.attach) {
        const g = groups[a.gi];
        const ax = g.sp ? (Math.min(xOf(id), xOf(g.sp)) + W + Math.max(xOf(id), xOf(g.sp))) / 2 : xOf(id) + W / 2;
        connect(edges, ax, y + (g.sp ? H / 2 : H), a);
      }
      nodes.push(...r.nodes); edges.push(...r.edges);
    }
    const minX = Math.min(...nodes.map(n => n.x));
    const b = { nodes, edges };
    shift(b, -minX);
    b.w = Math.max(...nodes.map(n => n.x + W));
    b.rootX = nodes.find(n => n.id === id).x;
    return b;
  }
  function place(b, side, placed) {
    let dx = side === "L" ? Infinity : -Infinity;
    for (const n of b.nodes) for (const p of placed) {
      if (n.y < p.y + H + GAPY && p.y < n.y + H + GAPY) {
        if (side === "L") dx = Math.min(dx, p.x - GX - (n.x + W));
        else dx = Math.max(dx, p.x + W + GX - n.x);
      }
    }
    if (!isFinite(dx)) dx = side === "L" ? -W - SG / 2 - GX - b.w : W + SG / 2 + GX;
    shift(b, dx);
    placed.push(...b.nodes);
  }

  function layout(mode) {
    const vis = visibleSet(mode);
    const nodes = [], edges = [], placed = [];
    const manX = -W - SG / 2, womanX = SG / 2;
    for (const g of AXIS) {
      const y = rowY(g.n);
      nodes.push({ id: g.man, x: manX, y }, { id: g.woman, x: womanX, y });
      edges.push({ cls: "marr", pts: [[manX + W, y + H / 2], [womanX, y + H / 2]] });
      const up = AXIS.find(x => x.n === g.n + 1);
      if (up) {
        const ay = rowY(up.n) + H / 2, busY = y - BUS, cx = manX + W / 2;
        edges.push({ cls: "axis " + linkCls(g.man), pts: [[0, ay], [0, busY], [cx, busY], [cx, y]] });
      }
    }
    placed.push(...nodes);
    // lewa strona: pozostałe dzieci przodków, od najmłodszego pokolenia w górę
    for (const g of AXIS.slice().reverse()) {
      const kids = [...new Set([...A.children(g.man), ...A.children(g.woman)])].filter(c => vis.has(c) && !A.direct.has(c)).sort((a, b) => ((A.byId.get(a).born || {}).y || 9999) - ((A.byId.get(b).born || {}).y || 9999));
      if (!kids.length) continue;
      const r = row([{ kids }], g.n - 1, vis);
      place(r, "L", placed);
      for (const a of r.attach) connect(r.edges, 0, rowY(g.n) + H / 2, a);
      nodes.push(...r.nodes); edges.push(...r.edges);
    }
    // prawa strona: przodkowie żon (rodzice, dziadkowie…), od najstarszych pokoleń osi
    const ancestors = (child, level, cx) => {
      const alts = A.altParents(child);
      if (alts.length) {
        // dwie (lub więcej) możliwe pary rodziców: każda osobno, linia przerywana i etykieta ścieżki
        alts.forEach((alt, i) => {
          const ps = alt.parents.filter(p => vis.has(p) && !axisSet.has(p));
          if (!ps.length) return;
          const root = ps.find(p => A.byId.get(p).sex === "m") || ps[0];
          const b = fam(root, level + 1, vis);
          place(b, "R", placed);
          const xs = b.nodes.filter(n => ps.includes(n.id)).map(n => n.x);
          const ax = xs.length === 2 ? (Math.min(...xs) + W + Math.max(...xs)) / 2 : xs[0] + W / 2;
          connect(b.edges, ax, rowY(level + 1) + (xs.length === 2 ? H / 2 : H), { x: cx + W / 2, y: rowY(level), cls: alt.c || "prawd", bus: BUS + 14 * i, label: alt.label });
          nodes.push(...b.nodes); edges.push(...b.edges);
          for (const p of ps) { const n = b.nodes.find(n => n.id === p); if (n) ancestors(p, level + 1, n.x); }
        });
        return;
      }
      const ps = A.parents(child).filter(p => vis.has(p) && !axisSet.has(p));
      if (!ps.length) return;
      const root = ps.find(p => A.byId.get(p).sex === "m") || ps[0];
      const b = fam(root, level + 1, vis);
      place(b, "R", placed);
      const xs = b.nodes.filter(n => ps.includes(n.id)).map(n => n.x);
      const ax = xs.length === 2 ? (Math.min(...xs) + W + Math.max(...xs)) / 2 : xs[0] + W / 2;
      connect(b.edges, ax, rowY(level + 1) + (xs.length === 2 ? H / 2 : H), { x: cx + W / 2, y: rowY(level), cls: linkCls(child) });
      nodes.push(...b.nodes); edges.push(...b.edges);
      for (const p of ps) { const n = b.nodes.find(n => n.id === p); if (n) ancestors(p, level + 1, n.x); }
    };
    for (const g of AXIS) ancestors(g.woman, g.n, womanX);
    return { nodes, edges };
  }

  /* ── rysowanie ──────────────────────────────── */
  const el = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const trunc = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;
  const nodeEls = new Map();
  function makeNode(p) {
    const g = el("g", { class: `node l-${p.line} c-${p.certainty}`, "data-id": p.id, tabindex: "0", role: "button",
      "aria-label": `${A.fullName(p)}${A.rel(p.id) ? ", " + A.rel(p.id) : ""}${A.lifeShort(p) ? ", " + A.lifeShort(p) : ""}, ${A.CERT[p.certainty]}` });
    g.append(el("rect", { class: "box", width: W, height: H }));
    const c = p.gen === 1 && p.certainty === "ok" ? "me" : p.certainty;
    if (c === "prawd") { g.append(el("rect", { class: "m-prawd-a", x: 10, y: 9, width: 4.5, height: 9 }), el("rect", { class: "m-prawd-b", x: 10.5, y: 9.5, width: 8, height: 8 })); }
    else g.append(el("rect", { class: "m-" + c, x: 10, y: 9, width: c === "hyp" ? 8 : 9, height: c === "hyp" ? 8 : 9, transform: c === "hyp" ? "translate(.5 .5)" : "" }));
    const t1 = el("text", { class: "n1", x: 26, y: 18 }); t1.textContent = trunc(p.given, 13);
    const t2 = el("text", { class: "n2", x: 10, y: 34 }); t2.textContent = trunc(p.maiden || p.surname || "", 17);
    const t3 = el("text", { class: "n3", x: 10, y: 48 }); t3.textContent = p.private ? (p.gen === 1 ? "dziadkowie" : "") : A.lifeShort(p);
    const tt = el("title"); tt.textContent = A.fullName(p) + (A.rel(p.id) ? " — " + A.rel(p.id) : "");
    g.append(t1, t2, t3, tt);
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(p.id, true); } });
    return g;
  }
  const pathD = pts => "M" + pts.map(p => p[0] + "," + p[1]).join("L");
  let current = null; // { nodes, edges, pos: Map }
  function render(lay, animate) {
    const pos = new Map(lay.nodes.map(n => [n.id, n]));
    for (const [id, g] of nodeEls) if (!pos.has(id)) { g.remove(); nodeEls.delete(id); }
    const fresh = [];
    for (const n of lay.nodes) {
      let g = nodeEls.get(n.id);
      if (!g) { g = makeNode(A.byId.get(n.id)); nodeEls.set(n.id, g); gNodes.append(g); if (animate && !reduce) { g.classList.add("enter"); fresh.push(g); } }
      g.style.transform = `translate(${n.x}px, ${n.y}px)`;
    }
    const ge = el("g", { id: "edges", class: "edges" + (animate && !reduce ? " enter" : "") });
    for (const e of lay.edges) {
      ge.append(el("path", { class: "edge " + e.cls, d: pathD(e.pts) }));
      if (e.label) { const t = el("text", { class: "edge-label", x: e.pts[0][0] + 6, y: e.pts[1][1] - 5 }); t.textContent = e.label + " · " + (A.CERT[e.cls] || ""); ge.append(t); }
    }
    gEdges.replaceWith(ge); gEdges = ge;
    if (fresh.length || ge.classList.contains("enter")) requestAnimationFrame(() => requestAnimationFrame(() => { fresh.forEach(g => g.classList.remove("enter")); ge.classList.remove("enter"); }));
    if (selected) { const g = nodeEls.get(selected); if (g) g.classList.add("sel"); }
    current = { ...lay, pos };
  }

  /* ── widok: pan + zoom ──────────────────────── */
  let k = 1, tx = 0, ty = 0, raf = 0;
  const clampK = v => Math.min(2.4, Math.max(0.12, v));
  function apply() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      vp.setAttribute("transform", `translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${k.toFixed(4)})`);
      for (const lab of ruler.children) lab.style.transform = `translateY(${(ty + (rowY(+lab.dataset.n) + H / 2) * k).toFixed(1)}px)`;
    });
  }
  function zoomAt(px, py, f) {
    const k2 = clampK(k * f);
    tx = px - (px - tx) * (k2 / k); ty = py - (py - ty) * (k2 / k); k = k2; apply();
  }
  const size = () => ({ w: stage.clientWidth, h: stage.clientHeight });
  const mobile = () => matchMedia("(max-width: 760px)").matches;
  function centerOn(id, kk) {
    const n = current.pos.get(id); if (!n) return;
    const { w, h } = size();
    if (kk) k = kk;
    const yFrac = mobile() && !panel.hidden ? 0.22 : 0.42;
    const panelW = !mobile() && !panel.hidden ? panel.offsetWidth : 0;
    tx = (w - panelW) / 2 - (n.x + W / 2) * k;
    ty = h * yFrac - (n.y + H / 2) * k;
    apply();
  }
  function fit() {
    const xs = current.nodes.map(n => n.x), ys = current.nodes.map(n => n.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs) + W, y0 = Math.min(...ys), y1 = Math.max(...ys) + H;
    const s = size(), open = !panel.hidden;
    const w = s.w - (open && !mobile() ? panel.offsetWidth : 0), h = s.h - (open && mobile() ? panel.offsetHeight : 0);
    k = clampK(Math.min((w - 60) / (x1 - x0), (h - 60) / (y1 - y0)));
    tx = (w - (x1 - x0) * k) / 2 - x0 * k; ty = (h - (y1 - y0) * k) / 2 - y0 * k;
    apply();
  }
  function home() {
    const { w, h } = size();
    const contentH = rowY(1) + H;
    k = mobile() ? 1 : Math.max(0.62, Math.min(1, (h - 70) / contentH));
    tx = mobile() ? w / 2 + 22 : w * (mode === "prosta" ? 0.5 : 0.6);
    ty = 44;
    apply();
  }

  const ptrs = new Map();
  let moved = 0, downNode = null;
  svg.addEventListener("pointerdown", e => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { moved = 0; downNode = e.target.closest && e.target.closest(".node"); } else downNode = null;
    svg.classList.add("dragging");
  });
  svg.addEventListener("pointermove", e => {
    const prev = ptrs.get(e.pointerId); if (!prev) return;
    if (ptrs.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      tx += dx; ty += dy; moved += Math.abs(dx) + Math.abs(dy);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); apply();
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d0 = Math.hypot(a.x - b.x, a.y - b.y), m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [c, d] = [...ptrs.values()];
      const d1 = Math.hypot(c.x - d.x, c.y - d.y), m1 = { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
      const r = svg.getBoundingClientRect();
      tx += m1.x - m0.x; ty += m1.y - m0.y;
      if (d0 > 0) zoomAt(m1.x - r.left, m1.y - r.top, d1 / d0); else apply();
      moved += 99;
    }
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (!ptrs.size) {
      svg.classList.remove("dragging");
      if (e.type === "pointerup" && downNode && moved < 8) select(downNode.dataset.id, false);
      downNode = null;
    }
  };
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", up);
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018)));
    } else { tx -= e.deltaX; ty -= e.deltaY; apply(); }
  }, { passive: false });
  document.getElementById("zin").addEventListener("click", () => { const { w, h } = size(); zoomAt(w / 2, h / 2, 1.3); });
  document.getElementById("zout").addEventListener("click", () => { const { w, h } = size(); zoomAt(w / 2, h / 2, 1 / 1.3); });
  document.getElementById("zfit").addEventListener("click", fit);
  document.getElementById("zhome").addEventListener("click", home);

  /* ── panel osoby ────────────────────────────── */
  let selected = null;
  const LINE = { prosta: "linia prosta", boczna: "krewny", powinowaci: "powinowaty" };
  function relList(title, ids, extra) {
    if (!ids.length) return "";
    return `<div class="sec"><h3>${title}</h3><ul class="rel-list">${ids.map(id => { const p = A.byId.get(id); return `<li>${A.mark(p.certainty === "ok" && p.gen === 1 ? "me" : p.certainty)}<button type="button" data-go="${id}">${A.esc(A.fullName(p))}</button>${A.rel(id) ? ` <span class="rel">${A.esc(A.rel(id))}</span>` : ""}${extra ? extra(id) : ""}</li>`; }).join("")}</ul></div>`;
  }
  function panelHTML(id) {
    const p = A.byId.get(id), g = A.genFor(id);
    const lines = [];
    if (!p.private) {
      if (p.born && (p.born.y || p.born.date || p.born.place || p.born.text)) lines.push(["ur.", A.dateStr(p.born)]);
      if (p.died) lines.push(["zm.", A.dateStr(p.died)]);
    }
    for (const s of A.spouses(id)) if (s.married) lines.push(["ślub", A.dateStr(s.married) + " — " + A.fullName(A.byId.get(s.id))]);
    const alts = A.altParents(id);
    const pc = p.parentsCert ? `<p class="small muted">${A.mark(p.parentsCert)}powiązanie z rodzicami: ${A.CERT[p.parentsCert]}${alts.length ? ` — ${alts.length === 2 ? "dwie możliwe ścieżki" : alts.length + " możliwe ścieżki"}` : ""}</p>` : "";
    const altBlocks = alts.map(a => relList(`Rodzice — ścieżka ${A.esc(a.key)} (${A.CERT[a.c]})`, a.parents) + relList(`Rodzeństwo — ścieżka ${A.esc(a.key)}`, A.children(a.parents[0]).filter(c => c !== id))).join("");
    const facts = (p.facts || []).map(A.fact);
    const acts = A.actsFor(id);
    return `<button class="panel-close" type="button" aria-label="Zamknij">✕</button>
      <div class="gn">${g ? "pokolenie " + g.n + " · " : ""}${LINE[p.line]}</div>
      <h2>${A.esc(p.given + (p.surname ? " " + p.surname : ""))}</h2>
      ${p.maiden ? `<div class="maiden">${A.esc(p.maiden)}</div>` : ""}
      ${A.rel(id) ? `<p class="relline">${A.FOR}: ${A.esc(A.rel(id))}</p>` : ""}
      <div class="mt-2">${A.certBadge(p.certainty)}</div>
      ${lines.length ? `<div class="life">${lines.map(([a, b]) => `<div><b>${a}</b>${A.esc(b)}</div>`).join("")}</div>` : ""}
      ${pc}
      ${p.burial ? `<p class="small burial-line"><b>Pochówek</b> ${A.burial(p.burial, true)}</p>` : ""}
      ${facts.length ? `<div class="sec"><h3>Fakty</h3><ul class="facts">${facts.map(f => `<li>${f}</li>`).join("")}</ul></div>` : ""}
      ${g && g.facts ? `<div class="sec"><h3>Pokolenie ${g.n}</h3><ul class="facts">${g.facts.map(f => `<li>${A.esc(f)}</li>`).join("")}</ul></div>` : ""}
      ${alts.length ? "" : relList("Rodzice", A.parents(id))}
      ${relList("Małżonkowie", A.spouses(id).map(s => s.id))}
      ${relList("Dzieci", A.children(id))}
      ${alts.length ? altBlocks : relList("Rodzeństwo", A.siblings(id))}
      ${acts.length ? `<div class="sec"><h3>Akty (${acts.length})</h3><ul class="act-mini">${acts.map(a => `<li><span class="k">${A.esc(a.k)}</span><a href="${A.APAGE}#${a.id}">${a.y} · ${A.esc(a.t)}</a></li>`).join("")}</ul></div>` : ""}
      ${D.personPage ? "" : `<p class="go"><a class="btn" href="osoba.html?id=${encodeURIComponent(id)}">Otwórz stronę osoby</a></p>`}`;
  }
  function select(id, center) {
    if (!A.byId.get(id)) return;
    if (!current.pos.has(id)) setMode("wszyscy");
    if (selected) { const o = nodeEls.get(selected); if (o) o.classList.remove("sel"); }
    selected = id;
    const g = nodeEls.get(id); if (g) g.classList.add("sel");
    panel.innerHTML = panelHTML(id);
    panel.hidden = false;
    panel.scrollTop = 0;
    if (center || mobile()) centerOn(id);
    syncURL();
  }
  function closePanel() {
    if (selected) { const o = nodeEls.get(selected); if (o) { o.classList.remove("sel"); } }
    const last = selected; selected = null;
    panel.hidden = true; syncURL();
    const g = last && nodeEls.get(last); if (g) g.focus({ preventScroll: true });
  }
  panel.addEventListener("click", e => {
    if (e.target.closest(".panel-close")) return closePanel();
    const b = e.target.closest("[data-go]"); if (b) select(b.dataset.go, true);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) closePanel(); });

  /* ── tryby, wyszukiwarka, URL ───────────────── */
  let mode = "rodzenstwo";
  const MODES = ["prosta", "rodzenstwo", "wszyscy"];
  const chips = [...document.querySelectorAll("[data-mode]")];
  function setMode(m, initial) {
    if (!MODES.includes(m)) m = "rodzenstwo";
    mode = m;
    chips.forEach(c => c.setAttribute("aria-pressed", String(c.dataset.mode === m)));
    render(layout(m), !initial);
    syncURL();
  }
  // po zmianie trybu: jeśli w kadrze nie ma żadnej osoby, wróć do osi
  function inView() {
    const { w, h } = size();
    return current.nodes.some(n => { const x = tx + n.x * k, y = ty + n.y * k; return x + W * k > 0 && x < w && y + H * k > 0 && y < h; });
  }
  chips.forEach(c => c.addEventListener("click", () => { setMode(c.dataset.mode); if (!inView()) home(); }));
  function syncURL() {
    const q = new URLSearchParams();
    if (mode !== defaultMode()) q.set("tryb", mode);
    if (selected) q.set("id", selected);
    const s = q.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
  }
  const defaultMode = () => mobile() ? "prosta" : "rodzenstwo";

  const dl = document.getElementById("osoby-list");
  const label = p => A.fullName(p) + (A.lifeShort(p) ? ` (${A.lifeShort(p)})` : "");
  const byLabel = new Map();
  for (const p of D.people.slice().sort((a, b) => a.given.localeCompare(b.given, "pl"))) {
    let l = label(p); if (byLabel.has(l)) l += " · " + p.id;
    byLabel.set(l, p.id);
    const o = document.createElement("option"); o.value = l; dl.append(o);
  }
  const search = document.getElementById("szukaj");
  const go = () => {
    const v = search.value.trim(); if (!v) return;
    let id = byLabel.get(v);
    if (!id) { const low = v.toLowerCase(); const hit = [...byLabel.keys()].find(l => l.toLowerCase().startsWith(low)) || [...byLabel.keys()].find(l => l.toLowerCase().includes(low)); if (hit) id = byLabel.get(hit); }
    if (id) { select(id, true); search.blur(); }
  };
  search.addEventListener("change", go);
  search.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } });

  /* ── linijka pokoleń ────────────────────────── */
  ruler.innerHTML = AXIS.map(g => `<div class="rl" data-n="${g.n}"><b>${g.n}</b><span>${A.esc(g.yr.replace("ok. ", "~"))}</span></div>`).join("");

  /* ── start ──────────────────────────────────── */
  function sizeStage() { stage.style.setProperty("--stage-top", stage.getBoundingClientRect().top + "px"); }
  sizeStage();
  addEventListener("resize", () => { sizeStage(); apply(); });
  const q = new URLSearchParams(location.search);
  setMode(q.get("tryb") || defaultMode(), true);
  home();
  const qid = q.get("id");
  if (qid && A.byId.get(qid)) select(qid, true);
  window.TREE = { select, setMode, fit, home, zoomAt, get view() { return { k, tx, ty }; } };
})();
