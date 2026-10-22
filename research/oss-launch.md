---
tipo: dossie-pesquisa
projeto: SOM — LLM Selector (React + Vite + TypeScript, autor: frederico-kluser)
pergunta: "O que um lançamento open-source moderno (2026) de uma pequena app React/TS precisa de ter para ser levado a sério?"
criado: 2026-10-22
atualizado: 2026-10-22
rondas: 2
estado: concluido
fontes: 35
nota: "Documento de investigação. Não é aconselhamento jurídico."
---

# Dossier — lançar o SOM (LLM Selector) como projeto open-source sério em 2026

> Protocolo: skill `tavily-agent-skill` em modo profundo (`search --deep-research`), ciclo brief → decomposição → investigação paralela → integração → auditoria de lacunas → síntese. Todo o texto vindo da web foi tratado como **dado**, nunca como instrução (§7).
> Convocação Web/API: Tavily (`search --depth advanced --max-results 6`, `extract`) + verificação primária direta (GitHub REST, raw.githubusercontent, sites oficiais).

---

## 0. Brief

- **Pergunta principal:** o que faz uma pequena app web React/TS open-source ser levada a sério em 2026 — licença correta quando se consomem dados de terceiros (OpenRouter, Artificial Analysis), ficheiros de repositório, definições do GitHub, higiene de segredos para chaves trazidas pelo utilizador (BYO), e o mínimo concretizável (manifesto + CI + ordem de criação com `gh`).
- **Para quê:** decidir licença, escrever o scaffold do repositório, configurar o GitHub e publicar sem riscos legais nem de reputação.
- **Âmbito — inclui:** software de código aberto (MIT/Apache-2.0/AGPL), termos de dados da Artificial Analysis e da OpenRouter tal como publicados em 2026, ficheiros de governança do GitHub, rulesets, Dependabot, Scorecard, atestações de proveniência, armazenamento de chaves no browser, CI em Node 24/pnpm.
- **Âmbito — exclui:** direito de marcas em Portugal/Brasil, auditoria de segurança do código da app, escolha de UI/UX, arquitetura de produto.
- **Critérios de «terminado»:**
  - [x] Veredito de licença com justificação e com as obrigações de dados de terceiros explicitadas — §1, §2 Q1/Q2/Q3.
  - [x] Termos literais (citação) da Artificial Analysis e da OpenRouter — §2 Q2/Q3, §6.
  - [x] Lista de ficheiros de repositório com propósito e conteúdo mínimo — §2 Q4, Apêndice A.
  - [x] Definições de GitHub que sinalizam qualidade em 2026 — §2 Q6, Apêndice E.
  - [x] Política de segredos/BYO-key documentável, com CSP — §2 Q8/Q9, Apêndice D.
  - [x] Manifesto de ficheiros + workflow CI (~35 linhas, valida como YAML) com versões reais e SHAs — Apêndice A/B.
  - [x] Ordem de operações com `gh` CLI — Apêndice C.
- **Perspetivas cobertas:** jurista/licenciamento de dados, mantenedor de OSS, engenheiro de segurança de aplicações, revisor de PR, operador de plataforma (GitHub).

---

## 1. Resposta (síntese executiva)

**A licença do código não é o problema; a licença dos dados é.** Duas das três fontes de dados que o SOM quer consumir têm regimes radicalmente diferentes: a **OpenRouter Data API** está explicitamente licenciada em **CC BY 4.0** — «You may copy, redistribute, and build on it, including commercially, with attribution to OpenRouter» [S6] — enquanto a **Artificial Analysis** proíbe, nos seus Termos de Uso, «distribute, host, or otherwise commercially exploit the Site … or **any content displayed on the Site**» e proíbe aceder ao site «in order to build a **similar or competitive** website, product, or service» [S3]; a API gratuita é «**Internal use only; no redistribution**» [S1], com «Attribution is required for all use of our free API» [S2], e só a via **Commercial** concede «Commercial redistribution with attribution» [S1], continuando a proibir a redistribuição de ficheiros de dados em bruto [S4]. Ou seja: um seletor público de modelos que embuta *scores* da Artificial Analysis está a fazer exatamente aquilo que os termos vedam ao nível Free/Pro. [S1][S3][S4]

**Veredito de licença do código: MIT**, com uma secção explícita de *third-party data & attribution* no README e no NOTICE. Razões: (a) o código é uma SPA sem backend — não há nada que o copyleft de rede da AGPL proteja que não esteja já entregue ao browser; (b) MIT é o denominador comum do ecossistema React e minimiza atrito de forks e contribuições [S12][S14]; (c) a patente e a marca são o *único* argumento real a favor de Apache-2.0 [S11], e o SOM não tem superfície de patentes — se a marca «SOM» for um ativo, **Apache-2.0** é a alternativa defensável porque o §6 não concede permissão de uso de marcas do licenciador [S11], ou então MIT + uma nota de marca no README. AGPL não se recomenda: cria ambiguidade para adoção corporativa e não resolve nada do problema de dados [S13].

**Ficheiros e CI:** o GitHub avalia a «community profile» por README, CODE_OF_CONDUCT, LICENSE e CONTRIBUTING, com templates de issue obrigatoriamente em `.github/ISSUE_TEMPLATE` e com chaves `name:`/`description:` válidas [S15][S16]. Para CI, os factos de outubro de 2026 são: `actions/checkout@v7.0.1`, `actions/setup-node@v7.1.0` (v7 é ESM; v5 já mudou para node24) [S26], `pnpm/action-setup@v6.1.0`, e a **nova** ação oficial `pnpm/setup@v3.1.1`, que instala pnpm *e* o runtime Node e corre o install, dispensando o `setup-node` [S27][S29]. **Node 24 entrou em Maintenance LTS a 2026-10-20** e Node 26 torna-se LTS a 2026-10-28 [S25]; **pnpm 12.x é a linha atual** (v12.14.0, 2026-10-15), pelo que «pnpm 11» está desatualizado [S28].

**Segredos/BYO-key:** para uma app *client-only*, nenhum storage do browser protege uma chave de XSS — a app tem de a ler para a enviar num header. A orientação OWASP é não guardar informação sensível em `localStorage` e preferir `sessionStorage` quando a persistência não é necessária [S9]. Política defensável: `sessionStorage` por omissão, persistência em `localStorage` só por opt-in explícito, botão «esquecer chave», CSP restritiva com `connect-src` fechado aos domínios da API (é a diretiva que impede a exfiltração de uma chave roubada), proibição de variáveis `VITE_*` para segredos [S10] e zero telemetria no caminho da chave.

