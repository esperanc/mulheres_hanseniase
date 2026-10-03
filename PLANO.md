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
index.html        estrutura de todas as seções
css/style.css     identidade visual (tokens de cor no :root)
js/csv.js         parser CSV (detecta ',' ou ';', aspas, BOM)
js/data.js        carrega as planilhas → DATA.women / DATA.quiz normalizados
js/main.js        navegação, scrollytelling, prévias dos painéis
data/             planilhas + fotos (fonte única de conteúdo)
```

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

- **Roxo** como cor principal (Janeiro Roxo), numa escala de `--roxo-950` a `--roxo-50`. Os painéis alternam fundo claro, lilás e roxo‑escuro para marcar o ritmo da rolagem.
- **Âmbar** como cor de destaque (chamadas, estado ativo, "em construção"). É o complemento quente do roxo.
- **Seis cores de eixo** (`--eixo-*`), usadas em etiquetas, mapa, linha do tempo e stories.
- Tipografia: **Sora** (títulos, geométrica e jovem) e **Nunito Sans** (texto, arredondada e muito legível). Corpo de texto com 17–20 px.
- Fotos em **duotom roxo**, para dar unidade a imagens de origens e qualidades diferentes.
- Ilustrações em SVG simples, sem imagens de lesões. É uma escolha deliberada, pensando no público infantil e no combate ao estigma.
- Acessibilidade: `prefers-reduced-motion`, foco visível, navegação por teclado (Esc fecha o menu), HTML semântico.

## Respostas às perguntas em aberto

- **"Quem sou eu?": quantas perguntas?** Um cartão por mulher, que já vem da coluna da planilha. Cada rodada sorteia 5 cartões, então o jogo cresce sozinho conforme a planilha cresce.
- **Quiz: quantas perguntas?** Com 10 a 15 no banco, cada partida sorteia 8, com 4 alternativas cada. Isso leva de 3 a 5 minutos, adequado para uma visita em feira ou sala de aula. As alternativas erradas podem ser geradas a partir de outros nomes (como na prévia).

## Ajustes sugeridos nas planilhas

**Planilha principal**
1. Para o mapa, criar colunas `cidade_nascimento`, `lat_nascimento`, `lon_nascimento`, `lat_atuacao`, `lon_atuacao`. Exemplo do problema: Ruth Bowden tem "Inglaterra" em *orígem*, mas nasceu na Índia, segundo a minibio.
2. Para a rede, criar uma coluna `instituicoes` com siglas padronizadas separadas por `;` (ex.: `OMS; Fiocruz; UFRJ`). Hoje o texto livre permite detectar só 2 conexões.
3. Para os contadores, criar uma coluna `papel` (pesquisadora / médica / ativista / gestora / liderança comunitária). Não dá para extrair isso com segurança de *formação_profissão*.
4. Para os stories, criar uma coluna "Você sabia? (curto)" com até cerca de 200 caracteres. Os textos atuais são longos demais para um cartão.
5. Criar as colunas `credito_foto` / `licenca_foto` e `fontes`. São essenciais numa página pública.
6. Criar um `ano_marco` (ano da principal contribuição) para posicionar cada mulher na linha do tempo. Hoje a página usa o início de *década principal*.

**Planilha do quiz**
- Usa `;` como separador e tem pontos finais em algumas respostas. O código já trata as duas coisas.
- Colunas úteis: `alternativa_2..4` (opcionais), `explicacao` (1–2 frases mostradas após a resposta), `eixo`, `nivel` (fácil/médio).
- Várias respostas (Maria Leide, Gilla Kaplan, Annemieke Geluk, Charlotte Avanzi, Olivia Breitha, Euzenir Sarno) ainda não estão na planilha principal. A página vai ligar cada resposta ao perfil pelo nome.

## Próximos passos sugeridos
1. Completar a planilha principal com as colunas acima.
2. Implementar o mapa (Leaflet ou D3 + TopoJSON local), que é o painel mais rico.
3. Quiz e Quem sou eu?, que são os mais simples e os de maior apelo para a escola.
4. Linha do tempo com marcos validados por uma especialista.
5. Rede e nuvem de palavras.
