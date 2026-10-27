# Mulheres na Hanseníase — plano de estrutura e design (v0)

Página de divulgação científica para a SNCT 2026. Público principal: estudantes de 9 a 18 anos.

## Como rodar

Os CSV são lidos via `fetch`, então a página precisa de um servidor local (não abre direto por `file://`):

```bash
python3 -m http.server 8123
```

Depois, abra http://localhost:8123. Não há dependências nem build: HTML, CSS e JS puros. Assim a página funciona offline, num computador de exposição (só as fontes do Google ficam de fora; sem internet, o navegador usa as fontes do sistema).

## Arquivos

```
index.html            estrutura de todas as seções
css/style.css         identidade visual (tokens de cor no :root)
js/csv.js             parser CSV (detecta ',' ou ';', aspas, BOM)
js/data.js            carrega as planilhas → DATA.women / quiz / glossary / milestones / epi
js/util.js            funções comuns (retratos, etiquetas de eixo, sorteio…)
js/perfil.js          janela de perfil de uma mulher, aberta por todas as atividades
js/mapa.js            atividade 1: mapa mundial + mapa de impacto (D3 + TopoJSON)
js/linha.js           atividade 2: linha do tempo + gerações
js/quem.js            atividade 3: jogo "Quem sou eu?"
js/stories.js         atividade 4: "Você sabia?" em formato de stories
js/rede.js            atividade 5: rede de colaboração (D3, grafo de forças)
js/quiz.js            atividade 6: quiz
js/palavras.js        atividade 7: contadores por papel + nuvem de palavras
js/glossario.js       capítulo do glossário + termos destacados no texto
js/main.js            navegação, scrollytelling, montagem das atividades
js/vendor/            d3 e topojson-client (locais, para funcionar offline)
data/mulheres.csv     planilha principal (uma linha por mulher)
data/quiz.csv         perguntas e respostas do quiz
data/glossario.csv    termos e definições
data/marcos.csv       marcos históricos da linha do tempo (ano;titulo;texto;eixo;escopo)
data/links_e_referencias.csv  fontes (referência;obs;titulo) — lista no fim da página e "Para saber mais" nos perfis
data/mapa_epidemio.csv       indicadores da OMS por país
data/coordenadas_proposta.csv  locais de nascimento e atuação (provisório, a validar)
data/geo/countries.json      fronteiras (Natural Earth)
data/photo/           fotos das mulheres e imagens do atlas
```

Os CSV podem estar em UTF-8 (recomendado) ou Windows-1252 (padrão do Excel): o carregador detecta. Mas letras fora do alfabeto latino ocidental, como o "ł" e o "ń" de Błeńska, só sobrevivem em UTF-8. No Excel: *Salvar como → CSV UTF-8*; no LibreOffice: marcar *Editar configurações do filtro* e escolher *Unicode (UTF-8)*.

Nomes são comparados por palavras, sem acentos: "Ruth Bowden" no quiz ou em `coordenadas_proposta.csv` encontra "Ruth Elizabeth Mary Bowden" na planilha principal.

## Estrutura narrativa (scrollytelling)

As 10 ideias originais foram reunidas em **7 atividades**. Algumas eram duas visões dos mesmos dados:

| # | Seção | Ideias originais | Eixos mais ligados |
|---|-------|------------------|--------------------|
| 0 | **Abertura**: título, eixos, mosaico de retratos | — | todos |
| 1 | **O que é hanseníase?**: 5 passos com ilustração fixa (bacilo → transmissão → sinais → tem cura → preconceito) | Introdução | saúde pública, direitos |
| 2 | **Onde elas estão?**: mapa com retratos no local de nascimento, arcos até o local de atuação e camadas de impacto | 1 + 8 | todos |
| 3 | **Linha do tempo 1873 → 2026**: eras do tratamento e trilha de gerações | 2 + 10 | descobertas, tratamento |
| 4 | **Quem sou eu?**: cartões com pistas que viram | 3 | — |
| 5 | **Você sabia?**: cartões verticais no estilo stories | 7 | — |
| 6 | **Rede de colaboração**: constelação mulheres ↔ instituições | 4 | pesquisa clínica |
| 7 | **Quiz** | 6 | — |
| 8 | **Mulheres que mudaram a história**: contadores e nuvem de palavras | 5 + 9 | — |
| 9 | **Encerramento**: mensagem de saúde ("procure a UBS"), créditos e fontes | — | — |