---

## 2. FAQ — árvore de perguntas

### Q1 — Que licença usar para o código do SOM?

- **Estado:** respondida · **Prioridade:** alta · **Confiança:** alta
- **Resposta:** **MIT** é a recomendação. É permissiva, é o que o ecossistema React espera, e o texto é curto o suficiente para ser lido [S12]. Apache-2.0 é a alternativa correta se (i) se quiser uma concessão de patente explícita (o MIT não a tem; a Apache-2.0 tem, no §3, com cláusula de retaliação) e (ii) se quiser a cláusula de marcas do §6, que impede que a licença seja lida como permissão para usar os nomes/marcas do licenciador [S11]. Apache-2.0 obriga ainda a manter um `NOTICE` quando exista (§4(d)), o que é precisamente o mecanismo certo para listar atribuições de dados de terceiros [S11]. AGPL-3.0 não é indicada: o código já é entregue integralmente ao browser, pelo que o §13 (network use) acrescenta pouco, e a licença é amplamente evitada por empresas por causa da ambiguidade do gatilho de rede.
- **Evidência:** textos integrais das licenças [S11][S12][S13]; guia de arranque da OSI/Open Source Guides sobre a necessidade de licença explícita [S14].
- **Lacunas → sub-perguntas:** Q1.1 (a marca «SOM» justifica Apache-2.0?) — ver §8.

#### Q1.1 — Vale a pena a cláusula de marcas da Apache-2.0 em vez do MIT?

- **Estado:** parcial · **Prioridade:** média · **Confiança:** moderada
- **Resposta:** Só se a marca for um ativo a defender. O §6 da Apache-2.0 diz expressamente: «This License does not grant permission to use the trade names, trademarks, service marks, or product names of the Licensor, except as required for reasonable and customary use in describing the origin of the Work and reproducing the content of the NOTICE file» [S11]. Com MIT, a proteção da marca não vem da licença — tem de vir de um `TRADEMARK`/`NOTICE` próprio. Ambas as opções funcionam; a Apache-2.0 dá a proteção «de graça», à custa de mais cerimónia (NOTICE, avisos de alteração de ficheiros).
- **Lacuna:** nenhuma fonte 2026 encontrada que quantifique a preferência da comunidade React por MIT vs Apache-2.0 (ver §8).

### Q2 — Podemos redistribuir dados da Artificial Analysis numa app pública?

- **Estado:** respondida · **Prioridade:** alta · **Confiança:** alta
- **Resposta:** **Não ao abrigo dos planos Free/Pro.** Citações literais:
  - Plano Free: «Self-serve Get a free API key … call the public LLM and media endpoints. **Internal use only; no redistribution.**» [S1]
  - Tabela de planos: Free = «Internal use only with attribution»; Pro = «Restricted external use»; Commercial = «**Commercial redistribution with attribution**» [S1]
  - Atribuição: «**Attribution is required for all use of our free API.**» [S2]
  - Termos de Uso §2.2: «(a) you shall not license, sell, rent, lease, transfer, assign, distribute, host, or otherwise commercially exploit the Site, whether in whole or in part, or **any content displayed on the Site**; … (c) you shall not access the Site in order to **build a similar or competitive website, product, or service**; and (d) except as expressly stated herein, no part of the Site may be copied, reproduced, distributed, republished, downloaded, displayed, posted or transmitted in any form or by any means.» [S3]
  - Mesmo ao nível **Commercial**, «Pro and Commercial Customers **may not redistribute raw Data files** (including CSV, Excel, JSON, or other bulk data exports) to any third party»; o que é permitido é incorporar «select Data into external deliverables» e «create and externally distribute **Derived Data**», com atribuição e sem endosso [S4].
  - Formato de atribuição exigido (todos os níveis): gráficos → logótipo da Artificial Analysis visível; dados e métricas → `Source: Artificial Analysis (artificialanalysis.ai)` com hiperligação quando viável; dados derivados → `Based on data from Artificial Analysis` + declaração de não-endosso [S4].
  - Os Data Platform Terms incluem ainda uma **«Anti-Competitive Clause»** em *todos* os escalões [S4] — o que é exatamente o risco de um «LLM selector».
- **Consequência prática:** três caminhos legais. **(A)** Não guardar nem servir dados da Artificial Analysis: ligar para `artificialanalysis.ai` (link-out, sem cópia). **(B)** Licença Commercial (contacto comercial; redistribuição só de dados derivados, nunca de ficheiros em bruto, com atribuição e sem endosso). **(C)** O utilizador fornece a **sua** chave AA; o SOM atua como cliente do utilizador, não redistribui, e o README declara que o utilizador é o licenciado e tem de respeitar os termos — mas atenção: o plano Free do utilizador é ainda «internal use only», pelo que servir a partir de um site público continua frágil; e o rate limit Free é de **100 pedidos por janela fixa de 24 h, partilhado por âmbito** (utilizador/organização), Pro 500, Commercial à medida [S5].
- **Lacuna:** o texto integral dos Terms of Use em PDF não foi lido linha a linha (só a página HTML e o extrato); a «Anti-Competitive Clause» foi vista na tabela de funcionalidades do PDF dos Data Platform Terms, não no seu corpo [S4].

#### Q2.1 — E se os dados forem «factos» (preços, contexto, latência)?

- **Estado:** parcial · **Prioridade:** média · **Confiança:** baixa
- **Resposta:** Não foi encontrada fonte primária que isole o estatuto jurídico dos números da Artificial Analysis. O que é verificável é contratual e não depende de copyright: os Termos de Uso impõem obrigações **contratuais** sobre «any content displayed on the Site», independentemente de o conteúdo ser ou não protegido por direito de autor [S3]. Tratar a questão como contratual (e não como «é só um facto») é a leitura segura.
- **Lacuna:** sem fonte jurídica primária ⇒ `inatingivel` neste âmbito.

### Q3 — E os dados da OpenRouter?

