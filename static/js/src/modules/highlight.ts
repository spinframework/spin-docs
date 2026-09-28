// Curated highlight.js build: only the languages used across the docs, to keep
// the bundle small (the full highlight.js build ships every language).
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import shell from "highlight.js/lib/languages/shell";
import plaintext from "highlight.js/lib/languages/plaintext";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import fsharp from "highlight.js/lib/languages/fsharp";
import ini from "highlight.js/lib/languages/ini";

// Aliases come for free: shell -> console/shellsession, ini -> toml,
// bash -> sh/zsh, plaintext -> text/txt.
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("python", python);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("fsharp", fsharp);
hljs.registerLanguage("ini", ini);

export function highlightAll(): void {
  hljs.highlightAll();
}
