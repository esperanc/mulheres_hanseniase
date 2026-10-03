/* Camada de dados: carrega as planilhas e normaliza os campos.
   Todos os painéis consomem DATA.women e DATA.quiz — nunca o CSV bruto. */
(function () {
  const FILES = {
    women: "data/2026SNCTMulheres na Hanseníase_v1.csv",
    quiz:  "data/2026SNCT Mulheres na Hanseníase_quiz interativo.csv",
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

  function normalizeWoman(r) {
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
      photo: r.foto ? PHOTO_DIR + r.foto : null,
      bio: r.minibio,
      decade: r.decada_principal,
      collaborators: r.colaboradoras_es_instituicoes,
      whoAmI: r.quem_sou_eu,
      didYouKnow: r.voce_sabia,
    };
  }

  function normalizeQuiz(r) {
    return { question: r.pergunta, answer: r.resposta.replace(/\.$/, "").trim() };
  }

  async function loadCSV(path) {
    const res = await fetch(encodeURI(path));
    if (!res.ok) throw new Error(`${res.status} ao carregar ${path}`);
    return CSV.toObjects(CSV.parse(await res.text()));
  }

  window.DATA = {
    AXES,
    async load() {
      const [w, q] = await Promise.all([loadCSV(FILES.women), loadCSV(FILES.quiz)]);
      this.women = w.filter(r => r.nome).map(normalizeWoman);
      this.quiz = q.filter(r => r.pergunta).map(normalizeQuiz);
      return this;
    },
  };
})();
