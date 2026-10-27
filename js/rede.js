/* Atividade 5 · Rede de colaboração ("constelação").
   Liga mulheres a instituições citadas nas colunas instituição_atuacao, colaboradoras e
   instituiçõesColaboradores, e mulheres entre si quando uma cita a outra como colaboradora.
   Só entram instituições ligadas a pelo menos duas mulheres. */
(function () {
  const { esc, fold, portrait, axisColor } = U;

  // Instituições reconhecidas no texto livre da planilha (sigla → expressão).
  const INST = [
    ["Fiocruz", /fiocruz|oswaldo cruz|\bIOC\b|\bENSP\b/i, "Fundação Oswaldo Cruz (Brasil)"],
    ["MORHAN", /morhan|movimento de reintegra/i, "Movimento de Reintegração das Pessoas Atingidas pela Hanseníase"],
    ["The Leprosy Mission", /leprosy mission/i, "The Leprosy Mission (organização internacional)"],
    ["ALERT", /\bALERT\b/, "All Africa Leprosy, Tuberculosis and Rehabilitation Training Centre (Etiópia)"],
    ["LSHTM", /LSHTM|london school of hygiene/i, "London School of Hygiene & Tropical Medicine (Reino Unido)"],
    ["Colorado State", /colorado state/i, "Colorado State University (EUA)"],
    ["Instituto Pasteur", /pasteur/i, "Institut Pasteur (França)"],
    ["Leiden (LUMC)", /leiden/i, "Leiden University Medical Center (Países Baixos)"],
    ["AIIMS", /AIIMS|all india institute/i, "All India Institute of Medical Sciences (Índia)"],
    ["NIH", /\bNIH\b|NIAID|national institutes? of (health|allergy)/i, "National Institutes of Health (EUA)"],
    ["Royal Tropical Institute", /royal tropical institute/i, "Royal Tropical Institute (Amsterdã)"],
    ["Hay Ling Chau", /hay ling chau/i, "Hospital de Hay Ling Chau (Hong Kong)"],
    ["Assistência aos Lázaros", /assist[eê]ncia aos l[aá]zaros/i, "Sociedades de Assistência aos Lázaros e Defesa contra a Lepra (Brasil)"],
    ["LEPRA / BELRA", /LEPRA Society|BELRA|british empire leprosy/i, "LEPRA, antiga British Empire Leprosy Relief Association"],
    ["OMS", /\bOMS\b|organiza[cç][aã]o mundial da sa[uú]de|\bWHO\b/i, "Organização Mundial da Saúde"],
    ["ONU", /na[cç][oõ]es unidas|\bONU\b/i, "Organização das Nações Unidas"],
    ["UFRJ", /UFRJ|federal do rio de janeiro/i, "Universidade Federal do Rio de Janeiro"],
    ["Rockefeller", /rockefeller/i, "Rockefeller University (EUA)"],
    ["Univ. da Califórnia", /UCLA|universidade da calif|university of california/i, "University of California (EUA)"],
  ];

  // "Elizabeth Pereira Sampaio" ↔ Elisabeth, "Jannine Ebenso" ↔ Jeannine: mesmo sobrenome + mesma inicial.
  function citedWomen(text, women, self) {
    return (text || "").split(/[;,]/).map(s => fold(s).replace(/\(.*?\)/g, "").trim().split(/\s+/)).filter(t => t.length >= 2)
      .map(t => women.find(w => {
        if (w === self) return false;
        const n = fold(w.name.replace(/\(.*?\)/g, "")).split(/\s+/);
        return n.at(-1) === t.at(-1) && n[0][0] === t[0][0];
      })).filter(Boolean);
  }

  function build(D) {
    const women = D.women;
    const inst = INST.map(([id, re, full]) => ({ id, full, kind: "inst", members: [] }));
    women.forEach(w => {
      const text = [w.institution, w.collaborators].join(" ");
      INST.forEach(([, re], k) => { if (re.test(text)) inst[k].members.push(w); });
    });
    const shared = inst.filter(n => n.members.length >= 2);
    const links = [];
    shared.forEach(n => n.members.forEach(w => links.push({ source: w.id, target: n.id, kind: "inst" })));
    const pairs = new Set();
    women.forEach(w => citedWomen(w.collaborators, women, w).forEach(o => {
      const k = [w.id, o.id].sort().join("|");
      if (!pairs.has(k)) { pairs.add(k); links.push({ source: w.id, target: o.id, kind: "pessoa" }); }
    }));
    const linked = new Set(links.flatMap(l => [l.source, l.target]));
    const nodes = [
      ...women.map(w => ({ id: w.id, kind: "woman", w, isolated: !linked.has(w.id) })),
      ...shared.map(n => ({ ...n })),
    ];
    return { nodes, links };
  }

  function mount(root, D) {
    const { nodes, links } = build(D);
    const W = 960, H = 620, R = 17;
    root.classList.add("rede");
    root.innerHTML = `
      <div class="rede__body">
        <div class="rede__canvas">
          <svg class="rede__svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rede: mulheres ligadas às instituições onde atuaram e entre si"></svg>
          <div class="rede__legend">
            <span><i class="rede__lw"></i>mulher</span>
            <span><i class="rede__li"></i>instituição (2 ou mais mulheres)</span>
            <span><i class="rede__lp"></i>colaboraram entre si</span>
          </div>
        </div>
        <aside class="rede__side" aria-live="polite"></aside>
      </div>`;

    const svg = d3.select(root.querySelector("svg"));
    // Fundo estrelado
    const stars = d3.range(110).map(() => [Math.random() * W, Math.random() * H, Math.random() * 1.3 + .3]);
    svg.append("g").attr("class", "rede__stars").selectAll("circle").data(stars).join("circle")
      .attr("cx", d => d[0]).attr("cy", d => d[1]).attr("r", d => d[2]).style("animation-delay", () => `${-Math.random() * 4}s`);
    svg.append("defs").html(`<clipPath id="rede-face"><circle r="${R}"/></clipPath>`);

    const byId = new Map(nodes.map(n => [n.id, n]));
    const isolated = nodes.filter(n => n.isolated);
    const active = nodes.filter(n => !n.isolated);
    // Mulheres sem ligações ficam num arco embaixo, como estrelas soltas.
    isolated.forEach((n, k) => {
      n.fx = W * (0.08 + 0.84 * (isolated.length > 1 ? k / (isolated.length - 1) : .5)); n.fy = H - 34;
    });

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(l => l.kind === "pessoa" ? 80 : 105).strength(.4))
      .force("charge", d3.forceManyBody().strength(d => d.kind === "inst" ? -520 : -240))
      .force("collide", d3.forceCollide(d => d.kind === "inst" ? 40 : R + 16))   // espaço para o nome
      .force("x", d3.forceX(W / 2).strength(.04))
      .force("y", d3.forceY((H - 70) / 2).strength(.07))
      .stop();
    for (let k = 0; k < 400; k++) sim.tick();
    active.forEach(n => { n.x = Math.max(40, Math.min(W - 40, n.x)); n.y = Math.max(30, Math.min(H - 90, n.y)); });

    const gl = svg.append("g").selectAll("line").data(links).join("line")
      .attr("class", d => `rede__link rede__link--${d.kind}`)
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);

    const gn = svg.append("g").selectAll("g").data(nodes).join("g")
      .attr("class", d => `rede__node rede__node--${d.kind}${d.isolated ? " is-isolated" : ""}`)
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .attr("tabindex", 0).attr("role", "button")
      .attr("aria-label", d => d.kind === "inst" ? `${d.id}: ${d.members.length} mulheres` : d.w.name);

    const inst = gn.filter(d => d.kind === "inst");
    inst.append("path").attr("d", d => star(10 + Math.min(d.members.length, 9) * 1.6));
    inst.append("text").attr("y", d => 24 + Math.min(d.members.length, 9) * 1.6).text(d => d.id);

    const wn = gn.filter(d => d.kind === "woman").style("--c", d => axisColor(d.w.axis));
    wn.append("circle").attr("r", R + 3).attr("class", "rede__ring");
    wn.append("circle").attr("r", R).attr("class", "rede__bg");
    wn.append("text").attr("class", "rede__ini").attr("dy", ".35em").text(d => U.initials(d.w.name));
    wn.filter(d => d.w.photo).append("image").attr("href", d => d.w.photo)
      .attr("x", -R).attr("y", -R).attr("width", 2 * R).attr("height", 2 * R)
      .attr("preserveAspectRatio", "xMidYMid slice").attr("clip-path", "url(#rede-face)")
      .on("error", function () { this.remove(); });
    wn.append("circle").attr("r", R).attr("class", "rede__tint");
    wn.append("text").attr("class", "rede__wname").attr("y", R + 14).text(d => d.w.shortName);

    // ----- Destaque e painel lateral -----
    const neighbors = id => new Set(links.flatMap(l => l.source.id === id ? [l.target.id] : l.target.id === id ? [l.source.id] : []));
    let selected = null;

    function focus(d) {
      if (!d) {
        root.classList.remove("has-focus");
        gn.classed("is-on", false); gl.classed("is-on", false);
        return;
      }
      const nb = neighbors(d.id);
      root.classList.add("has-focus");
      gn.classed("is-on", n => n === d || nb.has(n.id));
      gl.classed("is-on", l => l.source === d || l.target === d);
    }

    function side(d) {
      const box = root.querySelector(".rede__side");
      if (!d) {
        const inst = nodes.filter(n => n.kind === "inst").sort((a, b) => b.members.length - a.members.length);
        const pairs = links.filter(l => l.kind === "pessoa").length;
        box.innerHTML = `
          <p class="rede__big">${active.filter(n => n.kind === "woman").length}<small> de ${D.women.length} mulheres</small></p>
          <p>estão ligadas por <b>${inst.length} instituições</b> em comum e <b>${pairs} parcerias</b> diretas.</p>
          <p class="preview-label">Instituições que mais conectam</p>
          <ol class="rede__rank">${inst.slice(0, 6).map(n => `<li><button data-id="${esc(n.id)}">${esc(n.id)}<span>${n.members.length}</span></button></li>`).join("")}</ol>
          <p class="rede__hint">Toque numa estrela ou num retrato para ver as conexões.</p>`;
        return;
      }
      const nb = [...neighbors(d.id)].map(id => byId.get(id));
      if (d.kind === "inst") {
        box.innerHTML = `
          <button class="rede__back">← visão geral</button>
          <h3>${esc(d.id)}</h3><p class="rede__full">${esc(d.full)}</p>
          <p class="preview-label">${d.members.length} mulheres ligadas</p>
          <div class="rede__people">${d.members.map(w => `<button data-w="${w.id}">${portrait(w, { size: 40 })}<span>${esc(w.shortName)}</span></button>`).join("")}</div>`;
      } else {
        const w = d.w;
        const insts = nb.filter(n => n.kind === "inst"), people = nb.filter(n => n.kind === "woman");
        box.innerHTML = `
          <button class="rede__back">← visão geral</button>
          <div class="rede__who">${portrait(w, { size: 56 })}<h3>${esc(w.name)}</h3></div>
          ${insts.length ? `<p class="preview-label">Instituições em comum</p><ul class="rede__chips">${insts.map(n => `<li><button data-id="${esc(n.id)}">${esc(n.id)}</button></li>`).join("")}</ul>` : ""}
          ${people.length ? `<p class="preview-label">Colaborou com</p><div class="rede__people">${people.map(n => `<button data-w="${n.w.id}">${portrait(n.w, { size: 40 })}<span>${esc(n.w.shortName)}</span></button>`).join("")}</div>` : ""}
          ${!insts.length && !people.length ? `<p>Nenhuma instituição em comum com outras mulheres desta página ${w.institution ? `— atuou em ${esc(w.institution)}` : ""}.</p>` : ""}
          <button class="btn btn--light rede__perfil">Conhecer a história</button>`;
        box.querySelector(".rede__perfil").addEventListener("click", () => PERFIL.open(w));
      }
    }

    function select(d) { selected = d; focus(d); side(d); }
    gn.on("click", (e, d) => { e.stopPropagation(); select(selected === d ? null : d); })
      .on("keydown", (e, d) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(d); } })
      .on("pointerenter", (e, d) => { if (e.pointerType === "mouse") focus(d); })
      .on("pointerleave", e => { if (e.pointerType === "mouse") focus(selected); });
    svg.on("click", () => select(null));
    root.querySelector(".rede__side").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.classList.contains("rede__back")) select(null);
      else if (b.dataset.id) select(byId.get(b.dataset.id));
      else if (b.dataset.w) select(byId.get(b.dataset.w));
    });
    side(null);
  }

  // Estrela de 4 pontas (instituições)
  function star(r) {
    const p = [];
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 - Math.PI / 2, rr = k % 2 ? r * .38 : r;
      p.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
    }
    return `M${p.join("L")}Z`;
  }

  window.REDE = { mount, build };
})();
