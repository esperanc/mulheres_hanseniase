/* Atividade 6 · Quiz. Cada partida sorteia até 8 perguntas de data/quiz.csv, com
   4 alternativas: a resposta certa + 3 nomes de outras mulheres da página. */
(function () {
  const { esc, portrait, shuffle, sentences } = U;
  const PER_GAME = 8, OPTIONS = 4;

  function mount(root, D) {
    const bank = D.quiz.filter(q => q.question && q.answer);
    let qs, i, score, history;
    root.classList.add("quiz");

    // Alternativas erradas: nomes curtos de outras mulheres (nunca a própria resposta).
    function optionsFor(q) {
      const wrong = shuffle(D.women.filter(w => w !== q.woman && !U.fold(w.name).includes(U.fold(q.answer))))
        .slice(0, OPTIONS - 1).map(w => ({ label: w.shortName, w }));
      return shuffle([{ label: q.answer, w: q.woman, right: true }, ...wrong]);
    }

    function start() {
      qs = shuffle(bank).slice(0, PER_GAME); i = 0; score = 0; history = [];
      ask();
    }

    function ask() {
      const q = qs[i], opts = optionsFor(q);
      root.innerHTML = `
        <div class="quiz__top">
          <span>Pergunta <b>${i + 1}</b> de ${qs.length}</span>
          <span class="quiz__bar"><i style="width:${100 * i / qs.length}%"></i></span>
          <span>Acertos: <b>${score}</b></span>
        </div>
        <h3 class="quiz__q">${esc(q.question)}</h3>
        <div class="quiz__opts">${opts.map((o, k) => `
          <button class="quiz__opt" data-k="${k}"><span class="quiz__letter">${"ABCD"[k]}</span><span>${esc(o.label)}</span></button>`).join("")}
        </div>
        <div class="quiz__fb" aria-live="polite"></div>`;
      GLOSSARIO.annotate(root.querySelector(".quiz__q"));

      root.querySelector(".quiz__opts").addEventListener("click", e => {
        const b = e.target.closest(".quiz__opt"); if (!b || b.disabled) return;
        const o = opts[b.dataset.k], ok = !!o.right;
        if (ok) score++;
        history.push({ q, ok });
        root.querySelectorAll(".quiz__opt").forEach((x, k) => { x.disabled = true; x.classList.toggle("is-right", !!opts[k].right); });
        if (!ok) b.classList.add("is-wrong");
        const w = q.woman;
        const why = w ? sentences(w.contribution)[0] || "" : "";
        root.querySelector(".quiz__fb").innerHTML = `
          <div class="quiz__fbcard ${ok ? "is-ok" : "is-no"}">
            ${w ? portrait(w, { size: 64 }) : ""}
            <div>
              <p class="quiz__verdict">${ok ? "Isso mesmo!" : `Não foi dessa vez. A resposta é <b>${esc(q.answer)}</b>.`}</p>
              ${why ? `<p class="quiz__why">${esc(why)}</p>` : ""}
              <div class="quiz__actions">
                ${w ? `<button class="btn btn--ghost quiz__perfil">Conhecer ${esc(w.shortName)}</button>` : ""}
                <button class="btn quiz__next">${i + 1 < qs.length ? "Próxima pergunta →" : "Ver resultado"}</button>
              </div>
            </div>
          </div>`;
        root.querySelector(".quiz__perfil")?.addEventListener("click", () => PERFIL.open(w));
        const nb = root.querySelector(".quiz__next");
        nb.addEventListener("click", () => { i++; i < qs.length ? ask() : end(); });
        nb.focus({ preventScroll: true });
      });
    }

    function end() {
      const n = qs.length, pct = score / n;
      const [badge, msg] = pct === 1 ? ["Cientista de ouro", "Você acertou tudo!"]
        : pct >= .75 ? ["Pesquisadora sênior", "Excelente resultado!"]
        : pct >= .5 ? ["Pesquisadora em formação", "Bom trabalho! Algumas histórias ainda esperam por você."]
        : ["Iniciação científica", "Toda cientista começa assim. Explore a página e tente de novo!"];
      root.innerHTML = `
        <div class="quiz__end">
          <div class="quiz__badge"><span>${score}/${n}</span></div>
          <p class="quiz__level">${badge}</p>
          <p>${msg}</p>
          <ol class="quiz__review">${history.map(h => `<li class="${h.ok ? "is-ok" : "is-no"}"><span>${h.ok ? "✓" : "✗"}</span>${esc(h.q.question)} <b>${esc(h.q.answer)}</b></li>`).join("")}</ol>
          <button class="btn quiz__again">Jogar de novo</button>
        </div>`;
      root.querySelector(".quiz__again").addEventListener("click", start);
    }

    start();
  }

  window.QUIZ = { mount };
})();