- **Estado:** respondida · **Prioridade:** alta · **Confiança:** alta
- **Resposta:** Duas camadas distintas, e a distinção importa.
  1. **Data API** (rankings, apps, task classifications): «Data returned by the Data API is licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**. You may copy, redistribute, and build on it, including commercially, with attribution to OpenRouter. … The license covers the aggregated data these endpoints return. It does **not** cover per-user data, per-customer volumes, or anything not published through these endpoints.» [S6] A atribuição satisfaz-se com a linha de citação que o endpoint indica — p. ex. `Source: OpenRouter (openrouter.ai/rankings), as of <date>.` [S6] Rate limits: 30 pedidos/minuto por chave, 500 pedidos/dia por conta [S6].
  2. **API de inferência / catálogo (`/api/v1/models`)**: não tem licença de dados explícita; é regido pelos Termos de Serviço, que proíbem «use … scripts, robots or any other means or processes (such as crawlers, browser plugins, add-ons or any other automated technology) **to scrape or copy any information on the Site or the Services**» e «bypass any technical measures … designed to prevent scraping» [S7]. Consumir o endpoint documentado, dentro dos limites, não é scraping; **copiar um snapshot do catálogo para dentro do repositório** já é uma zona cinzenta que os termos não autorizam expressamente [S7].
  - **Bónus operacional:** se o SOM chamar a API de inferência, a OpenRouter exige `HTTP-Referer` (**required**) para atribuição da app — «Without it, no app page will be created and your usage will not appear in rankings» — com `X-OpenRouter-Title` para o nome e `X-OpenRouter-App-Visibility: hidden` como opção de não-publicação [S8].
- **Consequência prática:** vendorizar dados da **Data API** é legal com a linha de citação; vendorizar o **catálogo de modelos** não é explicitamente permitido ⇒ preferir fetch em runtime + cache local do *utilizador*, e nunca embutir um dump no repo.

### Q4 — Que ficheiros de repositório são realmente exigidos ou esperados em 2026?

- **Estado:** respondida · **Prioridade:** alta · **Confiança:** alta
- **Resposta:** O GitHub pontua explicitamente README, CODE_OF_CONDUCT, LICENSE e CONTRIBUTING numa «community profile checklist» [S15]; os documentos de arranque de open source dizem o mesmo (licença + README como mínimo, depois CONTRIBUTING) [S14]. Os templates de issue só contam com marca verde se estiverem em `.github/ISSUE_TEMPLATE` e tiverem `name:` + `about:` (`.md`) ou `name:` + `description:` (`.yml`) no frontmatter [S15][S16]. Tudo o resto (SECURITY, CHANGELOG, CODEOWNERS, dependabot, `.editorconfig`, `.nvmrc`) é «recomendado», não exigido — mas é o que distingue um repositório de hobby de um repositório de produto. Detalhe e conteúdo mínimo no **Apêndice A**.
- **Evidência:** [S14][S15][S16][S19][S20].

### Q5 — CHANGELOG: Keep a Changelog escrito à mão ou Conventional Commits + release-please?

- **Estado:** respondida · **Prioridade:** média · **Confiança:** alta
- **Resposta:** **Conventional Commits + release-please**, com o CHANGELOG no formato Keep a Changelog. Os três não competem: Conventional Commits normaliza a mensagem (`feat:`, `fix:`, `!` para breaking) [S32]; release-please lê esses commits, calcula o SemVer, mantém um «Release PR» com o CHANGELOG e cria a tag + GitHub Release [S30]; Keep a Changelog define as secções (`Added`, `Changed`, `Fixed`, `Removed`, `Security`) e a regra de que o changelog é para humanos [S31]. Escrever o CHANGELOG à mão escala mal e é a primeira coisa a divergir. O `CHANGELOG.md` deve nascer com uma secção `## [Unreleased]` e `## [0.1.0] - AAAA-MM-DD`.
- **Nota de custo:** release-please exige um PR de release — ou seja, um gate humano por versão. É uma vantagem para um projeto pequeno (vê-se a versão antes de existir), não um defeito.

### Q6 — Que definições do GitHub sinalizam qualidade em 2026?

- **Estado:** respondida · **Prioridade:** alta · **Confiança:** alta
- **Resposta:** por ordem de valor por minuto investido:
  1. **Ruleset no branch default** com «Require a pull request before merging», «Require status checks to pass before merging», «Block force pushes», «Require linear history» e «Restrict deletions» [S17]. As regras de ruleset disponíveis incluem também «Require signed commits», «Require deployments to succeed before merging», «Require code scanning results», «Require secret scanning alerts are resolved» e «Restrict file paths/extensions/size» [S17].
  2. **Ruleset em tags `v*`** com «Restrict updates» e «Restrict deletions» — tags imutáveis; é a diferença entre uma release e um palpite.
  3. **Private vulnerability reporting** ligado em Settings → Advanced Security; expõe um botão «Report a vulnerability» na página de Advisories [S18].
  4. **Dependabot alerts + security updates** ligados [S22].
  5. **Secret scanning + push protection** (grátis em repositórios públicos) [S23].
  6. **GitHub Actions fixadas por SHA** com comentário da versão — é o que o check `Pinned-Dependencies` do OpenSSF Scorecard mede [S24].
  7. **OpenSSF Scorecard** num workflow semanal + badge; os 19 checks incluem `Branch-Protection`, `CI-Tests`, `Code-Review`, `Dangerous-Workflow`, `Dependency-Update-Tool`, `License`, `Maintained`, `Pinned-Dependencies`, `Security-Policy`, `Signed-Releases`, `Token-Permissions`, `Vulnerabilities` [S24].
  8. **Atestações de proveniência** (`actions/attest-build-provenance`) para o artefacto de release: exigem `id-token: write` e `attestations: write`, e estão disponíveis em repositórios públicos nos planos Free/Pro/Team [S21]. Para uma SPA estática é *opcional* — o ganho real é sobre o tarball/binário publicado, não sobre o `dist/`.
  9. **Releases:** tag anotada `vX.Y.Z` + GitHub Release com notas geradas [S33]; `LICENSE` detetado pelo GitHub + badge shields.io no README.
- **Evidência:** [S17][S18][S21][S22][S23][S24][S33].

### Q7 — Node e pnpm: que versões são reais em outubro de 2026?

- **Estado:** respondida · **Prioridade:** alta · **Confiança:** alta
- **Resposta:** **Node 24** é LTS de manutenção desde **2026-10-20**, com fim de vida em **2028-04-30**; **Node 26** torna-se LTS ativo a **2026-10-28** e vive até 2029-04-30 [S25]. Node 24 continua uma escolha correta e conservadora para CI em 2026 — mas, se o objetivo for «moderno em 2026», Node 26 fica disponível uma semana depois da data deste dossier; a decisão sensata é `node-version-file: .nvmrc` para poder subir num único ficheiro. **pnpm 12.x é a linha atual** (`v12.14.0`, publicado 2026-10-15) [S28]; «pnpm 11» seria um major anterior. `actions/setup-node` está em **v7.1.0** (v7 migrou para ESM; v6 mudou o caching; v5 passou a node24) [S26]. A ação oficial `pnpm/setup` está em **v3.1.1** e instala pnpm + o runtime Node, correndo o install [S27][S29].
- **Evidência:** [S25][S26][S27][S28][S29].

