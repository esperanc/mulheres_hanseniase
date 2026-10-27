/* Janela de perfil de uma mulher, aberta a partir de qualquer atividade.
   PERFIL.open(woman) */
(function () {
  const { esc, portrait, axisTags, axisColor } = U;
  let dlg;

  function ensure() {
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.className = "perfil";
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });   // clique fora fecha
    dlg.addEventListener("close", () => { document.documentElement.classList.remove("has-dialog"); });
    document.body.append(dlg);
    return dlg;
  }

  function open(w) {
    if (!w) return;
    ensure();
    const years = w.born ? `${w.born}–${w.died || ""}` : "";
    const where = [
      w.origin && `<dt>Origem</dt><dd>${esc(w.origin)}</dd>`,
      (w.cityWork || w.countryWork) && `<dt>Atuação</dt><dd>${esc([w.cityWork, w.countryWork].filter(Boolean).join(" · "))}</dd>`,
      w.institution && `<dt>Instituições</dt><dd>${esc(w.institution)}</dd>`,
    ].filter(Boolean).join("");
    dlg.innerHTML = `
      <article class="perfil__box" style="--c:${axisColor(w.axis)}">
        <button class="perfil__close" aria-label="Fechar">×</button>
        <header class="perfil__head">
          ${portrait(w, { size: 96 })}
          <div>
            <h3>${esc(w.name)}</h3>
            <p>${esc(years)}${years && w.profession ? " · " : ""}${esc(w.profession)}</p>
            <div class="perfil__tags">${axisTags(w)}</div>
          </div>
        </header>
        ${where ? `<dl class="perfil__where">${where}</dl>` : ""}
        ${w.contribution ? `<section><h4>Contribuições</h4><p class="perfil__text">${esc(w.contribution)}</p></section>` : ""}
        ${w.bio ? `<section><h4>Biografia</h4><p class="perfil__text">${esc(w.bio)}</p></section>` : ""}
        ${w.didYouKnow ? `<aside class="perfil__know"><b>Você sabia?</b> ${esc(w.didYouKnow)}</aside>` : ""}
        ${w.refs?.length ? `<section><h4>Para saber mais</h4><ul class="refs">${w.refs.map(r => `<li>${U.refHTML(r)}</li>`).join("")}</ul></section>` : ""}
        ${w.birth && window.MAPA?.show ? `<button class="btn btn--ghost perfil__map">Ver no mapa</button>` : ""}
      </article>`;
    dlg.querySelector(".perfil__close").addEventListener("click", () => dlg.close());
    dlg.querySelector(".perfil__map")?.addEventListener("click", () => { dlg.close(); MAPA.show(w.id); });
    dlg.querySelectorAll(".perfil__text").forEach(p => window.GLOSSARIO?.annotate(p));
    document.documentElement.classList.add("has-dialog");
    dlg.showModal();
    dlg.querySelector(".perfil__box").scrollTop = 0;
  }

  window.PERFIL = { open };
})();
