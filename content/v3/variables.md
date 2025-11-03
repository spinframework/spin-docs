title = "Application Variables"
template = "main"
date = "2023-11-04T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v3/variables.md"

---
- [Adding Variables to Your Applications](#adding-variables-to-your-applications)
- [Using Variables From Applications](#using-variables-from-applications)
- [Providing Variable Values](#providing-variable-values)
  - [Providing Variable Values from a Secrets Store](#providing-variable-values-from-a-secrets-store)
  - [Providing Variable Values from the Environment](#providing-variable-values-from-the-environment)
  - [Providing Variable Values on the Command Line](#providing-variable-values-on-the-command-line)
- [Troubleshooting](#troubleshooting)

Spin supports dynamic application variables. Instead of being static, their values can be updated without modifying the application, creating a simpler experience for rotating secrets, updating API endpoints, and more. 

These variables are defined in a Spin application manifest (in the `[variables]` section), and their values can be set or overridden at runtime by an [application variables provider](./dynamic-configuration.md#application-variables-runtime-configuration), or the `--variable` flag to `spin up`. When running Spin locally, the variables provider can be [Hashicorp Vault](./dynamic-configuration.md#vault-application-variable-provider) for secrets, [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault), or host environment variables. [See below](#setting-variable-values) for more information.

## Adding Variables to Your Applications

Variables are added to an application under the top-level `[variables]` section of an application manifest (`spin.toml`). Each entry must either have a default value or be marked as `required = true`. “Required” entries must be [provided](./dynamic-configuration#application-variables-runtime-configuration) with a value.

For example, consider an application which makes an outbound API call using a bearer token. To configure this using variables, you would:
* Add a `[variables]` section to the application manifest
* Add a `token` entry for the bearer token.  Since there is no reasonable default value for this secret, set the variable as required with `required = true`.
* Add an `api_uri` variable.  The URL _is_ known, but is useful to override, for example for A/B testing. So you can give this variable a default value with `default = "http://my-api.com"`.
The resulting application manifest looks like this:

<!-- @nocpy -->

```toml
[variables]
api_token = { required = true }
api_uri = { default = "http://my-api.com" }
```

Variables are surfaced to a specific component by adding a `[component.(name).variables]` section to the component and referencing them within it. The `[component.(name).variables]` section contains a mapping of component variables and values. Entries can be static (like `api_version` below) or reference an updatable application variable (like `token` below) using [mustache](https://mustache.github.io/)-inspired string templates. Only components that explicitly use variables in their configuration section will get access to them. This enables only exposing variables (such as secrets) to the desired components of an application.

<!-- @nocpy -->

```toml
[component.(name).variables]
token = "\{{ api_token }}"
api_uri = "\{{ api_uri }}"
api_version = "v1"
```

When a component variable references an application variable, its value will dynamically update as the application variable changes. For example, if the `api_token` variable is provided using the [Spin Vault provider](./dynamic-configuration.md#vault-application-variable-provider), it can be updated by changing the value in HashiCorp Vault. The next time the component gets the value of `token`, the latest value of `api_token` will be returned by the provider. See the [next section](#using-variables-from-applications) to learn how to use Spin's configuration SDKs to get configuration variables within applications.

Variables can also be used in other sections of the application manifest that benefit from runtime configuration. In these cases, the variables are substituted at application load time rather than dynamically updated while the application is running. For example, the `allowed_outbound_hosts` can be dynamically configured using variables as follows:

<!-- @nocpy -->

```toml
[component.(name)]
allowed_outbound_hosts = [ "\{{ api_uri }}" ]
```


All in all, an application manifest with `api_token` and `api_uri` variables and a component that uses them would look similar to the following:

<!-- @nocpy -->

```toml
spin_manifest_version = 2

[application]
name = "api-consumer"
version = "0.1.0"
description = "A Spin app that makes API requests"

[variables]
api_token = { required = true }
api_uri = { default = "http://my-api.com" }

[[trigger.http]]
route = "/..."
component = "api-consumer"

[component.api-consumer]
source = "app.wasm"
[component.api-consumer.variables]
token = "\{{ api_token }}"
api_uri = "\{{ api_uri }}
api_version = "v1"
```

## Using Variables From Applications

The Spin SDK surfaces the Spin configuration interface to your language. The [interface](https://github.com/spinframework/spin/blob/main/wit/deps/spin@2.0.0/variables.wit) consists of one operation:

| Operation  | Parameters         | Returns             | Behavior |
|------------|--------------------|---------------------|----------|
| `get`      | Variable name      | Variable value      | Gets the value of the variable from the configured provider |

To illustrate the variables API, each of the following examples makes a request to some API with a bearer token. The API URI, version, and token are all passed as application variables. The application manifest associated with the examples would look similar to the one described [in the previous section](#adding-variables-to-your-applications). 

The exact details of calling the config SDK from a Spin application depends on the language:

{{ tabs "sdk-type" }}

{{ startTab "Rust"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://docs.rs/spin-sdk/latest/spin_sdk/variables/index.html)

The interface is available in the `spin_sdk::variables` module and is named `get`.

```rust
use spin_sdk::{
    http::{IntoResponse, Method, Request, Response},
    http_component, variables,
};

#[http_component]
async fn handle_api_call_with_token(_req: Request) -> anyhow::Result<impl IntoResponse> {
    let token = variables::get("token")?;
    let api_uri = variables::get("api_uri")?;
    let version = variables::get("version")?;
    let versioned_api_uri = format!("{}/{}", api_uri, version);
    let request = Request::builder()
        .method(Method::Get)
        .uri(versioned_api_uri)
        .header("Authorization", format!("Bearer {}", token))
        .build();
    let response: Response = spin_sdk::http::send(request).await?;
    // Do something with the response ...
    Ok(Response::builder()
        .status(200)
        .build())
}
```

{{ blockEnd }}

{{ startTab "TypeScript"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://spinframework.github.io/spin-js-sdk/modules/_spinframework_spin-variables.html)

```ts
import { AutoRouter } from 'itty-router';
import { Variables } from '@fermyon/spin-sdk';

let router = AutoRouter();

router
    .get("/", () => {
        let token = Variables.get("token")
        let apiUri = Variables.get("api_uri")
        let version = Variables.get("version")
        let versionedAPIUri = `${apiUri}/${version}`
        let response = await fetch(
          versionedAPIUri,
          {
            headers: {
              'Authorization': 'Bearer ' + token
            }
          }
        );

        return new Response("Used an API");
    })

//@ts-ignore
addEventListener('fetch', async (event: FetchEvent) => {
    event.respondWith(router.fetch(event.request));
});

```

{{ blockEnd }}

{{ startTab "Python"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://spinframework.github.io/spin-python-sdk/v3/variables.html)

The `variables` module has a function called `get`(https://spinframework.github.io/spin-python-sdk/v3/variables.html#spin_sdk.variables.get).

```py
from spin_sdk.http import IncomingHandler, Request, Response, send
from spin_sdk import variables

class IncomingHandler(IncomingHandler):
    def handle_request(self, request: Request) -> Response:
        token = variables.get("token")
        api_uri = variables.get("api_uri")
        version = variables.get("version")
        versioned_api_uri = f"{api_uri}/{version}"
        headers = {
            "Authorization": f"Bearer {token}"
        }
        response = send(Request("GET", versioned_api_uri, headers, None))
        # Do something with the response ...
        return Response(
            200,
            {"content-type": "text/plain"},
            bytes("Used an API", "utf-8")
        )
```

{{ blockEnd }}

{{ startTab "TinyGo"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://pkg.go.dev/github.com/spinframework/spin-go-sdk/v2@v2.2.1/variables)

The function is available in the `github.com/spinframework/spin-go-sdk/v2/variables` package and is named `Get`. See [Go package](https://pkg.go.dev/github.com/spinframework/spin-go-sdk/v2/variables) for reference documentation.

```go
import (
	"bytes"
	"fmt"
	"net/http"

	spinhttp "github.com/spinframework/spin-go-sdk/v2/http"
	"github.com/spinframework/spin-go-sdk/v2/variables"
)

func init() {
	spinhttp.Handle(func(w http.ResponseWriter, r *http.Request) {
		token, err := variables.Get("token")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		apiUri, err := variables.Get("api_uri")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		version, err := variables.Get("version")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		versionedApiUri := fmt.Sprintf("%s/%s", apiUri, version)

		request, err := http.NewRequest("GET", versionedApiUri, bytes.NewBuffer([]byte("")))
		request.Header.Add("Authorization", "Bearer "+token)
		response, err := spinhttp.Send(request)
		// Do something with the response ...
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintln(w, "Used an API")
	})
}
```

{{ blockEnd }}

{{ blockEnd }}

To build and run the application, we issue the following commands:

<!-- @selectiveCpy -->

```bash
# Build the application
$ spin build
# Run the application, setting the values of the API token and URI via the environment variable provider
# using the `SPIN_VARIABLE` prefix (upper case is necessary as shown here)
$ SPIN_VARIABLE_API_TOKEN="your-token-here" SPIN_VARIABLE_API_URI="http://my-best-api.com" spin up
```

Assuming you have configured you application to use an API, to test the application, simply query
the app endpoint:

<!-- @selectiveCpy -->

```bash
$ curl -i localhost:3000
HTTP/1.1 200 OK
content-type: text/plain
content-length: 11
date: Wed, 31 Jul 2024 22:03:35 GMT

Used an API
```

## Providing Variable Values

When you run an application, you must provide values for all required variables, and you may provide values for non-required variables (where you want to override the default). You can do this using a provider such as a secrets store, or you can set variables directly on the `spin up` command line.

### Providing Variable Values from a Secrets Store

You can provide variable values from a secrets store. The Spin CLI supports [Hashicorp Vault](./dynamic-configuration.md#vault-application-variable-provider) and [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault). If you want to do this, you must set up the store in the runtime configuration file, and reference that file using `--runtime-config-file` on the command line.

For information about configuring application variables providers, refer to the [runtime configuration documentation](./dynamic-configuration.md#application-variables-runtime-configuration).

### Providing Variable Values from the Environment

You can provide variable values using the operating system environment. For each variable you want to set, you must specify an environment variable named `SPIN_VARIABLE_` followed by a "shouty capitalised" form of the variable name - that is, all uppercase, with underscores for separators. For example, to set the `database_username` variable:

```console
$ export SPIN_VARIABLE_DATABASE_USERNAME=bob_the_admin
$ spin up
```

### Providing Variable Values on the Command Line

You can provide variable values via the `spin up --variable` command line flag. This flag can be repeated, and supports several variants:

* `<key>=<value>`: sets the `<key>` variable to the given value
* `<key>=@<file>`: sets the `<key>` variable to the contents of the given text file
* `@<file>.json`: sets multiple variables - each `"<key>": "<value>"` pair in the given JSON file sets the `<key>` variable to the corresponding value
* `@<file>.toml`: sets multiple variables - each `<key> = "<value>"` pair in the given TOML file sets the `<key>` variable to the corresponding value

For example, suppose `secrets.json` is as follows:

```json
{
    "sierra_madre": "no spoilers",
    "eleven_herbs_and_spices": "you will never learn them from us"
}
```

Then `spin up --variable @secrets.json` will set the `sierra_madre` and `eleven_herbs_and_spices` variables.  (Similarly with TOML files.)

For the `@<file>.json` and `@<file>.toml` variants, the file content must be string keys to string values. Numeric or object/table values are not allowed.

## Troubleshooting

**"No provider resolved" error**

If you run into the following error, you've most likely not set the variable, either through the environment variable provider using the `SPIN_VARIABLE_` prefix or through another provider.

```console
Handler returned an error: Error::Provider("no provider resolved required variable \"YOUR_VARIABLE\"")
```

See [Dynamic Application Configuration](./dynamic-configuration#application-variables-runtime-configuration) for information on setting variable values via environment variables, or configuring secure variable providers.

**"No variable" error**

If you run into the following error, you've most likely not configured the component section in the `spin.toml` to have access to the variable specified.

```console
Handler returned an error: Error::Undefined("no variable for \"<component-id>\".\"your-variable\"")
```

To fix this, edit the `spin.toml` and add to the `[component.<component-id>.variables]` table a line such as `<your-variable> = "{{ app-variable }}".` See [above](#adding-variables-to-your-applications) for more information.