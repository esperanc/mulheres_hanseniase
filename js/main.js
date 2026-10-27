/* Navegação, scrollytelling e montagem das atividades (data-component). */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content; };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

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

  function renderHero(D) {
    $(".axes").append(h(D.AXES.map(a => `<li style="--c:var(--eixo-${a.id})">${a.label}</li>`).join("")));
    // Até 12 retratos (com foto primeiro) e um contador com o restante.
    const SHOW = 12;
    const list = [...D.women].sort((a, b) => !!b.photo - !!a.photo).slice(0, SHOW);
    const rest = D.women.length - list.length;
    $(".hero__portraits").append(h(list.map(w => U.portrait(w)).join("") +
      (rest > 0 ? `<span class="portrait portrait--more" title="e mais ${rest} mulheres">+${rest}</span>` : "")));
  }

  // Fontes no encerramento: primeiro as gerais, depois as ligadas a cada mulher.
  function renderSources(D) {
    const general = D.refs.filter(r => !r.women.length);
    const byWoman = D.women.filter(w => w.refs.length);
    $(".fontes__n").textContent = `(${D.refs.length})`;
    $(".fontes__body").innerHTML = `
      <section><h4>Sobre hanseníase e sua história</h4><ul class="refs">${general.map(r => `<li>${U.refHTML(r)}</li>`).join("")}</ul></section>
      <section><h4>Sobre as mulheres</h4><ul class="refs refs--women">${byWoman.map(w => `
        <li><button class="fontes__who" data-id="${w.id}">${U.portrait(w, { size: 32 })}${esc(w.shortName)}</button>
          <ul>${w.refs.map(r => `<li>${U.refHTML(r)}</li>`).join("")}</ul></li>`).join("")}</ul></section>`;
    $(".fontes__body").addEventListener("click", e => {
      const b = e.target.closest(".fontes__who"); if (b) PERFIL.open(D.women.find(w => w.id === b.dataset.id));
    });
  }

  /* ---------- Início ------------------------------------------------------ */
  buildNav(); trackChapter(); trackScroll(); scrolly(); reveals();

  DATA.load().then(D => {
    GLOSSARIO.setup(D);
    GLOSSARIO.annotate($(".scrolly__steps"));
    renderHero(D);
    renderSources(D);
    const COMPONENTS = {
      mapa: MAPA.mount, linha: LINHA.mount, quem: QUEM.mount, stories: STORIES.mount,
      rede: REDE.mount, quiz: QUIZ.mount, palavras: PALAVRAS.mount, glossario: GLOSSARIO.mount,
    };
    $$("[data-component]").forEach(el => Promise.resolve().then(() => COMPONENTS[el.dataset.component](el, D)).catch(err => {
      console.error(err); el.innerHTML = `<p class="load-error">Não foi possível montar o painel: ${esc(err.message)}</p>`;
    }));
  }).catch(err => {
    console.error(err);
    const msg = location.protocol === "file:"
      ? "Abra a página por um servidor local (ex.: <code>python3 -m http.server</code>) — navegadores bloqueiam a leitura dos CSV via file://."
      : "Não foi possível carregar os dados: " + esc(err.message);
    $$("[data-component]").forEach(el => { el.innerHTML = `<p class="load-error">${msg}</p>`; });
  });
})();
