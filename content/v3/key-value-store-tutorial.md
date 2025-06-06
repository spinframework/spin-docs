title = "Spin Key-Value Store"
template = "main"
date = "2023-11-04T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v3/key-value-store-tutorial.md"

---
- [Key Value Store With Spin Applications](#key-value-store-with-spin-applications)
- [Tutorial Prerequisites](#tutorial-prerequisites)
  - [Python](#python)
- [Creating a New Spin Application](#creating-a-new-spin-application)
- [Configuration](#configuration)
  - [The Spin TOML File](#the-spin-toml-file)
- [Write Code to Save and Load Data](#write-code-to-save-and-load-data)
  - [The Spin SDK Version](#the-spin-sdk-version)
  - [Source Code](#source-code)
- [Building and Running Your Spin Application](#building-and-running-your-spin-application)
- [Storing and Retrieving Data From Your Default Key/Value Store](#storing-and-retrieving-data-from-your-default-keyvalue-store)
- [(Optional) Deploy Your App To Fermyon Cloud](#optional-deploy-your-app-to-fermyon-cloud)
- [Next Steps](#next-steps)

## Key Value Store With Spin Applications

Spin applications are best suited for event-driven, stateless workloads that have low-latency requirements. Keeping track of the application's state (storing information) is an integral part of any useful product or service. For example, users (and the business) will expect to store and load data/information at all times during an application’s execution. Spin has support for applications that need data in the form of key/value pairs and are satisfied by a Basically Available, Soft State, and Eventually Consistent (BASE) model. Workload examples include general value caching, session caching, counters, and serialized application state. In this tutorial, you will learn how to do the following:

* Create a Spin application with `spin new`
* Use the key value store SDK to get, set, and list key value pairs
* Configure your application manifest (`spin.toml`) to use the default key value store
* Run your key value store Spin application locally with `spin up`

## Tutorial Prerequisites

First, follow [this guide](./install.md) to install Spin. To ensure you have the correct version, you can check with this command:

<!-- @selectiveCpy -->

```bash
$ spin --version
```

> Please ensure you're on Spin version 2.0 or newer.

### Python

If you are planning on using Python for this tutorial, please ensure that you have Python 3.10 or later installed on your system. You can check your Python version by running:

```bash
python3 --version
```

If you do not have Python 3.10 or later, you can install it by following the instructions [here](https://www.python.org/downloads/).

## Creating a New Spin Application

Let's create a Spin application that will send and retrieve data from a key value store. To make things easy, we'll start from a template using the following commands ([learn more](./quickstart#creating-a-new-spin-application-from-a-template)):

{{ tabs "sdk-type" }}

{{ startTab "Rust"}}

<!-- @selectiveCpy -->

```bash
$ spin new -t http-rust spin-key-value

# Reference: https://github.com/spinframework/spin-rust-sdk/tree/stable/examples/rust-key-value
```

{{ blockEnd }}

{{ startTab "TypeScript" }}

<!-- @selectiveCpy -->

```bash
$ spin new -t http-ts spin-key-value
$ cd spin-key-value
$ npm install @spinframework/spin-kv

# Reference: https://github.com/spinframework/spin-js-sdk/tree/main/examples/spin-host-apis/spin-kv
```

{{ blockEnd }}

{{ startTab "Python" }}

<!-- @selectiveCpy -->

```bash
$ spin new -t http-py spin-key-value

# Reference: https://github.com/spinframework/spin-python-sdk/tree/main/examples/spin-kv
```

{{ blockEnd }}

{{ startTab "TinyGo" }}

<!-- @selectiveCpy -->

```bash
$ spin new -t http-go spin-key-value

# Reference: https://github.com/spinframework/spin-go-sdk/tree/stable/examples/key-value
```

{{ blockEnd }}

{{ blockEnd }}

## Configuration

Good news - Spin will take care of setting up your Key Value store. However, in order to make sure your Spin application has permission to access the Key Value store, you must add the `key_value_stores = ["default"]` line in the `[component.<component-name>]` section of the `spin.toml` file, for each component which needs access to the Key Value store. This line is necessary to communicate to Spin that a given component has access to the default Key Value store. A newly scaffolded Spin application will not have this line; you will need to add it. 

> Note: `[component.spin_key_value]` contains the name of the component. If you used a different name, when creating the application, this sections name would be different.

```toml
[component.spin_key_value]
...
key_value_stores = ["default"]
...
```

>> Tip: You can choose between various store implementations by modifying [the runtime configuration](dynamic-configuration.md#key-value-store-runtime-configuration). The default implementation uses [SQLite](https://www.sqlite.org/index.html) within the Spin framework.

Each Spin application's `key_value_stores` instances are implemented on a per-component basis across the entire Spin application. This means that within a multi-component Spin application (which has the same `key_value_stores = ["default"]` configuration line), each component will access that same data store. If one of your application's components creates a new key/value pair, another one of your application's components can update/overwrite that initial key/value after the fact.

### The Spin TOML File

We will give our components access to the key value store by adding the `key_value_stores = ["default"]` in the `[component.<component-name>] section as shown below:

```toml
spin_manifest_version = 2

[application]
name = "spin-key-value"
version = "0.1.0"
authors = ["Your Name <your-name@example.com>"]
description = "A simple application that exercises key-value storage."

[[trigger.http]]
route = "/..."
component = "spin-key-value"

[component.spin-key-value]
...
key_value_stores = ["default"]
...
```


## Write Code to Save and Load Data

In this section, we use the Spin SDK to open and persist our application's data inside our default key/value store. This is a special store that every environment running Spin applications will make available for their application. 

### The Spin SDK Version

If you have an existing application and would like to try out the key/value feature, please check the Spin SDK reference in your existing application's configuration. It is highly recommended to upgrade Spin and the SDK versions to the latest version available.

### Source Code

Now let's use the Spin SDK to:
- add new data
- check that the new data exists
- retrieve that data
- delete data
- check the data has been removed

{{ tabs "sdk-type" }}

{{ startTab "Rust"}}

```rust
use spin_sdk::{
    http::{IntoResponse, Request, Response, Method},
    http_component,
    key_value::Store,
};

#[http_component]
fn handle_request(req: Request) -> anyhow::Result<impl IntoResponse> {
    // Open the default key-value store
    let store = Store::open_default()?;

    let (status, body) = match *req.method() {
        Method::Post => {
            // Add the request (URI, body) tuple to the store
            store.set(req.path(), req.body())?;
            println!(
                "Storing value in the KV store with {:?} as the key",
                req.path()
            );
            (200, None)
        }
        Method::Get => {
            // Get the value associated with the request URI, or return a 404 if it's not present
            match store.get(req.path())? {
                Some(value) => {
                    println!("Found value for the key {:?}", req.path());
                    (200, Some(value))
                }
                None => {
                    println!("No value found for the key {:?}", req.path());
                    (404, None)
                }
            }
        }
        Method::Delete => {
            // Delete the value associated with the request URI, if present
            store.delete(req.path())?;
            println!("Delete key {:?}", req.path());
            (200, None)
        }
        Method::Head => {
            // Like GET, except do not return the value
            let code = if store.exists(req.path())? {
                println!("{:?} key found", req.path());
                200
            } else {
                println!("{:?} key not found", req.path());
                404
            };
            (code, None)
        }
        // No other methods are currently supported
        _ => (405, None),
    };
    Ok(Response::new(status, body))
}
```

{{ blockEnd }}

{{ startTab "TypeScript"}}

```typescript
import { AutoRouter } from 'itty-router';
import { openDefault } from '@spinframework/spin-kv';

const decoder = new TextDecoder();

let router = AutoRouter();

router
    .all("*", async (req: Request) => {
        let store = openDefault();
        let status = 200;
        let body;

        switch (req.method) {
            case 'POST':
                store.set(req.url, (await req.bytes()) || new Uint8Array().buffer);
                break;
            case 'GET':
                let val;
                val = store.get(req.url);
                if (!val) {
                    status = 404;
                } else {
                    body = decoder.decode(val);
                }
                break;
            case 'DELETE':
                store.delete(req.url);
                break;
            case 'HEAD':
                if (!store.exists(req.url)) {
                    status = 404;
                }
                break;
            default:
        }

        return new Response(body, { status });
    })

//@ts-ignore
addEventListener('fetch', async (event: FetchEvent) => {
    event.respondWith(router.fetch(event.request));
});

```

{{ blockEnd }}

{{ startTab "Python" }}

```python
from spin_sdk import http, key_value
from spin_sdk.http import Request, Response

class IncomingHandler(http.IncomingHandler):
    def handle_request(self, request: Request) -> Response:
        with key_value.open_default() as store:
            match request.method:
                case "GET":
                    value = store.get(request.uri)
                    if value:
                        status = 200
                        print(f"Found key {request.uri}")
                    else:
                        status = 404
                        print(f"Key {request.uri} not found")
                    return Response( status, {"content-type": "text/plain"}, value)
                case "POST":
                    store.set(request.uri, request.body)
                    print(f"Stored key {request.uri}")
                    return Response(200, {"content-type": "text/plain"})
                case "DELETE":
                    store.delete(request.uri)
                    print(f"Deleted key {request.uri}")
                    return Response(200, {"content-type": "text/plain"})
                case "HEAD":
                    if store.exists(request.uri):
                        print(f"Found key {request.uri}")
                        return Response(200, {"content-type": "text/plain"})
                    print(f"Key not found {request.uri}")
                    return Response(404, {"content-type": "text/plain"})
                case default:
                    return Response(405, {"content-type": "text/plain"})
```

{{ blockEnd }}


{{ startTab "TinyGo" }}

```go
package main

import (
	"io"
	"net/http"
	"fmt"

	spin_http "github.com/fermyon/spin/sdk/go/v2/http"
	"github.com/fermyon/spin/sdk/go/v2/kv"
)

func init() {
	// handler for the http trigger
	spin_http.Handle(func(w http.ResponseWriter, r *http.Request) {
		store, err := kv.OpenStore("default")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer store.Close()

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		switch r.Method {
		case http.MethodPost:
			err := store.Set(r.URL.Path, body)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			fmt.Println("Stored the key at:", r.URL.Path)
			w.WriteHeader(http.StatusOK)
		case http.MethodGet:
			value, err := store.Get(r.URL.Path)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			fmt.Println("Got the key:", r.URL.Path)
			w.WriteHeader(http.StatusOK)
			w.Write(value)
		case http.MethodDelete:
			err := store.Delete(r.URL.Path)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			fmt.Println("Deleted the key:", r.URL.Path)
			w.WriteHeader(http.StatusOK)
		case http.MethodHead:
			exists, err := store.Exists(r.URL.Path)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			if exists {
				w.WriteHeader(http.StatusOK)
				fmt.Println("Found key:", r.URL.Path)
				return
			}

			fmt.Println("Didn't find the key:", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
}
```

{{ blockEnd }}

{{ blockEnd }}

## Building and Running Your Spin Application

Now, let's build and run our Spin Application locally. Run the following command to build your application: 

<!-- @selectiveCpy -->

```bash
$ spin build
$ spin up
```

> If you ever receive the error `Handler returned an error: Error::AccessDenied`, please make sure you've included a list of allowed `key_value_stores` in your `spin.toml` file (as shown above in the [configuration](#configuration) section).

## Storing and Retrieving Data From Your Default Key/Value Store

Once you have completed this minimal configuration and deployed your application, data will be persisted across requests. Let's begin by creating a `POST` request that stores a JSON key/value object:

<!-- @selectiveCpy -->

```bash
# Create a new POST request and set the key/value pair of foo:bar
$ curl localhost:3000/test -H 'Content-Type: application/json' -d '{"foo":"bar"}'
```

We can now use a `HEAD` request to confirm that our component is holding data for us. Essentially, all we want to see here is a `200 OK` response when calling our components endpoint (`/test`). Let's give it a try:

<!-- @selectiveCpy -->

```bash
$ curl -I localhost:3000/test

HTTP/1.1 200 OK
```

Perfect, `200 OK`. Now, let's create a `GET` request that fetches the data from our component:

<!-- @selectiveCpy -->

```bash
# Create a GET request and fetch the key/value that we stored in the previous request
$ curl localhost:3000/test

{"foo": "bar"}
```

Great! The above command successfully returned our data as intended.

Lastly, we show how to create a `DELETE` request that removes the data for this specific component altogether:

<!-- @selectiveCpy -->

```bash
$ curl -X DELETE localhost:3000/test
```

Note how all of the above commands returned `200 OK` responses. In these examples, we were able to `POST`, `HEAD` (check to see if data exists), `GET` and also `DELETE` data from our component.

Interestingly there is one more request we can re-run before wrapping up this tutorial. If no data exists in the component's endpoint of `/test` (which is technically the case now that we have sent the `DELETE` request) the `HEAD` request should correctly return `404 Not Found`. You can consider this a type of litmus test; let's try it out:

<!-- @selectiveCpy -->

```bash
$ curl -I localhost:3000/test

HTTP/1.1 404 Not Found
```

As we can see above, there is currently no data found at the `/test` endpoint of our application.

## Next Steps

* Explore the contents of your Key Value store with the [Key Value Store Explorer template](../../hub/preview/template_kv_explorer)
