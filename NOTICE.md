# Notice — third-party data and services

SOM is an independent, local-first tool. It is **not affiliated with, endorsed by, or sponsored by**
OpenRouter or Artificial Analysis. Two different licences apply to the two things you get here: the
code (MIT) and the data (theirs).

## OpenRouter

- SOM reads the public model catalogue from `https://openrouter.ai/api/v1/models` at runtime.
- The aggregated OpenRouter Data API is published under **CC BY 4.0**, with attribution to
  OpenRouter. The model catalogue endpoint carries no separate data licence, and the OpenRouter terms
  prohibit scraping the site — therefore **this repository commits no catalogue snapshot**. The
  snapshot consumed by the static build is generated on your machine at build time and is
  git-ignored.
- When SOM (or your own deployment) makes OpenRouter API calls, it identifies itself with
  `HTTP-Referer` and `X-OpenRouter-Title` headers, as their documentation requires.
- If you display OpenRouter-derived numbers publicly, attribute them:
  `Source: OpenRouter (openrouter.ai), as of <date>.`

## Artificial Analysis

- SOM never ships, commits, or bundles Artificial Analysis data. Benchmark values are fetched at
  **runtime with the operator's or user's own API key**, kept in a short-lived in-memory cache, and
  rendered for the person who supplied the key.
- Attribution is displayed in the application footer and must remain visible in any fork:
  "Source: Artificial Analysis (artificialanalysis.ai)" with a hyperlink, plus a non-endorsement
  statement on derived data.
- The Artificial Analysis Data Platform Terms restrict redistributing raw data, embedding it in a
  customer-facing dashboard, and operating comparison/selection products without consent. The Free
  API tier is documented for internal use. **If you intend to host SOM publicly for third parties,
  contact Artificial Analysis for Commercial terms or written consent first.** Running SOM locally,
  for yourself, with your own key is the intended path and the only one this project supports.
- This notice is a summary written by a maintainer, not legal advice. Read the provider terms
  yourself before publishing an instance.

## Trademarks

The MIT licence covers the source code in this repository. It does not grant rights to the names
"SOM" or "LLM Selector", or to the SOM logo, which are trademarks of the project author. Forks are
welcome to keep the attribution required by the data licences, but should not present themselves as
the upstream project.

## Benchmarks named in the UI

GPT, Claude, Gemini, Qwen, DeepSeek, Kimi, GLM, Mistral, Llama, Grok, Nemotron, MiniMax and other
model names are trademarks of their respective owners. SOM displays them descriptively.
