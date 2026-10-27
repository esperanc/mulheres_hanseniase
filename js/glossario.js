/* Glossário: capítulo com busca + termos destacados no texto da página.
   GLOSSARIO.mount(root, D)  monta a lista de verbetes (data/glossario.csv).
   GLOSSARIO.annotate(el)    marca a 1ª ocorrência de cada termo dentro de `el`;
                             tocar no termo abre uma caixinha com a definição. */
(function () {
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fold = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  let entries = [], matchers = [], pop = null, openBtn = null;

  // "poliquimioterapia (PQT)" → ["poliquimioterapia (PQT)", "poliquimioterapia", "PQT"]
  function variants(term) {
    const m = term.match(/^(.*?)\s*\((.+)\)$/);
    return m ? [term, m[1], m[2]] : [term];
  }
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function setup(D) {
    entries = D.glossary || [];
    matchers = entries.flatMap(e => variants(e.term).map(v => ({ e, v })))
      .sort((a, b) => b.v.length - a.v.length)       // termos longos primeiro
      .map(({ e, v }) => ({ e, re: new RegExp(`(?<![\\p{L}\\p{N}])${reEsc(v)}(?![\\p{L}\\p{N}])`, "iu") }));
  }

  /* ---------- Caixinha de definição ----------------------------------- */
  function ensurePop() {
    if (pop) return pop;
    pop = document.createElement("div");
    pop.className = "gloss-pop"; pop.id = "gloss-pop"; pop.role = "dialog"; pop.hidden = true;
    document.body.append(pop);
    document.addEventListener("click", e => { if (!e.target.closest(".gloss, .gloss-pop")) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !pop.hidden) { openBtn?.focus(); close(); } });
    addEventListener("scroll", () => openBtn && place(openBtn), { passive: true });
    return pop;
  }
  function close() {
    if (!pop || pop.hidden) return;
    pop.hidden = true; openBtn?.setAttribute("aria-expanded", "false"); openBtn = null;
  }
  function open(btn) {
    const e = entries.find(x => x.id === btn.dataset.term); if (!e) return;
    if (openBtn === btn) return close();
    close(); ensurePop();
    (btn.closest("dialog") || document.body).append(pop);   // dentro de um modal, a caixinha precisa estar no modal
    pop.innerHTML = `<b>${esc(e.term)}</b>${e.defs.map(d => `<p>${esc(d)}</p>`).join("")}
      <a href="#glossario-${e.id}">ver no glossário</a>`;
    pop.setAttribute("aria-label", e.term);
    pop.querySelector("a").addEventListener("click", () => { pop.closest("dialog")?.close(); close(); });
    pop.hidden = false; openBtn = btn; btn.setAttribute("aria-expanded", "true");
    place(btn);
  }
  function place(btn) {
    const r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    if (r.bottom < 0 || r.top > innerHeight) return close();
    const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8));
    const top = r.bottom + 8 + h < innerHeight ? r.bottom + 8 : r.top - h - 8;
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }
  document.addEventListener("click", e => {
    const b = e.target.closest(".gloss"); if (b) { e.preventDefault(); open(b); }
  });

  /* ---------- Marcação dos termos no texto ----------------------------- */
  function annotate(root) {
    if (!root || !matchers.length) return;
    const used = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement.closest(".gloss, a, button, h1, h2, h3, h4, .step__bridge, svg, script")
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => annotateText(node, used));
  }
  // Marca o primeiro termo ainda não usado neste nó e continua no resto do texto.
  function annotateText(node, used) {
    for (const { e, re } of matchers) {
      if (used.has(e.id)) continue;
      const m = node.nodeValue.match(re); if (!m) continue;
      used.add(e.id);
      const after = node.splitText(m.index); after.nodeValue = after.nodeValue.slice(m[0].length);
      const b = document.createElement("button");
      b.type = "button"; b.className = "gloss"; b.dataset.term = e.id;
      b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", "gloss-pop");
      b.textContent = m[0];
      node.after(b);
      return annotateText(after, used);
    }
  }

  /* ---------- Capítulo do glossário ------------------------------------ */
  function mount(root, D) {
    setup(D);
    root.innerHTML = `
      <label class="gloss-search">
        <span class="sr-only">Buscar no glossário</span>
        <input type="search" placeholder="Buscar um termo…" autocomplete="off">
      </label>
      <p class="gloss-count" aria-live="polite"></p>
      <dl class="gloss-list">${entries.map(e => `
        <div class="gloss-item" id="glossario-${e.id}" data-text="${esc(fold(e.term + " " + e.defs.join(" ")))}">
          <dt>${esc(e.term)}</dt>${e.defs.map(d => `<dd>${esc(d)}</dd>`).join("")}
        </div>`).join("")}
      </dl>`;
    const items = [...root.querySelectorAll(".gloss-item")], count = root.querySelector(".gloss-count");
    const filter = q => {
      q = fold(q.trim()); let n = 0;
      items.forEach(it => { const ok = !q || it.dataset.text.includes(q); it.hidden = !ok; n += ok; });
      count.textContent = q ? `${n} de ${items.length} termos` : `${items.length} termos`;
    };
    root.querySelector("input").addEventListener("input", e => filter(e.target.value));
    filter("");
  }

  window.GLOSSARIO = { mount, annotate, setup };
})();
