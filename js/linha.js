/* Atividade 2 · Linha do tempo (1873 → 2026) + comparação entre gerações.
   Faixa horizontal rolável: marcos históricos (data/marcos.csv) acima do eixo,
   eras do tratamento no eixo e as mulheres abaixo, na década em que mais atuaram. */
(function () {
  const { esc, portrait, axisColor, activeYear } = U;

  const START = 1873, END = 2026, PX = 24, PAD = 70;     // px por ano e margem lateral
  const x = y => PAD + (y - START) * PX;
  const ERAS = [
    { from: 1873, to: 1941, label: "Era pré-sulfônica", c: "var(--roxo-900)" },
    { from: 1941, to: 1981, label: "Era dos sulfônicos", c: "var(--roxo-600)" },
    { from: 1981, to: 1991, label: "Poliquimioterapia", c: "var(--marca-magenta)" },
    { from: 1991, to: 2026, label: "Estratégias de eliminação da OMS", c: "var(--marca-ciano)" },
  ];
  const GENS = [
    { to: 1939, label: "Pioneiras", text: "Cuidaram, organizaram e pesquisaram quando o único remédio era o óleo de chaulmoogra e o isolamento era a regra." },
    { to: 1979, label: "Era dos sulfônicos", text: "Com os primeiros remédios eficazes, levaram tratamento, reabilitação e formação de profissionais a vários continentes." },
    { to: 1999, label: "Era da poliquimioterapia", text: "Ajudaram a implantar a PQT, decifraram a resposta imune ao bacilo e lutaram contra o estigma." },
    { to: Infinity, label: "Nova geração", text: "Genética, diagnóstico precoce, direitos humanos e o protagonismo das pessoas afetadas." },
  ];

  // Distribui itens em faixas (lanes) para não se sobreporem.
  function lanes(items, width, gap) {
    const ends = [];
    items.forEach(it => {
      let l = ends.findIndex(e => e + gap <= it.x);
      if (l < 0) l = ends.length;
      ends[l] = it.x + width; it.lane = l;
    });
    return ends.length;
  }

  function mount(root, D) {
    const CARD_W = 168, CARD_H = 70, FACE = 40;
    const ms = D.milestones.map(m => ({ m, x: x(m.year) - 14 }));
    const nMs = lanes(ms, CARD_W, 12);
    const women = D.women.map(w => ({ w, year: activeYear(w) })).filter(d => d.year)
      .sort((a, b) => a.year - b.year).map(d => ({ ...d, x: x(d.year) - FACE / 2 }));
    const nW = lanes(women, FACE, 4);

    const TOP = nMs * (CARD_H + 14) + 24, AXIS = 46;
    const H = TOP + AXIS + 30 + nW * (FACE + 8) + 10, W = x(END) + PAD;
    const ticks = []; for (let y = 1880; y <= 2020; y += 10) ticks.push(y);

    root.classList.add("tl2");
    root.innerHTML = `
      <div class="tl2__bar">
        <div class="tl2__eras" role="group" aria-label="Ir para uma era">
          ${ERAS.map((e, i) => `<button data-era="${i}" style="--c:${e.c}">${e.label} <small>${e.from}–${e.to === END ? "hoje" : e.to}</small></button>`).join("")}
        </div>
        <div class="tl2__nav">
          <button data-dir="-1" aria-label="Voltar no tempo">←</button>
          <button data-dir="1" aria-label="Avançar no tempo">→</button>
        </div>
      </div>
      <div class="tl2__scroll" tabindex="0" aria-label="Linha do tempo de ${START} a ${END}; role para os lados">
        <div class="tl2__track" style="width:${W}px;height:${H}px">
          ${ERAS.map(e => `<div class="tl2__era" style="left:${x(e.from)}px;width:${(e.to - e.from) * PX}px;top:${TOP}px;height:${AXIS}px;background:${e.c}"><span>${e.label}</span></div>`).join("")}
          ${ticks.map(y => `<span class="tl2__tick" style="left:${x(y)}px;top:${TOP + AXIS + 4}px">${y}</span>`).join("")}
          ${ms.map((d, i) => {
            const top = TOP - 18 - (d.lane + 1) * (CARD_H + 14) + 14;
            return `<i class="tl2__stem" style="left:${x(d.m.year)}px;top:${top + CARD_H}px;height:${TOP - top - CARD_H}px"></i>
              <button class="tl2__ms" data-i="${i}" style="left:${d.x}px;top:${top}px;width:${CARD_W}px;height:${CARD_H}px;--c:${axisColor(d.m.axis)}">
                <b>${d.m.year}${d.m.scope === "brasil" ? ' <em>Brasil</em>' : ""}</b><span>${esc(d.m.title)}</span>
              </button>`;
          }).join("")}
          ${women.map(d => `
            <button class="tl2__face" data-id="${d.w.id}" style="left:${d.x}px;top:${TOP + AXIS + 30 + d.lane * (FACE + 8)}px;--c:${axisColor(d.w.axis)}"
              aria-label="${esc(d.w.name)}, atuação a partir de ${d.year}">
              ${portrait(d.w, { size: FACE })}<span class="tl2__name">${esc(d.w.shortName)} · ${d.year}</span>
            </button>`).join("")}
        </div>
      </div>
      <div class="tl2__detail" aria-live="polite"></div>

      <h3 class="tl2__gtitle">Uma geração passa o bastão para a outra</h3>
      <div class="tl2__gens">
        ${(() => {
          let from = START;
          return GENS.map(g => {
            const list = women.filter(d => d.year >= from && d.year <= g.to);
            const period = g.to === Infinity ? `${from} em diante` : `${from === START ? "até" : from + " –"} ${g.to}`;
            from = g.to + 1;
            return `<section class="tl2__gen">
              <header><b>${g.label}</b><small>${period}</small><span class="tl2__gcount">${list.length}</span></header>
              <p>${g.text}</p>
              <div class="tl2__gfaces">${list.map(d => `<button class="tl2__gface" data-id="${d.w.id}" title="${esc(d.w.name)}">${portrait(d.w, { size: 44 })}<span>${esc(d.w.shortName)}</span></button>`).join("")}</div>
            </section>`;
          }).join("");
        })()}
      </div>
      <p class="tl2__note">Posição de cada mulher: início da década em que mais atuou (coluna “década principal”). Marcos históricos em <code>data/marcos.csv</code>, a validar.</p>`;

    const $ = s => root.querySelector(s);
    const scroller = $(".tl2__scroll"), detail = $(".tl2__detail");

    function showMilestone(i) {
      const m = ms[i].m;
      root.querySelectorAll(".tl2__ms").forEach(b => b.setAttribute("aria-pressed", b.dataset.i == i));
      detail.style.setProperty("--c", axisColor(m.axis));
      detail.innerHTML = `<b>${m.year}</b><div><h4>${esc(m.title)}</h4><p>${esc(m.text)}</p></div>`;
      GLOSSARIO.annotate(detail.querySelector("p"));
    }
    root.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b || moved) return;
      if (b.dataset.i) showMilestone(+b.dataset.i);
      else if (b.dataset.id) PERFIL.open(D.women.find(w => w.id === b.dataset.id));
      else if (b.dataset.era) scroller.scrollTo({ left: x(ERAS[b.dataset.era].from) - 30, behavior: "smooth" });
      else if (b.dataset.dir) scroller.scrollBy({ left: b.dataset.dir * scroller.clientWidth * 0.7, behavior: "smooth" });
    });

    // Arrastar com o mouse (no toque a rolagem já é nativa).
    let drag = null, moved = false;
    scroller.addEventListener("pointerdown", e => {
      if (e.pointerType !== "mouse") return;
      drag = { x: e.clientX, left: scroller.scrollLeft }; moved = false;
    });
    addEventListener("pointermove", e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) { moved = true; scroller.classList.add("is-dragging"); }
      scroller.scrollLeft = drag.left - dx;
    });
    addEventListener("pointerup", () => { drag = null; scroller.classList.remove("is-dragging"); setTimeout(() => moved = false); });

    // Era atual destacada conforme a rolagem.
    scroller.addEventListener("scroll", () => {
      const year = START + (scroller.scrollLeft + scroller.clientWidth / 2 - PAD) / PX;
      root.querySelectorAll(".tl2__eras button").forEach((b, i) =>
        b.setAttribute("aria-current", year >= ERAS[i].from && (year < ERAS[i].to || i === ERAS.length - 1)));
    }, { passive: true });
    scroller.dispatchEvent(new Event("scroll"));
    showMilestone(0);
  }

  window.LINHA = { mount };
})();