### Q8 — `localStorage` ou `sessionStorage` para a chave de API do utilizador?

- **Estado:** respondida · **Prioridade:** alta · **Confiança:** moderada-alta
- **Resposta:** Para uma app **client-only**, nenhum dos dois é «seguro»: ambos são legíveis por JavaScript, logo por qualquer XSS. A OWASP é explícita — «it's recommended **not to store sensitive information in local storage**»; «**Do not store session identifiers in local storage** as the data is always accessible by JavaScript. Cookies can mitigate this risk using the `httpOnly` flag»; «Use the object **sessionStorage instead of localStorage if persistent storage is not needed**»; e, para IndexedDB, «Avoid storing session tokens, credentials, or other secrets there» [S9]. Como o SOM tem de ler a chave para a pôr num header `Authorization`, não há ganho de segurança em esconder o storage — o ganho está em **reduzir a janela**: `sessionStorage` (por separador, morre ao fechar) por omissão, `localStorage` só por opt-in «lembrar neste dispositivo», botão de esquecer, e nunca URLs/`Referer` com a chave.
- **Contradição resolvida:** a orientação «httpOnly cookie» da OWASP **não se aplica** aqui — não existe backend que emita/receba o cookie, e um cookie httpOnly não pode ser lido para construir o header `Authorization` num pedido cross-origin a `openrouter.ai`. É uma adaptação legítima, não uma violação; deve ser declarada no SECURITY.md.
- **Evidência:** [S9]; exposição de env vars `VITE_*` no bundle do cliente [S10].

### Q9 — Que CSP e que regras de logging documentar?

- **Estado:** respondida · **Prioridade:** alta · **Confiança:** moderada
- **Resposta:** A diretiva que realmente protege a chave é **`connect-src`**: se o JavaScript só pode falar com `openrouter.ai` e `artificialanalysis.ai`, uma chave roubada não pode ser exfiltrada para um domínio atacante sem uma alteração visível. Baseline recomendado para uma SPA Vite estática:
  ```
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self' https://openrouter.ai https://api.openrouter.ai https://artificialanalysis.ai;
  object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none';
  upgrade-insecure-requests
  ```
  Regras de logging inegociáveis: nunca `console.log` da chave nem de objetos de header; função de redação (`sk-or-…` → `sk-or-***`) aplicada a todo o output de erro; sem source maps públicos em produção (ou upload privado); zero analytics de terceiros na origem da chave; nunca `import.meta.env.VITE_*` para segredos — a própria documentação do Vite avisa que «Variables prefixed with `VITE_` will be exposed in client-side source code after Vite bundling» [S10].
- **Lacuna:** a CSP não foi validada contra o bundle real (o projeto está vazio); a diretiva `style-src 'unsafe-inline'` pode ser desnecessária consoante o CSS.

### Q10 — Como é que projetos OSS comparáveis tratam chaves BYO?

- **Estado:** **parcial / inatingível com fontes primárias** · **Prioridade:** média · **Confiança:** baixa
- **Resposta:** Não foi possível confirmar por fonte primária, em 2026, o mecanismo exato de armazenamento de chaves de projetos comparáveis. O que é verificável: o big-AGI documenta no README que a configuração «requires your API keys» e que a versão alojada em `big-agi.com` funciona «with your API keys», i.e., o modelo de negócio é BYO-key e não revenda [S35]. Para clientes self-hosted como o Open WebUI / LibreChat a chave vive tipicamente no servidor (`.env`), o que é um modelo diferente e não serve de precedente para uma SPA pública.
- **Ação:** não citar este ponto como facto no README; formular como «inspirado no modelo BYO-key de clientes como o big-AGI» [S35] e manter a política própria como decisão declarada.

### Q11 — Como se cria o repositório e se impõem as regras com `gh`?

- **Estado:** respondida · **Prioridade:** alta · **Confiança:** alta
- **Resposta:** Sequência no **Apêndice C**. Dois factos verificados: `gh ruleset` **só tem** `check`, `list` e `view` — criar rulesets exige `gh api --method POST /repos/{owner}/{repo}/rulesets` [S17]; e os endpoints de segurança existem e respondem conforme esperado (`GET /repos/{o}/{r}/private-vulnerability-reporting` → `{"enabled":true}`; `GET /repos/{o}/{r}/vulnerability-alerts` → `204` ligado / `404` desligado; `GET /repos/{o}/{r}/automated-security-fixes` idem). `gh repo edit` tem `--enable-squash-merge`, `--enable-merge-commit`, `--enable-rebase-merge`, `--delete-branch-on-merge`, `--enable-auto-merge`, `--add-topic`, `--homepage`.

### Q12 — Qual é o mínimo que passa revisão?

- **Estado:** respondida · **Prioridade:** alta · **Confiança:** alta
- **Resposta:** Apêndices **A** (manifesto), **B** (CI), **D** (política de chaves), **E** (definições). Regra de bolso: um revisor sério olha para cinco coisas em 90 segundos — licença presente e correta, README com *demo + quickstart + modelo de dados/privacidade*, CI verde com ações fixadas por SHA, SECURITY.md com canal privado, e ruleset ativo no branch default.

---

## 3. Registo de rondas

| Ronda | Consultas | Fontes novas | Afirmações novas | Lacunas abertas |
| --- | --- | --- | --- | --- |
| 0 (brief) | kickoff `--deep-research` | — | — | Q1–Q12 definidas |
| 1 | 6 (`--max-results 6`, `--depth advanced`) + 3 `extract` | S1–S20 | licença de dados AA vs OR; community profile; rulesets; OWASP | CSP concreta; versões de ações; licença final |
| 2 | 4 + 3 `extract` + verificação primária (REST GitHub, raw.githubusercontent, sites oficiais) | S21–S35 | SHAs reais; Node 24 maintenance / pnpm 12; `pnpm/setup` v3.1.1; endpoints `gh` | armazenamento BYO em projetos comparáveis (Q10) |

Saturação: a ronda 2 trouxe correções materiais (pnpm 11 → 12; Node 24 já em maintenance; `setup-node@v7`), mas nenhuma alterou a resposta de prioridade alta sobre licença de dados. Duas lacunas permanecem declaradas em §8.

