# AGENTS.md

This file provides guidance to AI coding agents (Codex, Claude Code, and others) working with code in this repository.

## What this repo is

Source for https://spinframework.dev: the Spin docs (versioned v1–v4), the blog, and the Spin Hub. The site is itself a Spin application. Markdown is rendered at request time by [Bartholomew](https://github.com/fermyon/bartholomew), a Wasm CMS shipped prebuilt as `modules/bartholomew.wasm`. There is no static-site generation step for the docs; `spin build` only regenerates search indexes, the JS bundle, and the Hub SPA.

## Prerequisites

- `spin` CLI (https://spinframework.dev/quickstart)
- Node + npm, with `npm ci` run at the repo root **and** in `spin-up-hub/`
- `bart` (Bartholomew CLI) for the content check CI runs; CI pins v0.10.0 from https://github.com/fermyon/bartholomew/releases
- `timeout` (GNU coreutils) for the link checker

## Commands

```bash
npm ci && npm ci --prefix ./spin-up-hub   # install
spin build                                # runs every [component.*.build] in spin.toml: indexes, JS bundle, Hub SPA
spin up -e PREVIEW_MODE=1                 # serve at http://localhost:3000, showing future-dated pages. Serves a snapshot of content/ and templates/ copied at startup, so restart it (or use spin watch / npm run spin) to see edits
spin watch -e PREVIEW_MODE=1              # same, rebuilding when content/ or templates/ change (extra args pass through to spin up)
npm run spin                              # nodemon alternative; regenerates indexes and restarts spin up, honors $PREVIEW_MODE

npm run build-index                       # content/ -> static/data.json (docs search)
npm run build-hub-index                   # content/api/hub/ -> static/hub-index-data.json (Hub search)
npm run bundle-scripts                    # parcel watch: static/js/src/main.js -> static/js/main.js
npm run styles                            # sass watch: static/sass/styles.scss -> static/css/styles.css

bart check --shortcodes shortcodes content/* && bart check --shortcodes shortcodes content/**/*   # front matter check (CI gate; see Front matter)
bart check --shortcodes shortcodes content/api/hub/*.md                                            # Hub entries (see Known issues 2)
npm run lint-markdown                     # markdownlint-cli2 over content/**/*.md
npx markdownlint-cli2 content/v4/install.md   # lint one file
npm test                                  # .build/check-broken-links.sh: boots the site, runs blc recursively from /javascript-components; follows only <a href>, so it covers v4, v3 and the blog, never v1 or v2 (see Known issues); takes minutes. Stop any spin up already on :3000 first, or the checker tests that server instead

cd spin-up-hub && npm run dev             # Vite dev server for the Hub; it fetches Hub data from VITE_API_HOST (see .env.development), so run the main site too. If it shows an empty Hub, see Known issues 7
```

- `spin up`, `npm run spin` and `npm test` need `spin-up-hub/dist/` (gitignored), which only `spin build` (or `npm run build --prefix spin-up-hub`) creates. On a fresh checkout run `spin build` once after `npm ci`; otherwise `spin up` fails with `File or directory "spin-up-hub/dist/" does not exist` and `npm test` shows only its 60 s timeout.
- The PR gate in `.github/workflows/build.yaml` is `bart check` + `spin build` + `npm test`. `npm run lint-markdown` exists but is commented out in CI as too aggressive (title case, blank lines); its failures are not blockers.
- `bart check` validates front matter only. A shortcode error is printed on stderr as "Error rendering markdown: …" while the file still gets a green tick, and on the served page the whole body is replaced by the Handlebars error text (e.g. `Helper not defined: "tab"`), so read stderr, not just the exit code. A template parse error (for example an unclosed shortcode argument, or an unescaped Spin `{{ x | filter }}` expression) prints only "Failed to parse template." with no file name; it appears just before the offending file's tick, and running `bart check` on single files pins it down. One such error is listed in Known issues 6.
- `PREVIEW_MODE=1` is fine on the command line but must stay `"0"` in `spin.toml`.

## Generated vs committed files

Committed, and must be regenerated and committed when their source changes:
- `static/css/styles.css` from `static/sass/*.scss`. `npm run styles` is `sass --watch` and never exits; for a one-shot build run `npx sass static/sass/styles.scss static/css/styles.css`. Never edit the CSS directly.
- `static/js/main.js` from `static/js/src/` via `npm run bundle-scripts-ci` (also run by `spin build`). Commit only `bundle-scripts-ci` output, never the `bundle-scripts` (watch) output. If `spin build` modifies it without a source change, see Known issues 8.
- `modules/*.wasm`. `spin-redirecter.wasm` is built from `spin-redirecter/` with `npm run build` there, which needs the `spin js2wasm` plugin; that build step is commented out in `spin.toml`, so rebuild it by hand.

Gitignored, produced by `spin build`: `static/data.json`, `static/hub-index-data.json`, `spin-up-hub/dist/`.

## Architecture

### Bartholomew pieces
- `content/**/*.md`: pages. URL path is the file path minus `content/` and `.md`.
- `templates/*.hbs`: Handlebars. `main` is the docs layout, `blog_post`/`blog_index` the blog; `hub_list_api` and `render_hub_content_body` emit JSON/HTML fragments for the Hub SPA. Content pages reference only `main`, `blog_post`, `blog_index`, `hub_list_api` and `render_hub_content_body`, and the only partials used are `content_top`, `content_bottom`, `content_footer`, `content_navbar` and `sidebar_vN`. Everything else in `templates/` is dead: `page.hbs` (references a missing `content_cta` partial), `404.hbs` (Bartholomew has no 404-template concept: a missing page renders through `main` with the title "Not Found" and HTTP 404, with whichever sidebar `active_project` matches), `home.hbs`, `robots.hbs`, `sitemap.hbs`, `google_verification.hbs` and `doc_feedback.hbs`. No sitemap or robots.txt is served; the `index_site_pages` list in `config/site.toml` does not make those templates pages.
- `scripts/*.rhai`: each file becomes a Handlebars helper named after the file. The ones that matter: `active_project` (a substring test, `string.contains`, on the full request URL, not a prefix test; it drives sidebar highlighting and version selection), `content_filter` (lists pages by path prefix and `extra.type`), `blogs` (date-sorted posts), `timed_publish` (gates a menu item until a date, honoring PREVIEW_MODE).
- `shortcodes/*.rhai`: callable from markdown as `{{ name "arg" }}`, only on pages with `enable_shortcodes = true`.
- `config/site.toml`: site metadata.

### Front matter
TOML-style, not YAML: `key = "value"` lines, an optional `[extra]` table, then a `---` line.

```toml
title = "Page Title"
template = "main"
date = "2023-11-04T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v4/<file>.md"
keywords = "term1 term2"

---
```

- `bart check` rejects a page for unparseable TOML, a missing `title`, a `template` whose `.hbs` file does not exist, a missing `---` separator, any typed field of the wrong TOML type (for example `enable_shortcodes = "true"`, `tags = "x"`, or a `date` that is not RFC 3339), or a non-string `[extra]` value. A missing `template` defaults to `main`. A missing `date` passes `bart check`, but a page without one that uses `main`, `blog_post` or `blog_index` returns HTTP 500, because `content_top.hbs` calls `date_format` on it; only Hub entries render without a date. Always set all three. On docs pages, `[extra] url` powers the "Edit this page" button, which only the versioned sidebars render (so only pages with `template = "main"`), and must point at the file itself. Hub entries use the same field differently; see the Spin Hub section.
- A future `date` hides the page until then; `PREVIEW_MODE=1` shows it.
- `md_parser.mjs` (and `hub_index_generator.mjs`) parse front matter by textually rewriting every `=` to `:` and stopping at the first `---` in the file, so keep values quoted and one per line. An `=` inside an indexed field (`title` and `keywords` for docs pages; `title`, `author`, `keywords`, `language`, `tags` for Hub entries) is indexed as `:`; other fields are not read, which is why Hub entries can use `spin_version = ">=v3.1.0"`. Never put `---` in a value: the rewrite stops there, so if any key follows on a later line, js-yaml throws and `npm run build-index` (hence `spin build` and CI) fails.

### Routing (spin.toml)
| Route | Component | Serves |
|---|---|---|
| `/...` | bartholomew | `content/<path>.md`; `/` is `content/index.md` |
| `/:page` (single segment) | spin-version-proxy | 302 to `/<latest_spin_version>/<page>` unless `spin-redirect.json` overrides it |
| `/static/...`, `/downloads/...`, `/.well-known/...` | static fileserver | `static/`, `downloads/` (`install.sh`), `well-known/` |
| `/hub/...` | hub-fileserver-static | `spin-up-hub/dist/` SPA with `index.html` fallback |
| `/blog` | redirect | `/blog/index` |
| `/kubernetes` | redirect | 301 to `/deploying` |
| `/spin/v1/...`, `/spin/v2/...`, `/spin/v3/...` | bartholomew-spin-v1/v2/v3 | Legacy, effectively dead: every path 404s (see below) |

The three `/spin/vN/...` components use the same `bartholomew.wasm` and content mount as the main one. They return "Not Found" only because `config/site.toml` sets `prepend_route_info = true`, which makes Bartholomew look for `content/spin/vN/<path>.md`, and no `content/spin/` exists; with the default (`false`) they would serve `content/<path>.md` under a stale prefix. They are removable; see Known issues for the stale links and duplicate build tables to clean up with them.

Link conventions that follow from this:
- Site chrome (navbar, Hub, `content/index.md`) links to the latest docs **unversioned**, e.g. `/quickstart`; the redirecter resolves the version.
- Inside `content/vN/`, link to sibling pages relatively (`./install` or `install`), never `/v4/install`, so pages stay within their version.

### Versioned docs
- `content/v1` … `content/v4`, each with its own `templates/sidebar_vN.hbs`. `templates/main.hbs` picks the sidebar and dropdown selection via `active_project` (a substring match, see Bartholomew pieces), testing `/v1/`, `/v2/`, … in that order.
- Adding a page: create the `.md` under the version dir and add its link to the matching sidebar file. Navigation is not generated.
- Some older-version pages carry `[extra] canonical_url` pointing at the newer copy of the same page.
- `content/index.md` is a hand-maintained near-copy of `content/v4/index.md`; keep them in sync.

Bumping the latest major version touches:
1. `spin.toml`: `latest_spin_version` under `[component.spin-version-proxy]`.
2. `templates/main.hbs`: the version dropdown and the sidebar `if` chain.
3. New `templates/sidebar_vN.hbs` and `content/vN/`, usually copied from the previous version.
4. `static/js/src/modules/search.js`: the fallback version for pages without a `/vN/` prefix (`const version = match ? match[1] : ...`) must equal `latest_spin_version`; change it and rebundle with `npm run bundle-scripts-ci`. (see Known issues 1 if it differs)
5. `content/index.md`.
6. `.github/workflows/update-cli-reference.yml` (Known issues 5).

### Search
- `md_parser.mjs` splits every non-Hub page into one lunr document per heading and writes `static/data.json`. The browser filters to the version in the current URL.
- Boost a page with `[extra] keywords = "..."`, or a section with `<!-- @searchTerm "word word" -->` in the body (jumps to the nearest heading above). Both boost by 100x (`boost: 100` in `search.js`), so use sparingly.

### Spin Hub
- Entries are `content/api/hub/*.md` with `template = "render_hub_content_body"` and `[extra] type = "hub_document"`; `content/api/hub/contributing.md` documents the metadata contract.
- In Hub entries, `[extra] url` is the source URL of the contributed template, plugin, or sample (e.g. a GitHub tree or repo link), not the entry's own markdown file. `hub_list_api.hbs` exports it as the entry's `url`, and the Hub SPA renders it as the "View on Github" button.
- `content/api/hub/get_list.md` + `templates/hub_list_api.hbs` render the JSON catalogue at `/api/hub/get_list`. The Vue 3 + Vuex SPA in `spin-up-hub/` fetches that, plus `/api/hub/<id>` for preview bodies and `/static/hub-index-data.json` for search.
- Run `bart check --shortcodes shortcodes content/api/hub/*.md` before a Hub PR (the CI glob may not reach these files; see Known issues 2).
- `category` and `language` must exactly match the lists in `spin-up-hub/src/store.js` (`contentTypes`, `languages`, e.g. `"JS/TS"`, `"Rust"`), or the entry disappears when filters are applied.
- `spin-up-hub/vite.config.js` imports the main site's `static/sass/styles.scss`, so style changes there affect the Hub too.

### Blog
Posts are `content/blog/*.md` with `template = "blog_post"`, `[extra] type = "post"`, `author`, and a top-level `description` (shown on the index). `blog_index.hbs` lists them via `blogs.rhai`.

### Docs markdown conventions
From `content/v4/contributing-docs.md`:
- Code-block copy annotations, each on its own line followed by a blank line, then the fence: `<!-- @selectiveCpy -->` for shell transcripts, so the copy button copies only lines starting with `$`; `<!-- @nocpy -->` for output not meant to be pasted, which removes the copy button; no annotation for copyable source or configuration examples, which get a plain copy button. Do not use `@selectiveCpy` on a block with no `$`-prefixed lines (whatever the language), since the button would copy an empty string. Always give fences a language.
- Multi-tab blocks: `{{ tabs "os" }}` … `{{ startTab "Linux"}}` … `{{ blockEnd }}` … `{{ blockEnd }}`. Reuse the existing `tabs` class names (`os`, `platforms`, `sdk-type`, `spin-version`, …) and `startTab` labels (`Linux`, `macOS`, `Windows`, `Rust`, `Go`, `Python`, `TypeScript`, …) listed on that page, and add any new one to its list.
- With `enable_shortcodes = true` the whole body is a Handlebars template: write every literal `{{` (Spin `{{ variable }}` templates, GitHub Actions `${{ }}`) as `\{{`, including inside code fences. An unescaped `{{ name }}` silently renders as empty text, which neither `bart check` nor its stderr reports; an unescaped `{{ name | filter }}` (Spin template syntax) is a Handlebars parse error that replaces the whole body with "Failed to parse template.". Do not escape on pages without shortcodes, where the backslash is shown literally. When turning shortcodes on for an existing page, escape its existing `{{` first.
- Long pages open with a hand-written table of contents as a bulleted list of anchor links; the CSS rule `h1:first-of-type + ul` styles only a `<ul>` that immediately follows the `<h1>`, so the list must be the very first block of the body (no intro paragraph or alert before it) or it renders as a plain list. The same rule hides that list entirely (`display: none`) on viewports 1661px wide or narrower (the `max-width: 1661px` block is declared after the `min-width` one), so preview the ToC in a window at least 1662px wide.

## CI and deployment
- `build.yaml` (PRs, and called via `workflow_call` from `deploy.yaml` on push to main): `bart check`, `npm ci` ×2, `spin build`, `npm test` (PR runs only; the deploy call skips the link check), then archives every path `spin.toml` references.
- `deploy.yaml` (push to main) deploys that artifact to Fermyon Cloud; `deploy-preview.yaml` deploys per-PR previews for non-fork PRs.
- `update-cli-reference.yml` (manual) regenerates `content/v3/cli-reference.md` with `spin maintenance generate-reference` and opens a PR. Read Known issues 5 before running it. `content/v4/cli-reference.md` is the same generator output pasted under a v4 front matter; do not hand-edit individual flag descriptions, regenerate instead. Previous regenerations also applied two cosmetic post-edits that nothing in the pipeline depends on (a `<!-- no toc -->` editor marker before the command overview, and overview bullets as `- [...]` without `↴`); match them for a clean diff or drop them.

## Known issues (as of 2026-09-26)

Point-in-time defects, each with its one-line fix. The sections above describe the intended mechanics and point here by entry number instead of repeating these. When an entry is fixed, replace its text with "Fixed" and keep its number; do not renumber, or the pointers above break.

1. `static/js/src/modules/search.js`: the fallback version is still `"v3"` although `latest_spin_version` is `v4`, so search opened from `/`, `/blog/*` or `/hub` filters to v3 documents. Fix: set `"v4"` (or derive it from `spin.toml`) and run `npm run bundle-scripts-ci`.
2. `.github/workflows/build.yaml`, Check Docs step: the `bart check` globs never reach `content/api/hub/*.md`. Fix: add `bart check --shortcodes shortcodes content/api/hub/*.md`; all 92 files there pass today.
3. `content/v1/ai-sentiment-analysis-api-tutorial.md` and `content/v2/ai-sentiment-analysis-api-tutorial.md` link to `/spin/v3/ai-sentiment-analysis-api-tutorial`, which 404s. Fix: `/v3/ai-sentiment-analysis-api-tutorial`. `npm test` cannot catch this because it never crawls v1 or v2.
4. `spin.toml`: the dead `bartholomew-spin-v1/v2/v3` components; v1 and v2 still carry `[component.*.build]` tables identical to bartholomew's, so `spin build` regenerates both indexes three times. Fix: delete the three triggers and components, or at least the two build tables; when the components go, also delete the `/spin/vN/...` row of the Routing table and the paragraph below it.
5. `.github/workflows/update-cli-reference.yml` hard-codes `content/v3/cli-reference.md` but downloads `canary` (4.x) Spin, so it can neither regenerate v3 nor update v4. Fix: parametrize the Spin version, the output path and the `[extra] url`.
6. `content/v3/build.md:86`: the second argument of the `{{ details ... }}` shortcode is never closed (compare `content/v2/build.md:84`), so `/v3/build` serves "Failed to parse template." as its whole body with HTTP 200, and every `bart check` run prints that error. Fix: close the string and the tag as v2 does.
7. `spin-up-hub`: the Vite dev server fetches Hub data from `http://localhost:3000`, which sends no `Access-Control-Allow-Origin` header, so `npm run dev` shows an empty Hub. Fix: add a Vite `server.proxy` for `/api`, `/static/css`, `/static/js`, `/static/data.json` and `/static/hub-index-data.json` (not all of `/static`, which would hide the Hub's own `public/static/image/*`) and set `VITE_API_HOST=""` in `.env.development`. Until then, preview Hub changes with `spin build && spin up` at http://localhost:3000/hub.
8. `static/js/main.js`: the committed file is the unminified `parcel watch` output (about 64 KB), while `spin build` and CI produce the minified `parcel build` output (about 19 KB), so every `spin build` dirties the tree. Fix: commit the `npm run bundle-scripts-ci` output once. Until then, restore the file with `git checkout -- static/js/main.js` after any `spin build` or `spin watch` that did not change `static/js/src/`.
9. `content/v3/variables.md:341` and `content/v3/ai-sentiment-analysis-api-tutorial.md:1049` contain unescaped `{{ … }}` on pages with shortcodes enabled, so the served text shows empty strings where the template placeholders should be. Fix: write them as `\{{`.

## Commits
The docs contributing guide (`content/v4/contributing-docs.md`, under "9. Commit Changes"; there is no `CONTRIBUTING.md`) requires commits to be DCO signed-off and GPG-signed: `git commit -S --signoff`.
