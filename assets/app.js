/* Wspólne: nawigacja, motyw, indeksy grafu i helpery renderu. Bez zależności. */
(function () {
  "use strict";
  const D = window.DRZEWO;

  /* ── tekst ─────────────────────────────────────── */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    const w = n === 1 ? one : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? few : many;
    return n + " " + w;
  };

  /* ── indeksy ───────────────────────────────────── */
  const byId = new Map(D.people.map(p => [p.id, p]));
  const actById = new Map(D.acts.map(a => [a.id, a]));
  const srcById = new Map(D.sources.map(s => [s.id, s]));
  const kids = new Map();
  const marr = new Map(); // id -> [{id, married}]
  // altParents: każda para to możliwa ścieżka; do grafu (dzieci, przodkowie, pokrewieństwo) wchodzą wszystkie
  const altSets = id => ((byId.get(id) || {}).altParents || []);
  const allParents = p => [...new Set([...(p.parents || []), ...(p.altParents || []).flatMap(a => a.parents)])];
  for (const p of D.people) {
    for (const par of allParents(p)) { if (!kids.has(par)) kids.set(par, []); kids.get(par).push(p.id); }
    for (const s of p.spouses || []) {
      const add = (a, b) => { if (!marr.has(a)) marr.set(a, []); if (!marr.get(a).some(x => x.id === b)) marr.get(a).push({ id: b, married: s.married || null }); };
      add(p.id, s.id); add(s.id, p.id);
    }
  }
  const byYear = (a, b) => (by(a) - by(b));
  const by = id => { const p = byId.get(id); return (p && p.born && p.born.y) || 9999; };
  for (const [k, v] of kids) v.sort(byYear);

  const person = id => byId.get(id);
  const children = id => (kids.get(id) || []).slice();
  const spouses = id => (marr.get(id) || []).slice();
  const parents = id => { const p = byId.get(id); return p ? allParents(p) : []; };
  const altParents = id => altSets(id).slice();
  // ścieżka (klucz pary z altParents), przez którą osoba łączy się z rodziną; null = poza ścieżkami
  const altOf = (child, par) => { const a = altSets(child).find(x => x.parents.includes(par)); return a || null; };
  const siblings = id => {
    const ps = parents(id); const out = new Set();
    for (const par of ps) for (const c of children(par)) if (c !== id) out.add(c);
    return [...out].sort(byYear);
  };
  const actsFor = id => D.acts.filter(a => a.osoby.includes(id)).sort((a, b) => a.y - b.y || (a.osoby[0] === id ? -1 : 1));
  const triviaFor = id => D.trivia.filter(t => (t.people || []).includes(id));
  const genFor = id => D.generations.find(g => g.man === id || g.woman === id);

  // przodkowie dziadków = linia prosta
  const direct = new Set();
  (function walk(ids) { for (const id of ids) { if (!id || direct.has(id)) continue; direct.add(id); walk(parents(id)); } })(D.anchors || ["marian", "henryka"]);

  /* ── pokrewieństwo z perspektywy Adriana ─────────
     Adrian (wirtualny węzeł) = wnuk Mariana i Henryki. dist = liczba pokoleń od Adriana:
     2 dziadek, 3 pradziadek, 4 prapradziadek, 5+ „(dist−2)× pradziadek”. Rodzica Adriana nie pokazujemy. */
  /* Odwiedzający (V): domyślnie Adrian = 2 pokolenia pod Marianem i Henryką. Inny członek rodziny wybiera
     najbliższego przodka z drzewa (anchors) i ile pokoleń jest pod nim (k); zapis tylko w tej przeglądarce. */
  /* Drugie drzewo (np. drzewo-mama.html) podaje w danych: anchors, gp ({ gen: "Ryszarda i Zofii", nom: "Ryszard i Zofia" }),
     viewerKey, personPage, pages — dzięki temu oba drzewa mają osobne dane i osobny wybór odwiedzającego. */
  const GP = D.gp || { gen: "Mariana i Henryki", nom: "Mariana i Henryki" }, VKEY = D.viewerKey || "aa_viewer", PPAGE = D.personPage || "osoba.html", APAGE = D.actsPage || "akty.html", CPAGE = D.triviaPage || "ciekawostki.html";
  const VDEF = { anchors: D.anchors || ["marian", "henryka"], k: 2, name: "", def: true };
  let V = VDEF;
  try {
    const s = JSON.parse(localStorage.getItem(VKEY) || "null");
    if (s && Array.isArray(s.anchors) && s.anchors.length && s.anchors.every(a => byId.has(a)) && s.k >= 1 && s.k <= 12)
      V = { anchors: s.anchors, k: s.k | 0, name: String(s.name || "").slice(0, 40), def: false };
  } catch (e) {}
  const FOR = V.def ? "dla wnuka " + GP.gen : "dla Ciebie", TO = V.def ? "do wnuka " + GP.gen : "do Ciebie";
  const dist = new Map(), pathOf = new Map(); // pathOf: id przodka -> para z altParents (ścieżka A/B)
  (function () {
    const q = V.anchors.map(a => [a, V.k, null]);
    while (q.length) {
      const [id, d, path] = q.shift();
      if (dist.has(id) && dist.get(id) <= d) continue;
      dist.set(id, d); if (path) pathOf.set(id, path);
      for (const p of (byId.get(id) || {}).parents || []) q.push([p, d + 1, path]);
      for (const a of altSets(id)) for (const p of a.parents) q.push([p, d + 1, path || a]);
    }
  })();
  const pathTag = a => ` (ścieżka ${a.key}, ${CERT[a.c] || a.c})`;
  const ANC = (d, sex, c) => {
    if (d === 1) { if (c === "pl") return "rodzice"; if (c === "plgen") return "rodziców"; const r = sex === "f" ? ["mama", "mamy"] : ["tata", "taty"]; return c === "gen" ? r[1] : r[0]; }
    if (c === "pl") return d === 2 ? "dziadkowie" : d === 3 ? "pradziadkowie" : d === 4 ? "prapradziadkowie" : `${d - 2}× pradziadkowie`;
    if (c === "plgen") return d === 2 ? "dziadków" : d === 3 ? "pradziadków" : d === 4 ? "prapradziadków" : `${d - 2}× pradziadków`;
    const f = sex === "f";
    const b = d === 2 ? (f ? ["babcia", "babci"] : ["dziadek", "dziadka"]) : d === 3 ? (f ? ["prababcia", "prababci"] : ["pradziadek", "pradziadka"])
      : d === 4 ? (f ? ["praprababcia", "praprababci"] : ["prapradziadek", "prapradziadka"]) : (f ? [`${d - 2}× prababcia`, `${d - 2}× prababci`] : [`${d - 2}× pradziadek`, `${d - 2}× pradziadka`]);
    return c === "gen" ? b[1] : b[0];
  };
  const genName = (n, sex) => {
    if (sex === "f") return /ia$/.test(n) ? n.slice(0, -1) + "i" : /[kg]a$/.test(n) ? n.slice(0, -1) + "i" : /a$/.test(n) ? n.slice(0, -1) + "y" : n;
    return /y$/.test(n) ? n.slice(0, -1) + "ego" : /ek$/.test(n) ? n.slice(0, -2) + "ka" : /er$/.test(n) ? n.slice(0, -2) + "ra" : /eł$/.test(n) ? n.slice(0, -2) + "ła" : n + "a";
  };
  const nameGen = id => { const p = byId.get(id); return p.genName || genName(p.given.split(" ")[0], p.sex); };
  const relCache = new Map();
  function relOf(id, depth = 0) {
    if (!depth && relCache.has(id)) return relCache.get(id);
    const p = byId.get(id); if (!p) return null;
    const f = p.sex === "f";
    let r = null;
    let path = null;
    if (dist.has(id)) { const d = dist.get(id); r = { nom: ANC(d, p.sex, "nom"), gen: ANC(d, p.sex, "gen"), kind: "anc", d }; path = pathOf.get(id) || null; }
    else {
      let best = null; const seen = new Set([id]); const q = [[id, 0]];
      while (q.length) { const [x, b] = q.shift(); for (const par of parents(x)) { if (seen.has(par)) continue; seen.add(par); if (dist.has(par)) { const a = dist.get(par); if (!best || a < best.a || (a === best.a && b + 1 < best.b)) best = { x: par, a, b: b + 1 }; } else q.push([par, b + 1]); } }
      if (best) {
        const { x, a, b } = best; path = pathOf.get(x) || null;
        const ancAt = t => { let cur = x; while (dist.get(cur) > t) { const nx = children(cur).find(c => dist.get(c) === dist.get(cur) - 1); if (!nx) return null; cur = nx; } return cur; };
        const t = a - b;
        if (b === 1 && a === 2) { const lbl = `${f ? "córka" : "syn"} ${GP.gen}`; r = { nom: lbl, gen: f ? "córki " + GP.gen : "syna " + GP.gen, kind: "sib" }; } /* dziecko dziadków = pokolenie rodziców odwiedzającego */
        if (!r && b === 1 && a - 1 >= 2) { const c = ancAt(a - 1); if (c) { const tail = `${ANC(a - 1, byId.get(c).sex, "gen")} ${nameGen(c)}`; r = { nom: `${f ? "siostra" : "brat"} ${tail}`, gen: `${f ? "siostry" : "brata"} ${tail}`, kind: "sib" }; } }
        if (!r && t >= 2) { const c = ancAt(t); if (c) { const deg = b - 1, st = deg > 1 ? ` ${deg}. stopnia` : ""; const tail = `${ANC(t, byId.get(c).sex, "gen")} ${nameGen(c)}`; r = { nom: `${f ? "kuzynka" : "kuzyn"}${st} ${tail}`, gen: `${f ? "kuzynki" : "kuzyna"}${st} ${tail}`, kind: "cousin" }; } }
        if (!r) { const deg = Math.min(a, b) - 1, rem = Math.abs(a - b); const st = `${deg}. stopnia${rem ? `, ${rem}× ${f ? "usunięta" : "usunięty"}` : ""}`; r = { nom: `${f ? "kuzynka" : "kuzyn"} ${st}`, gen: `${f ? "kuzynki" : "kuzyna"} ${st}`, kind: "cousin" }; }
      } else if (!depth) {
        for (const s of spouses(id)) { const sr = relOf(s.id, 1); if (sr) { r = { nom: `${f ? "żona" : "mąż"} ${sr.gen}`, gen: `${f ? "żony" : "męża"} ${sr.gen}`, kind: "inlaw" }; break; } }
      }
    }
    if (r && path) r = { ...r, nom: r.nom + pathTag(path), gen: r.gen + pathTag(path), path: path.key };
    if (!depth) relCache.set(id, r);
    return r;
  }
  /* ── ścieżka pokrewieństwa do diagramu ───────────
     anc: chain = [osoba … dziadek/babcia]; lat: left = [wspólny przodek … osoba], right = [wspólny przodek … dziadek/babcia];
     spouse = id małżonka-krewnego, przez którego liczona jest ścieżka (powinowaci); alt = druga możliwa ścieżka. */
  const isAnc = (a, b) => { const seen = new Set([b]), q = [b]; while (q.length) { const x = q.shift(); if (x === a) return true; for (const p of parents(x)) if (!seen.has(p)) { seen.add(p); q.push(p); } } return false; };
  function kinPath(id, depth = 0) {
    if (!byId.get(id)) return null;
    const down = from => { const out = [from]; let cur = from; while (dist.get(cur) > V.k) { const nx = children(cur).find(c => dist.get(c) === dist.get(cur) - 1); if (!nx) return null; out.push(nx); cur = nx; } return out; };
    // wszystkie drogi w dół od przodka do dziadków (Marian/Henryka)
    const downAll = from => { const out = []; const go = (cur, acc) => { if (out.length > 60) return; if (dist.get(cur) === V.k) { out.push(acc); return; } for (const c of children(cur)) if (dist.has(c) && dist.get(c) < dist.get(cur) && !acc.includes(c)) go(c, [...acc, c]); }; go(from, [from]); return out; };
    const pathsFrom = from => downAll(from).sort((a, b) => a.length - b.length);
    if (dist.has(id)) {
      const all = pathsFrom(id);
      if (all.length >= 2) {
        const sc = q => q.filter(n => /ntosiak$/.test((byId.get(n) || {}).surname || "")).length;
        let p1 = all[0]; const cp = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
        let p2 = all.slice(1).reduce((m, q) => (cp(p1, q) < cp(p1, m) ? q : m), all[1]);
        if (p1 !== p2) {
          if (sc(p2) > sc(p1)) [p1, p2] = [p2, p1];
          const f = cp(p1, p2) - 1; let sf = 0; while (sf < p1.length - f - 1 && sf < p2.length - f - 1 && p1[p1.length - 1 - sf] === p2[p2.length - 1 - sf]) sf++;
          return { kind: "dbl", top: p1.slice(0, f + 1), L: p1.slice(f + 1, p1.length - sf), R: p2.slice(f + 1, p2.length - sf), suf: p1.slice(p1.length - sf) };
        }
      }
      const chain = down(id); return chain && { kind: "anc", chain };
    }
    const prev = new Map(), seen = new Set([id]), q = [[id, 0]], cands = [];
    while (q.length) { const [x, b] = q.shift(); for (const par of parents(x)) { if (seen.has(par)) continue; seen.add(par); prev.set(par, x); if (dist.has(par)) cands.push({ x: par, a: dist.get(par), b: b + 1 }); else q.push([par, b + 1]); } }
    let best = null; for (const c of cands) if (!best || c.a < best.a || (c.a === best.a && c.b < best.b)) best = c;
    if (best) {
      const left = [best.x]; while (left[left.length - 1] !== id) left.push(prev.get(left[left.length - 1]));
      const right = down(best.x); if (!right) return null;
      const other = cands.find(c => c !== best && c.x !== best.x && prev.get(c.x) !== prev.get(best.x) && !isAnc(c.x, best.x) && !isAnc(best.x, c.x));
      let alt = other ? other.x : null;
      if (!alt) { const ps = pathsFrom(best.x); const o = ps.find(q => q.some((n, i) => right[i] !== n)); if (o) { const i = o.findIndex((n, k) => right[k] !== n); alt = o[i]; } }
      return { kind: "lat", x: best.x, left, right, alt };
    }
    if (!depth) for (const s of spouses(id)) { const k = kinPath(s.id, 1); if (k) return { ...k, spouse: s.id }; }
    return null;
  }

  const rel = id => { const r = relOf(id); return r ? r.nom : ""; };
  const DESC = k => k === 1 ? "dziecko" : k === 2 ? "wnuk lub wnuczka" : k === 3 ? "prawnuk lub prawnuczka" : k === 4 ? "praprawnuk lub praprawnuczka" : `${k - 2}× prawnuk lub prawnuczka`;
  const viewerDesc = () => V.def ? "wnuk lub wnuczka " + GP.gen : `${DESC(V.k)} ${V.anchors.map(nameGen).join(" i ")}`;
  const genPl = (n, c = "pl") => ANC(n + 1, "m", c);

  /* ── opis osoby ────────────────────────────────── */
  const fullName = p => {
    if (!p) return "";
    let s = p.given + (p.surname ? " " + p.surname : "");
    if (p.maiden) s += " " + p.maiden;
    return s;
  };
  const shortName = p => p ? p.given + (p.maiden ? " " + p.maiden : p.surname ? " " + p.surname : "") : "";
  const yr = e => !e ? "" : e.y ? (e.approx ? "ok. " : "") + e.y : (e.text || "");
  const lifeShort = p => {
    if (!p || p.private) return "";
    const b = p.born && p.born.y ? yr(p.born) : "", d = p.died ? yr(p.died) : "";
    if (b && d) return b + "–" + d;
    if (b) return "ur. " + b;
    if (d) return "zm. " + d;
    return "";
  };
  const dateStr = e => {
    if (!e) return "";
    const s = e.date ? ((e.approx && !/^ok\./.test(e.date) ? "ok. " : "") + e.date) : e.text ? e.text : yr(e);
    return s + (e.place ? (s ? ", " : "") + e.place : "");
  };
  const CERT = { ok: "pewne", prawd: "prawdopodobne", hyp: "hipoteza", brak: "nieznane — szukamy" };
  const mark = c => `<i class="mark ${c === "me" ? "me" : c}" aria-hidden="true"></i>`;
  const certBadge = c => `<span class="badge">${mark(c)}${CERT[c] || ""}</span>`;
  const fact = f => typeof f === "string" ? esc(f) : `${esc(f.t)} <span class="badge">${mark(f.c)}${CERT[f.c]}</span>`;
  /* pochówek: b = obiekt burial (lub tablica); short = wersja do panelu (bez notatki) */
  const burialLabel = u => /findagrave/.test(u) ? "Find a Grave" : /grobonet/.test(u) ? "Grobonet" : /familysearch/.test(u) ? "FamilySearch" : "źródło";
  const burial1 = (b, short) => {
    if (!b) return "";
    const where = [b.cemetery, b.place, b.plot ? (/^\d|^[A-Z]{1,3}\d/.test(b.plot) ? "kwatera " : "") + b.plot : ""].filter(Boolean).map(esc).join(", ");
    const links = [b.url ? { label: burialLabel(b.url), url: b.url } : null, ...(b.links || [])].filter(Boolean)
      .map(l => ` <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("");
    if (b.c === "brak") return `${mark("hyp")}<span>nieznane — szukamy</span>${short || !b.note ? "" : `<span class="muted small"> · ${esc(b.note)}</span>`}`;
    return `${mark(b.c)}${b.who ? `<span>${esc(b.who)}: </span>` : ""}<span>${where}</span>${links}${short ? "" : ` <span class="badge">${CERT[b.c] || ""}</span>`}${short || !b.note ? "" : `<span class="muted small"> · ${esc(b.note)}</span>`}`;
  };
  const burial = (b, short) => (Array.isArray(b) ? b : b ? [b] : []).map(x => `<span class="burial">${burial1(x, short)}</span>`).join("");
  const plink = (id, txt) => { const p = byId.get(id); return p ? `<a href="${PPAGE}?id=${encodeURIComponent(id)}">${esc(txt || fullName(p))}</a>` : esc(txt || id); };

  /* ── akty ──────────────────────────────────────── */
  const SW = "https://www.szukajwarchiwach.gov.pl/jednostka/-/jednostka/";
  const scanUrl = h => `https://photos.szukajwarchiwach.gov.pl/${h}_max`;
  const reading = a => a.idx ? "indeks" : (a.r || "");
  const actLinks = a => [
    a.scan ? `<a href="${scanUrl(a.scan)}" target="_blank" rel="noopener">skan ↗</a>` : "",
    a.unit ? `<a href="${SW}${a.unit}" target="_blank" rel="noopener">księga ${a.y} w archiwum ↗</a>` : "",
    a.fs ? `<a href="${esc(a.fs)}" target="_blank" rel="noopener">skan w FamilySearch ↗ (wymaga darmowego konta)</a>` : "",
    a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">skan w metryki.genealodzy.pl ↗</a>` : "",
    a.idx && !a.url && !a.scan ? `<span>skan niedostępny online (AP Pułtusk)</span>` : "",
  ].join("");
  const actHTML = (a, opt = {}) => `
    <li class="act" id="${esc(a.id)}">
      <div class="yr">${a.y}</div>
      <div>
        <div class="act-head"><span class="act-kind">${esc(a.k)} · akt ${esc(a.no)}</span><span class="act-title">${esc(a.t)}</span><span class="act-meta">${a.parish ? "parafia " + esc(a.parish) : "pokolenie " + genPl(a.g, "plgen")}${reading(a) ? " · " + esc(reading(a)) : ""}</span></div>
        ${a.q ? `<p class="act-q" lang="pl">„${esc(a.q)}”</p>` : ""}
        <p class="act-tr"><b>${a.idx ? "indeks" : "po współczesnemu"}</b>${esc(a.tr)}</p>
        ${opt.people !== false ? `<div class="act-people">${a.osoby.map(id => `<span>${plink(id, shortName(byId.get(id)))}${rel(id) ? ` <span class="rel">${esc(rel(id))}</span>` : ""}</span>`).join("")}</div>` : ""}
        <div class="act-links">${actLinks(a)}${opt.anchor ? `<a href="${APAGE}#${esc(a.id)}">w przeglądarce aktów</a>` : ""}</div>
      </div>
    </li>`;
  const srcLinks = ids => (ids || []).map(id => { const s = srcById.get(id); if (!s) return ""; return s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>` : `<span>${esc(s.label)}</span>`; }).join(" ");
  const srcShort = ids => (ids || []).map(id => { const s = srcById.get(id); if (!s) return ""; const t = s.short || s.label.split(/ — |, /)[0]; return s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.label)}">${esc(t)}</a>` : `<span title="${esc(s.label)}">${esc(t)}</span>`; }).join(" ");
  const actRefs = ids => (ids || []).map(id => { const a = actById.get(id); return a ? `<a href="${APAGE}#${esc(id)}">akt: ${esc(a.k)} ${a.no === "—" ? a.y : a.no + "/" + a.y}</a>` : ""; }).join(" ");
  const refLinks = refs => (refs || []).map(r => r.scan ? `<a href="${scanUrl(r.scan)}" target="_blank" rel="noopener">${esc(r.label)} ↗</a>` : r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)} ↗</a>` : `<span>${esc(r.label)}</span>`).join(" ");

  const legend = (extra = "") => `<div class="legend" aria-label="Legenda pewności">
      <span>${mark("ok")}pewne — akt, indeks lub wiedza rodzinna</span>
      <span>${mark("prawd")}prawdopodobne — zgodne poszlaki</span>
      <span>${mark("hyp")}hipoteza — trop do sprawdzenia</span>${extra}
    </div>`;

  /* ── nawigacja, motyw, stopka ─────────────────── */
  const PAGES = [
    ["index.html", "Start"], ["drzewo.html", "Drzewo"], ["historie.html", "Historie"], ["dwie-linie.html", "Dwie linie"], ["osoba.html", "Osoby"], ["akty.html", "Akty"],
    ["os-czasu.html", "Oś czasu"], ["mapa.html", "Mapa"], ["ciekawostki.html", "Ciekawostki"], ["kurpie.html", "Kurpie"],
    ["obrazy.html", "Obrazy"], ["siec.html", "Sieć"], ["statystyki.html", "Statystyki"], ["ameryka.html", "Ameryka"],
    ["babcia.html", "Babcia"], ["zrodla.html", "Źródła"],
  ];
  const here = (location.pathname.split("/").pop() || "index.html");
  function chrome() {
    const el = document.getElementById("chrome");
    if (el) {
      el.innerHTML = `<header class="top"><a href="${D.home || "index.html"}"><span class="brand-host">adrianantosiak.pl/</span>${D.brand || "drzewo"}</a>
        <span class="top-btns"><button class="toggle" id="search-btn" type="button" aria-expanded="false" aria-controls="site-search">[ szukaj ]</button><button class="toggle menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">[ menu ]</button>
        <button class="toggle" id="theme" type="button" aria-label="Zmień motyw">[ motyw ]</button></span></header>
        <nav class="nav" id="site-nav" aria-label="Sekcje"><ul>${(D.pages || PAGES).map(([h, t]) => `<li><a href="${h}"${h === here ? ' aria-current="page"' : ""}>${t}</a></li>`).join("")}</ul></nav>
        <div class="viewer"><span>Pokrewieństwo liczone dla: <b>${V.def ? "wnuka lub wnuczki " + GP.gen : esc(V.name ? V.name + " — " + viewerDesc() : viewerDesc())}</b></span> <button class="toggle" id="viewer-btn" type="button" aria-expanded="false" aria-controls="viewer-panel">[ zmień ]</button>
          <form class="viewer-panel" id="viewer-panel" hidden>
            <label class="vrow"><input type="radio" name="vm" value="def"${V.def ? " checked" : ""}> Wnuk lub wnuczka ${GP.gen}</label>
            <label class="vrow"><input type="radio" name="vm" value="own"${V.def ? "" : " checked"}> Ktoś inny z rodziny</label>
            <div class="vown">
              <label>Twój najbliższy przodek, który jest w drzewie<input id="v-anc" list="v-list" type="search" autocomplete="off" placeholder="zacznij pisać imię lub nazwisko…"></label>
              <datalist id="v-list"></datalist>
              <div id="v-sp"></div>
              <label>Jesteś jego/jej<select id="v-k">${[1,2,3,4,5,6,7,8].map(k => `<option value="${k}"${(V.def ? 3 : V.k) === k ? " selected" : ""}>${{1:"dzieckiem",2:"wnukiem / wnuczką",3:"prawnukiem / prawnuczką",4:"praprawnukiem / praprawnuczką"}[k] || (k - 2) + "× prawnukiem / prawnuczką"}</option>`).join("")}</select></label>
              <label>Twoje imię (opcjonalnie)<input id="v-name" maxlength="40" autocomplete="given-name" value="${V.def ? "" : esc(V.name)}"></label>
            </div>
            <p class="small muted">Wybór zostaje tylko w tej przeglądarce — nic nie jest wysyłane.</p>
            <p class="btns"><button class="btn" type="submit">Zapisz</button> <button class="btn" type="button" id="v-cancel">Anuluj</button> <span id="v-err" class="small"></span></p>
          </form></div>
        <div class="site-search" id="site-search" hidden><input id="ss-q" type="search" placeholder="Imię, nazwisko lub miejsce" autocomplete="off" aria-label="Szukaj na stronie"><div id="ss-out" aria-live="polite"></div></div>`;
      siteSearch(); viewerPicker();
      const cur = el.querySelector('[aria-current="page"]');
      const nav = el.querySelector(".nav");
      if (cur && nav && cur.offsetLeft + cur.offsetWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft - 16;
      const mb = document.getElementById("menu-btn");
      const setMenu = (open, focus) => {
        nav.classList.toggle("open", open); mb.setAttribute("aria-expanded", String(open));
        if (open) { const a = nav.querySelector("a"); if (a) a.focus(); } else if (focus) mb.focus();
      };
      mb.addEventListener("click", () => setMenu(mb.getAttribute("aria-expanded") !== "true"));
      nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) setMenu(false, true); });
      document.addEventListener("click", (e) => { if (nav.classList.contains("open") && !nav.contains(e.target) && !mb.contains(e.target)) setMenu(false); });
      window.matchMedia("(min-width: 761px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });
      document.getElementById("theme").addEventListener("click", () => {
        const t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
        document.documentElement.dataset.theme = t;
        const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === "light" ? "#eff1f5" : "#1e1e2e";
        try { localStorage.setItem("aa_theme", t); } catch (e) {}
      });
    }
    const as = document.getElementById("asof"); if (as) as.textContent = "Stan: " + D.asof;
    const f = document.getElementById("foot");
    if (f) f.innerHTML = `<span>Stan: ${esc(D.asof)}</span><button class="toggle" type="button" data-contribute>[ wiesz coś więcej? dodaj informację lub zdjęcie ]</button><a href="../">adrianantosiak.pl</a>`;
    document.addEventListener("click", e => { const b = e.target.closest("[data-contribute]"); if (b) { e.preventDefault(); contribute(b.dataset.contribute ? JSON.parse(b.dataset.contribute) : null); } });
  }
  /* ── wybór odwiedzającego (od kogo liczyć pokrewieństwo) ── */
  function viewerPicker() {
    const btn = document.getElementById("viewer-btn"), f = document.getElementById("viewer-panel");
    if (!btn || !f) return;
    const dl = document.getElementById("v-list"), inp = document.getElementById("v-anc"), spBox = document.getElementById("v-sp"), err = document.getElementById("v-err");
    const lab = new Map();
    const label = p => fullName(p) + (lifeShort(p) ? ` (${lifeShort(p)})` : "");
    for (const p of D.people.slice().sort((a, b) => a.given.localeCompare(b.given, "pl"))) {
      let l = label(p); if (lab.has(l)) l += " · " + p.id; lab.set(l, p.id);
      const o = document.createElement("option"); o.value = l; dl.append(o);
    }
    const idOf = v => lab.get(v.trim()) || null;
    const showSp = keep => {
      const id = idOf(inp.value); if (!id) { spBox.innerHTML = ""; return; }
      spBox.innerHTML = spouses(id).map(sp => `<label class="vrow small"><input type="checkbox" value="${esc(sp.id)}"${keep && keep.includes(sp.id) ? " checked" : ""}> pochodzisz też od ${byId.get(id).sex === "f" ? "jej męża" : "jego żony"}: ${esc(fullName(byId.get(sp.id)))}</label>`).join("");
    };
    if (!V.def) { const p = byId.get(V.anchors[0]); inp.value = [...lab].find(([, v]) => v === p.id)[0]; showSp(V.anchors.slice(1)); }
    inp.addEventListener("input", () => showSp());
    const set = open => { f.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", () => set(f.hidden));
    document.getElementById("v-cancel").addEventListener("click", () => set(false));
    f.addEventListener("submit", e => {
      e.preventDefault(); err.textContent = "";
      const mode = (f.querySelector('input[name="vm"]:checked') || {}).value;
      try {
        if (mode === "def") localStorage.removeItem(VKEY);
        else {
          const id = idOf(inp.value); if (!id) { err.textContent = "Wybierz osobę z listy podpowiedzi."; return; }
          const anchors = [id, ...[...spBox.querySelectorAll("input:checked")].map(x => x.value)];
          localStorage.setItem(VKEY, JSON.stringify({ anchors, k: +document.getElementById("v-k").value, name: document.getElementById("v-name").value.trim() }));
        }
      } catch (x) { err.textContent = "Przeglądarka nie pozwala zapisać wyboru."; return; }
      location.reload();
    });
  }
  /* ── zgłoszenia: informacja lub zdjęcie (Cloudflare Worker drzewo-api) ── */
  const API = "https://drzewo-api.aantosiak.workers.dev/api/zgloszenie";
  function currentTarget() {
    const qs = new URLSearchParams(location.search);
    if (here === "osoba.html" && qs.get("id") && byId.has(qs.get("id"))) return { type: "osoba", id: qs.get("id") };
    if (here === APAGE && location.hash && actById.has(location.hash.slice(1))) return { type: "akt", id: location.hash.slice(1) };
    return { type: "strona", id: "" };
  }
  const targetLabel = t => t.type === "osoba" ? fullName(byId.get(t.id)) : t.type === "akt" ? (actById.get(t.id) || {}).t : document.title.replace(/ — Drzewo (Antosiaków|mamy|Paców)$/, "");
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5e6) return file;
    try {
      const bmp = await createImageBitmap(file); const m = 2400, sc = Math.min(1, m / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.85));
      return b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
    } catch (e) { return file; }
  }
  function contribute(t) {
    t = t || currentTarget();
    let dlg = document.getElementById("contrib");
    if (dlg) dlg.remove();
    dlg = document.createElement("dialog"); dlg.id = "contrib"; dlg.className = "contrib"; dlg.setAttribute("aria-labelledby", "contrib-h");
    dlg.innerHTML = `<form method="dialog" class="contrib-f">
      <h2 id="contrib-h">Dodaj informację lub zdjęcie</h2>
      <p class="small muted">Dotyczy: <b>${esc(targetLabel(t) || "całej strony")}</b>. Zgłoszenie najpierw czytamy i sprawdzamy w aktach — na stronę nic nie trafia automatycznie.</p>
      <label>Co wiesz?<textarea name="tresc" rows="5" maxlength="5000" placeholder="np. daty, miejsca, kto z kim, wspomnienia, gdzie jest grób"></textarea></label>
      <label>Skąd to wiesz?<select name="skad"><option value="wspomnienie">wspomnienie rodzinne</option><option value="dokument">dokument</option><option value="nagrobek">nagrobek</option><option value="zdjecie">zdjęcie</option><option value="inne">inne</option></select></label>
      <label>Zdjęcia (do 5, np. dokumenty, nagrobki, fotografie)<input name="zdjecia" type="file" accept="image/*" multiple></label>
      <label>Twoje imię (opcjonalnie)<input name="imie" maxlength="80" autocomplete="given-name"></label>
      <label>Kontakt, jeśli chcesz odpowiedzi (opcjonalnie)<input name="kontakt" maxlength="120" placeholder="e-mail lub telefon"></label>
      <label class="vrow small"><input type="checkbox" name="podziekowanie" value="1"> Można mi podziękować z imienia na stronie</label>
      <input name="www" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
      <p class="small muted">Dane widzi tylko autor strony; służą wyłącznie do uzupełnienia drzewa. Nie publikujemy danych osób żyjących ani kontaktu.</p>
      <p class="btns contrib-btns"><button class="btn" type="submit" value="send">Wyślij</button> <button class="btn" type="button" value="cancel" data-close>Anuluj</button> <span class="small" data-msg aria-live="polite"></span></p>
    </form>`;
    document.body.append(dlg);
    const f = dlg.querySelector("form"), msg = dlg.querySelector("[data-msg]");
    dlg.querySelector("[data-close]").addEventListener("click", () => dlg.close());
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const files = [...f.zdjecia.files];
      if (!f.tresc.value.trim() && !files.length) { msg.textContent = "Napisz coś albo dodaj zdjęcie."; return; }
      if (files.length > 5) { msg.textContent = "Maksymalnie 5 zdjęć."; return; }
      const btn = f.querySelector('[type="submit"]'); btn.disabled = true; msg.textContent = "Wysyłanie…";
      const fd = new FormData();
      for (const k of ["tresc", "skad", "imie", "kontakt", "www"]) fd.append(k, f[k].value);
      fd.append("podziekowanie", f.podziekowanie.checked ? "1" : "0");
      fd.append("target_type", t.type); fd.append("target_id", t.id || ""); fd.append("page", location.pathname + location.search + location.hash);
      fd.append("kto", JSON.stringify(V.def ? { opis: viewerDesc() } : { opis: viewerDesc(), anchors: V.anchors, k: V.k, imie: V.name }));
      for (const x of files) { const y = await shrink(x); if (y.size > 6 * 1024 * 1024) { msg.textContent = "Zdjęcie „" + x.name + "” jest za duże (max 6 MB)."; btn.disabled = false; return; } fd.append("zdjecia", y, y.name); }
      try {
        const r = await fetch(API, { method: "POST", body: fd }); const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Błąd " + r.status);
        f.innerHTML = `<h2 id="contrib-h">Dziękujemy!</h2><p>Zgłoszenie dotarło. Sprawdzimy je w aktach i uzupełnimy drzewo.</p><p class="btns"><button class="btn" type="button" data-close>Zamknij</button></p>`;
        f.querySelector("[data-close]").addEventListener("click", () => dlg.close());
      } catch (x) { msg.textContent = "Nie udało się wysłać: " + x.message; btn.disabled = false; }
    });
    dlg.showModal();
  }
  /* ── wyszukiwarka w nagłówku: osoby, akty, historie, ciekawostki ── */
  function siteSearch() {
    const btn = document.getElementById("search-btn"), box = document.getElementById("site-search");
    const q = document.getElementById("ss-q"), out = document.getElementById("ss-out");
    if (!btn || !box) return;
    const norm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
    const strip = t => String(t || "").replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1").replace(/\{\{\w+\}\}/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    const facts = p => (p.facts || []).map(x => typeof x === "string" ? x : x.t).join(" ");
    let idx = null;
    const build = () => {
      const r = [];
      for (const p of D.people || []) r.push({ g: "Osoby", h: PPAGE + "?id=" + encodeURIComponent(p.id), t: fullName(p), sub: lifeShort(p),
        k1: norm(fullName(p) + " " + (p.nick || "")), k2: norm([p.born && p.born.place, p.died && p.died.place, p.burial && p.burial.place, p.private ? "" : facts(p)].join(" ")) });
      for (const a of D.acts || []) r.push({ g: "Akty", h: APAGE + "#" + a.id, t: a.t, sub: a.k + " " + a.y, k1: norm(a.t), k2: norm((a.q || "") + " " + (a.tr || "")) });
      for (const s of D.stories || []) r.push({ g: "Historie", h: "historie.html#" + s.id, t: s.title, sub: "", k1: norm(s.title), k2: norm(strip((s.paragraphs || []).join(" "))) });
      for (const c of D.trivia || []) r.push({ g: "Ciekawostki", h: CPAGE, t: c.title, sub: c.year || "", k1: norm(c.title), k2: norm(c.text) });
      return r;
    };
    const run = () => {
      const words = norm(q.value).split(/\s+/).filter(w => w.length > 1);
      if (!words.length) { out.innerHTML = ""; return; }
      idx = idx || build();
      const res = words.map(w => new RegExp("[^a-z0-9]" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      const hits = [];
      for (const it of idx) {
        const all = " " + it.k1 + " " + it.k2;
        if (!res.every(re => re.test(all))) continue;
        hits.push({ it, score: res.filter(re => re.test(" " + it.k1)).length * 10 + (it.k1.startsWith(words[0]) ? 5 : 0) });
      }
      if (!hits.length) { out.innerHTML = `<p class="empty">Nic nie znaleziono.</p>`; return; }
      const groups = { Osoby: [], Akty: [], Historie: [], Ciekawostki: [] };
      for (const h of hits.sort((a, b) => b.score - a.score)) (groups[h.it.g] = groups[h.it.g] || []).push(h.it);
      out.innerHTML = Object.entries(groups).filter(([, l]) => l.length).map(([g, list]) => `<h3>${g} <span class="muted">${list.length}</span></h3><ul>${list.slice(0, 12).map(it =>
        `<li><a href="${esc(it.h)}">${esc(it.t)}</a>${it.sub ? ` <span class="muted">${esc(String(it.sub))}</span>` : ""}</li>`).join("")}${list.length > 12 ? `<li class="muted">…i ${list.length - 12} więcej — doprecyzuj</li>` : ""}</ul>`).join("");
    };
    const set = open => {
      box.hidden = !open; btn.setAttribute("aria-expanded", String(open));
      if (open) { q.focus(); q.select(); }
    };
    btn.addEventListener("click", () => set(box.hidden));
    q.addEventListener("input", run);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !box.hidden) { set(false); btn.focus(); }
      if (e.key === "/" && box.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); set(true); }
    });
    out.addEventListener("click", e => { if (e.target.closest("a")) set(false); });
  }
  chrome();

  window.APP = { contribute, V, FOR, TO, DESC, viewerDesc, rel, relOf, kinPath, genPl, dist, pathOf, altParents, altOf, nameGen, D, esc, plural, byId, actById, srcById, person, children, spouses, parents, siblings, actsFor, triviaFor, genFor,
    APAGE, CPAGE, direct, fullName, shortName, yr, lifeShort, dateStr, CERT, mark, certBadge, burial, fact, plink, actHTML, actLinks, srcLinks, srcShort, actRefs, refLinks, legend, scanUrl };
})();
