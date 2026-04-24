title = "Announcing Spin v4.0"
date = "2026-04-23T17:00:00Z"
template = "blog_post"
description = "Announcing Spin v4.0: stabilized WASIp3 support, async host APIs across the board, build profiles, and fine-grained capability inheritance for dependencies."
tags = []

[extra]
type = "post"
author = "The Spin Project"

---

The CNCF Spin project just released [Spin v4.0.0](https://github.com/spinframework/spin/releases/tag/v4.0.0), the first major release of Spin in over a year. This release delivers a production-grade, stable implementation of WASI Preview 3; rewrites Spin's host APIs around `async`; adds build profiles; and introduces fine-grained capability inheritance for component dependencies.

There's a lot in this release, so this post is part release-notes and part tutorial. We'll walk through each headline feature with a working example.

- [WASI Preview 3: stabilized and supported long-term](#wasip3-stabilized-and-supported-long-term)
- [Async everywhere: Spin's host interfaces are now async](#async-everywhere-spins-host-interfaces-are-now-async)
- [Build profiles](#build-profiles)
- [Fine-grained capability inheritance for dependencies](#fine-grained-capability-inheritance-for-dependencies)
- [Upgrading to Spin 4.0](#upgrading-to-spin-40)

## WASI Preview 3: stabilized and supported long-term

WASI Preview 3 (WASIp3) is the next major revision of the WebAssembly System Interface. It brings first-class async, concurrent component exports, and significantly simpler WIT definitions to the component model. In practice, that means your components can handle multiple in-flight requests on a single instance, fan out concurrent I/O with plain `await`, and talk to host interfaces using idiomatic async code in each language.

**Spin 4.0 ships with the March 2026 release candidate of WASIp3, and we are committing to supporting it long-term.** WASIp3 is now the default platform for new applications, and the Spin Rust, Python, and Go SDKs have all been updated to use it.

If you followed along in [Spin 3.5](https://spinframework.dev/v3/blog/announcing-spin-3-5) and [Spin 3.6](https://spinframework.dev/v3/blog/announcing-spin-3-6), you've seen WASIp3 progress from "experimental, opt-in, might break between releases" to something ready for production use.

What this means in practice:

- **Concurrent, async component exports.** A single component instance can service multiple in-flight requests concurrently, instead of one instance per request.
- **One idiomatic story per language.** Rust handlers are `async fn` using `http` / `hyper` types, and Python handlers are `async def`. Go handlers remain standard `net/http`, but now build with the standard Go toolchain (see below).
- **WASIp2 components continue to run unchanged.** The HTTP trigger speaks WASIp3 natively, and existing WASIp2 components keep working without changes.

Here's the new minimum-viable Rust HTTP component in 4.0:

```rust
use spin_sdk::http::{IntoResponse, Request, Response};
use spin_sdk::http_service;

#[http_service]
async fn handle(_req: Request) -> anyhow::Result<impl IntoResponse> {
    Ok(Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body("Hello, Spin 4!".to_string())?)
}
```

A few things to notice:

- The handler is `async fn`. That's not cosmetic, it's a real WASIp3 async export. While this handler is awaiting I/O, Spin can dispatch another request into the same component instance.
- `Request` and `Response` are re-exports from the ecosystem `http` crate, so this code composes with Axum, Tower, `http-body-util`, and friends with no glue types.

For a richer illustration of concurrent async exports, see the [gRPC sample](https://github.com/spinframework/spin-rust-sdk/tree/main/examples/grpc) in the Spin repo.

### Python and Go

The same story holds in Python and Go. The Python SDK exposes a single `handle_request` coroutine:

```python
from spin_sdk.http import Handler, Request, Response

class HttpHandler(Handler):
    async def handle_request(self, request: Request) -> Response:
        return Response(
            200,
            {"content-type": "text/plain"},
            bytes("Hello from Python on WASIp3!", "utf-8"),
        )
```

Build it with:

```bash
componentize-py -w spin:up/http-trigger@4.0.0 componentize app -o app.wasm
```

### No more TinyGo

On the Go side, the 4.0 release lines up with Go SDK `v3`, which **drops the TinyGo requirement**. Spin Go components now build with the standard Go toolchain (Go 1.25.5+) via `componentize-go`:

```go
package main

import (
    "fmt"
    "net/http"

    spinhttp "github.com/spinframework/spin-go-sdk/v3/http"
)

func init() {
    spinhttp.Handle(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("content-type", "text/plain")
        fmt.Fprintln(w, "Hello from Go on WASIp3!")
    })
}

func main() {}
```

```toml
[component.hello-go.build]
command = "go tool componentize-go build"
```

If you've been writing Spin Go components against `spin-go-sdk/v2` with TinyGo, this is the big one: standard Go, and no `tinygo build -target=wasip1 -gc=leaking ...` incantation.

### Concurrent outbound HTTP: the canonical demo

Because component exports are async, you can now fan out concurrent I/O from inside a component. The old ceremony of spinning up an async runtime by hand is gone, just `await` futures:

```rust
use futures::future::{select, Either};
use spin_sdk::http::{EmptyBody, IntoResponse, Request, send};
use spin_sdk::http_service;
use std::pin::pin;

#[http_service]
async fn handle(_req: Request) -> anyhow::Result<impl IntoResponse> {
    let spin = pin!(content_length("https://spinframework.dev"));
    let book = pin!(content_length("https://component-model.bytecodealliance.org/"));

    let (winner, len) = match select(spin, book).await {
        Either::Left((len, _))  => ("Spin docs", len?),
        Either::Right((len, _)) => ("Component model book", len?),
    };

    Ok(format!("{winner} responded first, content-length = {len:?}\n"))
}

async fn content_length(url: &str) -> anyhow::Result<Option<u64>> {
    let req = Request::get(url).body(EmptyBody::new())?;
    let res = send(req).await?;
    Ok(res
        .headers()
        .get("content-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse().ok()))
}
```

Both requests are in flight at once, inside a single Wasm instance, scheduled by Spin. That same instance may also be serving other requests concurrently. And because WASIp3 supports streaming response bodies, a handler can start writing its response before it's finished computing the rest, something we'll use in the next section.

## Async everywhere: Spin's host interfaces are now async

WASIp3 unlocks async, but the benefit only lands if the *host APIs* your component calls are also async. A lot of Spin 4.0's work happened here: we've asyncified Spin's host interfaces so I/O-heavy handlers actually get concurrency instead of blocking the instance.

In 4.0, the following interfaces are async from the guest's perspective:

- **Key-value**: `Store::open_default().await`, `store.get(key).await`, `store.set(key, value).await`
- **SQLite**: `Connection::open_default().await`, `connection.execute(...).await`
- **PostgreSQL**: `Connection::open(...).await`, `connection.query(...).await`
- **Redis (outbound and trigger)**: `Connection::open(...).await`, plus async Redis subscriber handlers
- **Outbound HTTP**: `spin_sdk::http::send(req).await`

Here's a Rust handler that runs a SQLite query and streams each row to the client as it arrives, using `spin_sdk::wasip3::spawn`:

```rust
use bytes::Bytes;
use futures::{SinkExt, StreamExt};
use http_body_util::StreamBody;
use spin_sdk::http::{IntoResponse, Request, Response};
use spin_sdk::http_service;
use spin_sdk::sqlite::Connection;

#[http_service]
async fn handle(_req: Request) -> anyhow::Result<impl IntoResponse> {
    let db = Connection::open_default().await?;

    // A channel the spawned task will push body chunks into.
    let (mut tx, rx) = futures::channel::mpsc::channel::<Bytes>(1024);
    let rx = rx.map(|value| anyhow::Ok(http_body::Frame::data(value)));
    let response = Response::builder()
        .header("content-type", "application/x-ndjson")
        .body(StreamBody::new(rx))?;

    // Spawn a background Wasm task. It outlives `handle` returning.
    spin_sdk::wasip3::spawn(async move {
        let mut query_result = db
            .execute("SELECT id, name FROM users ORDER BY id", [])
            .await?;
        let id_idx = query_result.columns().iter().position(|c| c == "id").unwrap();
        let name_idx = query_result.columns().iter().position(|c| c == "name").unwrap();

        while let Some(row) = query_result.next().await {
            let id: i64 = row.get(id_idx).unwrap();
            let name: &str = row.get(name_idx).unwrap();
            let line = format!("{{\"id\":{id},\"name\":\"{name}\"}}\n");
            let _ = tx.send(line.into()).await;
        }
        query_result.result().await?;
        // Dropping `tx` closes the body stream.
        anyhow::Ok(())
    });

    Ok(response)
}
```

Spin starts streaming the response as soon as `handle` returns, and each row hits the client as soon as SQLite yields it, without buffering the full result set in memory. That's a real win for time-to-first-byte and for large queries: you don't have to wait for every row before the client starts receiving bytes.

The same pattern is available in Python (via `componentize_py_async_support.spawn`) and Go (via plain `go func() { ... }()` goroutines).

> **Heads up on global state.** Because a single instance can now serve multiple concurrent requests, instance-scoped "global" state is shared across in-flight requests. This is the same rule you already follow in Axum, Express, or Flask, but it's a genuine shift from "one instance per request" if you've been writing Spin components against WASIp2 semantics. Audit any `static`, module-level, or `OnceCell` state and reach for per-request state or explicit synchronization where needed.

## Build profiles

Until now, building a Spin component in debug vs. release mode, or profiling builds, or "use a pre-built version in CI", meant hand-editing `[component.X.build]` tables, usually on a branch you hoped nobody merged. [SIP-022](https://github.com/spinframework/spin/blob/main/docs/content/sips/022-build-profiles.md) fixes this. Spin 4.0 introduces named **build profiles**, inspired by Cargo profiles.

You declare alternate profiles inline under each component, and select one at the command line:

```toml
spin_manifest_version = 2

[application]
name = "sentiment-analysis"

[component.sentiment-analysis]
source = "target/spin-http-js.wasm"

[component.sentiment-analysis.build]
command = "npm run build"
watch = ["src/**/*", "package.json", "package-lock.json"]

# A `debug` profile for the sentiment-analysis component.
[component.sentiment-analysis.profile.debug]
source = "target/spin-http-js.debug.wasm"

[component.sentiment-analysis.profile.debug.build]
command = "npm run build:debug"

# The `ui` component has no debug profile, it'll fall back to the default.
[component.ui]
source = { url = "https://.../spin_static_fs.wasm", digest = "sha256:..." }

# The `kv-explorer` component pulls a pre-built debug build from a registry.
[component.kv-explorer]
source = { url = "https://.../spin-kv-explorer.wasm", digest = "sha256:..." }

[component.kv-explorer.profile.debug]
source = { url = "https://.../spin-kv-explorer.debug.wasm", digest = "sha256:..." }
```

Now you can run the same manifest in two modes:

```bash
# Production: every component uses its default build.
$ spin up

# Debug: every component that defines `debug` uses it; others fall back.
$ spin up --profile debug
```

The `--profile` flag is recognized by `spin build`, `spin watch`, `spin up`, `spin deploy`, and `spin registry push`, so profiles carry all the way from local dev through deployment.

The fields a profile can override are intentionally scoped to build-time concerns:

- `source`
- `build.command`
- `environment`
- `dependencies`

Profiles are *not* atomic, fields in a profile are individual overrides. If a component doesn't define a requested profile, it falls back to its default configuration rather than erroring. This is exactly what you want for mixed-language apps, where only some components have meaningful debug builds.

## Fine-grained capability inheritance for dependencies

[SIP-020](https://github.com/spinframework/spin/blob/main/docs/content/sips/020-component-dependencies.md) introduced component dependencies, along with a single component-level boolean: `dependencies_inherit_configuration`. It was all-or-nothing, either every dependency inherited every capability of the parent component, or none did.

That's a problem in the real world. You might be happy letting an `aws:client/s3` dependency make outbound HTTPS calls to S3, but not letting it read your key-value store or invoke an LLM. [SIP-023](https://github.com/spinframework/spin/blob/main/docs/content/sips/023-fine-grained-capability-inheritance.md) replaces that coarse toggle with a per-dependency `inherit_configuration` field that accepts three forms.

**1. Inherit everything** (equivalent to the old global flag, but scoped to one dep):

```toml
[component."infra-dashboard".dependencies]
"aws:client" = { version = "1.0.0", inherit_configuration = true }
```

**2. Inherit nothing** (the default):

```toml
[component."infra-dashboard".dependencies]
"aws:client" = { version = "1.0.0", inherit_configuration = false }
```

The dependency is fully isolated from the parent's configuration. All capability imports are satisfied by deny adapters.

**3. Inherit a specific subset.** This is the new power:

```toml
[component."infra-dashboard"]
allowed_outbound_hosts = ["https://s3.us-west-2.amazonaws.com"]
key_value_stores      = ["my-key-value-cache"]
ai_models             = ["llama2-chat"]

[component."infra-dashboard".dependencies]
"aws:client" = { version = "1.0.0", inherit_configuration = ["allowed_outbound_hosts"] }
```

Here `aws:client` can make outbound HTTPS calls to the parent's allowed hosts, enough to reach S3, but it *cannot* see `my-key-value-cache` and *cannot* invoke `llama2-chat`. Every other capability is denied.

The keys you can list are the configuration families Spin already knows about: `ai_models`, `allowed_outbound_hosts`, `environment`, `files`, `key_value_stores`, `sqlite_databases`, and `variables`. Each key maps to a set of WIT interfaces, for example, listing `allowed_outbound_hosts` covers `wasi:http`, `fermyon:spin/mysql`, `fermyon:spin/postgres`, `fermyon:spin/redis`, `wasi:sockets`, and so on. See the [SIP-023 table](https://github.com/spinframework/spin/blob/main/docs/content/sips/023-fine-grained-capability-inheritance.md) for the full mapping.

`inherit_configuration` works uniformly across every dependency source type:

```toml
[component."my-app".dependencies]
# Registry dependency
"aws:client"      = { version = "1.0.0", inherit_configuration = ["allowed_outbound_hosts"] }
# Local path dependency
"my:lib/utils"    = { path = "lib/utils.wasm", inherit_configuration = true }
# HTTP dependency
"vendor:dep/api"  = { url = "https://example.com/dep.wasm", digest = "sha256:abc123", inherit_configuration = ["variables"] }
# Reference to another component in this same app
"infra:dep/svc"   = { component = "svc-component", inherit_configuration = ["key_value_stores", "variables"] }
```

A couple of rules to be aware of:

- The shorthand form (`"fizz:buzz" = ">=0.1.0"`) doesn't support `inherit_configuration`, use the full table form.
- `dependencies_inherit_configuration = true` still works as a convenience for "turn it on for every dependency," but **mixing** it with per-dependency `inherit_configuration` is a hard error. Pick one.

Practically, this means you can hand out dependencies to components from across your organization, or from the registry, and grant them exactly the capabilities they need, and nothing more. It's the principle of least privilege, expressed in `spin.toml`.

## Upgrading to Spin 4.0

1. **Install Spin 4.0** from [spinframework.dev/install](https://spinframework.dev/install) or grab a binary from the [release page](https://github.com/spinframework/spin/releases/tag/v4.0.0).
2. **Update your templates:**
   ```bash
   spin templates install --git https://github.com/spinframework/spin --update
   ```
3. **Update the SDK** your component uses:
   - Rust: `spin-sdk = "6.0"` and target `wasm32-wasip2` (WASIp2 and WASIp3 share the same binary target).
   - Python: pull the latest `spin-sdk` and `componentize-py` into your virtualenv.
   - Go: switch to `github.com/spinframework/spin-go-sdk/v3` and use Go 1.25.5+ with `go tool componentize-go build`.
4. **Remove** any `executor = { type = "wasip3-unstable" }` lines from your manifest, they're no longer needed.
5. **Audit instance-scoped state.** Concurrent in-flight requests on a single instance is now the default.

For a full walkthrough, see the [v4 quickstart](https://spinframework.dev/v4/quickstart) and the updated [language guides](https://spinframework.dev/v4/language-support-overview).

## Thank you

Spin 4.0 is the work of a lot of people across a lot of organizations, contributors to Spin itself, to `wasmtime`, to `wit-bindgen`, to `componentize-py`, to the Spin Go SDK, and to the WASIp3 standardization effort in the Bytecode Alliance. Thank you, and thank you to the CNCF for continuing to support the project.

## Stay in touch

Join us at weekly [project meetings](https://github.com/spinframework/spin#getting-involved-and-contributing), say hi on the [Spin CNCF Slack channel](https://cloud-native.slack.com/archives/C089NJ9G1V0), and follow [@spinframework](https://twitter.com/spinframework) on X.

Ready to build? Head to the [Spin quickstart](https://spinframework.dev/v4/quickstart), or browse the [Spin Hub](https://spinframework.dev/hub) for inspiration.
