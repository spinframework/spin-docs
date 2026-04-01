title = "Building Spin components in Go"
template = "main"
date = "2023-11-04T00:00:01Z"
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v4/go-components.md"

---

- [Versions](#versions)
- [HTTP Components](#http-components)
- [Sending Outbound HTTP Requests](#sending-outbound-http-requests)
- [Redis Components](#redis-components)
- [Asynchronous and Streaming Idioms in Go](#asynchronous-and-streaming-idioms-in-go)
  - [Spawning Asynchronous Tasks](#spawning-asynchronous-tasks)
  - [Creating Futures and Streams](#creating-futures-and-streams)
- [Storing Data in Redis From Go Components](#storing-data-in-redis-from-go-components)
- [Using Go Packages in Spin Components](#using-go-packages-in-spin-components)
- [Storing Data in the Spin Key-Value Store](#storing-data-in-the-spin-key-value-store)
- [Storing Data in SQLite](#storing-data-in-sqlite)
- [AI Inferencing From Go Components](#ai-inferencing-from-go-components)

> This guide assumes you have Spin installed. If this is your first encounter with Spin, please see the [Quick Start](quickstart), which includes information about installing Spin with the Go templates, installing required tools, and creating Go applications.

> This guide assumes you are familiar with the Go programming language, and that
> you have
> [configured the TinyGo toolchain locally](https://tinygo.org/getting-started/install/).
Using TinyGo to compile components for Spin is currently required, as the
[Go compiler doesn't currently have support for compiling to WASI](https://github.com/golang/go/issues/31105).

> All examples from this page can be found in [the Spin Go SDK repository on GitHub](https://github.com/spinframework/spin-go-sdk/tree/main/examples).

[**Want to go straight to the Spin SDK reference documentation?**  Find it here.](https://pkg.go.dev/github.com/spinframework/spin-go-sdk/v2)

## Versions

TinyGo `0.35.0` is recommended, which requires Go `v1.22+`. Older versions of TinyGo may not support the command-line flags used when building Spin applications.

## HTTP Components

In Spin, HTTP components are triggered by the occurrence of an HTTP request, and
must return an HTTP response at the end of their execution. Components can be
built in any language that compiles to WASI, and Go has improved support for
writing applications, through its SDK.

Building a Spin HTTP component using the Go SDK means using the `init` function
to assign a handler function to `handler.Exports.Handle`. Below is a complete
implementation for a component that returns "Hello, Spin" as its response:

<!-- @nocpy -->

```go
package main

import (
    "fmt"
    "net/http"

    // The WASI contracts for receiving HTTP requests
    handler "github.com/spinframework/spin-go-sdk/v3/exports/wasi_http_service_0_3_0_rc_2026_03_15/export_wasi_http_0_3_0_rc_2026_03_15_handler"
    _ "github.com/spinframework/spin-go-sdk/v3/exports/wasi_http_service_0_3_0_rc_2026_03_15/wit_exports"
    . "github.com/spinframework/spin-go-sdk/v3/imports/wasi_http_0_3_0_rc_2026_03_15_types"
    . "go.bytecodealliance.org/pkg/wit/types")

func Handle(request *Request) Result[*Response, ErrorCode] {
    // The byte stream which will become the response body
    tx, rx := MakeStreamU8()

    // Start a goroutine to write the response body to the stream
    go func() {
        defer tx.Drop()
        tx.WriteAll([]uint8("Hello, Spin"))
    }()

    // Create the response object
    response, send := ResponseNew(
        // Response headers
        FieldsFromList([]Tuple2[string, []uint8]{
            Tuple2[string, []uint8]{"content-type", []uint8("text/plain")},
        }).Ok(),
        // Response body stream
        Some(rx),
        // A future that will provide (an empty set of) trailers once the body completes
        trailersFuture(),
    )
    send.Drop()

    return Ok[*Response, ErrorCode](response)
}

// Creates a future that will resolve to an (empty) set of HTTP trailers
func trailersFuture() *FutureReader[Result[Option[*Fields], ErrorCode]] {
    tx, rx := MakeFutureResultOptionFieldsErrorCode()
    go tx.Write(Ok[Option[*Fields], ErrorCode](None[*Fields]()))
    return rx
}

func init() {
    // Assign the Handle function as the WASI HTTP `handler`
    handler.Exports.Handle = Handle
}

// Formally required but never used
func main() {}
```

This component can be built using the `componentize-go` tool:

<!-- @selectiveCpy -->

```bash
$ componentize-go -w wasi:http/service@0.3.0-rc-2026-03-15 -w platform build
```

Once built, we can run our Spin HTTP component using the Spin up command:

<!-- @selectiveCpy -->

```bash
$ spin up
```

The Spin HTTP component can now receive and process incoming requests:

<!-- @selectiveCpy -->

```bash
$ curl -i localhost:3000
HTTP/1.1 200 OK
content-type: text/plain
content-length: 12

Hello, Spin
```

## Sending Outbound HTTP Requests

If allowed, Spin components can send outbound requests to HTTP endpoints. Let's
see an example of a component that makes a request to
[an API that returns random animal facts](https://random-data-api.fermyon.app/animals/json) and
inserts a custom header into the response before returning:

<!-- @nocpy -->

```go
// A Spin component written in Go that sends a request to an API
// with random animal facts.

package main

import (
 "fmt"
 "net/http"
 "os"

 spinhttp "github.com/spinframework/spin-go-sdk/v2/http"
)

func init() {
 spinhttp.Handle(func(w http.ResponseWriter, r *http.Request) {
    resp, _ := spinhttp.Get("https://random-data-api.fermyon.app/animals/json")

  fmt.Fprintln(w, resp.Body)
  fmt.Fprintln(w, resp.Header.Get("content-type"))

  // `spin.toml` is not configured to allow outbound HTTP requests to this host,
  // so this request will fail.
  if _, err := spinhttp.Get("https://fermyon.com"); err != nil {
   fmt.Fprintf(os.Stderr, "Cannot send HTTP request: %v", err)
  }
 })
}
```

The Outbound HTTP Request example above can be built using the `tingygo` toolchain:

<!-- @selectiveCpy -->

```bash
$ tinygo build -target=wasip1 -gc=leaking -buildmode=c-shared -no-debug -o main.wasm .
```

Before we can execute this component, we need to add the
`random-data-api.fermyon.app` domain to the application manifest `allowed_outbound_hosts`
list containing the list of domains the component is allowed to make HTTP
requests to:

<!-- @nocpy -->

```toml
# spin.toml
spin_manifest_version = 2

[application]
name = "spin-hello-tinygo"
version = "1.0.0"

[[trigger.http]]
route = "/hello"
component = "tinygo-hello"

[component.tinygo-hello]
source = "main.wasm"
allowed_outbound_hosts = [ "https://random-data-api.fermyon.app" ]
```

Running the application using `spin up` will start the HTTP
listener locally (by default on `localhost:3000`), and our component can
now receive requests in route `/hello`:

<!-- @selectiveCpy -->

```bash
$ curl -i localhost:3000/hello
HTTP/1.1 200 OK
content-length: 93

{"timestamp":1684299253331,"fact":"Reindeer grow new antlers every year"}
```

> Without the `allowed_outbound_hosts` field populated properly in `spin.toml`,
> the component would not be allowed to send HTTP requests, and sending the
> request would generate in a "Destination not allowed" error.

> You can set `allowed_outbound_hosts = ["https://*:*"]` if you want to allow
> the component to make requests to any HTTP host. This is not recommended
> unless you have a specific need to contact arbitrary servers and perform your own safety checks.

## Redis Components

Besides the HTTP trigger, Spin has built-in support for a Redis trigger, which
will connect to a Redis instance and will execute components for new messages
on the configured channels.

> See the [Redis trigger](./redis-trigger.md) for details about the Redis trigger.

Writing a Redis component in Go also takes advantage of the SDK:

<!-- @nocpy -->

```go
package main

import (
 "fmt"

 "github.com/spinframework/spin-go-sdk/v2/redis"
)

func init() {
 // redis.Handle() must be called in the init() function.
 redis.Handle(func(payload []byte) error {
  fmt.Println("Payload::::")
  fmt.Println(string(payload))
  return nil
 })
}
```

The manifest for a Redis application must contain the address of the Redis instance. This is set at the application level:

<!-- @nocpy -->

```toml
spin_manifest_version = 2

[application]
name = "spin-redis"
trigger = { type = "redis",  }
version = "0.1.0"

[application.trigger.redis]
address = "redis://localhost:6379"

[[trigger.redis]]
channel = "messages"
component = "echo-message"

[component.echo-message]
source = "main.wasm"
[component.echo-message.build]
command = "tinygo build -target=wasip1 -gc=leaking -buildmode=c-shared -no-debug -o main.wasm ."
```

The application will connect to `redis://localhost:6379`, and for every new message
on the `messages` channel, the `echo-message` component will be executed:

<!-- @selectiveCpy -->

```bash
# first, start redis-server on the default port 6379
$ redis-server --port 6379
# then, start the Spin application
$ spin build --up
INFO spin_redis_engine: Connecting to Redis server at redis://localhost:6379
INFO spin_redis_engine: Subscribed component 0 (echo-message) to channel: messages
```

For every new message on the `messages` channel:

<!-- @selectiveCpy -->

```bash
$ redis-cli
127.0.0.1:6379> publish messages "Hello, there!"
```

Spin will instantiate and execute the component:

<!-- @nocpy -->

```bash
INFO spin_redis_engine: Received message on channel "messages"
Payload::::
Hello, there!
```

## Asynchronous and Streaming Idioms in Go

### Spawning Asynchronous Tasks

Just as in native code, you can spawn an asynchronous task in Go using the `go` language keyword. (We mention this because some other languages require special library functions for this. But in Go you can use the normal language idiom.)

### Creating Futures and Streams

The Go SDK provides `Make*` functions for creating Wasm Component Model futures and streams. The bindings contain a corresponding function for each concrete future or stream type mentioned in the Spin and WASI APIs.

To create a future, call `MakeFuture<Type>` - for example, `MakeFutureFields`. This returns a writer (which you can use later to complete the future) and a reader (representing the future which will eventually resolve to a value).

To create a stream, call `MakeStream<Type>` - for example, `MakeStreamU8` is a byte stream. Again, this returns a writer and a reader. The writer is typically handed to a goroutine to asynchronously send values into the stream. The reader is typically passed to an API that takes a stream parameter, for example acting as the body in an HTTP response.

For generic types, the type name in the function is formed by concatenation, so you may see things like `MakeFutureResultOptionFieldsErrorCode` at the bindings level. You shouldn't normally have to deal with these in application code though!

## Storing Data in Redis From Go Components

Using the Spin's Go SDK, you can use the Redis key/value store to publish
messages to Redis channels. This can be used from both HTTP and Redis triggered
components.

Let's see how we can use the Go SDK to connect to Redis. This HTTP component demonstrates fetching a value from Redis by key, setting a
key with a value, and publishing a message to a Redis channel:

<!-- @nocpy -->

```go
package main

import (
 "net/http"
 "os"

 spin_http "github.com/spinframework/spin-go-sdk/v2/http"
 "github.com/spinframework/spin-go-sdk/v2/redis"
)

func init() {
 // handler for the http trigger
 spin_http.Handle(func(w http.ResponseWriter, r *http.Request) {

  // addr is the environment variable set in `spin.toml` that points to the
  // address of the Redis server.
  addr := os.Getenv("REDIS_ADDRESS")

  // channel is the environment variable set in `spin.toml` that specifies
  // the Redis channel that the component will publish to.
  channel := os.Getenv("REDIS_CHANNEL")

  // payload is the data publish to the redis channel.
  payload := []byte(`Hello redis from tinygo!`)

  // create a new redis client.
  rdb := redis.NewClient(addr)

  if err := rdb.Publish(channel, payload); err != nil {
   http.Error(w, err.Error(), http.StatusInternalServerError)
   return
  }

  // set redis `mykey` = `myvalue`
  if err := rdb.Set("mykey", []byte("myvalue")); err != nil {
   http.Error(w, err.Error(), http.StatusInternalServerError)
   return
  }

  // get redis payload for `mykey`
  if payload, err := rdb.Get("mykey"); err != nil {
   http.Error(w, err.Error(), http.StatusInternalServerError)
  } else {
   w.Write([]byte("mykey value was: "))
   w.Write(payload)
  }
 })
}
```

As with all networking APIs, you must grant access to Redis hosts via the `allowed_outbound_hosts` field in the application manifest:

<!-- @nocpy -->

```toml
[component.storage-demo]
environment = { REDIS_ADDRESS = "redis://127.0.0.1:6379", REDIS_CHANNEL = "messages" }
allowed_outbound_hosts = ["redis://127.0.0.1:6379"]
```

This HTTP component can be paired with a Redis component, triggered on new messages on the `messages` Redis channel, to build an asynchronous messaging application, where the HTTP front-end queues work for a Redis-triggered back-end to execute as capacity is available.

> You can find a complete example for using outbound Redis from an HTTP component
> in the [Spin repository on GitHub](https://github.com/spinframework/spin-go-sdk/tree/main/examples/redis-outbound).

## Using Go Packages in Spin Components

Any [package from the Go standard library](https://tinygo.org/docs/reference/lang-support/stdlib/) that can be imported in TinyGo and that compiles to
WASI can be used when implementing a Spin component.

> Make sure to read [the page describing the HTTP trigger](./http-trigger.md) for more
> details about building HTTP applications.

## Storing Data in the Spin Key-Value Store

Spin has a key-value store built in. For information about using it from TinyGo, see [the key-value API guide](kv-store-api-guide).

## Storing Data in SQLite

For more information about using SQLite from TinyGo, see [SQLite storage](sqlite-api-guide).

## AI Inferencing From Go Components

For more information about using Serverless AI from TinyGo, see the [Serverless AI](serverless-ai-api-guide) API guide.