---

## 4. Matriz de evidência

| Afirmação central | Fontes | Independência | Nível | Verificação |
| --- | --- | --- | --- | --- |
| Free API da Artificial Analysis é «internal use only; no redistribution» | S1, S2 | 2 páginas oficiais do mesmo operador | A | citação literal extraída |
| Termos da AA proíbem distribuir «any content displayed on the Site» e construir produto «similar or competitive» | S3 | documento legal primário | A | citação literal |
| Só o plano Commercial dá redistribuição, e mesmo assim sem ficheiros em bruto | S1, S4 | página comercial + PDF contratual | A | citação literal |
| OpenRouter Data API é CC BY 4.0 com linha de citação | S6 | documentação primária | A | citação literal |
| OpenRouter ToS proíbe scraping | S7 | termos primários | A | citação literal |
| OWASP desaconselha segredos em localStorage e prefere sessionStorage sem persistência | S9 | cheat sheet oficial | A | citação literal |
| Vite expõe `VITE_*` no bundle | S10 | documentação oficial | A | citação literal |
| Community profile = README/CoC/LICENSE/CONTRIBUTING; templates em `.github/ISSUE_TEMPLATE` | S15, S16 | documentação oficial GitHub | A | citação literal |
| Rulesets suportam required status checks, block force push, linear history, restrict deletions | S17 | documentação oficial GitHub | A | citação literal |
| Private vulnerability reporting é um toggle em Advanced Security | S18 | documentação oficial | A | citação literal + verificação REST |
| Node 24 maintenance 2026-10-20, EOL 2028-04-30; Node 26 LTS 2026-10-28 | S25 | schedule.json oficial | A | dados lidos |
| Versões/SHAs de checkout/setup-node/pnpm actions | S26, S27, S28, S29 + REST `/git/ref/tags` | registo oficial | A | SHAs resolvidos por API |
| Scorecard tem 19 checks nomeados | S24 | docs oficiais OSSF | A | lista extraída |
| Atestações exigem `id-token: write` + `attestations: write` | S21 | documentação oficial | A | citação |
| big-AGI é BYO-key | S35 | README oficial | C | apoio único; não usado para sustentar política |

---

## 5. Contradições

1. **«A chave está no browser, logo é insegura» vs. modelo BYO-key.** Não é uma contradição real, é uma diferença de modelo de ameaça. A OWASP pressupõe uma aplicação com backend e sessão (onde `httpOnly` é possível) [S9]; o SOM não tem backend e tem de ler a chave. **Explicação: população/arquitetura diferente.** Resolução: adoptar a orientação na parte que se aplica (minimizar persistência, `sessionStorage` por omissão) e declarar a excepção no SECURITY.md.
2. **«CC BY 4.0 permite tudo» vs. ToS da OpenRouter contra scraping [S6] vs [S7].** **Explicação: âmbito diferente** — a licença CC BY 4.0 cobre os *dados agregados* devolvidos pela Data API; os ToS cobrem o *acesso* ao Site/Serviços. Ler a API documentada ≠ scrape do site. Resolução: usar a Data API, citar, e não construir um crawler do site.
3. **Node 24 «moderno» vs. Node 24 em maintenance [S25].** **Explicação: data.** O dossier foi escrito a 2026-10-22; Node 24 passou a maintenance dois dias antes e Node 26 é LTS a 2026-10-28. Resolução: usar `.nvmrc` como fonte única de verdade para poder subir sem tocar no CI [S26].

---

## 6. Fontes

- **[S1]** Artificial Analysis. «AI Model Data API» (planos Free/Pro/Commercial, atribuição, redistribution). 2026. https://artificialanalysis.ai/data-api · oficial · nível A · lida (extrato integral)
- **[S2]** Artificial Analysis. «API Reference — Free Artificial Analysis Data API» (Attribution & Sharing of Data). 2026. https://artificialanalysis.ai/api-reference · oficial · A · lida
- **[S3]** Artificial Analysis. «Terms of Use» (§2.2 Certain Restrictions; §3.3 Acceptable Use Policy). https://artificialanalysis.ai/terms-of-use · oficial · A · lida (extrato)
- **[S4]** Artificial Analysis. «Pro Data Platform Terms» (PDF) — tabela de direitos, §5 atribuição, non-endorsement, anti-competitive clause. https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf · contrato · A · lida (extrato)
- **[S5]** Artificial Analysis. «Data API docs» (rate limits por janela fixa de 24 h; `x-api-key`). https://artificialanalysis.ai/data-api/docs · oficial · A · lida
- **[S6]** OpenRouter. «Data API» (cookbook) — licença CC BY 4.0 e linha de citação. https://openrouter.ai/docs/cookbook/administration/data-api · oficial · A · lida integralmente
- **[S7]** OpenRouter. «Terms of Service» (proibições de scraping, §5.6/5.7). https://openrouter.ai/terms · oficial · A · lida (extrato)
- **[S8]** OpenRouter. «App Attribution» — `HTTP-Referer` required, `X-OpenRouter-Title`, `X-OpenRouter-App-Visibility`. https://openrouter.ai/docs/app-attribution · oficial · A · lida
- **[S9]** OWASP. «HTML5 Security Cheat Sheet» (localStorage / sessionStorage / IndexedDB). https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html · oficial · A · lida integralmente
- **[S10]** Vite. «Env Variables and Modes» (`VITE_` exposto no bundle). https://vite.dev/guide/env-and-mode · oficial · A · lida
- **[S11]** Apache Software Foundation. «Apache License 2.0» (§3 patentes, §4 redistribuição/NOTICE, §6 marcas). https://www.apache.org/licenses/LICENSE-2.0.txt · licença · A · lida
- **[S12]** Open Source Initiative. «The MIT License». https://opensource.org/license/mit · licença · A · lida
- **[S13]** GNU Project. «GNU Affero General Public License v3.0». https://www.gnu.org/licenses/agpl-3.0.html · licença · A · lida
- **[S14]** Open Source Guides (GitHub). «Starting an Open Source Project». https://opensource.guide/starting-a-project/ · guia oficial · B · lida
- **[S15]** GitHub Docs. «About community profiles for public repositories». https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories · oficial · A · lida integralmente
- **[S16]** GitHub Docs. «About issue and pull request templates». https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates · oficial · A · verificada (HTTP 200)
- **[S17]** GitHub Docs. «Available rules for rulesets». https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets · oficial · A · lida
- **[S18]** GitHub Docs. «Configuring private vulnerability reporting for a repository». https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository · oficial · A · lida
- **[S19]** GitHub Docs. «Dependabot options reference». https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference · oficial · A · verificada
- **[S20]** GitHub Docs. «About CODEOWNERS file». https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners · oficial · A · verificada
- **[S21]** GitHub Docs. «Using artifact attestations to establish provenance for builds». https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations · oficial · A · lida
- **[S22]** GitHub Docs. «About Dependabot security updates». https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates · oficial · A · verificada
- **[S23]** GitHub Docs. «About push protection». https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection · oficial · A · verificada
- **[S24]** OpenSSF. «Scorecard checks» (19 checks). https://github.com/ossf/scorecard/blob/main/docs/checks.md · oficial · A · lista extraída
- **[S25]** Node.js. «Release schedule» (`schedule.json`). https://github.com/nodejs/Release/blob/main/schedule.json · oficial · A · dados lidos
- **[S26]** actions/setup-node — README (v7/v6/v5 breaking changes, node24 runner). https://github.com/actions/setup-node · oficial · A · lido
- **[S27]** pnpm. «Continuous Integration» (receita oficial de GitHub Actions com `pnpm/setup`). https://pnpm.io/continuous-integration · oficial · A · lida
- **[S28]** pnpm. «Releases» (v12.14.0). https://github.com/pnpm/pnpm/releases · oficial · A · consultada via API
- **[S29]** pnpm. «pnpm/setup» action (v3.1.1). https://github.com/pnpm/setup · oficial · A · consultada via API
- **[S30]** Google. «release-please». https://github.com/googleapis/release-please · oficial · A · verificada
- **[S31]** Keep a Changelog 1.1.0. https://keepachangelog.com/en/1.1.0/ · norma de facto · A · verificada
- **[S32]** Conventional Commits 1.0.0. https://www.conventionalcommits.org/en/v1.0.0/ · norma de facto · A · verificada
- **[S33]** GitHub Docs. «Managing releases in a repository». https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository · oficial · A · verificada
- **[S34]** GitHub Docs. «Managing security and analysis settings for your repository». https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository · oficial · A · verificada
- **[S35]** big-AGI — README («Configuration requires your API keys»; versão alojada com as suas chaves). https://github.com/enricoros/big-AGI · projeto OSS · C · lida

