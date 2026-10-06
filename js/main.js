/* Navegação, scrollytelling e prévias dos painéis. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content; };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const axisColor = a => a ? `var(--eixo-${a.id})` : "var(--roxo-600)";

  /* ---------- Navegação -------------------------------------------------- */
  const chapters = $$("[data-chapter]");

  function buildNav() {
    const dots = $(".dots ol"), drawer = $(".drawer__list");
    chapters.forEach(sec => {
      const label = esc(sec.dataset.chapter);
      dots.append(h(`<li><a href="#${sec.id}"><span>${label}</span><i></i></a></li>`));
      drawer.append(h(`<li><a href="#${sec.id}">${label}</a></li>`));
    });

    const btn = $(".topbar__menu"), menu = $("#menu");
    const setOpen = open => { btn.setAttribute("aria-expanded", open); menu.hidden = !open; };
    btn.addEventListener("click", () => setOpen(menu.hidden));
    menu.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
  }

  function trackChapter() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        $$(`.dots a, .drawer__list a`).forEach(a =>
          a.setAttribute("aria-current", a.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    chapters.forEach(s => io.observe(s));
  }

  function trackScroll() {
    const bar = $(".progress__bar"), top = $(".topbar"), hero = $(".hero");
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (100 * scrollY / max) + "%";
      top.classList.toggle("is-solid", scrollY > hero.offsetHeight - 80);
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Scrollytelling da introdução ------------------------------- */
  function scrolly() {
    const steps = $$(".step"), scenes = $$(".scene");
    const activate = n => {
      steps.forEach(s => s.classList.toggle("is-active", s.dataset.step === n));
      scenes.forEach(s => s.classList.toggle("is-active", s.dataset.scene === n));
    };
    activate("1");
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => en.isIntersecting && activate(en.target.dataset.step));
    }, { rootMargin: "-50% 0px -50% 0px" });
    steps.forEach(s => io.observe(s));
  }

  function reveals() {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { threshold: .15 });
    $$(".panel__head, .stage-frame, .section-head").forEach(el => { el.classList.add("reveal"); io.observe(el); });
  }

  /* ---------- Componentes reutilizáveis ---------------------------------- */
  const initials = n => n.split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("");
  function portrait(w, extra = "") {
    // Se a foto não existir, cai para as iniciais.
    const img = w.photo ? `<img src="${esc(w.photo)}" alt="" loading="lazy" onerror="this.remove()">` : "";
    return `<span class="portrait ${extra}" title="${esc(w.name)}">${esc(initials(w.name))}${img}</span>`;
  }

  const ICONS = {
    map: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    timeline: '<path d="M3 12h18"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 10V5M12 14v5M18 10V6"/>',
    mask: '<path d="M4 6c5 2 11 2 16 0v6a8 8 0 0 1-16 0z"/><path d="M8 11h2M14 11h2M9 15c2 1.5 4 1.5 6 0"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    network: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="12" cy="13" r="2.5"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M7 7l3.5 4.5M17 6.5l-3.5 4.5M10.5 14.5L7 18M13.5 14.5L17 18"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 16.5v.5"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
  };
  function plan(icon, title, items) {
    return `<div class="plan">
      <div class="plan__icon"><svg viewBox="0 0 24 24">${ICONS[icon]}</svg></div>
      <div><strong>${title}</strong><ul>${items.map(i => `<li>${i}</li>`).join("")}</ul></div>
    </div>`;
  }

  /* ---------- Prévias de cada painel (dados reais, interação mínima) ------ */
  const PREVIEWS = {
    timeline(D) {
      const start = 1873, end = 2026, pct = y => ((y - start) / (end - start)) * 100;
      const eras = [
        { from: 1873, to: 1941, label: "Era pré-sulfônica", c: "var(--roxo-800)" },
        { from: 1941, to: 1981, label: "Sulfônicos", c: "var(--roxo-600)" },
        { from: 1981, to: 1991, label: "PQT", c: "var(--eixo-clinica)" },
        { from: 1991, to: 2026, label: "Estratégias de eliminação OMS", c: "var(--eixo-tratamento)" },
      ];
      const pins = D.women.map(w => ({ w, y: parseInt(w.decade) || w.born })).filter(p => p.y)
        .sort((a, b) => a.y - b.y);
      // empilha marcadores muito próximos
      pins.forEach((p, i) => { p.row = 0; for (let j = 0; j < i; j++) if (p.y - pins[j].y < 8 && pins[j].row === p.row) p.row++; });
      const rows = Math.max(0, ...pins.map(p => p.row)) + 1;
      return plan("timeline", "Como vai funcionar", [
        "Linha horizontal 1873 → 2026 que avança com a rolagem; marcos aparecem um a um.",
        "Faixas coloridas para as eras do tratamento.",
        "Trilha de gerações (1910 · 1950 · 1980 · 2000+) mostra a continuidade do trabalho das mulheres.",
      ]) + `<div><p class="preview-label">Esboço · eras e décadas de atuação (datas a validar)</p>
        <div class="tl" style="padding-top:${rows * 52}px">
          ${pins.map(p => `<div class="tl__pin" style="left:${pct(p.y)}%;top:${(rows - 1 - p.row) * 52}px">${portrait(p.w)}<small>${p.y}</small></div>`).join("")}
        </div>
        <div class="tl__eras">${eras.map(e =>
          `<div class="tl__era" style="flex:${e.to - e.from};background:${e.c}" title="${e.label} (${e.from}–${e.to})">${e.label}</div>`).join("")}
        </div>
        <div class="tl__axis">${[1873, 1900, 1925, 1950, 1975, 2000, 2026].map(y =>
          `<span style="left:${pct(y)}%">${y}</span>`).join("")}</div>
      </div>`;
    },

    quem(D) {
      const w = D.women[Math.floor(Math.random() * D.women.length)];
      return plan("mask", "Como vai funcionar", [
        `Um cartão por mulher (coluna “Quem sou eu?”), ${D.women.length} hoje.`,
        "Cada rodada sorteia 5 cartões; pistas reveladas aos poucos valem mais pontos.",
        "Ao virar: foto, nome e local de nascimento.",
      ]) + `<button class="flip" aria-label="Virar cartão">
        <div class="flip__inner">
          <div class="flip__face flip__front"><p>“${esc(w.whoAmI)}”</p><span class="hint">Toque para descobrir →</span></div>
          <div class="flip__face flip__back">${portrait(w)}<h3>${esc(w.name)}</h3><small>${esc(w.origin)}</small></div>
        </div></button>`;
    },

    stories(D) {
      const n = D.women.length;
      return plan("phone", "Como vai funcionar", [
        "Cartões verticais 9:16 com avanço automático e toque para pausar, como nos stories.",
        "Texto curto (até ~200 caracteres) + imagem; link para a biografia completa.",
      ]) + `<div class="stories">${D.women.map((w, i) => `
        <article class="story" style="--c:${axisColor(w.axis)}">
          <div class="story__bars">${Array.from({ length: n }, () => "<i></i>").join("")}</div>
          <div><h4>Você sabia?</h4></div>
          <p>${esc(w.didYouKnow)}</p>
          <footer>${portrait(w)}${esc(w.shortName)}</footer>
        </article>`).join("")}
        <div class="story story--empty">+ novas histórias<br>conforme a planilha cresce</div>
      </div>`;
    },

    rede(D) {
      const INST = [
        { id: "Fiocruz", re: /fiocruz|oswaldo cruz/i }, { id: "OMS", re: /\bOMS\b|WHO|organiza[cç][aã]o mundial/i },
        { id: "UFRJ", re: /UFRJ/i }, { id: "LSHTM", re: /LSHTM|london school/i },
        { id: "MORHAN", re: /morhan/i }, { id: "ALERT", re: /ALERT/ },
        { id: "UCLA", re: /UCLA/i }, { id: "Rockefeller U", re: /rockefeller/i },
      ];
      const W = 760, H = 380, cx = W / 2, cy = H / 2;
      const inst = INST.map((n, i) => {
        const a = (i / INST.length) * Math.PI * 2 - Math.PI / 2;
        return { ...n, x: cx + Math.cos(a) * 330, y: cy + Math.sin(a) * 150 };
      });
      const women = D.women.map((w, i) => {
        const a = (i / D.women.length) * Math.PI * 2;
        return { w, x: cx + Math.cos(a) * 110, y: cy + Math.sin(a) * 50 };
      });
      const links = [];
      women.forEach(p => {
        const text = `${p.w.institution} ${p.w.collaborators}`;
        inst.forEach(n => n.re.test(text) && links.push([p, n]));
      });
      return plan("network", "Como vai funcionar", [
        "Grafo de forças: estrelas = mulheres, nós maiores = instituições.",
        "Passar o mouse ilumina as conexões; clique abre o perfil.",
        "Precisa de uma coluna estruturada de instituições (separadas por “;”).",
      ]) + `<div><p class="preview-label">Esboço · ${links.length} conexões detectadas no texto atual</p>
        <svg class="constellation" viewBox="0 0 ${W} ${H}" role="img" aria-label="Esboço da rede de colaboração">
          ${links.map(([a, b]) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`).join("")}
          ${inst.map(n => `<g class="inst"><circle cx="${n.x}" cy="${n.y}" r="22"/><text x="${n.x}" y="${n.y + 4}">${n.id}</text></g>`).join("")}
          ${women.map(p => `<g class="woman"><circle cx="${p.x}" cy="${p.y}" r="7"/><text x="${p.x}" y="${p.y - 14}">${esc(p.w.shortName)}</text></g>`).join("")}
        </svg></div>`;
    },

    quiz(D) {
      const q = D.quiz[0];
      const names = [...new Set(D.quiz.map(x => x.answer))].filter(a => a !== q.answer);
      const opts = [q.answer, ...names.sort(() => Math.random() - .5).slice(0, 3)].sort(() => Math.random() - .5);
      return plan("quiz", "Como vai funcionar", [
        `${D.quiz.length} perguntas na planilha; cada partida sorteia 8, com 4 alternativas.`,
        "Alternativas erradas geradas a partir de outros nomes (ou de uma coluna própria).",
        "Após responder: explicação curta + link para o perfil. Placar final com selo.",
      ]) + `<div class="quiz-card">
        <div class="quiz-meta"><span>Pergunta 1 de 8</span><span>Prévia</span></div>
        <h3>${esc(q.question)}</h3>
        <div class="quiz-options">${opts.map(o => `<button data-right="${o === q.answer}">${esc(o)}</button>`).join("")}</div>
      </div>`;
    },

    palavras(D) {
      const count = re => D.women.filter(w => re.test(w.profession)).length;
      const stats = [
        [D.women.length, "mulheres na planilha"],
        [count(/m[eé]dic/i), "médicas"],
        [count(/pesquis|imunolog|cientist/i), "pesquisadoras"],
        [count(/ativist|militant/i), "ativistas"],
        [new Set(D.women.map(w => w.countryWork)).size, "países de atuação"],
      ];
      const freq = {};
      D.women.forEach(w => [...w.keywords, ...w.fields].forEach(k => {
        const key = k.toLowerCase().replace(/["“”]/g, ""); freq[key] = (freq[key] || 0) + 1;
      }));
      const words = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30);
      const max = Math.max(...words.map(w => w[1]));
      const palette = ["var(--roxo-600)", "var(--roxo-800)", "var(--eixo-clinica)", "var(--eixo-tratamento)", "var(--roxo-400)"];
      return plan("cloud", "Como vai funcionar", [
        "Contadores animados por papel: pesquisadoras, médicas, ativistas, gestoras, lideranças comunitárias.",
        "Nuvem de palavras gerada das colunas de palavras-chave e áreas; clicar filtra as mulheres.",
      ]) + `<div class="counters">${stats.map(([n, l]) => `<div class="counter"><b data-count="${n}">0</b><span>${l}</span></div>`).join("")}</div>
        <div><p class="preview-label">Palavras-chave e áreas de conhecimento</p>
        <div class="cloud">${words.map(([w, n], i) =>
          `<span style="font-size:${16 + 22 * (n / max)}px;color:${palette[i % palette.length]}">${esc(w)}</span>`).join("")}
        </div></div>`;
    },
  };

  function wirePreviews() {
    $$(".flip").forEach(f => f.addEventListener("click", () => f.classList.toggle("is-flipped")));
    $$(".quiz-options").forEach(box => box.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      $$("button", box).forEach(x => x.dataset.right === "true" && x.classList.add("is-right"));
      if (b.dataset.right !== "true") b.classList.add("is-wrong");
    }));
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, target = +el.dataset.count, t0 = performance.now();
      const tick = t => { const k = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(target * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick); io.unobserve(el);
    }));
    $$("[data-count]").forEach(el => io.observe(el));
  }

  function renderHero(D) {
    $(".axes").append(h(D.AXES.map(a => `<li style="--c:var(--eixo-${a.id})">${a.label}</li>`).join("")));
    $(".hero__portraits").append(h(D.women.map(w => portrait(w)).join("") +
      `<span class="portrait portrait--more">+20</span>`));
  }

  /* ---------- Início ------------------------------------------------------ */
  buildNav(); trackChapter(); trackScroll(); scrolly(); reveals();

  DATA.load().then(D => {
    renderHero(D);
    $$("[data-preview]").forEach(el => { el.innerHTML = PREVIEWS[el.dataset.preview](D); });
    wirePreviews();
    const COMPONENTS = { mapa: MAPA.mount };
    $$("[data-component]").forEach(el => COMPONENTS[el.dataset.component](el, D).catch(err => {
      console.error(err); el.innerHTML = `<p class="load-error">Não foi possível montar o painel: ${esc(err.message)}</p>`;
    }));
  }).catch(err => {
    console.error(err);
    const msg = location.protocol === "file:"
      ? "Abra a página por um servidor local (ex.: <code>python3 -m http.server</code>) — navegadores bloqueiam a leitura dos CSV via file://."
      : "Não foi possível carregar os dados: " + esc(err.message);
    $$("[data-preview], [data-component]").forEach(el => { el.innerHTML = `<p class="load-error">${msg}</p>`; });
  });
})();
