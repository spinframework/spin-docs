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

## Component Instance Reuse

A defining capability of WASIp3 is support for asynchronous component exports. Components can expose async functions that suspend and resume around I/O and, critically, multiple calls may execute concurrently within the same component instance.

Because safe, concurrent instance reuse is a first-class design goal of WASIp3, Spin 3.6 introduces component instance reuse for WASIp3 components. By default, Spin will reuse p3 component instances both concurrently and serially, allowing multiple in-flight requests to share a single instance.

In practice, this translates to higher throughput and lower memory usage, since fewer component instances are required to sustain a given request volume. This behavior is intentionally limited to WASIp3: Spin does not reuse WASIp2 instances by default, as those components were not necessarily written with reentrancy or concurrent execution in mind.

Spin 3.6 ships with conservative defaults for tweaking the behavior of instance reuse:
* Up to 16 concurrent calls per instance
* Up to 128 total calls before an instance is retired
* Idle instances retained for up to one second

> NOTE: Once an instance reaches its total call limits, the instance will be disposed. These bounds provide reuse benefits while limiting long-lived state accumulation.

All reuse parameters can be tune, or disabled entirely, via `spin up` command-line options. Each option also supports specifying a range of values, in which case Spin will pseudo-randomly select parameters at runtime. This makes it straightforward to stress-test components under varying concurrency and lifecycle conditions without rebuilding or redeploying.

Instance reuse is enabled by default for WASIp3 components, but remains experimental while WASIp3 continues toward formal stabilization. We expect these semantics to solidify alongside the WASI standard itself.

### Why This Matters

Component instance reuse is more than a performance optimization, it reflects a fundamental shift in how WASIp3 components are intended to execute.

In earlier WASI models, including WASIp2, component instances were effectively single-use. Runtimes had to assume that each request required a fresh instance, which simplified correctness but imposed real costs: higher memory pressure, increased startup overhead, and tighter coupling between throughput and instance count.

WASIp3 changes that contract. By making asynchronous exports and safe concurrency a first-class concern, the model allows a single component instance to serve many in-flight operations. This enables runtimes like Spin to move from "one instance per request" toward managed concurrency within a bounded instance pool.

For platform operators, this means:
* Higher request density per node without linear growth in memory usage
* More predictable performance under bursty or spiky workloads
* Lower cold-start amplification, since fewer instances need to be created and torn down

For component authors, it establishes a clear execution model:
* Components should assume reentrancy and concurrent execution
* Instance-local state must be explicitly managed or protected
* Long-lived state becomes a deliberate design choice, not an accidental artifact

Most importantly, instance reuse aligns Spin's execution model with where the WASI ecosystem is heading. As WASIp3 stabilizes, reuse becomes the baseline expectation rather than a runtime-specific optimization. Spin 3.6 is an early step in that direction, giving developers and operators a concrete way to evaluate those semantics today.

## WASI OTel (OpenTelemtry)

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

```rust
use opentelemetry::{trace::TracerProvider as _, Context};
use opentelemetry_sdk::trace::SdkTracerProvider;
use opentelemetry_wasi::WasiPropagator;
use spin_sdk::{
    http::{IntoResponse, Request, Response},
    http_component,
    key_value::Store,
};
use tracing::instrument;
use tracing_subscriber::{layer::SubscriberExt, registry, util::SubscriberInitExt};

#[http_component]
fn handle_request(_req: Request) -> anyhow::Result<impl IntoResponse> {
    // Set up a tracer backed by the WASI span processor
    let wasi_processor = opentelemetry_wasi::WasiSpanProcessor::new();
    let provider = SdkTracerProvider::builder()
        .with_span_processor(wasi_processor)
        .build();
    let tracer = provider.tracer("tracing-spin");

    // Bridge the tracing crate to OpenTelemetry
    let tracing_layer = tracing_opentelemetry::layer().with_tracer(tracer);
    registry().with(tracing_layer).try_init().unwrap();

    // Propagate the trace context from the Spin host so your
    // spans appear as children of the Spin-level request span
    let wasi_propagator = opentelemetry_wasi::TraceContextPropagator::new();
    let _guard = wasi_propagator.extract(&Context::current()).attach();

    main_operation();

    Ok(Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body("Hello, Spin!")
        .build())
}

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

Make sure to add the following to your `spin.toml` to allow key value access:

```toml
key_value_stores = ["default"]
```

The key pieces are:

- **`WasiSpanProcessor`** — a `SpanProcessor` that forwards span start/end events to the host via WASI OTel WIT calls instead of exporting them over the network from the guest.
- **`TraceContextPropagator`** — extracts the host's span context so your component's spans are properly parented under the Spin-level request span.
- **`#[instrument]`** — standard `tracing` instrumentation. Each annotated function becomes a span, and `tracing::info!` calls become span events. No WASI-specific APIs leak into your application code.

To run it with Spin's built-in OTel tooling:

```bash
# Install the otel plugin
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