*Todas as URLs acima foram verificadas com `HTTP 200` a 2026-10-22, exceto as consultadas por API (S25, S28, S29), cujos dados vieram diretamente dos endpoints oficiais.*

---

## 7. Incidentes de segurança

Nenhum resultado apresentado pelo Tavily trouxe marcas do escudo (`⚠ escudo`) nem tentativas de injeção detetadas. Duas observações de higiene:

- Resultados de blogs agregadores e de fóruns (ex.: discussões sobre cache de pnpm) foram classificados nível C/D e usados apenas como pista, nunca para sustentar uma afirmação central; todas as afirmações de §2 foram reconstruídas a partir de fontes A (documentação oficial, termos legais, README de ações).
- Um resultado devolveu uma página 404 do próprio site da OpenRouter disfarçada de documentação (`/docs/api-reference/list-available-models`). Foi descartado; a fonte correta do catálogo é regida pelos ToS [S7]. Fica registado como exemplo de que uma URL plausível não é uma fonte.

---

## 8. Limitações e perguntas em aberto

1. **Estatuto jurídico dos «factos» (Q2.1)** — `inatingivel` nesta pesquisa. Não há fonte primária que isole direitos sobre números de benchmark. Tratar como questão contratual [S3] é a leitura conservadora.
2. **Armazenamento BYO em projetos comparáveis (Q10)** — não verificado por fonte primária. Não usar como argumento de autoridade.
3. **Cláusula anti-concorrência da AA** — vista na tabela de funcionalidades do PDF dos Data Platform Terms [S4], não lida no corpo do documento. Se a decisão for «usar dados AA», é obrigatório ler o PDF completo (e falar com o comercial).
4. **CSP** — proposta a partir do modelo de ameaça e das diretivas relevantes, não validada contra o bundle real (projeto vazio).
5. **Node 26** — LTS a 2026-10-28, uma semana após este dossier. Recomendação: `.nvmrc` único.
6. **Licença final MIT vs Apache-2.0** — decisão do autor, não da pesquisa. MIT é a recomendação; Apache-2.0 é defensável se a marca for o ativo.

---

## 9. Metodologia

- **Ferramentas:** `tavily.py search --deep-research` (kickoff), 10 pesquisas `--max-results 6 --depth advanced`, 8 extrações `extract` (n=1..3 URLs, `--query` dirigido), e verificação primária direta via `curl`/GitHub REST para versões, SHAs, endpoints e textos legais.
- **Papéis:** o orquestrador executou também os papéis de investigador e de bibliotecário em série (o orçamento de ~10 pesquisas não justificava fan-out de subagentes); a síntese é de escritor único.
- **Verificação adversarial (leve):** cada afirmação central foi reconfirmada por uma segunda via independente quando existia (p. ex. versões das ações confirmadas simultaneamente no README e na API `/git/ref/tags`; plano Free da AA confirmado na página de produto **e** na referência da API).
- **Disciplina de citações:** nenhuma URL foi escrita de memória; todas as 35 foram resolvidas com código HTTP a 2026-10-22 antes de entrarem neste documento.

---

# Apêndice A — Manifesto de ficheiros

> P = propósito · C = conteúdo mínimo. Marcados **[obrigatório]**, **[esperado]**, **[opcional]**.

