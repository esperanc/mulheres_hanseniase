/* Atividade 4 · Você sabia? — curiosidades em formato de stories.
   Avança sozinho (tempo proporcional ao texto) quando está visível na tela;
   toque à esquerda/direita navega, botão pausa, bolinhas no topo escolhem a história. */
(function () {
  const { esc, portrait, axisColor, shuffle, reducedMotion } = U;

  function mount(root, D) {
    const list = shuffle(D.women.filter(w => w.didYouKnow));
    let i = 0, t0 = 0, elapsed = 0, dur = 0, paused = reducedMotion(), visible = false, raf = 0;

    root.classList.add("st");
    root.innerHTML = `
      <div class="st__rail" role="tablist" aria-label="Escolha uma história">
        ${list.map((w, k) => `<button class="st__bubble" role="tab" data-k="${k}" aria-label="${esc(w.shortName)}" style="--c:${axisColor(w.axis)}">${portrait(w, { size: 52 })}<span>${esc(w.shortName.split(" ")[0])}</span></button>`).join("")}
      </div>
      <div class="st__stage">
        <button class="st__arrow" data-step="-1" aria-label="História anterior">‹</button>
        <article class="st__phone" aria-roledescription="história" aria-live="polite">
          <div class="st__bars">${list.map(() => "<i><b></b></i>").join("")}</div>
          <header class="st__who"></header>
          <div class="st__body"></div>
          <footer class="st__foot">
            <button class="st__toggle" aria-label="Pausar"></button>
            <button class="btn btn--light st__more">Conhecer a história</button>
          </footer>
          <button class="st__tap st__tap--prev" data-step="-1" tabindex="-1" aria-hidden="true"></button>
          <button class="st__tap st__tap--next" data-step="1" tabindex="-1" aria-hidden="true"></button>
        </article>
        <button class="st__arrow" data-step="1" aria-label="Próxima história">›</button>
      </div>`;

    const $ = s => root.querySelector(s);
    const phone = $(".st__phone"), bars = [...root.querySelectorAll(".st__bars b")];

    function show(k) {
      i = (k + list.length) % list.length;
      const w = list[i];
      dur = 5000 + w.didYouKnow.length * 45;       // ~45 ms por caractere
      elapsed = 0; t0 = performance.now();
      phone.style.setProperty("--c", axisColor(w.axis));
      $(".st__who").innerHTML = `${portrait(w, { size: 44 })}<div><b>${esc(w.shortName)}</b><small>${esc(w.axis?.label || "")}</small></div>`;
      const long = w.didYouKnow.length > 300;
      $(".st__body").innerHTML = `<h4>Você sabia?</h4><p class="${long ? "is-long" : ""}">${esc(w.didYouKnow)}</p>`;
      bars.forEach((b, k) => b.style.width = k < i ? "100%" : "0%");
      root.querySelectorAll(".st__bubble").forEach((b, k) => b.setAttribute("aria-selected", k === i));
      // centraliza a bolinha só na faixa (scrollIntoView rolaria a página inteira)
      const rail = $(".st__rail"), bub = rail.children[i];
      rail.scrollTo({ left: bub.offsetLeft - rail.clientWidth / 2 + bub.offsetWidth / 2, behavior: "smooth" });
    }

    function setPaused(p) {
      if (!p) t0 = performance.now() - elapsed;
      paused = p;
      $(".st__toggle").classList.toggle("is-paused", p);
      $(".st__toggle").setAttribute("aria-label", p ? "Continuar" : "Pausar");
    }

    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (paused || !visible) { t0 = now - elapsed; return; }
      elapsed = now - t0;
      bars[i].style.width = Math.min(100, 100 * elapsed / dur) + "%";
      if (elapsed >= dur) show(i + 1);
    }

    root.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.step) show(i + +b.dataset.step);
      else if (b.dataset.k) show(+b.dataset.k);
      else if (b.classList.contains("st__toggle")) setPaused(!paused);
      else if (b.classList.contains("st__more")) { setPaused(true); PERFIL.open(list[i]); }
    });
    // Segurar o dedo / o mouse sobre a história pausa, como nos apps.
    let hold = null;
    phone.addEventListener("pointerdown", e => { if (e.target.closest(".st__tap")) hold = setTimeout(() => { hold = "held"; setPaused(true); }, 350); });
    phone.addEventListener("pointerup", e => {
      if (hold === "held") { e.preventDefault(); setPaused(false); phone.addEventListener("click", ev => ev.stopPropagation(), { once: true, capture: true }); }
      else clearTimeout(hold);
      hold = null;
    });
    root.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") show(i + 1); else if (e.key === "ArrowLeft") show(i - 1);
    });

    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: .6 }).observe(phone);
    setPaused(paused);
    show(0);
    raf = requestAnimationFrame(tick);
  }

  window.STORIES = { mount };
})();
