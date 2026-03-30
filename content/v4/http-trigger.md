title = "The Spin HTTP Trigger"
template = "main"
date = "2023-11-04T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v4/http-trigger.md"

---
- [Specifying an HTTP Trigger](#specifying-an-http-trigger)
- [HTTP Trigger Routes](#http-trigger-routes)
  - [Resolving Overlapping Routes](#resolving-overlapping-routes)
  - [Private Endpoints](#private-endpoints)
  - [Reserved Routes](#reserved-routes)
- [Authoring HTTP Components](#authoring-http-components)
  - [The Request Handler](#the-request-handler)
  - [Getting Request and Response Information](#getting-request-and-response-information)
  - [Additional Request Information](#additional-request-information)
  - [Inside HTTP Components](#inside-http-components)
- [Static Responses with the HTTP Trigger](#static-responses-with-the-http-trigger)
- [HTTP With Wagi (WebAssembly Gateway Interface)](#http-with-wagi-webassembly-gateway-interface)
  - [Wagi Component Requirements](#wagi-component-requirements)
  - [Request Handling in Wagi](#request-handling-in-wagi)
  - [Wagi HTTP Environment Variables](#wagi-http-environment-variables)
- [Exposing HTTP Triggers Using HTTPS](#exposing-http-triggers-using-https)
  - [Trigger Options](#trigger-options)
  - [Environment Variables](#environment-variables)
- [Controlling Instance Reuse](#controlling-instance-reuse)
  - [Developer Guidelines for Instance Reuse](#developer-guidelines-for-instance-reuse)
  - [Preventing Instance Reuse](#preventing-instance-reuse)

HTTP applications are an important workload in event-driven environments,
and Spin has built-in support for creating and running HTTP
components. This page covers Spin options that are specific to HTTP.

The HTTP trigger type in Spin is a web server. When an application has HTTP triggers, Spin listens for incoming requests and,
based on the [application manifest](./writing-apps.md), it routes them to a
component, which provides an HTTP response.

## Specifying an HTTP Trigger

An HTTP trigger maps an HTTP route to a component.  For example:

```toml
[[trigger.http]]
route = "/..."                # the route that the trigger matches
component = "my-application"  # the name of the component to handle this route
```

Such a trigger says that HTTP requests matching the specified _route_ should be handled by the specified _component_. The `component` field works the same way across all triggers - see [Triggers](triggers) for the details.

## HTTP Trigger Routes

An HTTP route may be _exact_ or _wildcard_.

An _exact_ route matches only the given route.  This is the default behavior.  For example, `/cart` matches only `/cart`, and not `/cart/checkout`:

<!-- @nocpy -->

```toml
# Run the `shopping-cart` component when the application receives a request to `/cart`...
[[trigger.http]]
route = "/cart"
component = "shopping-cart"

# ...and the `checkout` component for `/cart/checkout`
[[trigger.http]]
route = "/cart/checkout"
component = "checkout"
```

You can use wildcards to match 'patterns' of routes. Spin supports two kinds of wildcards: single-segment wildcards and trailing wildcards.

A single-segment wildcard uses the syntax `:name`, where `name` is a name that identifies the wildcard. Such a wildcard will match only a single segment of a path, and allows further matching on segments beyond it. For example, `/users/:userid/edit` matches `/users/1/edit` and `/users/alice/edit`, but does not match `/users`, `/users/1`, or `/users/1/edit/cart`.

A trailing wildcard uses the syntax `/...` and matches the given route and any route under it.  For example, `/users/...` matches `/users`, `/users/1`, `/users/1/edit`, and so on. Any of these routes will run the mapped component.

> In particular, the route `/...` matches all routes.

> Browser clients often `GET /favicon.ico` after a page request. If you use the `/...` route, consider handling this case in your code!

<!-- @nocpy -->

```toml
[[trigger.http]]
# Run the `user-manager` component when the application receives a request to `/users`
# or any path beginning with `/users/`
route = "/users/..."
component = "user-manager"
```

### Resolving Overlapping Routes

If multiple triggers could potentially handle the same request based on their
defined routes, the trigger whose route has the longest matching prefix 
takes precedence.  This also means that exact matches take precedence over wildcard matches.

In the following example, requests starting with the  `/users/` prefix (e.g. `/users/1`)
will be handled by `user-manager`, even though it is also matched by the `shop` route, because the `/users` prefix is longer than `/`.
But requests to `/users/admin` will be handled by the `admin` component, not `user-manager`, because that is a more exact match still:

<!-- @nocpy -->

```toml
# spin.toml

[[trigger.http]]
route = "/users/..."
component = "user-manager"

[[trigger.http]]
route = "/users/admin"
component = "admin"

[[trigger.http]]
route = "/..."
component = "shop"
```

### Private Endpoints

Private endpoints are where an internal microservice is not exposed to the network (does not have an HTTP route) and so is accessible only from within the application.

<!-- @nocpy -->

```toml
[[trigger.http]]
route = { private = true }
component = "internal"
```

To access a private endpoint, use [local service chaining](./http-outbound#local-service-chaining) (where the request is passed in memory without ever leaving the Spin host process). Such calls still require the internal endpoint to be included in `allowed_outbound_hosts`.

### Reserved Routes

Every HTTP application automatically has a special route always configured at `/.well-known/spin/...`.  This route takes priority over any routes in the application: that is, the Spin runtime handles requests to this route, and the application never sees such requests.

You can use paths within this route for health and status checking. The following are currently defined:

* `/.well-known/spin/health`: returns 200 OK if Spin is healthy and accepting requests
* `/.well-known/spin/info`: returns information about the application and deployment

Other paths within the reserved space currently return 404 Not Found.

## Authoring HTTP Components

> Spin has two ways of running HTTP components, depending on language support for the evolving WebAssembly component standards.  This section describes the default way, which is currently used by Rust, JavaScript/TypeScript, Python, and TinyGo components.  For other languages, see [HTTP Components with Wagi](#http-with-wagi-webassembly-gateway-interface) below.

By default, Spin runs components using the [WebAssembly component model](https://component-model.bytecodealliance.org/).  In this model, the Wasm module exports a well-known interface that Spin calls to handle the HTTP request.

### The Request Handler

The exact signature of the HTTP handler, and how a function is identified to be exported as the handler, will depend on your language.

{{ tabs "sdk-type" }}

{{ startTab "Rust"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://docs.rs/spin-sdk/latest/spin_sdk/http/index.html)

In Rust, the handler is identified by the [`#[spin_sdk::http_service]`](https://docs.rs/spin-sdk/latest/spin_sdk/attr.http_service.html) attribute.  The handler function is an async function which receives the request as an argument, and returns the response as the return value of the function. For example:

```rust
#[http_service]
async fn handle(request: http::Request) -> anyhow::Result<http::Response> { ... }
```

You have some flexibility in choosing the types of the request and response.  The request may be:

* [`http::Request`](https://docs.rs/http/latest/http/request/struct.Request.html)
* [`spin_sdk::http::Request`](https://docs.rs/spin-sdk/latest/spin_sdk/http/struct.Request.html)
* Any type which implements the [`spin_sdk::http::FromRequest`](https://docs.rs/spin-sdk/latest/spin_sdk/http/trait.FromRequest.html) trait

The response may be:

* [`http::Response`](https://docs.rs/http/latest/http/response/struct.Response.html) - typically constructed via `Response::builder()`
* [`spin_sdk::http::Response`](https://docs.rs/spin-sdk/latest/spin_sdk/http/struct.Response.html) - typically constructed via a [`ResponseBuilder`](https://docs.rs/spin-sdk/latest/spin_sdk/http/struct.ResponseBuilder.html)
* Any type which implements the [`spin_sdk::http::IntoResponse`](https://docs.rs/spin-sdk/latest/spin_sdk/http/trait.IntoResponse.html) trait
* A `Result` where the success type is one of the above and the error type is `anyhow::Error` or another error type for which you have implemented `spin_sdk::http::IntoResponse` (such as `anyhow::Result<http::Response>`)

> The HTTP template generates a return type of `anyhow::Result<impl IntoResponse>`, so you don't need to tweak it if you change the concrete type of the response.

For example:

```rust
use http::{Request, Response};
use spin_sdk::http::IntoResponse;
use spin_sdk::http_service;

#[http_service]
async fn handle_hello_rust(_req: Request<()>) -> anyhow::Result<impl IntoResponse> {
    Ok(Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body("Hello, Spin".to_string())?)
}
```

For a full Rust SDK reference, see the [Rust Spin SDK documentation](https://docs.rs/spin-sdk/latest/spin_sdk/index.html).

{{ blockEnd }}

{{ startTab "TypeScript"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://spinframework.github.io/spin-js-sdk/)

Building a Spin HTTP component with the JavaScript/TypeScript SDK now involves adding an event listener for the `fetch` event. This event listener handles incoming HTTP requests and allows you to construct and return HTTP responses.

Below is a complete implementation for such a component in TypeScript:

```ts
import { AutoRouter } from 'itty-router';

let router = AutoRouter();

router
    .get("/", () => new Response("hello universe"))
    .get('/hello/:name', ({ name }) => `Hello, ${name}!`)

//@ts-ignore
addEventListener('fetch', async (event: FetchEvent) => {
    event.respondWith(router.fetch(event.request));
});
```

{{ blockEnd }}

{{ startTab "Python"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://spinframework.github.io/spin-python-sdk/v3/)

In Python, the application must define a top-level class named IncomingHandler which inherits from [IncomingHandler](https://spinframework.github.io/spin-python-sdk/v3/http/index.html#spin_sdk.http.IncomingHandler), overriding the `handle_request` method.

```python
from spin_sdk import http
from spin_sdk.http import Request, Response

class IncomingHandler(http.IncomingHandler):
      def handle_request(self, request: Request) -> Response:
        return Response(
            200,
            {"content-type": "text/plain"},
            bytes("Hello from Python!", "utf-8")
        )
```

{{ blockEnd }}

{{ startTab "TinyGo"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://pkg.go.dev/github.com/spinframework/spin-go-sdk/v2@v2.2.1/http)

In Go, you register the handler as a callback in your program's `init` function.  Set `handler.Exports.Handle` to your handler function.  Your handler takes a `*Request` pointer, and returns a `Result[Response, ErrorCode]` with the response.

```go
package main

import (
    "fmt"
    "net/http"

    handler "github.com/spinframework/spin-go-sdk/v3/exports/wasi_http_service_0_3_0_rc_2026_03_15/export_wasi_http_0_3_0_rc_2026_03_15_handler"
    _ "github.com/spinframework/spin-go-sdk/v3/exports/wasi_http_service_0_3_0_rc_2026_03_15/wit_exports"
    client "github.com/spinframework/spin-go-sdk/v3/imports/wasi_http_0_3_0_rc_2026_03_15_client"
    . "github.com/spinframework/spin-go-sdk/v3/imports/wasi_http_0_3_0_rc_2026_03_15_types"
    . "go.bytecodealliance.org/pkg/wit/types")

func Handle(request *Request) Result[*Response, ErrorCode] {
    tx, rx := MakeStreamU8()

    go func() {
        defer tx.Drop()
        tx.WriteAll([]uint8("hello, world!"))
    }()

    response, send := ResponseNew(
        FieldsFromList([]Tuple2[string, []uint8]{
            Tuple2[string, []uint8]{"content-type", []uint8("text/plain")},
        }).Ok(),
        Some(rx),
        trailersFuture(),
    )
    send.Drop()

    return Ok[*Response, ErrorCode](response)
}

// Helper function
func trailersFuture() *FutureReader[Result[Option[*Fields], ErrorCode]] {
    tx, rx := MakeFutureResultOptionFieldsErrorCode()
    go tx.Write(Ok[Option[*Fields], ErrorCode](None[*Fields]()))
    return rx
}

func init() {
    handler.Exports.Handle = Handle
}

func main() {}
```

{{ blockEnd }}

{{ blockEnd }}

### Getting Request and Response Information

Exactly how the Spin SDK surfaces the request and response types varies from language to language; this section calls out general features.

* In the request record, the URL contains the path and query, but not the scheme and host.  For example, in a request to `https://example.com/shop/users/1/cart/items/3/edit?theme=pink`, the URL contains `/shop/users/1/cart/items/3/edit?theme=pink`.  If you need the full URL, you can get it from the `spin-full-url` header - see the table below.

### Additional Request Information

As well as any headers passed by the client, Spin sets several headers on the request passed to your component, which you can use to access additional information about the HTTP request.

> In the following table, the examples suppose that:
> * Spin is listening on `example.com:8080`
> * The trigger `route` is `/users/:userid/cart/...`
> * The request is to `https://example.com:8080/users/1/cart/items/3/edit?theme=pink`

| Header Name                  | Value                | Example |
|------------------------------|----------------------|---------|
| `spin-full-url`              | The full URL of the request. This includes full host and scheme information. | `https://example.com:8080/users/1/cart/items/3/edit?theme=pink` |
| `spin-path-info`             | The request path relative to the component route | `/items/3/edit` |
| `spin-path-match-n`          | Where `n` is the pattern for our single-segment wildcard value (e.g. `spin-path-match-userid` will access the value in the URL that represents `:userid`)  | `1` |
| `spin-matched-route`         | The part of the trigger route that was matched by the route (including the wildcard indicator if present) | `/users/:userid/cart/...` |
| `spin-raw-component-route`   | The component route pattern matched, including the wildcard indicator if present | `/users/:userid/cart/...` |
| `spin-component-route`       | The component route pattern matched, _excluding_ any wildcard indicator | `/users/:userid/cart` |
| `spin-client-addr`           | The IP address and port of the client. Some Spin runtimes do not set this header. | `127.0.0.1:53152` |

### Inside HTTP Components

For the most part, you'll build HTTP component modules using a language SDK (see the Language Guides section), such as a JavaScript module or a Rust crate.  If you're interested in what happens inside the SDK, or want to implement HTTP components in another language, read on!

The HTTP component interface is defined using a WebAssembly Interface (WIT) file.  ([Learn more about the WIT language here.](https://component-model.bytecodealliance.org/design/wit.html)).  You can find the latest WITs for Spin HTTP components at [https://github.com/spinframework/spin/tree/main/wit](https://github.com/spinframework/spin/tree/main/wit).

The HTTP types and interfaces are defined in [https://github.com/spinframework/spin/tree/main/wit/deps/http@0.3.0-rc-2026-03-15](https://github.com/spinframework/spin/tree/main/wit/deps/http@0.3.0-rc-2026-03-15), which tracks [the `wasi-http` specification](https://github.com/WebAssembly/wasi-http).

In particular, the entry point for Spin HTTP components is defined in [the `handler` interface](https://github.com/spinframework/spin/blob/main/wit/deps/http@0.3.0-rc-2026-03-15/worlds.wit):

<!-- @nocpy -->

```fsharp
// handler.wit

interface handler {
  use types.{request, response, error-code};

  /// This function may be called with either an incoming request read from the
  /// network or a request synthesized or forwarded by another component.
  handle: async func(
    request: request,
  ) -> result<response, error-code>;
}
```

This is the interface that all HTTP components must implement, and which is used by the Spin HTTP executor when instantiating and invoking the component.

However, this is not necessarily the interface you, the component author, work with. In many cases, you will use a more idiomatic wrapper provided by the Spin SDK, which implements the "true" interface internally.

But if you wish, and if your language supports it, you can implement the `incoming-handler` interface directly, using tools such as the
[Bytecode Alliance `wit-bindgen` project](https://github.com/bytecodealliance/wit-bindgen). Spin will happily load and run such a component. This is exactly how Spin SDKs, such as the [Rust](rust-components) SDK, are built; as component authoring tools roll out for Go, JavaScript, Python, and other languages, you'll be able to use those tools to build `wasi-http` handlers and therefore Spin HTTP components.

## Static Responses with the HTTP Trigger

You can write short, static responses within the HTTP trigger by setting `static_response` (instead of `component`):

```toml
# Example use case: fallback 404 handling
[[trigger.http]]
route = "/..."
static_response = { status_code = 404, body = "not found" }

# Example use case: redirect
[[trigger.http]]
route = "/bob"
static_response = { status_code = 302, headers = { location = "/users/bob" } }
```

Static responses may have only text or empty bodies.

## HTTP With Wagi (WebAssembly Gateway Interface)

A number of languages support WASI Preview 1 but not the component model. To enable developers to use these languages, Spin supports an
HTTP executor based on [Wagi](https://github.com/deislabs/wagi), or the
WebAssembly Gateway Interface, a project that implements the
[Common Gateway Interface](https://datatracker.ietf.org/doc/html/rfc3875)
specification for WebAssembly.

Wagi allows a module built in any programming language that compiles to [WASI](https://wasi.dev/)
to handle an HTTP request by passing the HTTP request information to the module's
standard input, environment variables, and arguments, and expecting the HTTP
responses through the module's standard output.
This means that if a language has support for the WebAssembly System Interface,
it can be used to build Spin HTTP components.
The Wagi model is only used to parse the HTTP request and response. Everything
else — defining the application, running it, or [distributing](./distributing-apps.md)
is done the same way as a component that uses the Spin executor.

### Wagi Component Requirements

Spin uses the component model by default, and cannot detect from the Wasm module alone whether it was built with component model support.  For Wagi components, therefore, you must tell Spin in the component manifest to run them using Wagi instead of 'default' Spin.  To do this, use the `executor` field in the `trigger` table:

```toml
[[trigger.http]]
route = "/"
component = "wagi-test"
executor = { type = "wagi" }
```

> If, for whatever reason, you want to highlight that a component uses the default Spin execution model, you can write `executor = { type = "spin" }`.  But this is the default and is rarely written out.

Wagi supports non-default entry points, and allows you to pass an arguments string that a program can receive as if it had been passed on the command line. If you need these you can specify them in the `executor` table. For details, see the [Manifest Reference](manifest-reference#the-componenttrigger-table-for-http-applications).

### Request Handling in Wagi

Building a Wagi component in a particular programming language that can compile
to `wasm32-wasip2` does not require any special libraries — instead,
[building Wagi components](https://github.com/deislabs/wagi/tree/main/docs) can
be done by reading the HTTP request from the standard input and environment
variables, and sending the HTTP response to the module's standard output.

In pseudo-code, this is the minimum required in a Wagi component:

- either the `content-media` or `location` headers must be set — this is done by
printing its value to standard output
- an empty line between the headers and the body
- the response body printed to standard output:

<!-- @nocpy -->

```text
print("content-type: text/html; charset=UTF-8\n\n");
print("hello world\n");
```

Here is a working example, written in [Grain](https://grain-lang.org/),
a programming language that natively targets WebAssembly and WASI but
does not yet support the component model:

```js
import Process from "sys/process";
import Array from "array";

print("content-type: text/plain\n");

// This will print all the Wagi env variables
print("==== Environment: ====");
Array.forEach(print, Process.env());

// This will print the route path followed by each query
// param. So /foo?bar=baz will be ["/foo", "bar=baz"].
print("==== Args: ====");
Array.forEach(print, Process.argv());
```

> You can find examples on how to build Wagi applications in
> [the DeisLabs GitHub organization](https://github.com/deislabs?q=wagi&type=public&language=&sort=).

### Wagi HTTP Environment Variables

Wagi passes request metadata to the program through well-known environment variables. The key path-related request variables are:

- `X_FULL_URL` - the full URL of the request —
  `http://localhost:3000/hello/abc/def?foo=bar`
- `PATH_INFO` - the path info, relative to the
  component route — in our example, where the the
  component route is `/hello`, this is `/abc/def`.
- `X_MATCHED_ROUTE` - the route pattern matched (including the
  wildcard pattern, if applicable) — in our case `"/hello/..."`.
- `X_RAW_COMPONENT_ROUTE` - the route pattern matched (including the wildcard
  pattern, if applicable) — in our case `/hello/...`.
- `X_COMPONENT_ROUTE` - the route path matched (stripped of the wildcard
  pattern) — in our case `/hello`

For details, and for a full list of all Wagi environment variables, see
[the Wagi documentation](https://github.com/deislabs/wagi/blob/main/docs/environment_variables.md).

## Exposing HTTP Triggers Using HTTPS

When exposing HTTP triggers using HTTPS you must provide `spin up` with a TLS certificate and a private key. This can be achieved by either using trigger options (`--tls-cert` and `--tls-key`) when running the `spin up` command, or by setting environment variables (`SPIN_TLS_CERT` and `SPIN_TLS_KEY`) before running the `spin up` command.

### Trigger Options

The `spin up` command accepts some HTTP-trigger-specific options:

The `--listen` option sets the local IP and port that `spin up` should listen to for requests. By default, it listens to `localhost:3000`.

The `--tls-cert` and `--tls-key` options provide a way for you to configure a TLS certificate. If they are not set, plaintext HTTP will be used. The `--tls-cert` option specifies the path to the TLS certificate to use for HTTPS. The certificate should be in PEM format. The `--tls-key` option specifies the path to the private key to use for HTTPS. The key should be in PKCS#8 format.

### Environment Variables

The `spin up` command can also automatically use the `SPIN_TLS_CERT` and `SPIN_TLS_KEY` environment variables instead of the respective flags (`--tls-cert` and `--tls-key`):

<!-- @nocpy -->

```bash
SPIN_TLS_CERT=<path/to/cert>
SPIN_TLS_KEY=<path/to/key>
```

Once set, `spin up` will automatically use these explicitly set environment variables. For example, if using a Linux-based system, you can go ahead and use the `export` command to set the variables in your session (before you run the `spin up` command):

<!-- @nocpy -->

```bash
export SPIN_TLS_CERT=<path/to/cert>
export SPIN_TLS_KEY=<path/to/key>
```

## Controlling Instance Reuse

Instance reuse is when Spin handles more than one HTTP request within a single component instance. Instance reuse improves performance and density, because Spin does not need to create a new instance for every request. Spin can reuse instances both consecutively and concurrently - that is, it can assign a new request to either a freshly created instance, an instance that has finished handling a request, or an instance that is _in the middle of_ handling another request.

The exact details depend on your component.

A WASI P2 HTTP component is _not_ subject to instance reuse. This includes all triggers other than HTTP.

A WASI P3 HTTP component is _always_ subject to instance reuse, unless it calls specific APIs to prevent concurrent use. You can control instance reuse behaviour using the following `spin up` flags:

* `--max-instance-reuse-count` sets the maximum number of times a single instance can be reused
* `--max-instance-concurrent-reuse-count` sets the maximum number of requests that can be running in a single instance at the same time
* `--idle-instance-timeout` controls how long Spin will allow a reusable instance to be sit idle before evicting it

All of these flags accept ranges. When you provide a range, Spin assigns each new instance a random value from that range. This is to help you test that your component works correctly both when fresh (e.g. you do not rely on long-running state) and when reused (e.g. you are not unintentionally leaking data from one request to another).

### Developer Guidelines for Instance Reuse

When writing WASI P3 HTTP components, you can take advantage of reuse in your code, by placing static data in static or global variables, which will become part of the instance state. For example, if your component contains a routing table, you could cache the parsed table in a static variable - you would then parse the table only if the cache had not been initialised (i.e. in a fresh instance), avoiding the overhead of parsing on every request.

> Don't rely on techniques like this for expensive operations. Spin doesn't guarantee the degree of instance reuse, and reuse may vary across differnt Spin hosts.

Conversely, take care that request data is not stored in static or global variables. If you're used to the WASI P2 model, you may have an implicit expectation that each request finds your component in an entirely fresh state. In WASI P3, that's no longer the case. You should store data that's private to a request in local variables; if you must store it in a static variable, make sure to isolate it (for example storing it in a map under a request-specific key).

### Preventing Instance Reuse

Although you can control instance reuse on the `spin up` command line, this isn't necessarily available in other hosts. If the structure of your code means that it's not safe to reuse instances, then you can use Wasm Component Model backpressure functions in your code to tell the host not to schedule further requests to the current instance. How these are surfaced will depend on your language - for example, in Rust you would use `spin_sdk::wit_bindgen::backpressure_inc` to suspend re-use and a balancing `spin_sdk::wit_bindgen::backpressure_dec` to re-enable it. See the [Component Model documentation](https://github.com/WebAssembly/component-model/blob/main/design/mvp/Concurrency.md#backpressure) for detailed information.