A ordem segue o percurso **conhecer → localizar → contextualizar → brincar → aprofundar → testar → sintetizar**. Os jogos (Quem sou eu?, Quiz) vêm depois do conteúdo que lhes dá base.

### Navegação
- Barra de progresso de leitura no topo.
- Cabeçalho fixo: fica transparente sobre a abertura e sólido depois dela. O menu ☰ abre a lista de capítulos numerados.
- Pontos laterais (só no desktop), com o nome do capítulo ao passar o mouse; o capítulo atual fica destacado em âmbar.
- Âncoras (`#mapa`, `#quiz`…) permitem projetar ou compartilhar uma atividade específica.

## Identidade visual

Segue o manual da marca da **23ª SNCT "Ciência Delas"** (`design_requirements/`: `Marca_23SNCT.pdf`, logotipos em PNG/vetor e réguas).

- **Paleta oficial** em `--marca-*`: Violeta Profundo `#43318C`, Magenta Framboesa `#C5127C`, Verde Lima `#B6C939`, Amarelo Dourado `#F1CB25`, Laranja Vibrante `#FA8607` e Azul Ciano `#009EE0`.
- **Violeta** como cor principal (também remete ao Janeiro Roxo), numa escala de `--roxo-950` a `--roxo-50` em que `--roxo-700` é o Violeta Profundo. Abertura e painéis escuros usam o violeta da marca.
- **Amarelo Dourado** (`--ambar`) como cor de destaque (estado ativo, "em construção").
- **Seis cores de eixo** (`--eixo-*`) tiradas da paleta, cada uma com a cor de texto legível sobre ela (`--eixo-*-on`).
- **Tipografia**: o manual pede Redonda (Adobe Fonts) nos títulos e **Outfit** nos textos. Como Redonda exige assinatura Adobe, a página usa só a Outfit (Google Fonts), com pesos 800–900 nos títulos.
- **Elementos da marca**: logotipo horizontal da SNCT no cabeçalho (branco sobre a abertura, violeta quando o cabeçalho fica sólido); "HANSENÍASE" em blocos coloridos, como o "DELAS" do logotipo; faixa de quadrados coloridos (padrões geométricos); régua oficial SNCT + MCTI no rodapé. Versões web dos arquivos ficam em `assets/marca/`.
- Fotos em **duotom roxo**, para dar unidade a imagens de origens e qualidades diferentes.
- Ilustrações em SVG simples, sem imagens de lesões. É uma escolha deliberada, pensando no público infantil e no combate ao estigma.
- Acessibilidade: `prefers-reduced-motion`, foco visível, navegação por teclado (Esc fecha o menu), HTML semântico.

## Respostas às perguntas em aberto

- **"Quem sou eu?": quantas perguntas?** Um cartão por mulher, que já vem da coluna da planilha. Cada rodada sorteia 5 cartões, então o jogo cresce sozinho conforme a planilha cresce.
- **Quiz: quantas perguntas?** Com 10 a 15 no banco, cada partida sorteia 8, com 4 alternativas cada. Isso leva de 3 a 5 minutos, adequado para uma visita em feira ou sala de aula. As alternativas erradas podem ser geradas a partir de outros nomes (como na prévia).

## Ajustes sugeridos nas planilhas

**Planilha principal (`mulheres.csv`)**
1. **Fotos:** 23 das 29 mulheres não têm o arquivo correspondente em `data/photo/` (a página mostra as iniciais). Atenção a `janninebenso.jpg` (o arquivo é `janineebenso.jpg`) e a `jeanwatson` sem extensão na linha repetida.
2. **Jean Margaret Watson** aparece duas vezes. A página usa só a primeira linha.
3. **Maria Esther Noviski Gallo:** a minibio a chama de "Maria Eugênia Novisk Gallo", e a foto se chama `mariaeugenia.jpg`. Confirmar o nome.
4. **Ruth Bowden:** *orígem* diz "London, England", mas a minibio diz que ela nasceu na Índia. O mapa segue a minibio.
5. **latitude/longitude** da planilha estão em formatos misturados (`22.572.646`, `52,16° N`, `9°02′`) e alguns valores estão errados (Wanda: lon = lat; Alice Ball: lon −0,17; Alice Tibiriçá: coordenadas da Fiocruz). Por isso o mapa usa `coordenadas_proposta.csv`, que tem as 29 mulheres e uma coluna de confiança. Sugestão: trazer para a planilha principal as colunas `cidade_nascimento`, `pais_nascimento_iso3`, `lat_nascimento`, `lon_nascimento` e `locais_atuacao` (formato `Cidade|ISO3|lat|lon; …`, com ponto decimal). Elas têm prioridade sobre o arquivo provisório.
6. **eixo** pode ter vários valores separados por `;` ou `/`. O primeiro é o principal (cor do retrato); os demais aparecem como etiquetas e contam no filtro do mapa.
7. Coluna opcional **`nome_curto`** para o nome usado em cartões e no mapa (ex.: "Maria Leide", "Cristina Pessolani", "Madre Teresa"). Sem ela, a página usa primeiro + último nome.
8. Continuam úteis: `instituicoes` padronizadas (rede), `papel` (contadores), "Você sabia? (curto)" (stories), `credito_foto` / `licenca_foto` / `fontes` e `ano_marco` (linha do tempo).

