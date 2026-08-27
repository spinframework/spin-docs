title = "Announcing Spin v4.1"
date = "2026-08-26T17:00:00Z"
template = "blog_post"
description = "Announcing Spin v4.1: a finalized WASI Preview 3, composable HTTP middleware, async MySQL, service chaining across WASIp2 and WASIp3, connection limits and backpressure, and sharper OpenTelemetry metrics."
tags = []

[extra]
type = "post"
author = "The Spin Project"

---

The CNCF Spin project just released [Spin v4.1.0](https://github.com/spinframework/spin/releases/tag/v4.1.0).

Back in [Spin 4.0](https://spinframework.dev/blog/announcing-spin-4-0) we shipped a
production-grade implementation of WASI Preview 3 built on the March 2026 release
candidate, and committed to supporting it long-term. That commitment just got a lot easier
to make: **WASIp3 is final, and Spin 4.1 runs on it.**

On top of that foundation, 4.1 adds **composable HTTP middleware**, written as ordinary Wasm
components and built on the async streaming WASIp3 gives us. There's also async MySQL,
service chaining for WASIp3 components, and a set of connection limits and telemetry
improvements for folks running Spin in production.

- [WASI Preview 3 is final](#wasi-preview-3-is-final)
- [HTTP middleware](#http-middleware)
- [Async MySQL, with streaming rows](#async-mysql-with-streaming-rows)
- [Service chaining across WASIp2 and WASIp3](#service-chaining-across-wasip2-and-wasip3)
- [Target environments](#target-environments)
- [A heads-up on WAGI](#a-heads-up-on-wagi)
- [Running Spin in production](#running-spin-in-production)
- [Upgrading to Spin 4.1](#upgrading-to-spin-41)

## WASI Preview 3 is final

WASI 0.3.0 is done. After the March 2026 release candidate that shipped in Spin 4.0,
WASIp3's interfaces are finalized, and Spin 4.1, running on Wasmtime 48, speaks it
natively.

If you're already on Spin 4.0, the good news is that this is a non-event for your
applications. Spin 4.1 supports **both** the final 0.3.0 interfaces and the
`0.3.0-rc-2026-03-15` snapshot, so components you built against 4.0 keep running exactly as
they did. You can see both in the `spin:up@4.1.0` world:

```
package spin:up@4.1.0;

world http-trigger {
  include platform;
  export wasi:http/handler@0.3.0;
}

world platform {
  include wasi:cli/imports@0.2.6;
  include wasi:cli/imports@0.3.0-rc-2026-03-15;
  include wasi:cli/imports@0.3.0;
  import wasi:http/outgoing-handler@0.2.6;
  import wasi:http/client@0.3.0-rc-2026-03-15;
  import wasi:http/client@0.3.0;
  // ...
}
```

And as always, WASIp2 components continue to run unchanged: `wasi:cli/imports@0.2.6` and
`wasi:http/outgoing-handler@0.2.6` are right there in the platform world. There's even a new
`http-rust-p2` template if you have a reason to stay on WASIp2 for a while.

A big thank you to everyone in the Bytecode Alliance who carried WASIp3 across the finish
line. It's been a long road from "experimental, opt-in, might break between releases" in
Spin 3.5 to a finished standard, and Spin is much better for it.

## HTTP middleware

Here's the headline feature, and it's one we've wanted for a long time.

Every web framework you've ever used has a middleware story: a way to slot auth, logging,
compression, header rewriting, or rate limiting in front of your handler without tangling it
up in your business logic. Spin 4.1 brings that same idea to Wasm components, as an
ordinary, sandboxed component instead of a proxy bolted on in front of your app.

You declare a middleware chain right on your HTTP trigger:

```toml
[[trigger.http]]
route = "/..."
component = "api-server"
dependencies.middleware = [
    { component = "auth", inherit_configuration = ["allowed_outbound_hosts"] },
    { component = "cors" }
]
```

Requests flow outermost to innermost: `auth`, then `cors`, then your `api-server`
component. Responses flow back out the other way. It's the same middleware pipeline pattern
used by frameworks like Express or ASP.NET, except every layer here is an independently
compiled, independently sandboxed Wasm component that you can build, test, version, and
publish on its own.

### The contract is just `wasi:http/handler`

There's no special Spin middleware API to learn. A middleware component **imports and
exports the same interface** your application component exports:

```
interface handler {
  handle: async func(request: request) -> result<response, error-code>;
}
```

Spin wires the chain together automatically because every link speaks the same interface.
A middleware is just a handler that happens to call the next one, which means middleware
and application components are the same kind of thing: an ordinary component you can
publish to a registry and drop into anyone's chain.

### Writing one: touching the request

Here's a middleware that fetches a random animal fact and attaches it as a request header,
from the new [`examples/http-middleware`](https://github.com/spinframework/spin/tree/main/examples/http-middleware)
sample:

```rust
#[http_service]
async fn add_animal_fact_header(
    request: Request,
) -> Result<Response, spin_sdk::wasip3::http::types::ErrorCode> {
    let animal_fact_response =
        spin_sdk::http::get("https://random-data-api.fermyon.app/animals/json").await?;
    let animal_fact_json = animal_fact_response.into_body().bytes().await?;
    let animal_fact: AnimalFact = serde_json::from_slice(&animal_fact_json).unwrap();

    let (mut parts, body) = request.into_parts();
    parts.headers.append(
        "animal-fact",
        HeaderValue::from_str(&animal_fact.fact).unwrap(),
    );
    let request = Request::from_parts(parts, body);

    spin_sdk::http::next(request).await
}
```

`spin_sdk::http::next(request)` is your "call the next handler" primitive. The interesting
part is that calling it is optional. If you *don't* call it, you've short-circuited the
chain: nothing behind you ever sees the request, and your response goes straight back to the
client. That's all an auth middleware is:

```rust
#[http_service]
async fn require_token(request: Request) -> anyhow::Result<impl IntoResponse> {
    let authorized = request
        .headers()
        .get("authorization")
        .is_some_and(is_valid_token);

    if !authorized {
        return Ok(Response::new(401, "unauthorized"));
    }

    Ok(spin_sdk::http::next(request).await?)
}
```

### Writing one: transforming the response, without buffering

This is the part where WASIp3 really earns its keep: because bodies are `stream<u8>` and
handlers are `async func`, a streaming transform is just a loop. Under WASIp2, doing the same
thing meant buffering the whole body in memory or hand-rolling a state machine to pump it
through.

```rust
#[http_service]
async fn yell_it(request: Request) -> anyhow::Result<impl IntoResponse> {
    let response = spin_sdk::http::next(request).await?;

    let (parts, body) = response.into_parts();
    let mut body_stm = body.stream();

    let (mut tx, transformed_body) = spin_sdk::http::body::stream();

    spin_sdk::wasip3::spawn(async move {
        while let Some(chunk) = body_stm.next().await {
            let Ok(chunk) = chunk else { break; };
            let text = String::from_utf8_lossy(chunk.as_ref());
            let bytes = bytes::Bytes::from_owner(text.to_uppercase().into_bytes());
            if tx.send(bytes).await.is_err() { break; }
        }
    });

    Ok(Response::from_parts(parts, transformed_body))
}
```

The response headers go back to the client immediately, and the body is transformed chunk by
chunk on a spawned task, using the same `spin_sdk::wasip3::spawn` pattern we used for
streaming SQLite rows in the [4.0 post](https://spinframework.dev/blog/announcing-spin-4-0).
No buffering: the same middleware works just as well on a 4 KB JSON payload as on a 4 GB
stream.

### Middleware doesn't get a free pass on capabilities

Suppose the `api-server` component is allowed to call your token endpoint:

```toml
[component.api-server]
allowed_outbound_hosts = ["https://tokens.example.com"]
```

The `auth` middleware in front of it can reach that endpoint only because `api-server`
grants it that capability, and only because the trigger says
`inherit_configuration = ["allowed_outbound_hosts"]`. Middleware gets no ambient authority.

This is exactly the fine-grained capability inheritance that landed in Spin 4.0 for
component dependencies, now applied to middleware. If you want a middleware to reach a
capability, list it explicitly in `inherit_configuration`; otherwise leave it out and the
middleware gets nothing.

### Hosts have to opt in

When you deploy an application that uses middleware, it matters whether the host you deploy
it to actually knows how to run middleware, and a host built on an older version of Spin
might not. Spin's distribution format makes sure of this: a host that can't run middleware
rejects the application up front with a clear error, rather than quietly running it without
the security layer you carefully placed in front.

## Async MySQL, with streaming rows

Spin 4.0 asyncified key-value, SQLite, PostgreSQL, Redis, and outbound HTTP. MySQL was the
one that didn't make it. In 4.1, it does:

```
resource connection {
  open: static async func(address: string) -> result<connection, error>;

  query: async func(statement: string, params: list<parameter-value>)
    -> result<tuple<list<column>, stream<row>, future<result<_, error>>>, error>;

  execute: async func(statement: string, params: list<parameter-value>) -> result<_, error>;
}
```

`query` hands you column metadata right away, plus a `stream<row>` and a trailing `future`
for any error hit partway through. You can start processing rows before MySQL has finished
producing them, and a big result set no longer has to fit in guest memory all at once. It's
the same streaming story PostgreSQL got in 4.0.

## Service chaining across WASIp2 and WASIp3

Local service chaining, where one component calls another over
`http://other-component.spin.internal` without ever leaving the host, now works for WASIp3
components, and it works across the P3/P2 boundary. A WASIp3 component can chain to a
WASIp2 component and vice versa, so you can migrate a multi-component application one piece
at a time instead of all at once.

## Target environments

Spin 4.0 introduced `spin new -E <environment>` for targeting a specific deployment platform.
Spin 4.1 builds on that.

There's a new command for seeing and refreshing what's available:

```console
$ spin targets list      # list known target environments
$ spin targets update    # refresh the list from the master catalogue
```

You can set a default so you don't have to type `-E` forever:

```console
$ export SPIN_NEW_DEFAULT_ENVIRONMENT=<environment>
```

Environments can also constrain more than WIT worlds. An environment can declare which
key-value stores, SQLite databases, or AI models it actually provides, and `spin build` will
tell you before you deploy:

> Component `api-server` can't run in environment `spin-up` because it requires the
> `my-database` key-value store which the environment does not support

## A heads-up on WAGI

Spin 4.1 begins printing a deprecation warning for WAGI components, and the WAGI examples
have been removed from the repository. Your WAGI components will keep running: this is the
start of a gradual, managed deprecation, not a break. WAGI is a pre-component-model
compatibility shim and we'd like to retire it, so if you're still running WAGI components,
now's a good time to plan a move to a proper Wasm component.

## Running Spin in production

The rest of this post is for the folks running Spin rather than writing for it.

### Connection limits and backpressure

Spin has always been careful about *what* an application is allowed to talk to. It's been
less opinionated about *how much*. A single app could exhaust a host's resources through
outbound HTTP, PostgreSQL, MySQL, Redis, MQTT, or raw sockets, each with its own independent
notion of "unlimited."

Spin 4.1 adds connection limits across all of those, configured in your runtime config:

```toml
[outbound_networking]
max_total_connections = 500    # global ceiling across every outbound kind
max_socket_connections = 100   # raw wasi-sockets specifically

[outbound_http]
max_connections = 200

[outbound_pg]
max_connections = 50

[outbound_redis]
max_connections = 50
```

If you're using `[outbound_http] max_concurrent_requests`, it still works but is now
**deprecated** in favor of `max_connections`. See the upgrade notes below for one subtlety
to watch for when you migrate.

### Sharper telemetry

Spin's metrics now go straight to the OpenTelemetry SDK instead of being routed through
`tracing` events, so they're cheaper to emit and behave the way your OTel tooling expects.
Spin has also switched to `opentelemetry-semantic-conventions` for attribute names instead
of hand-rolled strings, so Spin's telemetry now lines up with the rest of your observability
stack out of the box.

If you've built dashboards or alerts against Spin's OpenTelemetry attribute names, see the
upgrade notes below.

## Upgrading to Spin 4.1

1. Install Spin 4.1 from [spinframework.dev/install](https://spinframework.dev/install) or
   grab a binary from the
   [release page](https://github.com/spinframework/spin/releases/tag/v4.1.0).
2. Update your templates:
   ```console
   spin templates install --git https://github.com/spinframework/spin --update
   ```
3. That's it for app developers. Applications built for Spin 4.0, including WASIp3 components
   built against the March release candidate, run on 4.1 unchanged.

And if you want to try middleware, the fastest path is the example in the repo:

```console
$ git clone https://github.com/spinframework/spin
$ cd spin/examples/http-middleware
$ spin build --up
```

If you're operating Spin, two things are worth a look:

- In your runtime config file, replace `[outbound_http] max_concurrent_requests` with
  `max_connections`, remembering that `0` now means *no connections* rather than *one*.
- Re-check any dashboards or alerts built on Spin's OpenTelemetry attribute names, which now
  follow the OTel semantic conventions.

## Thank you

Spin 4.1 is the work of contributors across a lot of organizations: to Spin itself, to
`wasmtime`, to `wit-bindgen`, to the SDKs, and to the WASIp3 standardization effort in the
Bytecode Alliance that reached 0.3.0 in this cycle. Thank you all, and thank you to the CNCF
for continuing to support the project.

A special welcome to [@TheRayquaza](https://github.com/TheRayquaza) and
[@carsonfarmer](https://github.com/carsonfarmer), who both made their first contributions in
this release, and congratulations to [@alexcrichton](https://github.com/alexcrichton) on
joining as a Spin maintainer.

## Stay in touch

Join us at weekly
[project meetings](https://github.com/spinframework/spin#getting-involved-and-contributing),
say hi on the [Spin CNCF Slack channel](https://cloud-native.slack.com/archives/C089NJ9G1V0),
and follow [@spinframework](https://twitter.com/spinframework) on X.

Ready to build? Head to the [Spin quickstart](https://spinframework.dev/v4/quickstart), or
browse the [Spin Hub](https://spinframework.dev/hub) for inspiration.
