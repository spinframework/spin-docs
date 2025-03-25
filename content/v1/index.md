title = "Introducing Spin"
template = "main"
date = "2022-03-14T00:22:56Z"
enable_shortcodes = true
[extra]
canonical_url = "https://spinframework.com/v2/index"
url = "https://github.com/spinframework/spin-docs/blob/main/content/spin/v1/index.md"

---

Spin is a framework and CLI for building and running event-driven microservice applications with WebAssembly (Wasm) components. Spin uses Wasm because it is **sandboxed, portable, and fast**.  Millisecond cold start times mean no need to keep applications "warm".

Many languages have Wasm implementations, so **developers don't have to learn new languages or libraries**. Spin is **open source** and **built on standards**, meaning you can take your Spin applications anywhere.  There are Spin implementations for local development, for self-hosted servers, for Kubernetes, and for cloud-hosted services.

#### Starter Examples

{{suh_cards}}
{{card_element "sample" "Checklist Sample App" "A checklist app that persists data in a key value store" "/hub/preview/sample_checklist" "Typescript,Http,Kv" true }}
{{card_element "template" "Zola SSG Template" "A template for using Zola framework to create a static webpage" "/hub/preview/template_zola_ssg" "rust" true }}
{{card_element "sample" "AI-assisted News Summarizer" "Read an RSS newsfeed and have AI summarize it for you" "/hub/preview/sample_newsreader_ai" "Typescript,Javascript,Ai" true }}
{{blockEnd}}

Or dive into the documentation and get started:

- [Take Spin for a spin](quickstart)
- [Learn how to write Spin applications](writing-apps)
