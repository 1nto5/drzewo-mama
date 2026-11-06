/* Renderery stron: start, osoba, akty, ciekawostki, ameryka, babcia, źródła. */
(function () {
  "use strict";
  const A = window.APP, D = A.D, esc = A.esc;
  const $ = s => document.querySelector(s);
  const page = document.body.dataset.page;
  const KIND_ORDER = ["fakt o rodzinie", "kontekst", "hipoteza"];
  const fold = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
  const markFor = p => A.mark(p.gen === 1 && p.certainty === "ok" ? "me" : p.certainty);

  const card = t => `<li class="card">
      <div class="card-kind"><span class="k">${esc(t.kind)}</span>${t.c ? A.certBadge(t.c) : ""}${t.year ? `<span>${t.year}</span>` : ""}${(t.people || []).length ? `<span>${t.people.map(id => A.plink(id, A.byId.get(id).given) + (A.rel(id) ? ` <span class="rel">(${esc(A.rel(id))})</span>` : "")).join(", ")}</span>` : ""}</div>
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.text)}</p>
      <div class="src">${A.actRefs(t.acts)}${A.srcLinks(t.sources)}${t.link ? `<a href="${esc(t.link[0])}">${esc(t.link[1])} →</a>` : ""}</div>
    </li>`;
  const listC = arr => `<ul class="facts">${arr.map(x => `<li>${typeof x === "string" ? esc(x) : `${x.c ? A.mark(x.c) : ""}${esc(x.t)}${x.note ? ` <span class="muted small">(${esc(x.note)})</span>` : ""}${x.sources || x.acts ? ` <span class="src">${A.actRefs(x.acts)} ${A.srcLinks(x.sources)}</span>` : ""}`}</li>`).join("")}</ul>`;
  const genItem = g => {
    const m = A.byId.get(g.man), w = A.byId.get(g.woman);
    return `<li class="gen ${g.c}">
      <div class="yr">${esc(g.yr)}</div>
      <div class="body">
        <div class="gn">pokolenie ${g.n} · ${esc(A.genPl(g.n))} Adriana</div>
        <div class="couple"><a class="who" href="osoba.html?id=${m.id}">${esc(m.given + " " + (m.surname || ""))}</a><span class="x">×</span><span><a class="who" href="osoba.html?id=${w.id}">${esc(w.given)}</a>${w.maiden ? ` <span class="maiden">${esc(w.maiden)}</span>` : ""}</span></div>
        <p class="gen-sum">${esc(g.sum)}</p>
        <details><summary>szczegóły</summary><div class="more">${g.facts.map(f => `<p>${esc(f)}</p>`).join("")}${(g.more || []).map(f => `<p>${esc(f)}</p>`).join("")}${g.src ? `<p class="src">akty: ${esc(g.src)}</p>` : ""}</div></details>
      </div>
    </li>`;
  };

  /* ── start ─────────────────────────────────────── */
  function start() {
    $("#legend").outerHTML = A.legend();
    const years = D.acts.map(a => a.y);
    $("#stats").innerHTML = [
      [D.generations.length, "pokoleń linii prostej"],
      [D.people.length, "osób w drzewie"],
      [D.acts.length, "aktów metrykalnych"],
      [Math.min(...years) + "–" + Math.max(...years), "lata aktów"],
    ].map(([n, l]) => `<div><dt>${l}</dt><dd>${n}</dd></div>`).join("");
    $("#gens").innerHTML = D.generations.map(genItem).join("");
    const T = [
      ["drzewo.html", "Drzewo", "Interaktywny graf rodziny: linia prosta, rodzeństwo, wszyscy."],
      ["historie.html", "Historie", "Opowieści o każdej parze przodków — od Jakuba do dziadków."],
      ["osoba.html", "Osoby", `Indeks ${A.plural(D.people.length, "osoby", "osób", "osób")} — każda ma swoją stronę.`],
      ["akty.html", "Akty", `${D.acts.length} aktów z cytatami, tłumaczeniem i skanami. Filtry i słowniczek.`],
      ["os-czasu.html", "Oś czasu", "Życie przodków na tle historii Połoni, 1750–1970."],
      ["ciekawostki.html", "Ciekawostki", `${D.trivia.length} historii: fakty o rodzinie, kontekst i hipotezy.`],
      ["mapa.html", "Mapa rodu", "Gdzie żyli przodkowie i dokąd wyjeżdżali — Połoń, Kurpie, Mazury, USA."],
      ["dwie-linie.html", "Dwa razy od Pawła", "Wincenty i Eleonora mieli wspólnych przodków — dwie linie, jeden początek."],
      ["kurpie.html", "Kurpie i „Godowie”", "Region, stroje, pieśni prababci i przezwisko mieszkańców Połoni."],
      ["obrazy.html", "Historia wsi w obrazach", "Stare mapy, zdjęcia z 1915 r., sosna bartna, kościół."],
      ["siec.html", "Sieć sąsiadów", "Kto trzymał dzieci do chrztu i świadkował na ślubach."],
      ["statystyki.html", "Statystyki rodu", "Wiek przy ślubie i śmierci, śmiertelność dzieci, imiona."],
      ["ameryka.html", "Ameryka", "Kto z Połoni wyjechał do USA i co o nich wiemy."],
      ["babcia.html", "Babcia Henryka", "Mieszałowie i Szczepankowie — punkt wyjścia i tropy."],
      ["zrodla.html", "Źródła i metoda", "Archiwa, zasady odczytu, imiennicy, lista do zrobienia."],
    ];
    $("#tiles").innerHTML = T.map(([h, t, d]) => `<li><a href="${h}"><b>${t}</b><span>${esc(d)}</span></a></li>`).join("");
  }

  /* ── dwie (lub więcej) możliwe ścieżki rodowe: porównanie z pola altParents ── */
  function pathsTable(id) {
    const alts = A.altParents(id);
    if (!alts.length) return "";
    const who = pid => { const q = A.byId.get(pid); return q ? `${A.plink(pid)}${A.lifeShort(q) ? ` <span class="muted small">${esc(A.lifeShort(q))}</span>` : ""}` : ""; };
    const sibs = a => A.children(a.parents[0]).filter(c => c !== id && A.parents(c).length);
    const gp = a => a.parents.flatMap(pid => A.parents(pid)).map(who).join("<br>") || `<span class="muted">nieznani</span>`;
    const rows = [
      ["ocena", a => A.certBadge(a.c)],
      ["urodzenie", a => esc(a.born || "")],
      ["akt chrztu", a => A.actRefs([a.act])],
      ["chrzestni", a => esc(a.godparents || "")],
      ["ojciec", a => who(a.parents[0])],
      ["matka", a => who(a.parents[1])],
      ["dziadkowie", gp],
      ["rodzeństwo", a => sibs(a).map(c => { const q = A.byId.get(c); return `${A.plink(c, q.given)}${q.born && q.born.y ? " " + q.born.y : ""}`; }).join(", ")],
      ["poszlaki", a => listC([a.note, ...(a.for || [])].filter(Boolean))],
    ];
    return `<div class="scroll"><table class="paths"><thead><tr><th></th>${alts.map(a => `<th>${esc(a.label)}</th>`).join("")}</tr></thead><tbody>
      ${rows.map(([l, fn]) => `<tr><th scope="row">${l}</th>${alts.map(a => `<td>${fn(a)}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>`;
  }

  /* ── osoba ─────────────────────────────────────── */
  const LINE = { prosta: "linia prosta", boczna: "krewny", powinowaci: "powinowaty" };
  function relBlock(title, ids) {
    if (!ids.length) return "";
    return `<div><h3>${title}</h3><ul>${ids.map(id => { const p = A.byId.get(id); return `<li>${markFor(p)}<span>${A.plink(id)}${A.rel(id) ? `<br><span class="rel">${esc(A.rel(id))}</span>` : ""}</span>${A.lifeShort(p) ? `<span class="yrs">${esc(A.lifeShort(p))}</span>` : ""}</li>`; }).join("")}</ul></div>`;
  }
  function peopleIndex(missing) {
    document.title = "Osoby — Drzewo Antosiaków";
    const groups = [
      ["Linia prosta", D.people.filter(p => p.line === "prosta").sort((a, b) => (b.gen || 0) - (a.gen || 0) || (((a.born || {}).y || 0) - ((b.born || {}).y || 0)))],
      ["Krewni", D.people.filter(p => p.line === "boczna")],
      ["Powinowaci", D.people.filter(p => p.line === "powinowaci")],
    ];
    const sortByName = arr => arr.slice().sort((a, b) => a.given.localeCompare(b.given, "pl") || (((a.born || {}).y || 0) - ((b.born || {}).y || 0)));
    $("#main").innerHTML = `<section class="page-h"><h1>Osoby<span class="dot">.</span></h1>
      ${missing ? `<p class="lead">Nie ma osoby o identyfikatorze „${esc(missing)}”. Wybierz z listy poniżej.</p>` : `<p class="lead">${A.plural(D.people.length, "osoba", "osoby", "osób")} z drzewa. Każda ma stronę z danymi, rodziną, aktami i ciekawostkami.</p>`}
      ${A.legend()}</section>
      ${groups.map(([t, arr], i) => `<h2>${t}</h2><ul class="people-index">${(i ? sortByName(arr) : arr).map(p => `<li>${markFor(p)}${A.plink(p.id)}${A.lifeShort(p) ? `<span class="yrs">${esc(A.lifeShort(p))}</span>` : ""}</li>`).join("")}</ul>`).join("")}`;
  }
  /* ── diagram pokrewieństwa z Adrianem ─────────── */
  function kinship(id, opt = {}) {
    const K = A.kinPath(id); if (!K) return "";
    const cert = (child, par) => { const c = A.byId.get(child); const a = A.altOf(child, par); return (a && a.c) || (c && c.parentsCert) || "ok"; };
    const node = (nid, o = {}) => {
      const q = A.byId.get(nid); if (!q) return "";
      const life = A.lifeShort(q), r = A.rel(nid);
      return `<a class="kn${o.cur ? " cur" : ""}${o.up ? " up c-" + o.up : ""}${o.bar ? " bar-" + o.bar : ""}" href="osoba.html?id=${encodeURIComponent(nid)}"><b>${esc(A.fullName(q))}</b>${life ? `<span class="kn-y">${esc(life)}</span>` : ""}${r ? `<span class="kn-rel">${esc(r)}</span>` : ""}${o.dn ? `<i class="dn dn-${o.dn}" aria-hidden="true"></i>` : ""}</a>`;
    };
    const ANON = d => d === 1 ? "mama lub tata" : d === 2 ? "dziadek lub babcia" : d === 3 ? "pradziadek lub prababcia" : `${d - 2}× pradziadek lub prababcia`;
    const anon = o => Array.from({ length: A.V.k - 1 }, (_, i) => A.V.k - 1 - i).map((d, i) =>
      `<div class="kr"><span class="kn anon up c-ok${o.bar && !i ? " bar-" + o.bar : ""}"><b>${ANON(d)}</b></span></div>`).join("");
    const me = `<span class="kn me up c-ok"><b>${esc(A.V.name ? A.V.name + " (Ty)" : "Ty")}</b><span class="kn-rel">${esc(A.viewerDesc())}</span></span>`;
    const hl = `<i class="hl" aria-hidden="true"></i>`;
    const used = new Set();
    // rząd: węzeł krwi (S) i opcjonalnie małżonek T poziomo
    const row = (nid, o, side) => {
      used.add(nid);
      const main = node(nid, { ...o, cur: o.cur || false });
      if (K.spouse && o.spouseHere) { used.add(id); const sp = node(id, { cur: true }); return `<div class="kr">${side === "l" ? sp + hl + main : main + hl + sp}</div>`; }
      return `<div class="kr">${main}</div>`;
    };
    const isEnd = nid => nid === (K.kind === "anc" ? K.chain[0] : K.left[K.left.length - 1]);
    const target = K.spouse || id;
    const lastCur = nid => nid === target && !K.spouse;
    const certs = [];
    let body, title = "Jak jesteśmy spokrewnieni";
    if (K.kind === "dbl") {
      title = "Dwie linie pochodzenia";
      const { top, L, R, suf } = K; const f = top[top.length - 1];
      const partner = (L[0] ? A.parents(L[0]) : []).find(q => q !== f && A.spouses(f).some(sp => sp.id === q) && (!R[0] || A.parents(R[0]).includes(q)));
      const topRows = top.map((nid, i) => {
        const last = i === top.length - 1, c = i ? cert(nid, top[i - 1]) : "ok"; if (i) certs.push(c);
        if (last && partner) { used.add(nid); return `<div class="kr">${node(nid, { up: i ? c : "", cur: nid === id && !K.spouse })}${hl}${node(partner, { cur: partner === id && !K.spouse })}</div>`; }
        return row(nid, { up: i ? c : "", cur: nid === id && !K.spouse, spouseHere: K.spouse && i === 0 }, "r");
      }).join("");
      const mate = (nid, next) => { if (!opt.couples) return ""; const q = next ? A.parents(next).find(x => x !== nid && A.spouses(nid).some(sp => sp.id === x)) : null; return q || ""; };
      const col = (list, parent, side) => list.map((nid, i) => { const c = cert(nid, i ? list[i - 1] : parent); certs.push(c); const m = mate(nid, list[i + 1]); const me1 = node(nid, { up: c, bar: i === 0 ? side : "", dn: i === list.length - 1 ? side : "" }); const sp = m ? node(m) : ""; return `${i && i === list.length - 1 ? `<i class="kgap" aria-hidden="true"></i>` : ""}<div class="kr">${m ? (side === "l" ? sp + hl + me1 : me1 + hl + sp) : me1}</div>`; }).join("");
      const sufRows = suf.map((nid, i) => { const m = opt.couples && i === 0 && A.dist.get(nid) === A.V.k && A.V.anchors.length > 1 ? (A.spouses(nid)[0] || {}).id : ""; return `<div class="kr">${node(nid, { up: i ? "ok" : "" })}${m ? hl + node(m) : ""}</div>`; }).join("");
      body = `<div class="kin-in"><div class="kin-top stack">${topRows}</div>
        <div class="kin-col l1 dbl">${col(L, f, "l")}</div><div class="kin-col r1 dbl">${col(R, f, "r")}</div>
        <div class="kin-bot"><div class="kin-col">${sufRows}${anon({ up: 1 })}<div class="kr">${me}</div></div></div></div>`;
    } else if (K.kind === "anc") {
      const rows = K.chain.map((nid, i) => {
        const c = i ? cert(K.chain[i - 1], nid) : "ok"; if (i) certs.push(c);
        return row(nid, { up: i ? c : "", cur: lastCur(nid), spouseHere: K.spouse && i === 0 }, "r");
      }).join("");
      body = `<div class="kin-in single"><div class="kin-col l1">${rows}${anon({ up: 1 })}<div class="kr">${me}</div></div></div>`;
    } else {
      const x = K.x, L = K.left.slice(1), R = K.right.slice(1);
      const L1 = L[0], R1 = R[0];
      const partner = (L1 ? A.parents(L1) : []).find(q => q !== x && A.spouses(x).some(sp => sp.id === q) && (!R1 || A.parents(R1).includes(q)));
      const topPair = `<div class="kr">${node(x)}${partner ? hl + node(partner) : ""}</div>`;
      const lrows = L.map((nid, i) => { const c = cert(nid, i ? L[i - 1] : x); certs.push(c); return row(nid, { up: c, bar: i === 0 ? "l" : "", cur: lastCur(nid), spouseHere: K.spouse && i === L.length - 1 }, "l"); }).join("");
      const rrows = R.map((nid, i) => { const c = cert(nid, i ? R[i - 1] : x); certs.push(c); return row(nid, { up: c, bar: i === 0 ? "r" : "" }, "r"); }).join("");
      const rAnon = anon({ up: 1, bar: R.length ? "" : "r" });
      body = `<div class="kin-in"><div class="kin-top">${topPair}</div>
        <div class="kin-col l1">${lrows}</div>
        <div class="kin-col r1">${rrows}${rAnon}<div class="kr">${me}</div></div></div>`;
    }
    const key = [["ok", "link-axis", "pewne"], ["prawd", "link-prawd", "prawdopodobne"], ["hyp", "link-hyp", "hipoteza"]].filter(([c]) => certs.includes(c) && c !== "ok");
    const alt = K.alt ? `<p class="muted small kin-alt">druga ścieżka: przez ${A.plink(K.alt, A.fullName(A.byId.get(K.alt)))} (${esc(A.rel(K.alt) || "")})</p>` : "";
    const diagram = `<div class="kin" role="group" aria-label="Diagram pokrewieństwa z Tobą"><div class="kin-scroll">${body}</div></div>
      ${key.length ? `<div class="legend">${key.map(([, m, t]) => `<span><i class="mark ${m}"></i>powiązanie ${t}</span>`).join("")}</div>` : ""}`;
    if (opt.bare) return diagram;
    return `<h2>${title}</h2>
      <p class="intro">${esc(A.fullName(A.byId.get(id)))} to ${esc(A.rel(id))}. Poniżej ścieżka od ${K.kind === "dbl" ? "tej osoby " + A.TO + " — dwiema liniami, które łączą się niżej w drzewie" : K.kind === "anc" ? "tej osoby " + A.TO : K.spouse ? "małżonka tej osoby " + A.TO + " przez wspólnego przodka" : "wspólnego przodka do tej osoby i " + A.TO}.</p>
      ${diagram}${alt}${TWO.has(id) ? `<p class="small mt-2"><a href="dwie-linie.html">Dwa razy od Pawła i Jadwigi — opisane dokładniej →</a></p>` : ""}`;
  }
  const TWO = new Set(["pawel", "jadwiga", "adam-p", "ewa-antosiak-debek", "wincenty", "eleonora"]);

  function osoba() {
    const id = new URLSearchParams(location.search).get("id");
    const p = id && A.byId.get(id);
    if (!p) return peopleIndex(id);
    document.title = A.fullName(p) + " — Drzewo Antosiaków";
    const g = A.genFor(id), alts = A.altParents(id);
    const life = [];
    if (!p.private) {
      if (p.born && (p.born.y || p.born.date || p.born.place || p.born.text)) life.push(["urodzenie", A.dateStr(p.born)]);
      if (p.died) life.push(["zgon", A.dateStr(p.died)]);
    }
    for (const s of A.spouses(id)) if (s.married) life.push(["ślub", A.dateStr(s.married) + " — " + A.fullName(A.byId.get(s.id))]);
    // oś życia
    const ev = [];
    const by = p.born && p.born.y;
    const age = y => by && y && !p.private ? (y - by >= 0 ? ` <span class="age">${p.born.approx ? "ok. " : ""}${y - by} l.</span>` : "") : "";
    if (!p.private && p.born && p.born.y) ev.push({ y: p.born.y, own: 1, t: `${p.sex === "f" ? "Urodziła" : "Urodził"} się${p.born.place ? " — " + esc(p.born.place) : ""}` });
    for (const s of A.spouses(id)) if (s.married && s.married.y) ev.push({ y: s.married.y, own: 1, t: `Ślub z: ${A.plink(s.id)}${s.married.place ? ", " + esc(s.married.place) : ""}` });
    for (const c of A.children(id)) { const cp = A.byId.get(c); if (cp.born && cp.born.y) ev.push({ y: cp.born.y, t: `${cp.sex === "f" ? "Rodzi się córka" : "Rodzi się syn"} ${A.plink(c, cp.given)}` }); if (cp.died && cp.died.y && cp.born && cp.died.y - (cp.born.y || 0) < 15) ev.push({ y: cp.died.y, t: `Umiera ${cp.sex === "f" ? "córka" : "syn"} ${A.plink(c, cp.given)}` }); }
    for (const a of A.actsFor(id)) if (a.osoby[0] !== id && !(A.children(id).includes(a.osoby[0]) && a.k === "chrzest")) ev.push({ y: a.y, t: `Wymieniony${p.sex === "f" ? "a" : ""} w akcie: <a href="akty.html#${a.id}">${esc(a.k)} — ${esc(a.t)}</a>` });
    if (!p.private && p.died && p.died.y) ev.push({ y: p.died.y, own: 1, t: `${p.sex === "f" ? "Zmarła" : "Zmarł"}${p.died.place ? " — " + esc(p.died.place) : ""}` });
    for (const e of D.timeline) if ((e.people || []).includes(id)) ev.push({ y: e.y, hist: 1, t: `<span class="muted">${esc(e.text)}</span>` });
    ev.sort((a, b) => a.y - b.y || (b.own || 0) - (a.own || 0));
    const acts = A.actsFor(id);
    const triv = A.triviaFor(id);
    const am = (D.america || []).filter(x => x.person === id);
    $("#main").innerHTML = `<section class="page-h person-h">
        <div class="gn">${g ? "pokolenie " + g.n + " · " : ""}${LINE[p.line]}</div>
        <div class="person-name"><h1>${esc(p.given + (p.surname ? " " + p.surname : ""))}</h1>${p.maiden ? `<span class="maiden">${esc(p.maiden)}</span>` : ""}</div>
        ${A.rel(id) ? `<p class="relline">${A.FOR}: ${esc(A.rel(id))}</p>` : ""}
        <p class="small mt-2"><button class="toggle" type="button" data-contribute='${esc(JSON.stringify({ type: "osoba", id }))}'>[ wiesz coś o tej osobie? dodaj informację lub zdjęcie ]</button></p>
        <div class="mt-3">${A.certBadge(p.certainty)}${p.parentsCert ? ` &nbsp; <span class="badge">${A.mark(p.parentsCert)}powiązanie z rodzicami: ${A.CERT[p.parentsCert]}</span>` : ""}</div>
        ${life.length || p.burial ? `<div class="life">${life.map(([a, b]) => `<div><b>${a}</b> ${esc(b)}</div>`).join("")}${p.burial ? `<div><b>pochówek</b><span class="burials">${A.burial(p.burial)}</span></div>` : ""}</div>` : ""}
        <p class="mt-4"><a class="btn" href="drzewo.html?id=${encodeURIComponent(id)}${p.line === "prosta" ? "" : "&tryb=wszyscy"}">Pokaż w drzewie</a></p>
      </section>
      ${kinship(id)}
      <h2>Rodzina</h2>
      <div class="rels">${(alts.length ? "" : relBlock("Rodzice", A.parents(id))) + relBlock("Małżonkowie", A.spouses(id).map(s => s.id)) + relBlock("Dzieci", A.children(id)) + (alts.length ? "" : relBlock("Rodzeństwo", A.siblings(id))) || `<p class="muted">Brak znanych krewnych w drzewie.</p>`}</div>
      ${alts.length ? `<h2>${alts.length === 2 ? "Dwie możliwe ścieżki" : "Możliwe ścieżki"}</h2>
        <p class="intro">Rodziców nie rozstrzygnięto. ${alts.map(a => `${esc(a.label)}: ${a.parents.map(pid => A.plink(pid, A.byId.get(pid).given)).join(" i ")}`).join("; ")} — ${alts.every(a => a.c === "prawd") ? "obie prawdopodobne" : "zob. ocenę"}. Krewni z obu ścieżek mają przy pokrewieństwie dopisek ścieżki.</p>
        ${pathsTable(id)}
        <div class="rels">${alts.map(a => relBlock(`Rodzice — ścieżka ${esc(a.key)}`, a.parents) + relBlock(`Rodzeństwo — ścieżka ${esc(a.key)}`, A.children(a.parents[0]).filter(c => c !== id))).join("")}</div>` : ""}
      ${(p.facts || []).length ? `<h2>Fakty</h2><ul class="facts">${p.facts.map(f => `<li>${A.fact(f)}</li>`).join("")}</ul>` : ""}
      ${g ? `<h2>Pokolenie ${g.n}</h2><ul class="facts">${g.facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul>${g.more ? `<details><summary>szczegóły z aktów</summary><div class="more">${g.more.map(m => `<p>${esc(m)}</p>`).join("")}</div></details>` : ""}${g.src ? `<div class="src">akty: ${esc(g.src)}</div>` : ""}` : ""}
      ${ev.length > 1 ? `<h2>Oś życia</h2><ol class="lifeline">${ev.map(e => `<li class="${e.own ? "own" : ""}"><span class="y">${e.y}</span>${e.t}${e.own || e.hist ? "" : ""}${!e.own ? age(e.y) : ""}</li>`).join("")}</ol>` : ""}
      ${acts.length ? `<h2>Akty (${acts.length})</h2><ol class="acts">${acts.map(a => A.actHTML(a, { anchor: true })).join("")}</ol>` : ""}
      ${(p.refs || []).length ? `<h2>Inne akty i źródła</h2><div class="act-links">${A.refLinks(p.refs)}</div>` : ""}
      ${am.length ? `<h2>Ameryka</h2><ul class="facts">${am.map(x => `<li>${esc(x.trip || "")}${x.fate ? " — " + esc(x.fate) : ""} <a href="ameryka.html">więcej</a></li>`).join("")}</ul>` : ""}
      ${triv.length ? `<h2>Ciekawostki</h2><ul class="cards">${triv.map(card).join("")}</ul>` : ""}`;
    for (const k of document.querySelectorAll(".kin-scroll")) k.scrollLeft = (k.scrollWidth - k.clientWidth) / 2;
  }

  /* ── dwa razy od Pawła i Jadwigi ───────────────── */
  function dwieLinie() {
    const P = id => A.plink(id, A.fullName(A.byId.get(id)));
    const rows = [
      ["kacper", "adam-p", "bracia (synowie Pawła i Jadwigi)", "Paweł i Jadwiga są ich rodzicami"],
      ["walenty", "ewa-antosiak-debek", "kuzynostwo 1. stopnia (dzieci braci)", "Paweł i Jadwiga są dziadkami obojga"],
      ["feliks", "grzegorz-d", "kuzyni 2. stopnia", "Paweł i Jadwiga są pradziadkami obu"],
      ["franciszek", "adam-d", "kuzyni 3. stopnia", "Paweł i Jadwiga są prapradziadkami obu"],
      ["wincenty", "eleonora", "kuzyni 4. stopnia", "Paweł i Jadwiga są ich 3× pradziadkami (5 pokoleń wstecz)"],
    ];
    const sources = ["s1750", "u1759-sk", "u1810-ewa", "z1832-159", "u1847-225", "z1880-4"].map(i => A.actById.get(i)).filter(Boolean);
    $("#main").innerHTML = `<section class="page-h"><h1>Dwa razy od Pawła i Jadwigi<span class="dot">.</span></h1>
        <p class="lead">Wincenty Antosiak i Eleonora z Dębków — rodzice dziadka Adriana, Mariana — mieli wspólnych przodków. Dlatego Paweł i Jadwiga stoją w drzewie Adriana dwa razy.</p>
        ${A.legend()}</section>
      <h2>W skrócie</h2>
      <div class="prose">
        <p>${P("wincenty")} i ${P("eleonora")} pobrali się w 1925 r. Nie wiedzieli (a przynajmniej nic na to nie wskazuje), że są dalekimi krewnymi. Ich wspólni przodkowie to ${P("pawel")} i ${P("jadwiga")}, którzy wzięli ślub 8.02.1750 w Chorzelach.</p>
        <p>Paweł i Jadwiga mieli kilku synów. Dwóch z nich — ${P("adam-p")} (ur. 1754) i ${P("kacper")} (ur. 1759) — to bracia. Od Kacpra idzie linia Antosiaków: aż do Wincentego. Od Adama idzie inna droga: jego córka ${P("ewa-antosiak-debek")} (ur. 24.12.1810) wyszła za Józefa Dębka, a ich wnuk Adam Dębek był ojcem Eleonory. Obie linie spotykają się dopiero w 1925 r., na ślubie Wincentego i Eleonory.</p>
      </div>
      <h2>Dwie linie</h2>
      <p class="intro">Po lewej linia Antosiaków od Kacpra, po prawej linia Dębków od Adama. Na dole łączą się w Marianie i Henryce, dziadkach Adriana. Każda osoba jest linkiem.</p>
      ${kinship("pawel", { bare: true, couples: true })}
      <h2>Kim byli dla siebie</h2>
      <p class="intro">Kolejne pokolenia obu linii szły równolegle, jak dwie drabiny z jednego pnia — za każdym razem o jeden szczebel dalej od wspólnych przodków.</p>
      <div class="scroll"><table class="today"><thead><tr><th>Z linii Kacpra</th><th>Z linii Adama</th><th>Kim byli dla siebie</th><th>Wspólni przodkowie</th></tr></thead><tbody>
      ${rows.map(([a, b, r, c]) => `<tr><td>${P(a)}</td><td>${P(b)}</td><td>${esc(r)}</td><td>${esc(c)}</td></tr>`).join("")}
      </tbody></table></div>
      <h2>Skąd wiemy</h2>
      <p class="intro">Powiązanie dwóch linii opiera się na kilku aktach. Kluczowe jest to, że ${P("adam-p")}, mąż Marianny Samsłówny, był synem Pawła i Jadwigi — a jego córką była Ewa Dębkowa.</p>
      <ol class="acts">${sources.map(a => A.actHTML(a, { anchor: true })).join("")}</ol>
      <ul class="facts mt-3">
        <li>${A.mark("ok")}Chrzest Ewy (1810) podaje jej rodziców: Adama Antosiaka i Mariannę Samsłównę.</li>
        <li>${A.mark("ok")}Zgon Adama (1832) mówi, że był synem Pawła i Jadwigi. Skorowidz z 1759 r. zapisuje Kacpra jako dziecko Pawła i Jadwigi, więc obaj są braćmi.</li>
        <li>${A.mark("ok")}Zgon Ewy (1880) potwierdza, że była córką Adama i Marianny, a chrzest Grzegorza (1847) — że Ewa była żoną Józefa Dębka i matką Grzegorza, dziadka Eleonory.</li>
        <li>${A.mark("prawd")}Wiek Adama w akcie zgonu („90 lat”) nie zgadza się z rokiem urodzenia przyjętym w drzewie (1754) — urzędnicy często zaokrąglali wiek.</li>
      </ul>
      <h2>Co to znaczy dla Adriana</h2>
      <div class="prose">
        <p>Paweł i Jadwiga (oraz ich przodkowie ${P("jakub-j")} i ${P("marianna-j")}) zajmują w drzewie Adriana <b>dwa miejsca</b>: raz po stronie ojca Mariana, Wincentego, i drugi raz po stronie jego matki, Eleonory. Gdy ktoś ma tego samego przodka w dwóch miejscach, w genealogii mówi się o „zapętleniu drzewa” (po angielsku <i>pedigree collapse</i>).</p>
        <p>To zupełnie normalne w małych wsiach. Przez setki lat żeniło się tu kilka tych samych rodzin: Antosiakowie, Dębkowie, Kutowie, Chudzikowie, Bańkowie. Przy kilku pokoleniach odległości ludzie zwykle nie wiedzieli o pokrewieństwie — pięć pokoleń to dawno zapomniana rodzina.</p>
        <p>${A.certBadge("prawd")} Ciekawostka z ogólnej wiedzy, nie z aktów: według kodeksu prawa kanonicznego z 1917 r. małżeństwo blokowało pokrewieństwo tylko do bliższych stopni (mniej więcej do drugich kuzynów). Wincenty i Eleonora byli kuzynami 4. stopnia, więc w 1925 r. dyspensa raczej nie była potrzebna. W streszczeniu aktu ślubu (${A.actRefs(["s1925-40"])}) o dyspensie nie ma wzmianki.</p>
      </div>
      <p class="small mt-5"><a href="ciekawostki.html">← Ciekawostki</a> · <a href="historie.html">Historie</a></p>`;
    for (const k of document.querySelectorAll(".kin-scroll")) k.scrollLeft = (k.scrollWidth - k.clientWidth) / 2;
  }

  /* ── akty ──────────────────────────────────────── */
  function akty() {
    $("#gloss").innerHTML = D.gloss.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join("");
    const acts = D.acts.slice().sort((a, b) => a.y - b.y || a.no - b.no);
    const inActs = [...new Set(acts.flatMap(a => a.osoby))].map(id => A.byId.get(id)).sort((a, b) => a.given.localeCompare(b.given, "pl"));
    $("#f-osoba").innerHTML = `<option value="">wszystkie</option>` + inActs.map(p => `<option value="${p.id}">${esc(A.fullName(p))}${A.lifeShort(p) ? " (" + esc(A.lifeShort(p)) + ")" : ""}</option>`).join("");
    $("#f-gen").innerHTML = `<option value="">wszystkie</option>` + D.generations.map(g => `<option value="${g.n}">${g.n} — ${esc(A.byId.get(g.man).given)} × ${esc(A.byId.get(g.woman).given)}</option>`).join("");
    const ys = acts.map(a => a.y), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const fOd = $("#f-od"), fDo = $("#f-do");
    fOd.min = fDo.min = y0; fOd.max = fDo.max = y1; fOd.placeholder = y0; fDo.placeholder = y1;
    const hay = new Map(acts.map(a => [a.id, fold([a.t, a.q, a.tr, a.k, a.no, a.y, ...a.osoby.map(id => A.fullName(A.byId.get(id)))].join(" "))]));
    const list = $("#acts"), count = $("#count");
    const read = a => a.idx ? "indeks" : a.r;
    function run() {
      const q = fold($("#f-q").value.trim()), k = $("#f-typ").value, g = $("#f-gen").value, o = $("#f-osoba").value, r = $("#f-odczyt").value;
      const od = +fOd.value || y0, dO = +fDo.value || y1;
      const out = acts.filter(a => (!q || q.split(/\s+/).every(w => hay.get(a.id).includes(w))) && (!k || a.k === k) && (!g || a.g === +g) && (!o || a.osoby.includes(o)) && (!r || read(a) === r) && a.y >= od && a.y <= dO);
      list.innerHTML = out.length ? out.map(a => A.actHTML(a)).join("") : `<li class="empty">Żaden akt nie pasuje do filtrów. <button class="btn" type="button" id="reset2">Wyczyść filtry</button></li>`;
      count.textContent = out.length === acts.length ? `Wszystkie ${A.plural(acts.length, "akt", "akty", "aktów")}` : `Pokazano ${out.length} z ${acts.length}`;
      const r2 = $("#reset2"); if (r2) r2.addEventListener("click", reset);
    }
    function reset() { for (const el of document.querySelectorAll("#filters input, #filters select")) el.value = ""; run(); }
    for (const el of document.querySelectorAll("#filters input, #filters select")) el.addEventListener("input", run);
    $("#reset").addEventListener("click", reset);
    const params = new URLSearchParams(location.search);
    if (params.get("osoba")) $("#f-osoba").value = params.get("osoba");
    run();
    function toHash() {
      const h = decodeURIComponent(location.hash.slice(1));
      if (!h || !A.actById.get(h)) return;
      if (!document.getElementById(h)) reset();
      const el = document.getElementById(h);
      if (el) { document.querySelectorAll(".act.hl").forEach(x => x.classList.remove("hl")); el.classList.add("hl"); el.scrollIntoView({ block: "start" }); }
    }
    addEventListener("hashchange", toHash);
    toHash();
  }

  /* ── ciekawostki ───────────────────────────────── */
  function ciekawostki() {
    const all = D.trivia.slice().sort((a, b) => (a.year || 9999) - (b.year || 9999));
    const chips = $("#chips");
    const kinds = [["", "wszystkie"], ...KIND_ORDER.map(k => [k, k])];
    let cur = "";
    const draw = () => {
      chips.innerHTML = kinds.map(([k, l]) => `<button class="chip" type="button" data-k="${k}" aria-pressed="${k === cur}">${l} <span class="muted">${k ? all.filter(t => t.kind === k).length : all.length}</span></button>`).join("");
      const out = all.filter(t => !cur || t.kind === cur);
      $("#cards").innerHTML = out.map(card).join("");
    };
    chips.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (!b) return; cur = b.dataset.k; draw(); });
    draw();
  }

  /* ── ameryka ───────────────────────────────────── */
  function usMap(entries) {
    const P = D.americaPlaces, Wd = 400, Hd = 170, L0 = -92.5, L1 = -66.5, B0 = 37.8, B1 = 43;
    const x = lon => ((lon - L0) / (L1 - L0)) * Wd, y = lat => Hd - ((lat - B0) / (B1 - B0)) * Hd;
    const pt = k => [x(P[k].lon), y(P[k].lat)];
    const used = new Set(entries.flatMap(e => e.places || []));
    const lab = [
      ["chicago", "Chicago", 0, -10, "middle"], ["stlouis", "St. Louis", 8, 14, "start"], ["baltimore", "Baltimore (port)", -8, 16, "end"],
      ["ellis", "Ellis Island", 8, 14, "start"], ["newark", "Newark, Millburn?", -10, 18, "end"], ["middletown", "Connecticut", 6, -12, "start"],
    ];
    const grid = [-90, -85, -80, -75].map(l => `<line x1="${x(l)}" x2="${x(l)}" y1="0" y2="${Hd}" class="g"/>`).join("") + [39, 41].map(b => `<line x1="0" x2="${Wd}" y1="${y(b)}" y2="${y(b)}" class="g"/>`).join("");
    const routes = [
      ["ellis", "manchester"], ["ellis", "middletown"], ["ellis", "stlouis"], ["ellis", "millburn"], ["ellis", "newark"], ["baltimore", "stlouis"], ["ellis", "chicago"],
    ].filter(([, b]) => used.has(b)).map(([a, b]) => { const [x1, y1] = pt(a), [x2, y2] = pt(b); const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.abs(x1 - x2) * 0.12; return `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" class="r"/>`; }).join("");
    const sea = [["ellis"], ["baltimore"]].map(([k]) => { const [px, py] = pt(k); return `<path d="M${Wd},${py + 30} Q${(px + Wd) / 2},${py + 34} ${px},${py}" class="sea"/>`; }).join("");
    const dots = Object.keys(P).map(k => { const [px, py] = pt(k); return `<circle cx="${px}" cy="${py}" r="${P[k].port ? 3.5 : 4}" class="${P[k].port ? "port" : "d"}"/>`; }).join("");
    const labels = lab.map(([k, t, dx, dy, an]) => { const [px, py] = pt(k); return `<text x="${px + dx}" y="${py + dy}" text-anchor="${an}">${t}</text>`; }).join("");
    return `<svg class="usmap" viewBox="-10 -14 ${Wd + 20} ${Hd + 30}" role="img" aria-label="Mapka: Chicago, St. Louis, Baltimore, Ellis Island, Newark, Connecticut">
      ${grid}${sea}${routes}${dots}${labels}<text x="${Wd}" y="${Hd + 12}" text-anchor="end" class="s">← z Bremy i Hamburga</text></svg>`;
  }
  function todaySection(T) {
    return `<h2>Rodzina w USA dziś</h2>
      <p class="intro">Ilu żyjących krewnych — potomków emigrantów z Połoni — wymieniają publiczne nekrologi ich krewnych z lat 2010–2025. Na stronie tylko liczby, bez imion i nazwisk. Stan „podany” — źródło przypisuje go tej osobie; „wnioskowany” — to stan zmarłego krewnego.</p>
      <dl class="stats stats-tight"><div><dt>żyjących krewnych</dt><dd>${T.total}</dd></div><div><dt>gałęzie</dt><dd>${T.branches}</dd></div><div><dt>niepewnych, niewliczonych</dt><dd>${T.uncertain}</dd></div></dl>
      <div class="scroll"><table class="today"><thead><tr><th>Gałąź</th><th>Osób</th><th>Kim są dla Adriana</th><th>Wspólni przodkowie z Adrianem</th><th>Stany</th><th>Źródła z lat</th></tr></thead><tbody>
      ${T.rows.map(r => `<tr><td>${esc(r.branch)}</td><td>${r.count}</td><td>${esc(r.adrian || "")}</td><td>${esc(r.common)}</td><td>${esc(r.states)}</td><td>${esc(r.years)}</td></tr>`).join("")}
      <tr><td><b>Razem</b></td><td><b>${T.total}</b></td><td></td><td></td><td>NC, MO, FL, IL, TN</td><td></td></tr>
      </tbody></table></div>
      ${listC(T.notes)}
      <p class="src">Stan na ${esc(T.asof)}. Kontakt z żyjącymi krewnymi nawiązuje się poza stroną.</p>`;
  }
  function ameryka() {
    const I = D.americaInfo, all = D.america || [];
    const entry = e => `<li class="act">
        <div class="yr">${esc(((e.trip || "").match(/\b1[89]\d\d\b/) || [""])[0])}</div>
        <div>
          <div class="act-head"><span class="act-title">${e.person ? A.plink(e.person, e.name) : esc(e.name)}</span>${A.certBadge(e.c)}${e.alias ? `<span class="act-meta">${esc(e.alias)}</span>` : ""}</div>
          <div class="life">${e.born ? `<div><b>ur.</b> ${esc(e.born)}</div>` : ""}${e.trip ? `<div><b>podróż</b> ${esc(e.trip)}</div>` : ""}${e.died ? `<div><b>zm.</b> ${esc(e.died)}</div>` : ""}${(e.burial || (e.person && (A.byId.get(e.person) || {}).burial)) ? `<div><b>pochówek</b><span class="burials">${A.burial(e.burial || A.byId.get(e.person).burial)}</span></div>` : ""}</div>
          ${e.fate ? `<p class="act-tr">${esc(e.fate)}</p>` : ""}
          ${(e.person && A.rel(e.person)) || (A.V.def && e.adrian) ? `<p class="relline small">${A.FOR}: ${esc((e.person && A.rel(e.person)) || e.adrian)}</p>` : ""}
          ${e.rel ? `<p class="act-tr"><b>rodzina</b>${A.mark(e.rel.c)}${esc(e.rel.t)}</p>` : ""}
          <div class="act-links">${(e.sources || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("")}</div>
        </div></li>`;
    const sure = all.filter(e => e.c === "ok"), fb = all.filter(e => e.c === "prawd"), maybe = all.filter(e => e.c === "hyp");
    const P = D.americaPlaces;
    const placeRows = Object.keys(P).filter(k => !P[k].port).map(k => [k, all.filter(e => (e.places || []).includes(k))]).filter(([, v]) => v.length);
    $("#main").innerHTML = `<section class="page-h"><h1>Ameryka<span class="dot">.</span></h1>
        <p class="lead">Wątek emigracji: kto z Połoni wyjechał do USA, dokąd trafił i co z tego wiemy. Cel — odnaleźć ślady krewnych.</p>
        <p class="status mt-3">poszukiwania w toku</p></section>
      <h2>Co wiemy</h2>${listC(I.known)}
      <h2>Emigranci z Połoni</h2>
      <p class="intro">Połoń stoi w ich dokumentach: na liście pasażerów, w karcie poborowej albo w petycji o obywatelstwo.</p>
      ${sure.length ? `<ol class="acts">${sure.map(entry).join("")}</ol>` : `<p class="empty">Nikogo jeszcze nie wpisano. Emigrantów dopisuje się w pliku data/ameryka.js.</p>`}
      ${fb.length ? `<h2>Według strony FB I. Antosiaka</h2><p class="intro">Emigranci znani ze strony „Połoń - Matecznik Rodziny Antosiak” — źródło wtórne, do potwierdzenia dokumentami.</p><ol class="acts">${fb.map(entry).join("")}</ol>` : ""}
      <h2>Możliwi</h2>
      <p class="intro">Bez twardego dowodu na Połoń — hipotezy do sprawdzenia.</p>
      ${maybe.length ? `<ol class="acts">${maybe.map(entry).join("")}</ol>` : `<p class="empty">Brak.</p>`}
      ${D.americaToday ? todaySection(D.americaToday) : ""}
      <h2>Dokąd trafili</h2>
      <div class="map-wrap">${usMap(all)}</div>
      <table class="places"><tbody>${placeRows.map(([k, v]) => `<tr><td>${esc(P[k].name)}</td><td>${v.map(e => `${esc(e.name)}${e.c === "hyp" ? " (?)" : ""}`).join(", ")}</td></tr>`).join("")}</tbody></table>
      <h2>Tło: dlaczego i jak wyjeżdżano</h2>${listC(I.context)}
      <h2>Nie ta rodzina</h2>${listC(I.notUs)}
      <h2>Jak szukać krewnych</h2>${listC(I.contact)}
      <div class="note"><p>${esc(I.rules)}</p></div>`;
  }

  /* ── babcia ────────────────────────────────────── */
  const shootingHTML = S => `<h2>${esc(S.title)}</h2>
      ${S.key ? `<div class="note key"><p>${A.mark(S.key.c)}<b>${esc(S.key.title)}</b> — ${esc(S.key.label || A.CERT[S.key.c])}</p>${S.key.t.map(t => `<p>${esc(t)}</p>`).join("")}${S.key.note ? `<p class="muted small">${esc(S.key.note)}</p>` : ""}</div>` : ""}
      <div class="mt-3">${listC(S.items)}</div>
      <p class="muted small mt-3">co to rozstrzygnie</p><ol class="todo">${S.resolve.map(t => `<li>${esc(t)}</li>`).join("")}</ol>
      <p class="src row">${A.srcLinks(S.sources)}</p>`;
  function babcia() {
    const G = D.grandma;
    $("#main").innerHTML = `<section class="page-h"><h1>Babcia Henryka<span class="dot">.</span></h1>
        <p class="lead">Henryka z domu Mieszała, żona dziadka ${A.plink("marian", "Mariana")}, córka Władysława Mieszały i Zofii ze Szczepanków. Imiona rodziców i dziadków znamy z relacji rodzinnej; dokumenty prowadzą do parafii Nowa Wieś koło Ostrołęki. Rodzina Zofii jest ustalona; Władysław był synem Adama i Elżbiety z Gąsków. Formalnie potwierdzi to akt chrztu babci lub akt ślubu Władysława i Zofii (USC Olszewo-Borki).</p>
        <p class="status mt-3">${esc(G.status.replace(/\.$/, ""))}</p>
        ${A.legend()}</section>
      <h2>Rodzina babci</h2>
      <ol class="gens">${[["prapradziadkowie (rodzice Władysława)", A.parents("wladyslaw-m")], ["prapradziadkowie (rodzice Zofii)", ["aleksander-sz", "katarzyna-sz"]], ["pradziadkowie (rodzice babci)", ["wladyslaw-m", "zofia-m"]], ["dziadkowie", ["henryka", "marian"]]].map(([l, ids, c]) => { const nm = p => `<span><a class="who" href="osoba.html?id=${p.id}">${esc(p.given + (p.maiden || !p.surname ? "" : " " + p.surname))}</a>${p.maiden ? ` <span class="maiden">${esc(p.maiden)}</span>` : ""}</span>`; const [a, b] = ids.map(id => A.byId.get(id)); return `<li class="gen ${l === "dziadkowie" ? "me" : c || "ok"}"><div class="yr"></div><div class="body"><div class="gn">${l}</div><div class="couple">${nm(a)}<span class="x">×</span>${nm(b)}</div></div></li>`; }).join("")}</ol>
      <p class="src">źródło: relacja rodzinna, 2026; akty chrztu i ślubu z Nowej Wsi · bez dat i miejsc</p>
      <h2>Co wiemy</h2>${listC(G.known)}
      <h2>Nazwisko Mieszała</h2>${listC(G.surname)}
      <h2>Tropy</h2>
      ${G.leads.map(l => `<div class="note"><p>${A.mark(l.c)}<b>${esc(l.title)}</b> — ${A.CERT[l.c]}</p>
        <p class="muted small">co za tym przemawia</p>${listC(l.for)}
        <p class="muted small mt-2">co przeciw</p>${listC(l.against)}
        <p class="src row">${A.srcLinks(l.sources)}</p></div>`).join("")}
      ${G.shooting ? shootingHTML(G.shooting) : ""}
      <h2>Uwaga na imienniczki</h2>${listC(G.pitfalls)}
      <h2>Co to rozstrzygnie</h2><ol class="todo">${G.resolve.map(t => `<li>${esc(t)}</li>`).join("")}</ol>`;
  }

  /* ── źródła ────────────────────────────────────── */
  function zrodla() {
    const GR = [["rodzina", "Rodzina"], ["archiwa", "Archiwa i indeksy"], ["kontekst", "Historia i kontekst"], ["ameryka", "Ameryka"], ["nazwiska", "Nazwiska"], ["robocze", "Materiały robocze"]];
    $("#main").innerHTML = `<section class="page-h"><h1>Źródła i metoda<span class="dot">.</span></h1>
        <p class="lead">Skąd pochodzą dane, jak je czytamy i oznaczamy oraz co zostało do sprawdzenia.</p></section>
      <h2>Metoda</h2>${A.legend()}<div class="mt-3">${listC(D.method)}</div>
      ${GR.map(([g, t]) => { const ss = D.sources.filter(s => s.group === g); return ss.length ? `<h2>${t}</h2><ul class="facts">${ss.map(s => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>` : esc(s.label)}</li>`).join("")}</ul>` : ""; }).join("")}
      <h2>Imiennicy i pułapki</h2>${listC(D.pitfalls)}
      <h2>Do zrobienia</h2><ol class="todo">${D.todo.map(t => `<li>${esc(t)}</li>`).join("")}</ol>`;
  }

  ({ start, osoba, "dwie-linie": dwieLinie, akty, "akty-mama": akty, "ciekawostki-mama": ciekawostki, "ciekawostki-pac": ciekawostki, ciekawostki, ameryka, babcia, zrodla })[page]?.();
})();
