/* Parser CSV mínimo (RFC 4180): aspas, aspas duplicadas, quebras de linha em campos.
   Detecta o separador (',' ou ';') pela primeira linha. Sem dependências externas,
   para que a página funcione offline em um computador de exposição. */
(function () {
  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    const firstLine = text.slice(0, text.indexOf("\n") >>> 0);
    const sep = (firstLine.split(";").length > firstLine.split(",").length) ? ";" : ",";

    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === sep) { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(v => v.trim() !== ""));
  }

  /* "anofalecimento" → "anofalecimento"; "\"Quem sou eu?\"" → "quem_sou_eu";
     "colaboradoras/es (instituições)" → "colaboradoras_es_instituicoes" */
  function slugKey(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  function toObjects(rows) {
    const [head, ...body] = rows;
    const keys = head.map(slugKey);
    return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
  }

  window.CSV = { parse: parseCSV, toObjects, slugKey };
})();
