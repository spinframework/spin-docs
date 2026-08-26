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

On top of that foundation, 4.1 adds the feature WASIp3 has quietly been making possible all
along — **composable HTTP middleware**, written as ordinary Wasm components — plus async
MySQL, service chaining for WASIp3 components, and a set of connection limits and telemetry
improvements for folks running Spin in production.

- [WASI Preview 3 is final](#wasi-preview-3-is-final)
- [HTTP middleware](#http-middleware)
- [Async MySQL, with streaming rows](#async-mysql-with-streaming-rows)
- [Service chaining across WASIp2 and WASIp3](#service-chaining-across-wasip2-and-wasip3)
- [Connection limits and backpressure](#connection-limits-and-backpressure)
- [Sharper telemetry](#sharper-telemetry)
- [Target environments keep growing up](#target-environments-keep-growing-up)
- [A heads-up on WAGI](#a-heads-up-on-wagi)
- [Upgrading to Spin 4.1](#upgrading-to-spin-41)

## WASI Preview 3 is final

WASI 0.3.0 is done. After the March 2026 release candidate that shipped in Spin 4.0,
WASIp3 has reached its final form, and Spin 4.1 — running on Wasmtime 48 — speaks it
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

And as always, WASIp2 components continue to run unchanged — `wasi:cli/imports@0.2.6` and
`wasi:http/outgoing-handler@0.2.6` are right there in the platform world. There's even a new
`http-rust-p2` template if you have a reason to stay on WASIp2 for a while.

A big thank you to everyone in the Bytecode Alliance who carried WASIp3 across the finish
line. It's been a long road from "experimental, opt-in, might break between releases" in
Spin 3.5 to a finished standard, and Spin is much better for it.

## HTTP middleware

Here's the headline feature, and it's one we've wanted for a long time.

Every web framework you've ever used has a middleware story: a way to slot auth, logging,
compression, header rewriting, or rate limiting in front of your handler without tangling it
up in your business logic. Spin didn't have one. Your options were to bake the logic into
the component itself, or to put a proxy in front of Spin — which meant the thing doing the
work wasn't a Wasm component, and didn't get Spin's sandboxing, permissions, or portability.

In Spin 4.1, you can declare a middleware chain right on your HTTP trigger:

```toml
[[trigger.http]]
route = "/..."
component = "hello"
dependencies.middleware = [
    { component = "animal-fact", inherit_configuration = ["allowed_outbound_hosts"] },
    { component = "yelling" }
]
```

Requests flow outermost to innermost — `animal-fact`, then `yelling`, then your `hello`
component. Responses flow back out the other way. It's the onion model you already know,
except every layer is an independently compiled, independently sandboxed Wasm component
that you can build, test, version, and publish on its own.

### The contract is just `wasi:http/handler`

There's no special Spin middleware ABI to learn. A middleware component is simply one that
**imports and exports the same interface**:

```
world middleware {
  import types;
  import handler;
  // ... clocks, cli, client ...
  export handler;
}

interface handler {
  use types.{request, response, error-code};

  handle: async func(request: request) -> result<response, error-code>;
}
```

That's it. Because the import and the export are the same interface, Spin can wire the chain
up mechanically: each middleware's import gets connected to the next one's export, and the
innermost import lands on your application component.

The nice consequence is that **middleware and application components are the same kind of
thing**. A middleware is just a handler that happens to call the next one. Publish it to a
registry and anyone can drop it into their chain.

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

`spin_sdk::http::next(request)` is your "call the next handler" primitive. And if you
*don't* call it — say, because the caller didn't present a valid token — you've
short-circuited the chain and returned your own response. That's your auth middleware.

### Writing one: transforming the response, without buffering

This is the part where WASIp3 really earns its keep.

Under WASIp2, response bodies were resource handles you pumped through `wasi:io/streams`
with explicit pollables. Transforming a body meant either buffering the whole thing in
memory or hand-rolling a little state machine. Under WASIp3, bodies are `stream<u8>` and
handlers are `async func`, so a streaming transform is just a loop:

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
chunk on a spawned task — the same `spin_sdk::wasip3::spawn` pattern we used for streaming
SQLite rows in the 4.0 post. No buffering, no head-of-line blocking, and the same middleware
works just as well on a 4 KB JSON payload as on a 4 GB stream.

### Middleware doesn't get a free pass on capabilities

Look again at that manifest snippet, and at the application component:

```toml
[component.hello]
allowed_outbound_hosts = ["https://random-data-api.fermyon.app"]
```

The `animal-fact` middleware can reach the animal fact API only because the component it
fronts grants it that capability, and only because the trigger says
`inherit_configuration = ["allowed_outbound_hosts"]`. Middleware gets no ambient authority.

This is exactly the fine-grained capability inheritance that landed in Spin 4.0 for
component dependencies, now applied to middleware. As with dependencies,
`inherit_configuration` accepts `true` (everything, including capabilities added in future
releases), `false` or omitted (nothing), or an explicit list of capability keys. We'd
encourage the explicit list.

### Hosts have to opt in

If your manifest declares middleware, Spin records a `"middleware": "required"` host
requirement in `spin.lock`. A host that can't run middleware will reject the application up
front with a clear error, rather than quietly ignoring the security layer you carefully
placed in front of your app. `spin up` advertises support, alongside local service chaining.

Two smaller changes came along for the ride. The `Connection` header is now stripped before a
request reaches any guest — it's hop-by-hop transport state, and it causes real problems when
a middleware forwards the request onward. And the blanket ban on "forbidden" headers in
guest-produced responses is gone, because middleware legitimately needs to set headers that a
leaf handler had no business setting.

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
producing them, and a big result set no longer has to fit in guest memory all at once — the
same streaming story PostgreSQL got in 4.0.

The host side got smarter too: if your guest drops the row consumer, Spin now cancels the
underlying query task instead of dutifully draining the rest of the result set into the void.

## Service chaining across WASIp2 and WASIp3

Local service chaining — one component calling another over
`http://other-component.spin.internal` without ever leaving the host — now works for WASIp3
components, and it works **across the boundary**. A WASIp3 component can chain to a WASIp2
component and vice versa, so you can migrate a multi-component application one piece at a
time instead of all at once.

## Connection limits and backpressure

This one is for the operators.

Spin has always been careful about *what* an application is allowed to talk to. It's been
less opinionated about *how much*. A single app could exhaust a host's file descriptors
through any of half a dozen outbound factors, each with its own independent notion of
"unlimited."

Spin 4.1 introduces a shared connection semaphore underneath outbound HTTP, PostgreSQL,
MySQL, Redis, MQTT, and raw WASI sockets. You get a global ceiling plus per-factor caps,
configured in your runtime config:

```toml
[outbound_networking]
max_total_connections = 500    # global ceiling across every outbound factor
max_socket_connections = 100   # raw wasi-sockets specifically

[outbound_http]
max_connections = 200

[outbound_pg]
max_connections = 50

[outbound_redis]
max_connections = 50
```

The ordering is deliberate: a factor-specific permit is acquired first and the global one
second, so a factor with a long backlog never sits on a scarce global slot while it waits.
And if you set a per-factor cap above the global cap, Spin tells you at startup that the
global limit is what will actually bite.

If you're using `[outbound_http] max_concurrent_requests`, it still works but is now
**deprecated** in favor of `max_connections`. Watch out for one subtlety when you migrate:
`max_concurrent_requests = 0` used to permit one connection, whereas `max_connections = 0`
blocks all of them. Spin translates the old key for you and prints a warning, so nothing
changes until you're ready.

Related: waiting for a connection permit now counts against your connect timeout. It used to
be possible to wait indefinitely for a permit and *then* start a connection with a fresh
timeout budget, which made connect timeouts nearly meaningless under load.

Embedders get a few more knobs in the same spirit:

- **Hard request deadlines.** `InstanceReuseConfig::single_use_with_request_deadline` uses
  Wasmtime's epoch interruption to enforce a real wall-clock budget on guest execution. A
  plain request *timeout* lets the host stop waiting; a *deadline* actually interrupts a
  guest that's spinning in a loop.
- **MQTT payload caps** via `[outbound_mqtt] max_payload_size_bytes`.
- **SQLite `ATTACH`** is now off unless the host opts in with `allow_attach_file`.
- **Key-value concurrency limits**, gated by the same semaphore machinery.

## Sharper telemetry

Spin used to emit metrics by routing them through `tracing` events. It worked, but every
metric paid for span machinery and inherited the quirks of the bridge. In 4.1, metrics go
straight to the OpenTelemetry SDK. Embedders also get more say in how instruments are
registered, and can supply custom histogram bucket boundaries per metric.

The new connection semaphore takes advantage of that immediately, so you can see saturation
coming before it turns into an incident:

| Metric | Type |
| --- | --- |
| `outbound_connection_permits_acquired` | counter (labeled by factor, and whether it waited) |
| `outbound_connection_permits_rejected` | counter (labeled by which limit was hit) |
| `outbound_connection_permit_wait_duration_ms` | histogram |
| `outbound_connection_factor_utilization` | histogram, 0.0–1.0 |
| `outbound_connection_global_utilization` | histogram, 0.0–1.0 |

The utilization histograms ship with buckets at 0.25, 0.5, 0.75, 0.9, 0.95, and 0.99, because
OTel's defaults are tuned for millisecond durations and would squash every sample on a 0–1
scale into the bottom bucket. Spin also logs a warning the first time a semaphore starts
rejecting, so you get one clear signal instead of a wall of identical lines.

Elsewhere in observability: Spin now uses `opentelemetry-semantic-conventions` for attribute
names instead of hand-rolled strings, some high-cardinality span names have been generalized,
`http.response.body.size` is reported for WASIp3 responses, outbound HTTP span records
reliably land on the `send_request` span under WASIp3, and the OTLP HTTP exporter uses
`rustls` — thanks to [@TheRayquaza](https://github.com/TheRayquaza) for that one, their first
contribution to Spin.

If you've built dashboards against Spin's span attributes, this is the release to
double-check them.

## Target environments keep growing up

Spin 4.0 introduced `spin new -E <environment>` for targeting a specific deployment platform.
In 4.1 the idea gets a proper home.

There's a new command for seeing and refreshing what's available:

```console
$ spin targets list      # list known target environments
$ spin targets update    # refresh from the catalogue
```

Environment definitions now live in Git, in the
[`spinframework/spin-environments`](https://github.com/spinframework/spin-environments)
repository, with a local cache that refreshes on demand — so platform authors can publish an
environment without a registry round-trip, and you pick up changes automatically.

You can set a default so you don't have to type `-E` forever:

```console
$ export SPIN_NEW_DEFAULT_ENVIRONMENT=<environment>
```

And environments can now constrain more than just WIT worlds. An environment can declare
which key-value stores, SQLite databases, AI models, or outbound hosts it actually provides,
and `spin build` will tell you before you deploy:

> Component `api-server` can't run in environment `spin-up` because it requires the
> `my-database` key-value store which the environment does not support

That's a meaningful shift. Target environments started life answering "does your component's
WIT world fit?" and are moving toward "will this application actually work over there?"

A pile of smaller robustness fixes landed too: `spin build -c foo` only validates the
components you selected, `spin new -E` no longer hard-fails if a template update fails,
`spin add` respects existing `targets`, and the error you get when a target isn't satisfied
is much clearer. Shell completions (introduced in 4.0) now cover `-E` as well, so you can
tab-complete environment names.

## A heads-up on WAGI

Spin 4.1 begins printing a deprecation warning for WAGI components, and the WAGI examples
have been removed from the repository. Nothing is broken yet, but WAGI is a
pre-component-model compatibility shim and we'd like to retire it. If you're still running
WAGI components, now's a good time to plan a move to a proper Wasm component.

A couple of other things went away in this release: some obsolete experimental CLI flags that
guarded features which have long since shipped, and the old validation that an application
could only use a single trigger type, which predated proper multi-trigger support.

## Upgrading to Spin 4.1

1. Install Spin 4.1 from [spinframework.dev/install](https://spinframework.dev/install) or
   grab a binary from the
   [release page](https://github.com/spinframework/spin/releases/tag/v4.1.0).
2. Update your templates:
   ```console
   spin templates install --git https://github.com/spinframework/spin --update
   ```
3. That's mostly it. Applications built for Spin 4.0 — including WASIp3 components built
   against the March release candidate — run on 4.1 unchanged.

If you're operating Spin, two things are worth a look:

- Replace `[outbound_http] max_concurrent_requests` with `max_connections`, remembering that
  `0` now means *no connections* rather than *one*.
- Re-check any dashboards or alerts built on Spin's OpenTelemetry attribute names, which now
  follow the OTel semantic conventions.

And if you want to try middleware, the fastest path is the example in the repo:

```console
$ git clone https://github.com/spinframework/spin
$ cd spin/examples/http-middleware
$ spin build --up
```

## Thank you

Spin 4.1 is the work of contributors across a lot of organizations — to Spin itself, to
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
