import { build, context } from "esbuild";
import * as sass from "sass";
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const watch = process.argv.includes("--watch");

const OUTDIR = "static/build";
// Referenced from the deployed site; served immutably (content-hashed names).
const HREF_BASE = "{{site.info.base_url}}/static/build";
const SASS_ENTRY = "static/sass/styles.scss";

function contentHash(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 8);
}

// Generated Handlebars partials that bartholomew includes; they carry the
// hashed filenames so templates never hardcode them.
function writePartial(name, html) {
  writeFileSync(`templates/${name}`, html + "\n");
}

function buildCss() {
  const result = sass.compile(SASS_ENTRY, {
    style: watch ? "expanded" : "compressed",
    loadPaths: ["node_modules"],
    // Our own scss is migrated to the modern color API. The remaining
    // deprecations come from the vendored @fermyon/styleguide, which we can't
    // edit; `import` is silenced because our sources still use @import.
    silenceDeprecations: ["import", "color-functions", "global-builtin"],
  });
  const name = watch ? "styles.css" : `styles-${contentHash(result.css)}.css`;
  writeFileSync(`${OUTDIR}/${name}`, result.css);
  writePartial(
    "asset_styles.hbs",
    `<link rel="stylesheet" href="${HREF_BASE}/${name}" />`,
  );
  console.log(`css: ${name} (${(result.css.length / 1024).toFixed(0)} KB)`);
}

function writeScriptPartial(metafile) {
  const outFile = Object.keys(metafile.outputs).find((f) => f.endsWith(".js"));
  writePartial(
    "asset_scripts.hbs",
    `<script src="${HREF_BASE}/${basename(outFile)}"></script>`,
  );
}

// The theme bootstrap must run before first paint, so it is inlined into the
// document <head> rather than shipped as a separate (render-blocking) request.
function writeThemePartial(result) {
  // Single entry point, no outdir, so esbuild emits one in-memory file.
  const code = result.outputFiles[0].text;
  writePartial("asset_theme.hbs", `<script>${code.trim()}</script>`);
}

/** @type {import('esbuild').BuildOptions} */
const jsOptions = {
  entryPoints: ["static/js/src/main.ts"],
  outdir: OUTDIR,
  entryNames: watch ? "[name]" : "[name]-[hash]",
  bundle: true,
  minify: !watch,
  sourcemap: false,
  format: "iife",
  target: "es2020",
  metafile: true,
  logLevel: "info",
};

/** @type {import('esbuild').BuildOptions} */
const themeOptions = {
  entryPoints: ["static/js/src/theme.ts"],
  bundle: true,
  minify: !watch,
  format: "iife",
  target: "es2020",
  // Kept in memory so it can be inlined into the head partial.
  write: false,
  logLevel: "info",
};

rmSync(OUTDIR, { recursive: true, force: true });
mkdirSync(OUTDIR, { recursive: true });
buildCss();

if (watch) {
  const ctx = await context({
    ...jsOptions,
    plugins: [
      {
        name: "asset-partial",
        setup(b) {
          b.onEnd((result) => {
            if (result.metafile) writeScriptPartial(result.metafile);
          });
        },
      },
    ],
  });
  const themeCtx = await context({
    ...themeOptions,
    plugins: [
      {
        name: "theme-partial",
        setup(b) {
          b.onEnd((result) => {
            if (result.outputFiles) writeThemePartial(result);
          });
        },
      },
    ],
  });
  await ctx.watch();
  await themeCtx.watch();
  console.log("esbuild: watching static/js/src for changes...");
} else {
  const result = await build(jsOptions);
  writeScriptPartial(result.metafile);
  writeThemePartial(await build(themeOptions));
}
