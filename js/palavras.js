/* Atividade 7 · Mulheres que mudaram a história: contadores por papel + nuvem de palavras.
   Tocar num contador ou numa palavra mostra quem são as mulheres. */
(function () {
  const { esc, fold, portrait, shuffle } = U;
  const has = (w, id) => (w.axes || []).some(a => a.id === id);

  // Papéis (uma mulher pode ter vários). Deduzidos de formação_profissão e dos eixos,
  // até a planilha ganhar uma coluna "papel".
  const ROLES = [
    { id: "medicas", label: "médicas", test: w => /m[eé]dic/i.test(w.profession) },
    { id: "pesquisadoras", label: "pesquisadoras e cientistas", test: w => has(w, "descobertas") || has(w, "clinica") || /pesquis|imunolog|qu[ií]mic|biolog|farm[aá]c|antropolog|bacteriolog/i.test(w.profession) },
    { id: "cuidado", label: "enfermeiras e terapeutas", test: w => /enferm|fisioter|terapeut/i.test(w.profession) },
    { id: "ativistas", label: "ativistas e defensoras de direitos", test: w => has(w, "direitos") || /ativis|mobiliza/i.test(w.profession) },
    { id: "vivencia", label: "viveram a hanseníase", test: w => has(w, "vivencia") },
    { id: "missionarias", label: "missionárias", test: w => /mission/i.test(w.profession) },
  ];

  function words(D) {
    const freq = new Map();
    D.women.forEach(w => new Set([...w.keywords, ...w.fields].map(k => k.replace(/["“”]/g, "").trim().toLowerCase()))
      .forEach(label => {
        if (label.length < 3 || label.length > 34) return;
        const key = fold(label), f = freq.get(key) || { key, label, women: new Set() };
        if (label > f.label) f.label = label;          // prefere a grafia acentuada
        f.women.add(w); freq.set(key, f);
      }));
    return [...freq.values()].sort((a, b) => b.women.size - a.women.size).slice(0, 45);
  }

  function mount(root, D) {
    const roles = ROLES.map(r => ({ ...r, women: D.women.filter(r.test) })).filter(r => r.women.length);
    const countries = new Set(D.women.flatMap(w => (w.work || []).map(p => p.iso3)));
    const ws = words(D), max = ws[0]?.women.size || 1;
    const PALETTE = ["var(--roxo-700)", "var(--marca-magenta)", "var(--marca-ciano)", "var(--roxo-500)", "#7a8a12", "#c46a00"];

    root.classList.add("pal");
    root.innerHTML = `
      <div class="pal__counters">
        <div class="pal__total"><b data-count="${D.women.length}">0</b><span>mulheres</span><small>de ${countries.size} países de atuação</small></div>
        ${roles.map(r => `<button class="pal__counter" data-role="${r.id}"><b data-count="${r.women.length}">0</b><span>${r.label}</span></button>`).join("")}
      </div>
      <p class="pal__note">Uma mesma mulher pode ter mais de um papel.</p>
      <div class="pal__cloudwrap">
        <p class="preview-label">Palavras que mais aparecem nas biografias</p>
        <div class="pal__cloud">${shuffle(ws).map((f, k) => {
          const t = (f.women.size - 1) / Math.max(1, max - 1);
          return `<button data-word="${esc(f.key)}" style="font-size:calc(${(15 + 26 * Math.sqrt(t)).toFixed(0)}px * var(--fs));color:${PALETTE[k % PALETTE.length]};font-weight:${t > .4 ? 800 : 600}" title="${f.women.size} ${f.women.size > 1 ? "mulheres" : "mulher"}">${esc(f.label)}</button>`;
        }).join("")}</div>
      </div>
      <div class="pal__result" aria-live="polite" hidden></div>`;

    const result = root.querySelector(".pal__result");
    function showList(title, list, btn) {
      root.querySelectorAll("[aria-pressed]").forEach(b => b.setAttribute("aria-pressed", "false"));
      if (!btn || btn.dataset.on) {        // tocar de novo fecha
        root.querySelectorAll("[data-on]").forEach(b => delete b.dataset.on);
        result.hidden = true; return;
      }
      root.querySelectorAll("[data-on]").forEach(b => delete b.dataset.on);
      btn.dataset.on = "1"; btn.setAttribute("aria-pressed", "true");
      result.hidden = false;
      result.innerHTML = `<p><b>${list.length}</b> ${title}</p>
        <div class="pal__people">${list.map(w => `<button data-w="${w.id}">${portrait(w, { size: 48 })}<span>${esc(w.shortName)}</span></button>`).join("")}</div>`;
    }
    root.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.role) { const r = roles.find(x => x.id === b.dataset.role); showList(r.label, r.women, b); }
      else if (b.dataset.word) { const f = ws.find(x => x.key === b.dataset.word); showList(`com “${f.label}”`, [...f.women], b); }
      else if (b.dataset.w) PERFIL.open(D.women.find(w => w.id === b.dataset.w));
    });

    // Contagem animada quando aparece na tela
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, target = +el.dataset.count, t0 = performance.now();
      if (U.reducedMotion()) { el.textContent = target; io.unobserve(el); return; }
      const tick = t => { const k = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(target * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick); io.unobserve(el);
    }));
    root.querySelectorAll("[data-count]").forEach(el => io.observe(el));
  }

  window.PALAVRAS = { mount };
})();
