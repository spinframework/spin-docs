title = "Key Value Store"
template = "main"
date = "2023-11-04T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v4/kv-store-api-guide.md"

---
- [Using Key Value Store From Applications](#using-key-value-store-from-applications)
- [Custom Key Value Stores](#custom-key-value-stores)
- [Granting Key Value Store Permissions to Components](#granting-key-value-store-permissions-to-components)

Spin provides an interface for you to persist data in a key value store managed by Spin. This key value store allows Spin developers to persist non-relational data across application invocations.

{{ details "Why do I need a Spin interface? Why can't I just use my own external store?" "You can absolutely still use your own external store either with the Redis or Postgres APIs, or outbound HTTP. However, if you're interested in quick, non-relational local storage without any infrastructure set-up then Spin's key value store is a great option." }}

## Using Key Value Store From Applications

The Spin SDK surfaces the Spin key value store interface to your language. The set of operations is common across all SDKs:

| Operation  | Parameters | Returns | Behavior |
|------------|------------|---------|----------|
| `open`  | name | store  | Open the store with the specified name. If `name` is the string "default", the default store is opened, provided that the component that was granted access in the component manifest from `spin.toml`. Otherwise, `name` must refer to a store defined and configured in a [runtime configuration file](./dynamic-configuration.md#key-value-store-runtime-configuration) supplied with the application.|
| `get` | store, key | value | Get the value associated with the specified `key` from the specified `store`. |
| `set` | store, key, value | - | Set the `value` associated with the specified `key` in the specified `store`, overwriting any existing value. |
| `delete` | store, key | - | Delete the tuple with the specified `key` from the specified `store`. `error::invalid-store` will be raised if `store` is not a valid handle to an open store.  No error is raised if a tuple did not previously exist for `key`.|
| `exists` | store, key | boolean | Return whether a tuple exists for the specified `key` in the specified `store`.|
| `get-keys` | store | stream<keys> | Return a stream of all the keys in the specified `store`. NOTE: errors are reported via a future (promise) which resolves once the stream has ended. |
| `close` | store | - | Close the specified `store`. |

The exact detail of calling these operations from your application depends on your language:

{{ tabs "sdk-type" }}

{{ startTab "Rust"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://docs.rs/spin-sdk/latest/spin_sdk/key_value/index.html)

Key value functions are available in the `spin_sdk::key_value` module. The function names match the operations above. For example:

```rust
use bytes::Bytes;
use spin_sdk::{
    http::{FullBody, IntoResponse, Request, Response},
    http_service,
    key_value::Store,
};

#[http_service]
async fn handle_request(_req: Request) -> anyhow::Result<impl IntoResponse> {
    let store = Store::open_default().await?;
    store.set("mykey", b"myvalue").await?;
    let value = store.get("mykey").await?;
    let response = value.unwrap_or_else(|| "not found".into());
    Ok(Response::new(FullBody::new(Bytes::from(response))))
}
```

**General Notes** 

`set` **Operation**
- For set, the value argument can be of any type that implements `AsRef<[u8]>`

`get` **Operation**
- For get, the return value is of type `Option<Vec<u8>>`. If the key does not exist it returns `None`.

`get_keys` **Operation**
- This returns a stream containing the keys, and a future containing a `Result`. You _must_ check the future when the stream ends, to determine if the stream ended normally, or was terminated prematurely due to an error.

`open` and `close` **Operations**
- The close operation is not surfaced; it is called automatically when the store is dropped.

`set_json` and `get_json` **Operation**
- Rust applications can [store and retrieve serializable Rust types](./rust-components#storing-data-in-the-spin-key-value-store).

{{ blockEnd }}

{{ startTab "Typescript"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://spinframework.github.io/spin-js-sdk/)

The key value functions can be accessed after opening a store using either [the `open` or the `openDefault` functions](https://spinframework.github.io/spin-js-sdk/modules/_spinframework_spin-kv.html) which returns a [handle to the store](https://spinframework.github.io/spin-js-sdk/interfaces/_spinframework_spin-kv.Store.html). For example:

```ts
import { AutoRouter } from 'itty-router';
import { openDefault } from '@spinframework/spin-kv';

let router = AutoRouter();

router
    .get("/", () => {
        let store = openDefault()
        store.set("mykey", "myvalue") 
        return new Response(store.get("mykey") ?? "Key not found");
    })

//@ts-ignore
addEventListener('fetch', async (event: FetchEvent) => {
    event.respondWith(router.fetch(event.request));
});
```

**General Notes**
- The SDK doesn't surface the `close` operation. It automatically closes all stores at the end of the request; there's no way to close them early.

[`get` **Operation**](https://spinframework.github.io/spin-js-sdk/interfaces/_spinframework_spin-kv.Store.html#get)
- The result is of the type `Uint8Array | null`
- If the key does not exist, `get` returns `null`

[`set` **Operation**](https://spinframework.github.io/spin-js-sdk/interfaces/_spinframework_spin-kv.Store.html#set)
- The value argument is of the type `Uint8Array | string | object`.

[`setJson`](https://spinframework.github.io/spin-js-sdk/interfaces/_spinframework_spin-kv.Store.html#setjson) and [`getJson` **Operation**](https://spinframework.github.io/spin-js-sdk/interfaces/_spinframework_spin-kv.Store.html#getjson)
- Applications can store JavaScript objects using `setJson`; these are serialized within the store as JSON. These serialized objects can be retrieved and deserialized using `getJson`. If you call `getJson` on a key that doesn't exist then it returns an empty object.

{{ blockEnd }}

{{ startTab "Python"}}

> [**Want to go straight to the reference documentation?** Find it here.](https://spinframework.github.io/spin-python-sdk/v4/key_value.html)

The key value functions are provided through the `key_value` module in the Python SDK. For example:

```python
from spin_sdk import http, key_value
from spin_sdk.http import Request, Response

class HttpHandler(http.Handler):
    async def handle_request(self, request: Request) -> Response:
        with await key_value.open_default() as store:
            await store.set("test", bytes("hello world!", "utf-8"))
            val = await store.get("test")
            
        return Response(
            200,
            {"content-type": "text/plain"},
            val
        )

```

**General Notes**
- The Python SDK doesn't surface the `close` operation. It automatically closes all stores at the end of the request; there's no way to close them early.

- To open the default key-value store, you can use the [`key_value.open_default`](https://spinframework.github.io/spin-python-sdk/v4/key_value.html#spin_sdk.key_value.open_default) function. You can use [`key_value.open`](https://spinframework.github.io/spin-python-sdk/v4/key_value.html#spin_sdk.key_value.open) to open any store by label.

- Below is a breakdown of the methods surfaced directly from the underlying [spin-key-value-3.0.0 WIT definition](https://spinframework.github.io/spin-python-sdk/v4/wit/imports/spin_key_value_key_value_3_0_0.html):

    [`open` **Operation**](https://spinframework.github.io/spin-python-sdk/v4/wit/imports/spin_key_value_key_value_3_0_0.html#spin_sdk.wit.imports.spin_key_value_key_value_3_0_0.Store.open)
    - Open the store with the specified label

    [`get` **Operation**](https://spinframework.github.io/spin-python-sdk/v4/wit/imports/spin_key_value_key_value_3_0_0.html#spin_sdk.wit.imports.spin_key_value_key_value_3_0_0.Store.get)
    - If a key does not exist, it returns `None`

    [`set` **Operation**](https://spinframework.github.io/spin-python-sdk/v4/wit/imports/spin_key_value_key_value_3_0_0.html#spin_sdk.wit.imports.spin_key_value_key_value_3_0_0.Store.set)
    - Sets a value associated with the specified key, overwriting any existing value.

    [`delete` **Operation**](https://spinframework.github.io/spin-python-sdk/v4/wit/imports/spin_key_value_key_value_3_0_0.html#spin_sdk.wit.imports.spin_key_value_key_value_3_0_0.Store.delete)
    - Deletes the specified item from the store

    [`exists` **Operation**](https://spinframework.github.io/spin-python-sdk/v4/wit/imports/spin_key_value_key_value_3_0_0.html#spin_sdk.wit.imports.spin_key_value_key_value_3_0_0.Store.exists)
    - Return whether the specified key is present in the store

    [`get_keys` **Operation**](https://spinframework.github.io/spin-python-sdk/v4/wit/imports/spin_key_value_key_value_3_0_0.html#spin_sdk.wit.imports.spin_key_value_key_value_3_0_0.Store.get_keys)
    - Returns a `Tuple` containing a [StreamReader](https://github.com/bytecodealliance/componentize-py/blob/1b3d2e936868307a48fb70941dcad71b54e844f8/bundled/componentize_py_async_support/streams.py#L101) and a [FutureReader](https://github.com/bytecodealliance/componentize-py/blob/1b3d2e936868307a48fb70941dcad71b54e844f8/bundled/componentize_py_async_support/futures.py#L11). You _must_ check when the stream ends, to determine if the stream ended normally, or was terminated prematurely due to an error.

    > If you're familiar with previous versions of the Python SDK, note that `get_keys` no longer returns a list.  To get the keys as a list, use `await util.collect(await store.get_keys())`. See [collect](https://spinframework.github.io/spin-python-sdk/v4/util.html#spin_sdk.util.collect) for more details.

You can find a complete Python code example using the Key Value store in the [Spin Python SDK repository on GitHub](https://github.com/spinframework/spin-python-sdk/tree/main/examples/spin-kv).

{{ blockEnd }}

{{ startTab "TinyGo"}}

> [**Want to go straight to the Spin SDK reference documentation?**  Find it here.](https://pkg.go.dev/github.com/spinframework/spin-go-sdk/v2@v2.2.1/kv)

Key value functions are provided by the `github.com/spinframework/spin-go-sdk/v2/kv` module. [See Go Packages for reference documentation.](https://pkg.go.dev/github.com/spinframework/spin-go-sdk/v2/kv) For example:

```go
import "github.com/spinframework/spin-go-sdk/v2/kv"

func example() error {
    store, err := kv.OpenStore("default")
    if err != nil {
        return err
    }
    defer store.Close()
    previous, err := store.Get("mykey")
    return store.Set("mykey", []byte("myvalue"))
}

```

{{ blockEnd }}

{{ blockEnd }}

## Key Value Store Limits

The key/value size limits and syntactic requirements of a key value store depends on which [key value store provider](./dynamic-configuration#key-value-store-runtime-configuration) your app uses. The Spin command line currently supports a [default local SQLite provider]((./dynamic-configuration#file-key-value-store-provider)), a Redis KV provider, an Azure Cosmos DB backed provider, and an AWS Dynamo DB provider. See the [key value store runtime configuration](./dynamic-configuration#key-value-store-runtime-configuration) documentation for more information about the limits and requirements of each provider.

When you deploy your application, bear in mind that your deployment platform may have a KV provider with different characteristics from your local one!

## Custom Key Value Stores

Spin defines a key-value store named `"default"` and provides automatic backing storage.  If you need to customize Spin with additional stores, or to change the backing storage for the default store, you can do so via the `--runtime-config-file` flag and the `runtime-config.toml` file.  See [Key Value Store Runtime Configuration](./dynamic-configuration#key-value-store-runtime-configuration) for details.

## Granting Key Value Store Permissions to Components

By default, a given component of an app will not have access to any key value store. Access must be granted specifically to each component via the component manifest:

```toml
[component.example]
# Pass in 1 or more key value stores, based on how many you'd like your component to have access to
key_value_stores = ["<store 1>", "<store 2>"]
```

For example, a component could be given access to the default store using `key_value_stores = ["default"]`.
