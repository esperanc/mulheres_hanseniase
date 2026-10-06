/* Camada de dados: carrega as planilhas e normaliza os campos.
   Todos os painéis consomem DATA.women, DATA.quiz e DATA.epi — nunca o CSV bruto. */
(function () {
  const FILES = {
    women:  "data/mulheres.csv",
    quiz:   "data/2026SNCT Mulheres na Hanseníase_quiz interativo.csv",
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
  const axisOf = s => AXES.find(a => a.match.test(s)) || null;
  const splitList = s => (s || "").split(/[;,]/).map(x => x.trim().replace(/\.$/, "")).filter(Boolean);
  const num = s => (/^\d{3,4}$/.test(s) ? +s : null);
  const dec = s => { const v = parseFloat(String(s ?? "").replace(",", ".")); return Number.isFinite(v) ? v : null; };

  // Foto local (nome de arquivo) ou URL externa que aponte direto para uma imagem.
  function photoPath(s) {
    const first = (s || "").trim().split(/\s+/)[0];
    if (!first) return null;
    if (!/^https?:/.test(first)) return PHOTO_DIR + first;
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
    return {
      id: CSV.slugKey(name),
      name,
      shortName: name.split(" ").filter((_, i, a) => i === 0 || i === a.length - 1).join(" "),
      region: r.regiao, regionCode: r.codregiao,
      axis: axisOf(r.eixo), axisRaw: r.eixo,
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
      ...geoOf(r, coords.get(CSV.slugKey(name))),
    };
  }

  function normalizeQuiz(r) {
    return { question: r.pergunta, answer: r.resposta.replace(/\.$/, "").trim() };
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
    return CSV.toObjects(CSV.parse(await res.text()));
  }

  window.DATA = {
    AXES,
    async load() {
      const [w, q, e, c] = await Promise.all(
        [FILES.women, FILES.quiz, FILES.epi, FILES.coords].map(loadCSV));
      const coords = new Map(c.map(r => [CSV.slugKey(r.nome.replace(/\s+/g, " ").trim()), r]));
      this.women = w.filter(r => r.nome).map(r => normalizeWoman(r, coords));
      this.epi = new Map(e.filter(r => r.codpais).map(normalizeEpi).map(d => [d.iso3, d]));
      this.quiz = q.filter(r => r.pergunta).map(normalizeQuiz);
      return this;
    },
  };
})();
