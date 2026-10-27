/* Camada de dados: carrega as planilhas e normaliza os campos.
   Todos os painéis consomem DATA.women, DATA.quiz, DATA.glossary e DATA.epi — nunca o CSV bruto. */
(function () {
  const FILES = {
    women:  "data/mulheres.csv",
    quiz:   "data/quiz.csv",
    glossary: "data/glossario.csv",
    epi:    "data/mapa_epidemio.csv",
    // Coordenadas provisórias (a validar) enquanto a planilha principal não tem
    // as colunas de nascimento/atuação. Colunas da planilha principal têm prioridade.
    coords: "data/coordenadas_proposta.csv",
  };
  const PHOTO_DIR = "data/photo/";

  // Os seis eixos temáticos e suas cores (ver --eixo-* em style.css)
  const AXES = [
    { id: "descobertas", label: "Descobertas científicas", match: /descobert/i },
    { id: "tratamento",  label: "Tratamento",              match: /tratament/i },
    { id: "saude",       label: "Saúde pública",           match: /sa[uú]de/i },
    { id: "direitos",    label: "Direitos humanos",        match: /direito/i },
    { id: "clinica",     label: "Pesquisa clínica",        match: /cl[ií]nic/i },
    { id: "vivencia",    label: "Vivência da hanseníase",  match: /viv[eê]nci/i },
  ];
  // "mulheres com vivência; saúde pública" ou "tratamento/reabilitação" → eixos na ordem da planilha
  const axesOf = s => [...new Set((s || "").split(/[;\/]/)
    .map(t => AXES.find(a => a.match.test(t))).filter(Boolean))];

  // Nomes comparados por palavras, sem acentos nem parênteses, para casar
  // "Ruth Bowden" ↔ "Ruth Elizabeth Mary Bowden" ou "Maria Leide" ↔ "Maria Leide Wand-Del-Rey de Oliveira".
  const STOP = new Set(["de", "da", "do", "das", "dos", "e"]);
  const nameTokens = s => CSV.slugKey((s || "").replace(/\(.*?\)/g, "")).split("_").filter(t => t && !STOP.has(t));
  function sameName(short, full) {
    const a = nameTokens(short), b = new Set(nameTokens(full));
    return a.length >= 2 && a.every(t => b.has(t));
  }
  const findByName = (list, name, key = x => x.name) =>
    list.find(x => CSV.slugKey(key(x)) === CSV.slugKey(name)) || list.find(x => sameName(name, key(x)));
  const EMPTY = /^(sem registro|n[aã]o se aplica|-)$/i;
  const splitList = s => (s || "").split(/[;,]/).map(x => x.trim().replace(/\.$/, "")).filter(x => x && !EMPTY.test(x));
  const num = s => (/^\d{3,4}$/.test(s) ? +s : null);
  const dec = s => { const v = parseFloat(String(s ?? "").replace(",", ".")); return Number.isFinite(v) ? v : null; };

  // Foto local (nome de arquivo) ou URL externa que aponte direto para uma imagem.
  function photoPath(s) {
    const v = (s || "").trim();
    if (!v) return null;
    if (!/^https?:/.test(v)) return PHOTO_DIR + v;      // nomes de arquivo podem ter espaços
    const first = v.split(/\s+/)[0];
    return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(first) ? first : null;
  }

  // "Cidade|ISO3|lat|lon; Cidade|ISO3|lat|lon" → [{ place, iso3, lat, lon }]
  function parsePlaces(s) {
    return (s || "").split(";").map(t => t.trim().split("|")).filter(p => p.length === 4)
      .map(([place, iso3, lat, lon]) => ({ place: place.trim(), iso3: iso3.trim(), lat: dec(lat), lon: dec(lon) }))
      .filter(p => p.lat != null && p.lon != null);
  }

  function geoOf(r, c = {}) {
    const pick = k => r[k] || c[k] || "";
    const lat = dec(pick("lat_nascimento")), lon = dec(pick("lon_nascimento"));
    return {
      birth: lat != null && lon != null
        ? { place: pick("cidade_nascimento"), iso3: pick("pais_nascimento_iso3"), lat, lon } : null,
      work: parsePlaces(pick("locais_atuacao")),
      geoConfidence: c.confianca || null,
      geoNote: c.observacao || null,
    };
  }

  function normalizeWoman(r, coords) {
    const name = r.nome.replace(/\s+/g, " ").trim();
    const axes = axesOf(r.eixo);
    return {
      id: CSV.slugKey(name),
      name,
      // Coluna opcional "nome_curto"; senão, o apelido entre parênteses ou primeiro + último nome.
      shortName: r.nome_curto || (name.match(/\((.+)\)/)?.[1].replace(/ de .*$/, "")) ||
        name.split(" ").filter((_, i, a) => i === 0 || i === a.length - 1).join(" "),
      region: r.regiao, regionCode: r.codregiao,
      axis: axes[0] || null, axes, axisRaw: r.eixo,
      origin: r.origem,
      born: num(r.anonascimento), died: num(r.anofalecimento),
      profession: r.formacao_profissao,
      countryWork: r.pais_atuacao, cityWork: r.cidade_atuacao, institution: r.instituicao_atuacao,
      fields: splitList(r.areaconhecimento),
      contribution: r.contribuicao,
      keywords: splitList(r.palavras_chave),
      photo: photoPath(r.foto),
      bio: r.minibio,
      decade: r.decada_principal,
      collaborators: [r.colaboradoras, r.instituicoescolaboradores].filter(x => x && !/^(sem registro|n[aã]o se aplica)$/i.test(x)).join("; "),
      whoAmI: r.quem_sou_eu,
      didYouKnow: r.voce_sabia,
      ...geoOf(r, findByName(coords, name, c => c.nome)),
    };
  }

  function normalizeQuiz(r, women) {
    const answer = r.resposta.replace(/\.$/, "").trim();
    return { question: r.pergunta, answer, woman: findByName(women, answer) || null };
  }

  // Termos repetidos (ex.: "estigma") viram um verbete com várias acepções.
  function normalizeGlossary(rows) {
    const map = new Map();
    rows.filter(r => r.termo && r.significado).forEach(r => {
      const term = r.termo.trim(), key = CSV.slugKey(term);
      const def = r.significado.trim().replace(/^./, c => c.toUpperCase()).replace(/([^.])$/, "$1.");
      if (map.has(key)) map.get(key).defs.push(def);
      else map.set(key, { id: key, term, defs: [def] });
    });
    return [...map.values()].sort((a, b) => a.term.localeCompare(b.term, "pt-BR"));
  }

  // Indicadores da OMS por país. "No data" → null (≠ zero).
  function normalizeEpi(r) {
    return {
      iso3: r.codpais, country: r.pais, regionCode: r.codregiao, region: r.regiao,
      detection: dec(r.taxa_deteccao_100_000),      // casos novos por 100 mil hab.
      prevalence: dec(r.taxa_prevalencia_10_000),   // casos em tratamento por 10 mil hab.
      g2d: dec(r.taxa_deteccao_gif2_1_000_000),     // casos novos com incapacidade grau 2 por 1 milhão
    };
  }

  async function loadCSV(path) {
    const res = await fetch(encodeURI(path));
    if (!res.ok) throw new Error(`${res.status} ao carregar ${path}`);
    // O Excel costuma exportar CSV em Windows-1252; tenta UTF-8 e, se falhar, cai para ele.
    const buf = await res.arrayBuffer();
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
    catch { text = new TextDecoder("windows-1252").decode(buf); }
    return CSV.toObjects(CSV.parse(text));
  }

  window.DATA = {
    AXES,
    async load() {
      const [w, q, e, c, g] = await Promise.all(
        [FILES.women, FILES.quiz, FILES.epi, FILES.coords, FILES.glossary].map(loadCSV));
      const coords = c.filter(r => r.nome);
      // Linhas repetidas na planilha (mesmo nome) entram uma vez só.
      const seen = new Set();
      this.women = w.filter(r => r.nome).map(r => normalizeWoman(r, coords))
        .filter(x => !seen.has(x.id) && seen.add(x.id));
      this.epi = new Map(e.filter(r => r.codpais).map(normalizeEpi).map(d => [d.iso3, d]));
      this.quiz = q.filter(r => r.pergunta).map(r => normalizeQuiz(r, this.women));
      this.glossary = normalizeGlossary(g);
      return this;
    },
  };
})();