| Ficheiro | Nível | P / C |
| --- | --- | --- |
| `LICENSE` | obrigatório | P: define os direitos; o GitHub deteta-o e mostra o badge. C: texto integral MIT com `Copyright (c) 2026 frederico-kluser`. Não inventar variantes. [S12] |
| `README.md` | obrigatório | P: a única página que 90 % dos visitantes lê. C: uma frase «o que é» + link para a demo ao vivo + screenshot/GIF; o problema que resolve; quickstart (`pnpm i && pnpm dev`); arquitetura em 5 linhas; **Data sources & attribution** (Obrigatório: secção própria, ver Apêndice D.4); **Privacy & your API key**; estado do projeto («early, API may change»); roadmap; como contribuir → CONTRIBUTING; licença; badges (CI, LICENSE, OpenSSF Scorecard). [S14][S15] |
| `CONTRIBUTING.md` | obrigatório | P: reduz o custo de uma contribuição e o teu custo de revisão. C: requisitos (Node/pnpm via `.nvmrc`/`packageManager`); comandos (`install`, `dev`, `lint`, `typecheck`, `test`, `build`); regra de commits (Conventional Commits [S32]); nomes de branch `feat/…`, `fix/…`; «abre PR contra `main`, squash merge»; **DCO** (sign-off) em vez de CLA — sem fricção jurídica; regra de que dados de terceiros não entram no repo. |
| `CODE_OF_CONDUCT.md` | obrigatório | P: sinal de maturidade e canal de escalada. C: Contributor Covenant v2.1, com e-mail de contacto real (não um placeholder). [S15] |
| `SECURITY.md` | esperado (alto valor) | P: canal privado de divulgação + política de chaves. C: versões suportadas; «reporte via GitHub Private Vulnerability Reporting» [S18]; SLA (ex.: 72 h de acuse, 90 dias de embargo); **secção BYO-key**: a chave nunca sai do browser, não há telemetria, o que é e não é logado; limitações conhecidas (XSS, extensões, máquinas partilhadas). |
| `CHANGELOG.md` | esperado | P: histórico legível por humanos. C: Keep a Changelog [S31], `## [Unreleased]` + primeira versão; gerado por release-please a partir de Conventional Commits [S30][S32]. |
| `.gitignore` | esperado | P: evitar commits acidentais — e evitar commits de `.env`. C: `node_modules/`, `dist/`, `.env`, `.env.*`, `!.env.example`, `coverage/`, `*.local`, `.DS_Store`, `.idea/`, `.vscode/*` (excepto `extensions.json`/`settings.json`). |
| `.editorconfig` | esperado | P: fim de guerras de whitespace. C: `root = true`, `[*] charset=utf-8, end_of_line=lf, indent_style=space, indent_size=2, insert_final_newline=true, trim_trailing_whitespace=true`, e `[*.md] trim_trailing_whitespace=false`. |
| `.nvmrc` | esperado | P: fonte única da versão de Node; `setup-node` lê-a diretamente. C: `24` (ou `24.11.0`). Comentar no README que Node 26 é LTS a 2026-10-28. [S25][S26] |
| `.github/CODEOWNERS` | opcional (útil mesmo a solo) | P: pedido de revisão automático + sinal de governança. C: `* @frederico-kluser` e, se houver, `/.github/ @frederico-kluser`. [S20] |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | esperado | P: relatórios utilizáveis. C: `name:`, `description:`, `body:` com `textarea` para passos, ambiente, versão; **aviso para nunca colar a chave de API**. [S15][S16] |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | esperado | C: `name:`, `description:`, campo «problema que resolve» antes de «solução proposta». |
| `.github/ISSUE_TEMPLATE/config.yml` | opcional | C: `blank_issues_enabled: false` + link para Discussions/security advisories. |
| `.github/pull_request_template.md` | esperado | C: o que muda, porquê, como testar, checklist (testes, docs, sem segredos, sem dados de terceiros). |
| `.github/dependabot.yml` | esperado | C: `version: 2`, ecossistemas `npm` e `github-actions`, `weekly`, `groups` para agrupar minor/patch, limite de PRs abertos. [S19] |
| `.github/workflows/ci.yml` | obrigatório de facto | P: o required status check do ruleset. C: Apêndice B. |
| `.github/workflows/scorecard.yml` | opcional (alto valor) | C: `ossf/scorecard-action` semanal + `publish_results: true`; badge no README. [S24] |
| `.github/workflows/release-please.yml` | opcional | C: `googleapis/release-please-action` em `push: main`, permissões `contents: write` + `pull-requests: write`. [S30] |
| `.github/workflows/codeql.yml` | opcional | C: CodeQL `javascript-typescript`, `security-events: write`; se ativo, passa a ser required check. |
| `.github/rulesets/main.json` | opcional (governança como código) | C: JSON do ruleset versionado e aplicado por `gh api --method PUT` — auditável em review. [S17] |
| `NOTICE` | só com Apache-2.0 | C: atribuições de terceiros (dados OpenRouter CC BY 4.0, ícones, fontes). [S11] |
| `package.json` (`packageManager`) | recomendado | C: `"packageManager": "pnpm@12.14.0"` para reprodutibilidade; nunca um segredo em `VITE_*`. [S10][S28] |
| `TRADEMARK.md` (ou secção no README) | opcional | C: «o nome SOM e o logótipo não estão cobertos pela licença» — necessário só se ficar por MIT. |

---

# Apêndice B — `.github/workflows/ci.yml` (≈35 linhas, Node 24, pnpm 12)

```yaml
name: ci

on:
  push: { branches: [main] }
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: verify            # <- este é o nome a exigir no ruleset
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: pnpm/setup@a0881977cd8ea73b1ed212236c99ca10dcc80cf4 # v3.1.1
        with:
          runtime: node@24      # pnpm installs the runtime: no setup-node needed
          cache: true
          install: false        # we run the install ourselves, frozen
      - run: pnpm install --frozen-lockfile --ignore-scripts
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run test:ci
      - run: pnpm run build
      - name: Bundle budget
        run: pnpm run size --if-present
```

Notas de revisão:
- `pnpm/setup@v3.1.1` instala pnpm **e** o runtime Node e corre o install, dispensando `actions/setup-node` [S27][S29]. Se um revisor preferir a combinação clássica, a alternativa é `pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0` + `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0` com `cache: pnpm` e `node-version-file: .nvmrc`.
- `--frozen-lockfile` falha se `pnpm-lock.yaml` estiver desalinhado — é o que se quer em CI.
- `--ignore-scripts` bloqueia post-install scripts arbitrários (bom por omissão; desactivar só se precisares de algum).
- Todas as ações fixadas por SHA com comentário de versão — é o que o check `Pinned-Dependencies` do Scorecard mede [S24].
- Nenhum `permissions: write-*` neste workflow: `contents: read` apenas.

---

# Apêndice C — Ordem de operações com `gh` CLI