**Quiz (`quiz.csv`)**
- Convertido para UTF-8; "Wanda B?e?ska" (caracteres perdidos na exportação) corrigido para Błeńska.
- **Gilla Kaplan** ainda não está na planilha principal. As outras 13 respostas já se ligam a um perfil.
- Ruth Bowden responde a duas perguntas parecidas (regeneração dos nervos / compreensão anatômica). Vale trocar uma delas.
- Colunas úteis: `alternativa_2..4`, `explicacao`, `eixo`, `nivel`.

**Glossário (`glossario.csv`)**
- Convertido para UTF-8. Corrigidos: chaumolgra → chaulmoogra, poliquimoterapia → poliquimioterapia, colônica → colônia, micobacteria → micobactéria. **Repassar essas correções para a planilha `.xlsx`**, senão voltam na próxima exportação.
- "estigma" aparece duas vezes: a página junta as duas definições num só verbete.

## Fontes e referências

`data/links_e_referencias.csv` tem três colunas: a referência (URL, citação ou citação com `<URL>`), `obs` e `titulo`.
- **titulo** (opcional): rótulo legível do link. Sem ele, a página usa a citação ou o último trecho do endereço, que nem sempre é claro.
- **obs**: se trouxer o nome de uma mulher da página (ex.: "Laila de Laguiche"), a referência aparece no perfil dela. Um nome ou sobrenome dela no endereço (ex.: `…/quem-foi-eunice-weaver`) também faz essa ligação. Outras observações não aparecem no site.
- As referências sem mulher associada aparecem em "Sobre hanseníase e sua história".

## Como cada atividade usa os dados

| Atividade | Colunas usadas | Regras |
|---|---|---|
| Linha do tempo | `década principal` (início), `data/marcos.csv` | Mulher posicionada no início da década; sem década, nascimento + 30. Gerações: até 1939 · 1940–79 · 1980–99 · 2000+. |
| Quem sou eu? | `"Quem sou eu?"`, `orígem`, `cidade/pais_atuacao`, `formação_profissão`, `eixo` | 5 cartões por rodada; pista 1 = fala da mulher (nome escondido), pista 2 = origem e atuação, pista 3 = formação e eixo. 3/2/1 pontos. |
| Você sabia? | `"Você sabia?"` | Tempo de cada história proporcional ao texto (5 s + 45 ms por caractere). Só avança quando está visível; não avança sozinha com "reduzir movimento" ligado. |
| Rede | `instituição_atuacao`, `colaboradoras`, `instituiçõesColaboradores` | Instituições reconhecidas por uma lista de nomes/siglas em `js/rede.js` (só entram as ligadas a 2+ mulheres). Colaboração entre mulheres: mesmo sobrenome + mesma inicial. |
| Quiz | `data/quiz.csv` | 8 perguntas sorteadas; alternativas erradas = nomes de outras mulheres. Depois da resposta, mostra a 1ª frase de *contribuição*. |
| Mulheres que mudaram a história | `formação_profissão`, `eixo`, `palavras-chave`, `areaconhecimento` | Papéis deduzidos por palavras-chave (médica, pesquis…, enferm…, missionária) e pelos eixos. Uma coluna `papel` tornaria isso exato. |

## Próximos passos sugeridos
1. Validar com especialista os marcos de `data/marcos.csv` e as coordenadas de `data/coordenadas_proposta.csv`.
2. Adicionar as fotos que faltam em `data/photo/` e a coluna `nome_curto` (ex.: "Maria Leide", "Cristina Pessolani").
3. Preencher créditos, fontes e equipe no encerramento.
4. Revisar a lista de instituições da rede em `js/rede.js` (ou criar a coluna `instituicoes` padronizada).
5. Testar com estudantes (9–18 anos) num computador de exposição e num celular.
