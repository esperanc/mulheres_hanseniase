/* Funções comuns às atividades. */
(function () {
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fold = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const initials = n => n.replace(/\(.*?\)/g, "").split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("");
  const axisColor = a => a ? `var(--eixo-${a.id})` : "var(--roxo-600)";
  const axisOn = a => a ? `var(--eixo-${a.id}-on)` : "#fff";

  // Retrato redondo com as iniciais por baixo (aparecem se a foto faltar).
  function portrait(w, { size, cls = "" } = {}) {
    const img = w.photo ? `<img src="${esc(w.photo)}" alt="" loading="lazy" onerror="this.remove()">` : "";
    const style = size ? ` style="--size:${size}px"` : "";
    return `<span class="portrait ${cls}"${style} title="${esc(w.name)}">${esc(initials(w.name))}${img}</span>`;
  }
  const axisTags = w => (w.axes?.length ? w.axes : [null]).map(a =>
    `<span class="tag-eixo" style="--c:${axisColor(a)};--on:${axisOn(a)}">${esc(a?.label || w.axisRaw)}</span>`).join("");

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // "1950-1960", "1890 a 1910", "2010- 2019" → 1950, 1890, 2010; senão nascimento + 30
  const activeYear = w => parseInt(w.decade) || (w.born ? w.born + 30 : null);
  const sentences = s => (s || "").replace(/[“”]/g, "").trim().split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/).filter(Boolean);
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Uma referência como link legível: citação, ou domínio + último trecho do endereço.
  function refHTML(r) {
    let title = r.cite;
    if (!title && r.url && r.host) {
      const seg = decodeURIComponent(new URL(r.url).pathname).split("/").filter(Boolean)
        .map(s => s.replace(/\.(html?|pdf|php)$/i, "").replace(/[-_]+/g, " ").trim())
        .filter(s => /[a-z]{4}/i.test(s) && !/^[0-9a-f ]{20,}$/i.test(s) && s.length < 90).at(-1);
      title = seg ? seg.replace(/^./, c => c.toUpperCase()) : "";
    }
    const pdf = r.url && /\.pdf(\?|$)/i.test(r.url) ? " (PDF)" : "";
    const body = `${title ? `<span>${esc(title)}</span>` : ""}${r.host ? `<small>${esc(r.host)}${pdf}</small>` : ""}`;
    return r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${body}</a>` : `<span class="ref__cite">${body}</span>`;
  }

  window.U = { refHTML, esc, fold, initials, axisColor, axisOn, portrait, axisTags, shuffle, activeYear, sentences, reducedMotion };
})();