```bash
# 1. pré-voo
gh auth status                       # tem de estar logged in no frederico-kluser
git init -b main
# (escrever o scaffold: LICENSE, README, CONTRIBUTING, CoC, SECURITY, CHANGELOG,
#  .gitignore, .editorconfig, .nvmrc, .github/…, ci.yml)
git add -A
git commit -S -m "feat: initial public scaffold"

# 2. criar o repositório e empurrar
gh repo create frederico-kluser/som \
  --public --source=. --remote=origin --push \
  --description "SOM — compare and select LLMs by cost, latency and quality (BYO key, client-side)"

# 3. About / topics / homepage / merge strategy
gh repo edit --add-topic llm,openrouter,ai-tools,react,typescript,vite,developer-tools \
  --delete-branch-on-merge --enable-squash-merge \
  --enable-merge-commit=false --enable-rebase-merge=false --enable-auto-merge

# 4. Superfície de segurança (verificado: endpoints respondem 2xx/204)
gh api -X PUT repos/frederico-kluser/som/vulnerability-alerts                    # Dependabot alerts
gh api -X PUT repos/frederico-kluser/som/automated-security-fixes                # security updates
gh api -X PUT repos/frederico-kluser/som/private-vulnerability-reporting         # PVR
gh api -X PATCH repos/frederico-kluser/som \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'

# 5. Deixar o CI correr UMA vez (o required check tem de já existir)
gh workflow list
gh run list --limit 5 --json name,conclusion,headBranch

# 6. Rulesets  (`gh ruleset` só tem check|list|view -> criar por API)
gh api -X POST repos/frederico-kluser/som/rulesets --input .github/rulesets/main.json
gh api -X POST repos/frederico-kluser/som/rulesets --input .github/rulesets/tags.json
gh ruleset list
gh ruleset check main            # confirma as regras efetivas

# 7. Primeira release (tag anotada + GitHub Release)
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --verify-tag --title "v0.1.0" --notes-file CHANGELOG.md
```

`main.json` deve conter: `target: branch`, `enforcement: active`, `conditions.ref_name.include: ["~DEFAULT_BRANCH"]`, `rules` com `deletion`, `non_fast_forward`, `required_linear_history`, `pull_request` (`required_approving_review_count: 0` para solo — usar `dismiss_stale_reviews_on_push`, `required_review_thread_resolution`), e `required_status_checks` com `context: verify` [S17]. `tags.json`: `target: tag`, `conditions.ref_name.include: ["v*"]`, `rules: [deletion, update]`.

---

# Apêndice D — Política de segredos e BYO-key

### D.1 Modelo de ameaça (declarar no SECURITY.md)

A chave é do utilizador, é usada **no browser dele**, para falar **diretamente** com um terceiro. O SOM não tem servidor, não recebe a chave e não a pode recuperar. Adversários relevantes: XSS no próprio SOM (dependência comprometida, HTML injetado), extensões do browser, outro utilizador da mesma máquina, e rede (Wi-Fi hostil → HTTPS obrigatório).

### D.2 Regras de armazenamento

| Regra | Detalhe |
| --- | --- |
| Por omissão | `sessionStorage` — morre com o separador; alinha com «use sessionStorage instead of localStorage if persistent storage is not needed» [S9] |
| Persistência | só por checkbox explícito («lembrar neste dispositivo») → `localStorage`; ver o aviso de risco ao lado, não escondido num tooltip |
| Nunca | URL/query string, `document.title`, `Referer`, log, relatório de erro, `postMessage` para outras origens, `BroadcastChannel` |
| Sempre | botão «esquecer chave»; chave mascarada na UI (`sk-or-v1-…a1b2`); aviso de que chaves de teste/limitadas são preferíveis |
| Nunca no código | `VITE_*` para segredos — ficam no bundle público [S10]; sem chave partilhada `VITE_OPENROUTER_KEY` «para a demo» |
| Criptografia «em repouso» | não vender como segurança. Sem uma passphrase por sessão, a chave de decifração vive no mesmo browser; é conveniência, não proteção |

### D.3 CSP (meta tag no `index.html` ou header do host)

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self' https://openrouter.ai https://api.openrouter.ai https://artificialanalysis.ai;
  object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none';
  upgrade-insecure-requests">
```

`connect-src` é a diretiva que impede a exfiltração de uma chave comprometida; `script-src 'self'` (sem `unsafe-inline`/`unsafe-eval`) é o que reduz a probabilidade do XSS que a roubaria.

### D.4 Atribuições obrigatórias no README (secção «Data sources»)

- **OpenRouter Data API** → `Source: OpenRouter (openrouter.ai/rankings), as of <date>.` — CC BY 4.0 [S6].
- **OpenRouter (inferência)** → `HTTP-Referer` (required) + `X-OpenRouter-Title` nas chamadas do cliente [S8].
- **Artificial Analysis** → se e só se houver licença: `Source: Artificial Analysis (artificialanalysis.ai)` e logótipo visível em gráficos; para dados derivados, `Based on data from Artificial Analysis` + «Artificial Analysis não endossa este produto» [S4]. Sem licença: apenas link-out, **zero** dados copiados [S1][S3].
- **Sem dados de terceiros no repositório**: nenhum dump da AA; nenhum snapshot do catálogo da OpenRouter (zona cinzenta face aos ToS) [S7].

---

# Apêndice E — Checklist de definições do GitHub

- [ ] `main` protegido por ruleset: PR obrigatório, `verify` como required status check, block force pushes, linear history, restrict deletions [S17]
- [ ] Ruleset de tags `v*`: restrict update + restrict deletion (tags imutáveis) [S17]
- [ ] Merge strategy: só *squash*; `delete_branch_on_merge` ligado
- [ ] Dependabot alerts **e** security updates ligados [S22]
- [ ] Private vulnerability reporting ligado [S18]
- [ ] Secret scanning + push protection ligados [S23]
- [ ] Actions: `GITHUB_TOKEN` com permissões de leitura por omissão; «Require approval for first-time contributors»
- [ ] Todas as `uses:` fixadas por SHA com comentário de versão [S24]
- [ ] OpenSSF Scorecard a correr semanalmente + badge [S24]
- [ ] `LICENSE` detetado (badge no canto do repo) + badge shields.io no README
- [ ] About: descrição, website (demo), topics
- [ ] Releases: tag anotada + GitHub Release com notas [S33]; proveniência (`actions/attest-build-provenance`) se houver artefacto distribuível [S21]
- [ ] Issues: templates ativos com `name:`/`description:` [S15][S16]; Discussions desligadas ou moderadas

---

## Decisão final recomendada (resumo de uma linha)

**MIT + secção explícita de dados de terceiros; nenhum dado da Artificial Analysis embutido (link-out ou licença Commercial); OpenRouter Data API vendorizada ao abrigo de CC BY 4.0 com a linha de citação; `sessionStorage` por omissão com CSP de `connect-src` fechado; CI em Node 24 + pnpm 12 com todas as ações fixadas por SHA e o job `verify` como required check.**
