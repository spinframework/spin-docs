title = "Announcing Spin v4.0"
date = "2026-04-23T12:00:00Z"
template = "blog_post"
description = "Announcing the release of Spin v4.0: WASIp3 stabilization, async interfaces across the board, build profiles, and fine-grained capability inheritance for dependencies."
tags = []

[extra]
type = "post"
author = "The Spin Project"

---

The CNCF Spin project is excited to announce [Spin v4.0](https://github.com/spinframework/spin/releases/tag/v4.0.0). This release marks the stabilization of WebAssembly System Interface Preview 3 (WASIp3) support in Spin, shipping the March RC (RC 2026-03-15) as a first-class, long-term supported target. Alongside this milestone, v4 delivers async interfaces throughout the entire API surface, build profiles for managing multiple build configurations, and fine-grained capability inheritance for component dependencies.

For the full list of changes, see the [release notes](https://github.com/spinframework/spin/releases/tag/v4.0.0).

## WASIp3: Now Stable in Spin

[WASIp3](https://wasi.dev) is the next generation of the WebAssembly System Interface. At its core, it brings **first-class concurrency and asynchronous I/O** to WebAssembly components — meaning your component can handle multiple requests concurrently within a single instance, stream data to clients as it is produced rather than buffering everything upfront, and coordinate asynchronous tasks that outlive the top-level entry point.

Previous Spin releases shipped WASIp3 under an experimental, opt-in executor: `executor = { type = "wasip3-unstable" }`. **In Spin v4, that gate is gone.** The March RC of WASIp3 (RC 2026-03-15) is the default execution model. All HTTP and Redis trigger components now run on WASIp3, and all Spin SDK interfaces — key-value, SQLite, PostgreSQL, outbound HTTP, variables, and more — are now `async`-native.

### What Changes for Your Components?

If you were using WASIp2 in Spin v3, here is what has changed:

- Your handler functions must now be `async` (in all SDKs).
- All Spin SDK API calls now return futures/coroutines; use your language's native `await` syntax.
- You no longer declare `executor = { type = "wasip3-unstable" }` in your trigger configuration.
- Component instance reuse is the default: a single component instance can serve multiple concurrent requests. Avoid storing per-request state in instance-level globals without synchronisation.

### Rust: `spin-sdk` v6

The Spin Rust SDK v6 makes WASIp3 the default, stable experience. The `#[http_service]` macro replaces `#[http_component]`, and handler functions are `async`:

```rust
use spin_sdk::http::{IntoResponse, Request, Response};
use spin_sdk::http_service;

#[http_service]
async fn handle(req: Request) -> anyhow::Result<impl IntoResponse> {
    Ok(Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body("Hello from Spin v4!")?)
}
```

```toml
[package]
name = "hello-spin"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
anyhow = "1"
spin-sdk = "6.0"
```

Build target is still `wasm32-wasip2` — WASIp3 extends the binary format rather than replacing it:

```bash
$ cargo build --target wasm32-wasip2 --release
```

Or use `spin build` with the Rust template.

#### Streaming Responses with WASIp3

One of the most powerful WASIp3 capabilities is streaming. You can spawn a background task that writes response body data asynchronously, allowing your handler to send the HTTP response _before_ all of the data is ready:

```rust
use bytes::Bytes;
use futures::{SinkExt, StreamExt};
use http_body_util::StreamBody;
use spin_sdk::http::{IntoResponse, Request, Response};
use spin_sdk::http_service;

#[http_service]
async fn handle(_req: Request) -> anyhow::Result<impl IntoResponse> {
    let store = spin_sdk::key_value::Store::open_default().await?;

    // Create a channel that will carry the response body chunks.
    let (mut tx, rx) = futures::channel::mpsc::channel::<Bytes>(1024);
    let rx = rx.map(|chunk| anyhow::Ok(http_body::Frame::data(chunk)));
    let response = Response::new(StreamBody::new(rx));

    // Spawn a background task. It runs even after `handle` returns.
    spin_sdk::wasip3::spawn(async move {
        if let Ok(Some(greeting)) = store.get("greeting").await {
            tx.send(greeting.into()).await.unwrap();
        }
        if let Ok(Some(name)) = store.get("name").await {
            tx.send(" ".into()).await.unwrap();
            tx.send(name.into()).await.unwrap();
        }
        // `tx` dropped here → body stream ends → Spin closes the response.
    });

    // Return immediately. Spin starts streaming the response to the client
    // as chunks arrive from the background task.
    Ok(response)
}
```

#### Concurrent Outbound Requests

WASIp3 makes it trivial to fire multiple outbound HTTP requests concurrently — no threads, no blocking:

```rust
use spin_sdk::http::{EmptyBody, IntoResponse, Request, Response};
use spin_sdk::http_service;

#[http_service]
async fn handle(_req: Request) -> anyhow::Result<impl IntoResponse> {
    // Kick off both requests at the same time.
    let (docs_res, spec_res): (Response, Response) = futures::try_join!(
        spin_sdk::http::send(Request::get("https://spinframework.dev").body(EmptyBody::new())?),
        spin_sdk::http::send(Request::get("https://wasi.dev").body(EmptyBody::new())?),
    )?;

    let body = format!(
        "Spin docs: {}, WASI spec: {}",
        docs_res.status(),
        spec_res.status()
    );
    Ok(Response::new(body))
}
```

### Python: `spin-python-sdk` v4

The Python SDK v4 updates `handle_request` to be an `async` method. Existing synchronous patterns still work — simply add `async`/`await`:

```python
from spin_sdk.http import Handler, Request, Response, send

class HttpHandler(Handler):
    async def handle_request(self, request: Request) -> Response:
        animal_resp = await send(
            Request("GET", "https://random-data-api.fermyon.app/animals/json", {}, None)
        )
        return Response(
            200,
            {"content-type": "text/plain"},
            bytes(f"Animal fact: {str(animal_resp.body, 'utf-8')}", "utf-8"),
        )
```

The `spin.toml` build command now targets the v4 HTTP trigger WIT:

```toml
[component.hello-world]
source = "app.wasm"
allowed_outbound_hosts = ["https://random-data-api.fermyon.app"]

[component.hello-world.build]
command = "componentize-py -w spin:up/http-trigger@4.0.0 componentize app -o app.wasm"
```

Install the updated Python SDK and templates:

```bash
$ spin templates install --git https://github.com/spinframework/spin-python-sdk --update
$ spin new -t http-py my-app --accept-defaults
```

### Go: `spin-go-sdk` v3

The Go SDK v3 drops TinyGo + WASIp1 in favour of standard Go tooling with `componentize-go`. HTTP handlers use the raw WASIp3 bindings exposed by the SDK. The idiomatic way to return a streaming body is with a goroutine — the same `go` keyword you already know:

```go
package main

import (
    "net/http"

    handler "github.com/spinframework/spin-go-sdk/v3/exports/wasi_http_service_0_3_0_rc_2026_03_15/export_wasi_http_0_3_0_rc_2026_03_15_handler"
    _ "github.com/spinframework/spin-go-sdk/v3/exports/wasi_http_service_0_3_0_rc_2026_03_15/wit_exports"
    . "github.com/spinframework/spin-go-sdk/v3/imports/wasi_http_0_3_0_rc_2026_03_15_types"
    . "go.bytecodealliance.org/pkg/wit/types"
)

func Handle(request *Request) Result[*Response, ErrorCode] {
    // Create a stream for the body.
    tx, rx := MakeStreamU8()

    // Goroutine writes the body asynchronously.
    go func() {
        defer tx.Drop()
        tx.WriteAll([]uint8("Hello from Spin v4!"))
    }()

    response, send := ResponseNew(
        FieldsFromList([]Tuple2[string, []uint8]{
            {"content-type", []uint8("text/plain")},
        }).Ok(),
        Some(rx),
        trailersFuture(),
    )
    send.Drop()
    return Ok[*Response, ErrorCode](response)
}

func trailersFuture() *FutureReader[Result[Option[*Fields], ErrorCode]] {
    tx, rx := MakeFutureResultOptionFieldsErrorCode()
    go tx.Write(Ok[Option[*Fields], ErrorCode](None[*Fields]()))
    return rx
}

func init() { handler.Exports.Handle = Handle }
func main() {}
```

Build using `componentize-go`:

```bash
$ componentize-go -w wasi:http/service@0.3.0-rc-2026-03-15 -w platform build
```

### Async Spin Interfaces Across the Board

In Spin v4 every Spin host interface is async. Where you previously called synchronous SDK functions, you now `await` them. Here is a side-by-side comparison for the key-value store across all three languages:

**Rust**

```rust
// Open the default store
let store = spin_sdk::key_value::Store::open_default().await?;

// Read a value
let value: Option<Vec<u8>> = store.get("my-key").await?;

// Write a value
store.set("my-key", b"my-value").await?;

// Iterate all keys (streamed)
let (keys, result) = store.get_keys().await;
while let Some(key) = keys.next().await {
    println!("{key}");
}
result.await?;
```

**Python**

```python
from spin_sdk import key_value

async def handle_request(self, request):
    async with await key_value.open_default() as store:
        await store.set("visits", b"1")
        value = await store.get("visits")
        print(value)
```

**Go** (using the SDK's async key-value bindings)

```go
// Key-value usage via the spin-go-sdk v3 bindings follows the same
// goroutine-and-stream pattern as the HTTP example above.
// See https://github.com/spinframework/spin-go-sdk for full examples.
```

The same async pattern applies to SQLite, PostgreSQL, MySQL, Redis, MQTT, and all other Spin APIs — no more blocking the event loop.

## Build Profiles

Managing different build configurations — release vs. debug, with or without profiling instrumentation — previously meant hand-editing `spin.toml` before every build. Spin v4 introduces **build profiles**: named, per-component configurations that you define once and activate with a flag.

### Defining Profiles

Add a `[component.<name>.profile.<profile-name>]` table (and optionally a `[component.<name>.profile.<profile-name>.build]` table) to your `spin.toml`:

```toml
spin_manifest_version = 2

[application]
name = "my-app"

[component.api]
source = "target/wasm32-wasip2/release/api.wasm"

[component.api.build]
command = "cargo build --release --target wasm32-wasip2"
watch = ["src/**/*", "Cargo.toml"]

# A debug build profile for the api component.
[component.api.profile.debug]
source = "target/wasm32-wasip2/debug/api.wasm"

[component.api.profile.debug.build]
command = "cargo build --target wasm32-wasip2"

# The static-assets component has no debug variant; it always uses the default.
[component.static-assets]
source = { url = "https://example.com/spin_static_fs.wasm", digest = "sha256:abc123" }
```

### Activating a Profile

Pass `--profile <name>` to `spin build`, `spin up`, `spin watch`, `spin deploy`, or `spin registry push`:

```bash
# Default (release) build
$ spin build

# Debug build — uses the debug profile where defined, default elsewhere
$ spin build --profile debug
$ spin up --profile debug

# Mix: watch in debug mode, live-reloading on source changes
$ spin watch --profile debug
```

Components that do not define the requested profile automatically fall back to their default configuration. This means you can add a profile to one component at a time without affecting the rest.

### What Can a Profile Override?

A profile can override the following fields:

| Field | Description |
|---|---|
| `source` | The Wasm binary to use |
| `build.command` | The command to compile the component |
| `environment` | Environment variables passed to the component |
| `dependencies` | Component dependencies to use in this profile |

## Fine-Grained Capability Inheritance for Dependencies

Spin has supported component dependencies since [SIP 020](https://github.com/spinframework/spin/blob/main/docs/content/sips/020-component-dependencies.md). Previously, the `dependencies_inherit_configuration` boolean on a component was all-or-nothing: either every dependency inherited every capability (outbound hosts, key-value stores, databases, AI models, …), or none of them did.

Spin v4 ships [SIP 023](https://github.com/spinframework/spin/blob/main/docs/content/sips/023-fine-grained-capability-inheritance.md), which replaces this coarse toggle with a **per-dependency `inherit_configuration` field** that lets you specify exactly which capabilities each dependency may access.

### Three Inheritance Modes

#### Inherit all capabilities

```toml
[component.dashboard.dependencies]
"aws:client" = { version = "1.0.0", inherit_configuration = true }
```

Equivalent to the old `dependencies_inherit_configuration = true`, but scoped to a single dependency.

#### Inherit no capabilities (the default)

```toml
[component.dashboard.dependencies]
"vendor:analytics" = { version = "2.0.0", inherit_configuration = false }
```

The dependency is fully isolated — all capability imports are satisfied by deny adapters. This is also the behaviour when `inherit_configuration` is omitted entirely.

#### Inherit a specific subset

```toml
[component.dashboard]
allowed_outbound_hosts = ["https://s3.us-west-2.amazonaws.com"]
key_value_stores = ["cache"]
ai_models = ["llama2-chat"]

[component.dashboard.dependencies]
# Only allow s3-client to make outbound HTTP requests.
# It cannot touch the key-value store or AI models.
"aws:s3-client" = { version = "1.0.0", inherit_configuration = ["allowed_outbound_hosts"] }

# Allow the templating library to read variables (e.g. secrets) from the parent.
"acme:templates" = { version = "0.5.0", inherit_configuration = ["variables"] }

# Internal analytics component can access the cache.
"acme:analytics" = { component = "analytics", inherit_configuration = ["key_value_stores"] }
```

The supported configuration keys are:

| Key | What it grants |
|---|---|
| `allowed_outbound_hosts` | Outbound HTTP, PostgreSQL, MySQL, Redis, MQTT, and socket access |
| `key_value_stores` | Key-value store access |
| `sqlite_databases` | SQLite database access |
| `ai_models` | LLM inferencing |
| `variables` | Dynamic variables / secrets |
| `environment` | Environment variables |
| `files` | Mounted files |

### Backward Compatibility

The component-level `dependencies_inherit_configuration = true` still works. It is equivalent to setting `inherit_configuration = true` on every dependency, and is expanded internally during manifest normalisation. However, **mixing** the component-level boolean with per-dependency `inherit_configuration` entries is not allowed — Spin will report an error directing you to pick one form:

```
Component `dashboard` specifies both `dependencies_inherit_configuration` and per-dependency
`inherit_configuration`. These are mutually exclusive; use one or the other.
```

The per-dependency form also applies uniformly to all dependency source types — registry packages, local paths, HTTP URLs, and app component references:

```toml
[component.my-app.dependencies]
# Registry dependency
"aws:s3-client"    = { version = "1.0.0",                                              inherit_configuration = ["allowed_outbound_hosts"] }
# Local Wasm file
"my:lib/utils"     = { path = "lib/utils.wasm",                                        inherit_configuration = true }
# HTTP URL dependency
"vendor:dep/api"   = { url = "https://example.com/dep.wasm", digest = "sha256:abc123", inherit_configuration = ["variables"] }
# Component within the same Spin app
"infra:dep/svc"    = { component = "svc-component",                                    inherit_configuration = ["key_value_stores", "variables"] }
```

## Getting Started with Spin v4

Install or upgrade Spin:

```bash
$ curl -fsSL https://spinframework.dev/downloads/install.sh | bash
```

Or use a package manager — see the [Spin install docs](https://spinframework.dev/v4/install) for all options.

Install the latest templates (including the WASIp3-based HTTP templates for Rust, Python, and Go):

```bash
$ spin templates install --upgrade --git https://github.com/spinframework/spin
```

Create a new HTTP application:

```bash
# Rust
$ spin new -t http-rust my-app-rs --accept-defaults

# Python
$ spin new -t http-py my-app-py --accept-defaults

# Go (requires componentize-go)
$ spin new -t http-go my-app-go --accept-defaults
```

Then build and run:

```bash
$ cd my-app-rs
$ spin build --up
```

Visit the [Spin v4 quickstart](https://spinframework.dev/v4/quickstart) for a full walkthrough.

## Thank You

A huge thank you to every contributor who helped bring Spin v4 together as well as the broader Bytecode Alliance and WASI community for their tireless work on the WASIp3 standard.

Thank you to the CNCF for their continued support of the Spin project.

## Stay In Touch

Please join us for weekly [project meetings](https://github.com/spinframework/spin#getting-involved-and-contributing), chat in the [Spin CNCF Slack channel](https://cloud-native.slack.com/archives/C089NJ9G1V0), and follow [@spinframework](https://twitter.com/spinframework) on X (formerly Twitter)!