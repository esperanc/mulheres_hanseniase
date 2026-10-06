/* Atividade 1 · Mapa mundial + mapa de impacto.
   Mapa-múndi (D3 + TopoJSON locais, projeção Equal Earth) com coroplético dos
   indicadores da OMS (camada "Impacto") e, por cima, a camada "Mulheres":
   retrato no local de nascimento + arcos até os locais de atuação. */
(function () {
  const GEO_URL = "data/geo/countries.json";   // Natural Earth 50m simplificado, id = ISO3
  const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
  const regionName = (() => {
    try { const dn = new Intl.DisplayNames(["pt-BR"], { type: "region" }); return c => { try { return dn.of(c); } catch { return null; } }; }
    catch { return () => null; }
  })();

  // Rampa sequencial em roxo: claro → escuro. A classe 0 é "zero casos".
  const RAMP = ["#e2dbea", "#d6c0f0", "#b386e4", "#8d43cf", "#62209d", "#3a0f57"];

  const INDICATORS = {
    detection: {
      label: "Casos novos", unit: "por 100 mil habitantes",
      breaks: [0.1, 1, 5, 10],
      note: "Quantas pessoas receberam o diagnóstico no ano, para cada 100 mil habitantes.",
    },
    prevalence: {
      label: "Em tratamento", unit: "por 10 mil habitantes",
      breaks: [0.01, 0.1, 0.5, 1],
      note: "Quantas pessoas estavam em tratamento, para cada 10 mil habitantes. A OMS considera a doença eliminada como problema de saúde pública abaixo de 1 por 10 mil.",
    },
    g2d: {
      label: "Diagnóstico tardio", unit: "por 1 milhão de habitantes",
      breaks: [0.5, 1, 3, 5],
      note: "Casos novos que já chegaram com incapacidade visível (grau 2), para cada 1 milhão de habitantes. Quanto maior, mais tarde as pessoas estão sendo diagnosticadas.",
    },
  };

  // 0 → classe 0; valores positivos → 1..5 conforme os limiares
  const classOf = (v, breaks) => v == null ? -1 : v === 0 ? 0 : 1 + breaks.filter(b => v >= b).length;

  function legendLabels(breaks) {
    const f = fmt.format;
    return ["0", `menos de ${f(breaks[0])}`,
      ...breaks.slice(0, -1).map((b, i) => `${f(b)} a ${f(breaks[i + 1])}`),
      `${f(breaks.at(-1))} ou mais`];
  }

  function countryName(iso3, iso2, epi, fallback) {
    return (iso2 && regionName(iso2)) || epi?.country || fallback || iso3;
  }

  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const initials = n => n.split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("");
  const axisColor = a => a ? `var(--eixo-${a.id})` : "var(--roxo-600)";
  const R = 15;              // raio do retrato no mapa, em pixels de tela
  const NEUTRAL = "#e6e0ee"; // países com a camada Impacto desligada

  // Arco curvo (no plano projetado) entre dois pontos, sempre "para cima".
  function arcPath([x1, y1], [x2, y2]) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    let nx = -dy / d, ny = dx / d;
    if (ny > 0) nx = -nx, ny = -ny;
    const bend = Math.min(0.3 * d, 90);
    return `M${x1},${y1}Q${(x1 + x2) / 2 + nx * bend},${(y1 + y2) / 2 + ny * bend} ${x2},${y2}`;
  }

  async function mount(root, D) {
    root.classList.add("mapa");
    root.innerHTML = `
      <div class="mapa__bar">
        <div class="mapa__layers" role="group" aria-label="Camadas do mapa">
          <button class="layer" aria-pressed="true" data-layer="women">Mulheres</button>
          <button class="layer" aria-pressed="true" data-layer="impact">Impacto</button>
        </div>
        <div class="seg" role="radiogroup" aria-label="Indicador">
          ${Object.entries(INDICATORS).map(([k, m], i) =>
            `<button role="radio" aria-checked="${i === 0}" data-ind="${k}">${m.label}</button>`).join("")}
        </div>
      </div>
      <div class="mapa__axes" role="group" aria-label="Filtrar por eixo">
        ${D.AXES.filter(a => D.women.some(w => w.axis === a)).map(a =>
          `<button class="chip-toggle" aria-pressed="true" data-axis="${a.id}" style="--c:var(--eixo-${a.id})">${a.label}</button>`).join("")}
      </div>
      <p class="mapa__note"></p>
      <div class="mapa__body">
        <div class="mapa__canvas">
          <svg class="mapa__svg" aria-label="Mapa-múndi: onde as mulheres nasceram e atuaram, e indicadores de hanseníase por país"></svg>
          <div class="mapa__zoom">
            <button data-z="in" aria-label="Aproximar">+</button>
            <button data-z="out" aria-label="Afastar">−</button>
            <button data-z="reset" aria-label="Ver o mundo todo">⟲</button>
          </div>
          <div class="mapa__tip" hidden></div>
        </div>
        <aside class="mapa__side">
          <div class="mapa__stats">
            <p class="mapa__headline"></p>
            <p class="preview-label">Maiores taxas</p>
            <ol class="mapa__rank"></ol>
          </div>
          <article class="mapa__card" hidden aria-live="polite"></article>
        </aside>
      </div>
      <div class="mapa__legend"></div>
      <div class="mapa__people" role="list" aria-label="Mulheres no mapa"></div>
      <p class="mapa__source">Fontes: Organização Mundial da Saúde (OMS); fronteiras: Natural Earth. Países-ilha pequenos aparecem como círculos.
        Locais de nascimento e atuação aproximados, em validação.</p>`;

    const $ = s => root.querySelector(s);
    const topo = await (await fetch(GEO_URL)).json();
    const land = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]).features;
    const epi = D.epi;

    // Dimensões fixas no viewBox; o SVG escala com o contêiner.
    const W = 960, H = 500;
    const projection = d3.geoEqualEarth().fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" });
    const path = d3.geoPath(projection);
    const svg = d3.select($(".mapa__svg")).attr("viewBox", `0 0 ${W} ${H}`);

    svg.append("defs").html(`
      <pattern id="mapa-nodata" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#e4e2e8"/><line x1="0" y1="0" x2="0" y2="6" stroke="#b9b4c2" stroke-width="2"/>
      </pattern>
      <clipPath id="mapa-face"><circle r="${R}"/></clipPath>`);

    const g = svg.append("g");
    g.append("path").attr("class", "mapa__sphere").attr("d", path({ type: "Sphere" }));
    g.append("path").attr("class", "mapa__graticule").attr("d", path(d3.geoGraticule10()));

    const countries = g.append("g").selectAll("path").data(land).join("path")
      .attr("class", "mapa__country").attr("d", path);

    // Países pequenos demais para ver (ex.: Comores, Kiribati) ganham um círculo.
    // (Territórios menores que compartilham o código de um país grande, como os da Austrália, ficam de fora.)
    const big = new Set(land.filter(f => path.area(f) >= 6).map(f => f.id));
    const small = land.filter(f => path.area(f) < 6 && epi.has(f.id) && !big.has(f.id));
    const dots = g.append("g").selectAll("circle").data(small).join("circle")
      .attr("class", "mapa__country mapa__country--dot")
      .attr("cx", f => path.centroid(f)[0]).attr("cy", f => path.centroid(f)[1]).attr("r", 4);

    const shapes = g.selectAll(".mapa__country");   // polígonos + círculos
    const iso2Of = new Map(land.map(f => [f.id, f.properties.iso2]));
    const nameOf = iso3 => countryName(iso3, iso2Of.get(iso3), epi.get(iso3));

    // ----- Camada Mulheres -----
    const women = D.women.filter(w => w.birth).map(w => ({
      w,
      p0: projection([w.birth.lon, w.birth.lat]),
      work: w.work.map(p => ({ ...p, xy: projection([p.lon, p.lat]) })),
    }));
    const lw = g.append("g").attr("class", "mapa__women");
    const arcs = lw.append("g").selectAll("g").data(women).join("g").attr("class", "mapa__trip")
      .style("--c", d => axisColor(d.w.axis));
    arcs.selectAll("path").data(d => d.work.filter(p => Math.hypot(p.xy[0] - d.p0[0], p.xy[1] - d.p0[1]) > 1)
      .map(p => arcPath(d.p0, p.xy))).join("path").attr("class", "mapa__arc").attr("d", x => x).attr("pathLength", 1);
    arcs.selectAll("circle").data(d => d.work).join("circle").attr("class", "mapa__workpt")
      .attr("cx", p => p.xy[0]).attr("cy", p => p.xy[1]).attr("r", 4);
    const leaders = lw.append("g").selectAll("line").data(women).join("line").attr("class", "mapa__leader")
      .attr("x1", d => d.p0[0]).attr("y1", d => d.p0[1]);
    const markers = lw.append("g").selectAll("g").data(women).join("g").attr("class", "mapa__face")
      .attr("tabindex", 0).attr("role", "button").attr("aria-label", d => `${d.w.name}: ver no mapa`)
      .style("--c", d => axisColor(d.w.axis));
    markers.append("circle").attr("r", R + 3).attr("class", "mapa__ring");
    markers.append("circle").attr("r", R).attr("class", "mapa__bg");
    markers.append("text").attr("dy", "0.35em").text(d => initials(d.w.name));
    markers.filter(d => d.w.photo).append("image").attr("href", d => d.w.photo)
      .attr("x", -R).attr("y", -R).attr("width", 2 * R).attr("height", 2 * R)
      .attr("preserveAspectRatio", "xMidYMid slice").attr("clip-path", "url(#mapa-face)")
      .on("error", function () { this.remove(); });
    markers.append("circle").attr("r", R).attr("class", "mapa__tint");

    // Afasta retratos que se sobrepõem (mesma cidade ou cidades vizinhas) e liga
    // cada um ao ponto real por uma linha fina. Recalculado a cada nível de zoom.
    // k = zoom atual; u = unidades do viewBox por pixel de tela (o SVG escala com a largura),
    // para que retratos e pontos tenham o mesmo tamanho na tela em qualquer zoom ou largura.
    let curK = 1;
    const unit = () => W / (svg.node().getBoundingClientRect().width || W);
    function placeWomen(k = curK) {
      curK = k; k = k / Math.min(unit(), 1.7);
      const nodes = women.map(d => ({ d, x: d.p0[0], y: d.p0[1] }));
      const sim = d3.forceSimulation(nodes).stop()
        .force("x", d3.forceX(n => n.d.p0[0]).strength(0.25))
        .force("y", d3.forceY(n => n.d.p0[1]).strength(0.25))
        .force("c", d3.forceCollide((R + 4) / k).strength(1));
      for (let i = 0; i < 160; i++) sim.tick();
      nodes.forEach(n => { n.d.x = n.x; n.d.y = n.y; });
      markers.attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / k})`);
      leaders.attr("x2", d => d.x).attr("y2", d => d.y);
      arcs.selectAll(".mapa__workpt").attr("r", 4 / k);
    }
    placeWomen(1);

    // ----- Zoom e arrasto -----
    const zoom = d3.zoom().scaleExtent([1, 10]).translateExtent([[0, 0], [W, H]])
      .on("zoom", e => { g.attr("transform", e.transform); dots.attr("r", 4 / e.transform.k); placeWomen(e.transform.k); });
    new ResizeObserver(() => placeWomen()).observe(svg.node());
    svg.call(zoom).on("wheel.zoom", null);    // a roda do mouse continua rolando a página
    svg.on("wheel", e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoom.scaleBy(svg, e.deltaY < 0 ? 1.25 : 0.8); } });
    $(".mapa__zoom").addEventListener("click", e => {
      const z = e.target.closest("button")?.dataset.z; if (!z) return;
      const t = svg.transition().duration(350);
      z === "reset" ? zoom.transform(t, d3.zoomIdentity) : zoom.scaleBy(t, z === "in" ? 1.6 : 1 / 1.6);
    });

    // ----- Dica (tooltip) -----
    const tip = $(".mapa__tip"), canvas = $(".mapa__canvas");
    let ind = "detection", ranks = new Map(), pinned = null;
    let showWomen = true, showImpact = true, selected = null;
    const activeAxes = new Set(D.AXES.map(a => a.id));
    const visible = d => !d.w.axis || activeAxes.has(d.w.axis.id);

    function tipHTML(f) {
      const d = epi.get(f.id), m = INDICATORS[ind];
      const name = countryName(f.id, f.properties.iso2, d, f.properties.name);
      if (!d) return `<b>${name}</b><span>fora da planilha da OMS</span>`;
      const v = d[ind];
      if (v == null) return `<b>${name}</b><span>sem dados</span>`;
      const r = ranks.get(f.id);
      return `<b>${name}</b><span class="mapa__tipval">${fmt.format(v)}</span><span>${m.unit}</span>` +
        (v > 0 && r ? `<small>${r}º maior taxa entre ${ranks.size} países</small>` : "");
    }
    function showTip(ev, f, html) {
      tip.innerHTML = html ?? tipHTML(f); tip.hidden = false;
      const box = canvas.getBoundingClientRect();
      const x = ev.clientX - box.left, y = ev.clientY - box.top;
      tip.style.left = Math.min(x + 14, box.width - tip.offsetWidth - 6) + "px";
      tip.style.top = (y > box.height / 2 ? y - tip.offsetHeight - 12 : y + 14) + "px";
    }
    const hideTip = () => { if (!pinned) tip.hidden = true; };
    shapes
      .on("pointermove", function (ev, f) { if (ev.pointerType === "mouse" && !pinned) { showTip(ev, f); highlight(f.id); } })
      .on("pointerleave", (ev) => { if (ev.pointerType === "mouse" && !pinned) { hideTip(); highlight(null); } })
      .on("click", function (ev, f) { pinned = f.id; showTip(ev, f); highlight(f.id); ev.stopPropagation(); });
    svg.on("click", () => { pinned = null; tip.hidden = true; select(null); });

    // Contorno âmbar num país (ou num conjunto de países).
    function highlight(id) {
      const ids = id instanceof Set ? id : new Set(id ? [id] : selected ? selectedCountries() : []);
      shapes.classed("is-hot", f => ids.has(f.id));
      shapes.filter(f => ids.has(f.id)).raise();
      root.querySelectorAll(".mapa__rank li").forEach(li => li.classList.toggle("is-hot", ids.has(li.dataset.iso)));
    }
    const selectedCountries = () => new Set(selected.work.map(p => p.iso3));

    markers
      .on("pointermove", (ev, d) => {
        if (ev.pointerType !== "mouse" || pinned) return;
        showTip(ev, null, `<b>${esc(d.w.name)}</b><span>nasceu em ${esc(d.w.birth.place || nameOf(d.w.birth.iso3))}</span><small>clique para saber mais</small>`);
      })
      .on("pointerleave", () => { if (!pinned) tip.hidden = true; })
      .on("click", (ev, d) => { ev.stopPropagation(); tip.hidden = true; pinned = null; select(d); })
      .on("dblclick", ev => ev.stopPropagation())
      .on("keydown", (ev, d) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(d); } });

    // ----- Seleção de uma mulher: destaca a trajetória, aproxima e abre o cartão -----
    function select(d) {
      selected = d || null;
      root.classList.toggle("has-selection", !!selected);
      markers.classed("is-selected", x => x === selected);
      arcs.classed("is-selected", x => x === selected);
      if (selected) markers.filter(x => x === selected).raise();
      root.querySelectorAll(".mapa__person").forEach(b => b.setAttribute("aria-pressed", b.dataset.id === selected?.w.id));
      highlight(null);
      renderCard();
      if (selected) {
        zoomTo([selected.p0, ...selected.work.map(p => p.xy)]);
        // No celular o cartão fica abaixo do mapa: rola até o mapa, com o cartão logo abaixo.
        if (matchMedia("(max-width: 860px)").matches) canvas.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function zoomTo(pts) {
      const [x0, x1] = d3.extent(pts, p => p[0]), [y0, y1] = d3.extent(pts, p => p[1]);
      const k = Math.max(1, Math.min(4, 0.6 / Math.max((x1 - x0) / W, (y1 - y0) / H, 0.15)));
      const t = d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
      svg.transition().duration(700).call(zoom.transform, t);
    }

    function renderCard() {
      const card = $(".mapa__card"), stats = $(".mapa__stats");
      card.hidden = !selected; stats.hidden = !!selected;
      if (!selected) return;
      const w = selected.w, m = INDICATORS[ind];
      const years = w.born ? `${w.born}–${w.died || ""}` : "";
      const birth = [w.birth.place, nameOf(w.birth.iso3)].filter(Boolean).join(", ");
      const work = w.work.map(p => `${esc(p.place)}${p.place === nameOf(p.iso3) ? "" : ", " + esc(nameOf(p.iso3))}`).join(" · ");
      const countries = [...new Set(w.work.map(p => p.iso3))];
      const impact = countries.map(c => {
        const v = epi.get(c)?.[ind];
        return `<li><b>${esc(nameOf(c))}</b> hoje: ${v == null ? "sem dados da OMS" : `<span class="mapa__cardval">${fmt.format(v)}</span> ${m.unit}`}</li>`;
      }).join("");
      const img = w.photo ? `<img src="${esc(w.photo)}" alt="" onerror="this.remove()">` : "";
      card.innerHTML = `
        <button class="mapa__close" aria-label="Fechar e voltar ao mapa-múndi">×</button>
        <div class="mapa__cardhead">
          <span class="portrait" style="--size:72px;border-color:${axisColor(w.axis)}">${esc(initials(w.name))}${img}</span>
          <div><h3>${esc(w.name)}</h3><small>${esc(years)}${years && w.profession ? " · " : ""}${esc(w.profession)}</small></div>
        </div>
        <span class="tag-eixo" style="--c:${axisColor(w.axis)}">${esc(w.axis?.label || w.axisRaw)}</span>
        <dl class="mapa__trajectory">
          <dt>Nasceu em</dt><dd>${esc(birth)}</dd>
          <dt>Atuou em</dt><dd>${work || "—"}</dd>
        </dl>
        ${w.contribution ? `<p class="mapa__contrib">${esc(w.contribution)}</p>` : ""}
        ${countries.length ? `<p class="preview-label">${m.label} onde ela atuou</p><ul class="mapa__impact">${impact}</ul>` : ""}
        ${w.bio ? `<details><summary>Biografia</summary><p>${esc(w.bio)}</p></details>` : ""}
        ${w.geoConfidence === "baixa" ? `<p class="mapa__approx">Os locais desta trajetória no mapa são aproximados.</p>` : ""}`;
      card.querySelector(".mapa__close").addEventListener("click", () => { select(null); zoom.transform(svg.transition().duration(600), d3.zoomIdentity); });
    }

    // ----- Faixa de retratos abaixo do mapa (atalho para tocar, útil no celular) -----
    $(".mapa__people").innerHTML = women.map(d => `
      <button class="mapa__person" role="listitem" aria-pressed="false" data-id="${d.w.id}" style="--c:${axisColor(d.w.axis)}">
        <span class="portrait" style="--size:44px">${esc(initials(d.w.name))}${d.w.photo ? `<img src="${esc(d.w.photo)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>
        <span>${esc(d.w.shortName)}</span>
      </button>`).join("");
    $(".mapa__people").addEventListener("click", e => {
      const b = e.target.closest(".mapa__person"); if (!b) return;
      const d = women.find(x => x.w.id === b.dataset.id);
      select(selected === d ? null : d);
      if (!selected) zoom.transform(svg.transition().duration(600), d3.zoomIdentity);
    });

    // ----- Camadas e filtros -----
    function applyFilters() {
      lw.attr("display", showWomen ? null : "none");
      [markers, arcs, leaders].forEach(sel => sel.classed("is-hidden", d => !visible(d)));
      root.querySelectorAll(".mapa__person").forEach(b =>
        b.classList.toggle("is-hidden", !visible(women.find(x => x.w.id === b.dataset.id))));
      $(".mapa__axes").hidden = !showWomen;
      $(".mapa__people").hidden = !showWomen;
      if (selected && (!showWomen || !visible(selected))) select(null);
    }
    $(".mapa__layers").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on);
      if (b.dataset.layer === "women") showWomen = on; else showImpact = on;
      applyFilters(); render();
    });
    $(".mapa__axes").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on);
      on ? activeAxes.add(b.dataset.axis) : activeAxes.delete(b.dataset.axis);
      applyFilters();
    });

    // ----- Desenho do indicador -----
    function render() {
      const m = INDICATORS[ind];
      const values = [...epi.values()].filter(d => d[ind] > 0).sort((a, b) => b[ind] - a[ind]);
      ranks = new Map(values.map((d, i) => [d.iso3, i + 1]));

      shapes.transition().duration(450).attr("fill", f => {
        if (!showImpact) return NEUTRAL;
        const d = epi.get(f.id);
        const c = classOf(d?.[ind], m.breaks);
        return c < 0 ? "url(#mapa-nodata)" : RAMP[c];
      });

      $(".mapa__note").textContent = showImpact ? m.note
        : "Cada retrato está no lugar onde a mulher nasceu; as linhas levam até onde ela atuou. Clique num retrato para conhecer a história.";
      root.querySelectorAll(".seg button").forEach(b => b.disabled = !showImpact);
      $(".mapa__legend").hidden = !showImpact;
      $(".mapa__stats").classList.toggle("is-off", !showImpact);
      if (selected) renderCard();

      const bra = epi.get("BRA"), r = ranks.get("BRA");
      $(".mapa__headline").innerHTML = bra?.[ind] != null
        ? `<span class="mapa__big">${fmt.format(bra[ind])}</span> ${m.unit} no <b>Brasil</b>` +
          (r ? ` — <b>${r}º lugar</b> entre ${values.length} países com casos.` : ".")
        : "";

      const max = values[0]?.[ind] || 1;
      $(".mapa__rank").innerHTML = values.slice(0, 10).map(d => {
        const f = land.find(x => x.id === d.iso3);
        const name = countryName(d.iso3, f?.properties.iso2, d);
        return `<li data-iso="${d.iso3}" class="${d.iso3 === "BRA" ? "is-br" : ""}">
          <span class="mapa__rname">${name}</span>
          <span class="mapa__rbar"><i style="width:${(100 * d[ind] / max).toFixed(1)}%;background:${RAMP[classOf(d[ind], m.breaks)]}"></i></span>
          <span class="mapa__rval">${fmt.format(d[ind])}</span></li>`;
      }).join("");

      const nodata = [...epi.values()].filter(d => d[ind] == null).length;
      $(".mapa__legend").innerHTML = `<span class="mapa__lunit">${m.label} · ${m.unit}</span>` +
        legendLabels(m.breaks).map((l, i) => `<span class="mapa__lkey"><i style="background:${RAMP[i]}"></i>${l}</span>`).join("") +
        `<span class="mapa__lkey"><i class="is-nodata"></i>sem dados (${nodata})</span>`;
      if (pinned) tip.hidden = true, pinned = null, highlight(null);
    }


    root.querySelector(".seg").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      ind = b.dataset.ind;
      root.querySelectorAll(".seg button").forEach(x => x.setAttribute("aria-checked", x === b));
      render();
    });
    $(".mapa__rank").addEventListener("pointerover", e => { const li = e.target.closest("li"); if (li && !pinned) highlight(li.dataset.iso); });
    $(".mapa__rank").addEventListener("pointerleave", () => { if (!pinned) highlight(null); });

    render();
    applyFilters();
  }

  window.MAPA = { mount };
})();
