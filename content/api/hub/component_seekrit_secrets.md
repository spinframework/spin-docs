title = "seekrit secrets component"
template = "render_hub_content_body"
date = "2026-09-14T00:00:00Z"
content-type = "text/html"
tags = ["rust", "secrets", "component", "wasi"]

[extra]
author = "seekrit"
type = "hub_document"
category = "Component"
language = "Rust"
created_at = "2026-09-14T00:00:00Z"
last_updated = "2026-09-14T00:00:00Z"
spin_version = ">=v3.0"
summary = "A dependency component that resolves and decrypts secrets inside the Wasm sandbox, so your component imports an interface instead of holding a credential."
url = "https://seekrit.dev/docs/guides/spin"
keywords = "secrets, credentials, api keys, encryption, wasi-config, component dependencies, zero knowledge, rust"

---

A WASI component that fetches and decrypts secrets, published so you can add it
to a Spin app as a dependency. Your component imports one interface and asks for
a name; the seekrit component holds the service token, makes a single outbound
call, and decrypts inside its own linear memory. Your component never sees the
token.

## Adding it

```toml
[component.app]
source = "target/wasm32-wasip2/release/app.wasm"
allowed_outbound_hosts = ["https://api.seekrit.dev"]
dependencies_inherit_configuration = true

[component.app.variables]
seekrit_token = "\{{ seekrit_token }}"

[component.app.dependencies]
"seekrit:secrets/store" = { version = "0.3.0", package = "seekritdev:secrets-spin", registry = "ghcr.io" }
```

Generate the bindings and call it:

```rust
spin_sdk::dependencies!();

use seekrit::secrets::store;

let api_key = match store::get("STRIPE_API_KEY") {
    Ok(Some(v)) => v,
    Ok(None) => return Ok(text(500, "STRIPE_API_KEY is not in scope")),
    Err(e) => return Ok(text(503, format!("{e:?}"))),
};
```

## The interface

```wit
package seekrit:secrets@0.1.0;

interface store {
  variant error { not-configured(string), denied(string), unavailable(string), decrypt(string) }

  get:        func(name: string) -> result<option<string>, error>;
  get-all:    func()             -> result<list<tuple<string, string>>, error>;
  list-names: func()             -> result<list<string>, error>;
  forget:     func();
}
```

`get` returns `ok(none)` for a name that is not in scope, which is distinct from
an error — your component can tell "no such secret" from "I could not ask" and
fail closed on the second without treating the first as an outage.
`list-names` returns names without materializing any value, which makes it the
call for a health check or a startup assertion. The component exports nothing
else: there is no write path.

## Configuration

The component reads `wasi:config/store` first and the environment second. On
Spin that means `[component.app.variables]`. Every key is accepted as
`SEEKRIT_TOKEN`, `seekrit_token`, or `seekrit-token`, because hosts differ in
what a configuration key may contain.

| Key | Required | Meaning |
| --- | --- | --- |
| `seekrit_token` | yes | The service token, bound to one application environment. |
| `seekrit_api_url` | no | Defaults to `https://api.seekrit.dev`. |
| `seekrit_with` | no | `group:environment` composition overrides, comma-separated. |
| `seekrit_branch` | no | A branch of the token's environment. |
| `seekrit_interpolate` | no | `0` leaves `${REFERENCE}` expansion off. |

Never put the token in `component.environment` or compile it into a component:
Spin's manifest expressions do not cover `environment`, so it could only hold a
literal, and Spin applications are pushed to registries.

## Two Spin-specific notes

**Use the `secrets-spin` package.** The same component is also published as
`seekritdev:secrets`, built against `wasi:config/store@0.2.0-draft` for other
hosts. Spin registers `wasi:config/store@0.2.0-draft-2024-09-27`, and wasmtime
gives pre-release versions no semver-compatible matching, so the two are
unrelated import names and the wrong one fails at instantiation.

**`dependencies_inherit_configuration` is required.** Spin grants a dependency
none of the component's permissions by default, so without it the seekrit
component can neither make its outbound call nor read the variable holding its
token. The app still starts; the first request returns `not configured`.

## Caching

The decrypted set is memoized per component instance. Spin instantiates per
request, so the cache holds for one request and nothing survives it — a rotated
secret is picked up on the next request. Failures are never cached.

Verified against Spin 4.1.0.

Documentation: [seekrit.dev/docs/guides/spin](https://seekrit.dev/docs/guides/spin).
Also published for wasmCloud, wasmtime, and other WASI 0.2 hosts —
[seekrit.dev/docs/guides/wasm](https://seekrit.dev/docs/guides/wasm).
