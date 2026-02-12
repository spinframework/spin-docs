title = "Announcing Spin v3.6"
date = "2026-02-11T17:45:05.449167Z"
template = "blog_post"
description = "Announcing the release of Spin v3.6: Onward to WASIp3 stabilization and experimental WASI-OTel!"
tags = []

[extra]
type = "post"
author = "The Spin Project"

---

Earlier this week, the CNCF Spin project released [Spin v3.6.0](https://github.com/spinframework/spin/releases/tag/v3.6.0) which includes support for a new release candidate of the upcoming WASI Preview 3 (WASIp3) release, component instance reuse, and experimental support for the [WASI OTel (OpenTelemetry)](https://github.com/webAssembly/wasi-otel) proposal!

## WASI Preview 3 January Release Candidate

Spin 3.6 replaces the WASIp3 release candidate used in 3.5 with the newer January RC. As in Spin 3.5, this remains experimental, and we do not expect to support it in the next release of Spin. WASIp3 Rust SDK users **must** update from 5.1 to 5.2. (But if you're not using WASIp3 then you **don't** need to update.)

The main user-facing change in the January RC is that it now distinguishes two uses of HTTP: the case of components passing requests along a composition chain, and the case of components making requests to network services. This means components participating in middleware chains can interoperate according to the P3 specification, instead of ad hoc - that is, middleware components from different authors will mix and match with no additional configuration. This doesn't affect application developers, though - you still use your language or SDK HTTP API. But we're working on a middleware feature to let developers take advantage of it - stay tuned!

## WASIp3 Component Instance Reuse

A defining capability of WASIp3 is support for asynchronous component exports. Components can expose async functions that suspend and resume around I/O. And, critically for this, multiple calls may execute concurrently within the same component instance.

This leads to a fundamental shift in how WASI components execute. In WASIp2, component instances were effectively single-use. Runtimes assigned each request a fresh instance, which simplified correctness but imposed real costs: higher memory pressure, no amortisation of startup overhead, and tighter coupling between throughput and instance count. WASIp3 changes that contract. By making asynchronous exports and safe concurrency a first-class concern, the model allows a single component instance to serve many in-flight operations. Runtimes like Spin can therefore move from "one instance per request" toward managed concurrency within a bounded instance pool.

By default, Spin 3.6 reuses WASIp3 component instances both concurrently and serially, allowing multiple in-flight requests to share a single instance, and allowing an instance which is no longer in use to be reused for newly arriving requests.

For platform operators, this means:
* Higher request density per node without linear growth in memory usage
* More predictable performance under bursty or spiky workloads
* Lower cold-start amplification, since fewer instances need to be created and torn down

It does, though, mean application developers need to alter some assumptions about instance lifecycles. Fortunately, these changes line up well with practices you're familiar with from other runtimes such as Axum or Express. If you're using 'global' (that is, instance-scoped) state as part of your request state, you'll need to address that. If you do truly need instace-level state, you must think about how to manage or protect that in the face of concurrent in-flight requests: long-lived state should be a deliberate design choice, not an accidental artifact.

Instance reuse is enabled by default for WASIp3 components, but remains experimental while WASIp3 continues toward formal stabilization. We expect these semantics to solidify alongside the WASI standard itself.

## WASI OTel (OpenTelemetry)

[WASI OTel](https://github.com/WebAssembly/wasi-otel) is a Phase 1 [WASI proposal](https://github.com/WebAssembly/WASI/blob/main/docs/Proposals.md) that defines WIT interfaces for emitting OpenTelemetry signals — traces, metrics, and logs — from within WebAssembly components. Spin 3.6 ships with experimental support for WASI OTel.

We're excited about this because observability is a big pain point in the WebAssembly ecosystem and WASI OTel is a step towards solving the problem. It unlocks first-class observability for Spin appications that tightly integrates with the host observability.

> Because this is still an in-progress proposal, the underlying WIT interfaces may change in future releases. That said, we think it's ready enough to start building with today. Try it out and let the WASI OTel team [know how it goes](https://github.com/WebAssembly/wasi-otel/issues)!

### Tracing a Rust Spin App

The [`opentelemetry-wasi`](https://github.com/calebschoepp/opentelemetry-wasi) crate provides a WASI backend for the standard OpenTelemetry [Rust SDK](https://docs.rs/opentelemetry/latest/opentelemetry/). It's what allows you to use OpenTelemetry within your WebAssembly component.

> The plan is to move this crate under the Bytecode Alliance, but for now you can pull it from its current home.

Let's build a minimal Rust Spin appplication to demo the tracing capabilities. The application will use the idiomatic [`tracing`](https://docs.rs/tracing/latest/tracing/) crate backed by OpenTelemetry. First scaffold a new application:

```bash
spin new wasi-otel-demo -t http-rust --accept-defaults
```

Add the following to the `[dependencies]` section in your `Cargo.toml`:

```toml
[dependencies]
...
opentelemetry = "0.29"
opentelemetry_sdk = "0.29"
opentelemetry-wasi = { git = "https://github.com/calebschoepp/opentelemetry-wasi" }
tracing = "0.1"
tracing-opentelemetry = "0.30"
tracing-subscriber = "0.3"
```

Then in `src/lib.rs`:

**1. Make a bunch of OTel types available in the `use` section.**

```rust
use opentelemetry::{trace::TracerProvider as _, Context};
use opentelemetry_sdk::trace::SdkTracerProvider;
use opentelemetry_wasi::{TraceContextPropagator, WasiPropagator, WasiSpanProcessor};
use spin_sdk::{
    http::{IntoResponse, Request, Response},
    http_component,
    key_value::Store,
};
use tracing::instrument;
use tracing_subscriber::{layer::SubscriberExt, registry, util::SubscriberInitExt};
```

The key pieces here are:

- **`WasiSpanProcessor`** — a `SpanProcessor` that forwards span start/end events to the host via WASI OTel WIT calls instead of exporting them over the network from the guest.
- **`TraceContextPropagator`** — extracts the host's span context so your component's spans are properly parented under the Spin-level request span.

**2. Set up the OTel context and environment.**

```rust
#[http_component]
fn handle_request(_req: Request) -> anyhow::Result<impl IntoResponse> {
    // Set up a tracer backed by the WASI span processor
    let wasi_processor = WasiSpanProcessor::new();
    let provider = SdkTracerProvider::builder()
        .with_span_processor(wasi_processor)
        .build();
    let tracer = provider.tracer("tracing-spin");

    // Bridge the tracing crate to OpenTelemetry
    let tracing_layer = tracing_opentelemetry::layer().with_tracer(tracer);
    registry().with(tracing_layer).try_init().unwrap();

    // Propagate the trace context from the Spin host so your
    // spans appear as children of the Spin-level request span
    let wasi_propagator = TraceContextPropagator::new();
    let _guard = wasi_propagator.extract(&Context::current()).attach();

    main_operation(); // see below

    Ok(Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body("Hello, Spin!")
        .build())
}
```

**3. You can now use the standard `tracing` instrumentation in your functions.** Each function annotated with `#[instrument]` becomes an OTel span, and macros such as `tracing::info!` become span events. Notice that no WASI-specific APIs leak into your application code!

```rust
#[instrument(fields(my_attribute = "my-value"))]
fn main_operation() {
    tracing::info!(name: "Main span event", foo = "1");
    child_operation();
}

#[instrument()]
fn child_operation() {
    tracing::info!(name: "Sub span event", bar = 1);
    let store = Store::open_default().unwrap();
    store.set("foo", "bar".as_bytes()).unwrap();
}
```

**4. Your instrumented application is ready to build and run!**

Make sure to add the following to your `spin.toml` to allow key value access:

```toml
key_value_stores = ["default"]
```

Then, run the application with Spin's built-in OTel tooling:

```bash
# Install the `otel` plugin
spin plugin update
spin plugin install otel

# Start the OpenTelemetry collector in the background
spin otel setup

# Run Spin wired up to the OTel collector
spin otel up -- --build --experimental-wasi-otel

# In another terminal
curl localhost:3000
```

Then open Jaeger (`spin otel open jaeger`) to view your traces.

![A screenshot of the traces](/static/image/wasi-otel-jaeger-trace.png)

> The `opentelemetry-wasi` crate also provides `WasiMetricExporter` and `WasiLogProcessor` for metrics and logs respectively. See the [`spin-basic` example](https://github.com/calebschoepp/opentelemetry-wasi/tree/main/rust/examples/spin-basic) for a complete demonstration of all three signals.

## Thank You

Thank you to all contributors for helping bring this release together. Thank you to our growing community and to the CNCF for their support and to the Bytecode Alliance for making such great strides on WASI.

## Stay In Touch
Please join us for weekly [project meetings](https://github.com/spinframework/spin#getting-involved-and-contributing), chat in the [Spin CNCF Slack channel](https://cloud-native.slack.com/archives/C089NJ9G1V0) and follow on X (formerly Twitter) [@spinframework](https://twitter.com/spinframework)!

To get started with Spin and explore the latest features, follow the [Spin quickstart](https://spinframework.dev/v3/quickstart) which provides step-by-step instructions for installing Spin, creating your first application, and running it locally. Also head over to the [Spin Hub](https://spinframework.dev/hub) for inspiration on what you can build!