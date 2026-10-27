/* Atividade 3 · Quem sou eu?
   Rodadas de 5 cartões. Cada cartão começa com a fala da mulher (coluna "Quem sou eu?",
   com o nome escondido); pedir mais pistas reduz os pontos (3 → 2 → 1). */
(function () {
  const { esc, portrait, axisColor, axisTags, shuffle, activeYear } = U;
  const ROUND = 5, OPTIONS = 4;

  // Esconde o nome da própria mulher na pista ("Sou Annemieke Geluk, …").
  function mask(text, w) {
    const parts = w.name.replace(/\(.*?\)/g, "").split(/\s+/).filter(t => t.length > 3);
    let out = text.replace(/[“”]/g, "").trim();
    parts.forEach(t => { out = out.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), "•••"); });
    out = out.replace(/(•••[\s,]*)+•••/g, "•••");
    return out.replace(/^./, c => c.toUpperCase()).replace(/[,;]\s*$/, "").replace(/([^.!?])$/, "$1.");
  }

  function cluesFor(w) {
    const c = [mask(w.whoAmI || w.contribution || "", w)];
    const year = activeYear(w);
    const where = [w.origin && `Minha origem: ${w.origin}.`, w.countryWork && `Atuei em ${w.cityWork ? w.cityWork + ", " : ""}${w.countryWork}${year ? `, sobretudo a partir de ${year}` : ""}.`];
    c.push(mask(where.filter(Boolean).join(" "), w));
    c.push(mask(`Minha formação: ${w.profession}. Eixo: ${(w.axes || []).map(a => a.label.toLowerCase()).join(", ") || w.axisRaw}.`, w));
    return c.filter(t => t.length > 3);
  }

  function mount(root, D) {
    const pool = D.women.filter(w => w.whoAmI);
    let deck, i, score, clues, shown, answered;

    root.classList.add("quem");
    function start() {
      deck = shuffle(pool).slice(0, ROUND); i = 0; score = 0;
      next();
    }

    function next() {
      const w = deck[i];
      clues = cluesFor(w); shown = 1; answered = false;
      const opts = shuffle([w, ...shuffle(pool.filter(x => x !== w)).slice(0, OPTIONS - 1)]);
      root.innerHTML = `
        <div class="quem__top">
          <span>Cartão <b>${i + 1}</b> de ${ROUND}</span>
          <span class="quem__dots">${deck.map((_, k) => `<i class="${k < i ? "is-done" : k === i ? "is-now" : ""}"></i>`).join("")}</span>
          <span>Pontos: <b class="quem__score">${score}</b></span>
        </div>
        <div class="quem__game">
          <div class="quem__card">
            <div class="quem__inner">
              <div class="quem__face quem__front">
                <p class="quem__label">Quem sou eu?</p>
                <ol class="quem__clues"></ol>
                <button class="btn btn--light quem__more">Mais uma pista <small>(vale menos pontos)</small></button>
              </div>
              <div class="quem__face quem__back" style="--c:${axisColor(w.axis)}">
                ${portrait(w, { size: 120 })}
                <h3>${esc(w.name)}</h3>
                <p>${esc(w.origin)}${w.born ? ` · ${w.born}` : ""}</p>
                <div class="quem__tags">${axisTags(w)}</div>
                <button class="btn btn--ghost quem__perfil">Conhecer a história</button>
              </div>
            </div>
          </div>
          <div class="quem__side">
            <p class="quem__ask">Quem é ela?</p>
            <div class="quem__opts">${opts.map(o => `<button class="quem__opt" data-id="${o.id}">${portrait(o, { size: 40 })}<span>${esc(o.shortName)}</span></button>`).join("")}</div>
            <p class="quem__feedback" aria-live="polite"></p>
            <button class="btn quem__next" hidden>${i + 1 < ROUND ? "Próximo cartão →" : "Ver resultado"}</button>
          </div>
        </div>`;
      renderClues();
      // Antes de responder, as opções mostram só o nome (as fotos entregariam a resposta).
      root.querySelectorAll(".quem__opt .portrait").forEach(p => p.hidden = true);

      root.querySelector(".quem__more").addEventListener("click", () => { shown++; renderClues(); });
      root.querySelector(".quem__opts").addEventListener("click", e => {
        const b = e.target.closest(".quem__opt"); if (!b || answered) return;
        answered = true;
        const ok = b.dataset.id === w.id, pts = ok ? 4 - shown : 0;
        score += pts;
        root.querySelectorAll(".quem__opt").forEach(o => {
          o.disabled = true; o.querySelector(".portrait").hidden = false;
          o.classList.toggle("is-right", o.dataset.id === w.id);
        });
        if (!ok) b.classList.add("is-wrong");
        root.querySelector(".quem__card").classList.add("is-flipped");
        root.querySelector(".quem__score").textContent = score;
        root.querySelector(".quem__feedback").innerHTML = ok
          ? `<b>Acertou!</b> +${pts} ${pts === 1 ? "ponto" : "pontos"}${shown > 1 ? ` (com ${shown} pistas)` : ""}.`
          : `<b>Quase!</b> Esta é ${esc(w.shortName)}.`;
        const nb = root.querySelector(".quem__next"); nb.hidden = false; nb.focus();
      });
      root.querySelector(".quem__perfil").addEventListener("click", () => PERFIL.open(w));
      root.querySelector(".quem__next").addEventListener("click", () => { i++; i < ROUND ? next() : end(); });
    }

    function renderClues() {
      root.querySelector(".quem__clues").innerHTML = clues.slice(0, shown)
        .map((c, k) => `<li class="${k === shown - 1 && k ? "is-new" : ""}">${esc(c)}</li>`).join("");
      root.querySelector(".quem__more").hidden = shown >= clues.length;
    }

    function end() {
      const max = ROUND * 3, pct = score / max;
      const msg = pct >= .8 ? "Você é especialista em mulheres na hanseníase!"
        : pct >= .5 ? "Muito bem! Você já conhece boa parte dessas histórias."
        : "Que tal explorar o mapa e a linha do tempo e tentar de novo?";
      root.innerHTML = `
        <div class="quem__end">
          <p class="quem__label">Resultado</p>
          <p class="quem__big">${score}<small> / ${max}</small></p>
          <p>${msg}</p>
          <div class="quem__met">${deck.map(w => `<button data-id="${w.id}" title="${esc(w.name)}">${portrait(w, { size: 56 })}<span>${esc(w.shortName)}</span></button>`).join("")}</div>
          <button class="btn quem__again">Jogar de novo</button>
        </div>`;
      root.querySelector(".quem__met").addEventListener("click", e => {
        const b = e.target.closest("button"); if (b) PERFIL.open(D.women.find(w => w.id === b.dataset.id));
      });
      root.querySelector(".quem__again").addEventListener("click", start);
    }

    start();
  }

  window.QUEM = { mount };
})();
