title = "Building Spin Components in JavaScript"
template = "main"
date = "2023-11-04T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v3/javascript-components.md"

---
- [Installing Templates](#installing-templates)
- [Structure of a JS/TS Component](#structure-of-a-jsts-component)
- [Building and Running the Template](#building-and-running-the-template)
- [HTTP Components](#http-components)
- [Sending Outbound HTTP Requests](#sending-outbound-http-requests)
  - [Intra-Application Requests in JavaScript](#intra-application-requests-in-javascript)
- [Storing Data in Redis From JS/TS Components](#storing-data-in-redis-from-jsts-components)
- [Storing Data in the Spin Key-Value Store](#storing-data-in-the-spin-key-value-store)
- [Storing Data in SQLite](#storing-data-in-sqlite)
- [Storing Data in MySQL and PostgreSQL Relational Databases](#storing-data-in-mysql-and-postgresql-relational-databases)
- [AI Inferencing From JS/TS Components](#ai-inferencing-from-jsts-components)
- [Node.js Compatibility](#nodejs-compatibility)
- [Using External NPM Libraries](#using-external-npm-libraries)
  - [Suggested Libraries for Common Tasks](#suggested-libraries-for-common-tasks)
- [Caveats](#caveats)

With JavaScript being a very popular language, Spin provides an SDK to support building components. The development of the JavaScript SDK is continually being worked on to improve user experience and add features. The SDK is based on [`ComponentizeJS`](https://github.com/bytecodealliance/ComponentizeJS).

> This guide assumes you have Spin installed. If this is your first encounter with Spin, please see the [Quick Start](quickstart), which includes information about installing Spin with the JavaScript templates and creating JavaScript and TypeScript applications.

> This guide assumes you are familiar with the JavaScript programming language,
> but if you are just getting started, be sure to check [the MDN guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide).

> All examples from this page can be found in [the JavaScript SDK repository on GitHub](https://github.com/spinframework/spin-js-sdk/tree/main/examples).

[**Want to go straight to the Spin SDK reference documentation?**  Find it here.](https://spinframework.github.io/spin-js-sdk/)

## Installing Templates

The JavaScript/TypeScript templates can be installed from [spin-js-sdk repository](https://github.com/spinframework/spin-js-sdk/tree/main/) using the following command:

<!-- @selectiveCpy -->

```bash
$ spin templates install --git https://github.com/spinframework/spin-js-sdk --update
```

which will install the `http-js` and `http-ts` templates:

<!-- @nocpy -->

```text
Copying remote template source
Installing template http-ts...
Installing template http-js...
Installed 2 template(s)

+-------------------------------------------------+
| Name      Description                           |
+=================================================+
| http-js   HTTP request handler using Javascript |
| http-ts   HTTP request handler using Typescript |
+-------------------------------------------------+
```

## Structure of a JS/TS Component

A new JS/TS component can be created using the following command:

<!-- @selectiveCpy -->

```bash
$ spin new -t http-ts hello-world --accept-defaults
```

This creates a directory of the following structure:

<!-- @nocpy -->

```text
hello-world
├── package.json
├── README.md
├── spin.toml
├── src
│   └── index.ts
├── tsconfig.json
└── webpack.config.js
```

The source for the component is present in `src/index.ts`. [Webpack](https://webpack.js.org) is used to bundle the component into a single `.js` file which will then be compiled to a `.wasm` module.

{{ details "Going from JavaScript to Wasm" "The JS source is compiled to a `wasm` module using the `j2w` node executable provided by the `@fermyon/spin-sdk` which is a wrapper around `ComponentizeJS` that is used to manage the dependencies."}}

## Building and Running the Template

First, the dependencies for the template need to be installed using the following commands:

<!-- @selectiveCpy -->

```bash
$ cd hello-world
$ npm install
```

Next step is to use the `spin build` command to run the build script for the component. Once a Spin compatible module is created, it can be run using `spin up`:

<!-- @selectiveCpy -->

```bash
$ spin build
$ spin up
```

`spin build` will execute the command in the `command` key under the `[component.<component-name>.build]` section from `spin.toml` for each component in your application. In this case an `npm` script will be run. The command in the `package.json` will looks something like:

<!-- @nocpy -->

```json
"scripts": {
    "build": "npx webpack --mode=production && npx mkdirp target && npx j2w -i dist.js -d combined-wit -n combined -o target/hello-world.wasm",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
```

---

## HTTP Components

In Spin, HTTP components are triggered by the occurrence of an HTTP request, and
must return an HTTP response at the end of their execution. Components can be
built in any language that compiles to WASI, and Javascript/TypeScript has improved support
for writing Spin components with the Spin JS/TS SDK.

> Make sure to read [the page describing the HTTP trigger](./http-trigger.md) for more
> details about building HTTP applications.

Building a Spin HTTP component with the JavaScript/TypeScript SDK now involves adding an event listener for the `fetch` event. This event listener handles incoming HTTP requests and allows you to construct and return HTTP responses.

Below is a complete implementation for such a component in TypeScript:

```javascript
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

## Sending Outbound HTTP Requests

If allowed, Spin components can send outbound HTTP requests using the `fetch` function.
Let's see an example of a component that makes a request to [an API that returns random animal facts](https://random-data-api.fermyon.app/animals/json)

```javascript
import { AutoRouter } from 'itty-router';

let router = AutoRouter();

router
    .get("*", getDataFromAPI)

async function getDataFromAPI(_request: Request) {
    let response = await fetch(
        'https://random-data-api.fermyon.app/physics/json',
    );
    let data = await response.json();
    let fact = `Here is a fact: ${data.fact}`;
    return new Response(fact);
}

//@ts-ignore
addEventListener('fetch', async (event: FetchEvent) => {
    event.respondWith(router.fetch(event.request));
});

```

Before we can execute this component, we need to add the `random-data-api.fermyon.app`
domain to the application manifest `allowed_outbound_hosts` list containing the list of
domains the component is allowed to make HTTP requests to:

<!-- @nocpy -->

```toml
spin_manifest_version = 2

[application]
authors = ["Your Name <your-name@example.com>"]
description = ""
name = "hello-world"
version = "0.1.0"

[[trigger.http]]
route = "/..."
component = "hello-world"

[component.hello-world]
source = "target/hello-world.wasm"
exclude_files = ["**/node_modules"]
allowed_outbound_hosts = ["https://random-data-api.fermyon.app"]
[component.hello-world.build]
command = "npm run build"
```

The component can be built using the `spin build` command. Running the application using `spin up` will start the HTTP listener locally (by default on `localhost:3000`):

<!-- @selectiveCpy -->

```text
$ curl -i localhost:3000
HTTP/1.1 200 OK
date = "2023-11-04T00:00:01Z"
content-type: application/json; charset=utf-8
content-length: 185
server: spin/0.1.0

Here is a fact: Reindeer grow new antlers every year
```

> Without the `allowed_outbound_hosts` field populated properly in `spin.toml`,
> the component would not be allowed to send HTTP requests, and sending the
> request would result in a "Destination not allowed" error.

> You can set `allowed_outbound_hosts = ["https://*:*"]` if you want to allow
> the component to make requests to any HTTP host. This is not recommended
> unless you have a specific need to contact arbitrary servers and perform your own safety checks.

We just built a WebAssembly component that sends an HTTP request to another
service, manipulates that result, then responds to the original request.
This can be the basis for building components that communicate with external
databases or storage accounts, or even more specialized components like HTTP
proxies or URL shorteners.

### Intra-Application Requests in JavaScript

JavaScript's `fetch` function handles relative URLs in a way that doesn't work well with Spin's fine-grained outbound HTTP permissions.
Therefore, when [making a request to another route within the same application](./http-outbound#intra-application-http-requests-by-route),
you must use the special pseudo-host `self.alt` rather than a relative route.  For example:

```javascript
await fetch('/api');  // Avoid!
await fetch('http://self.alt/api');  // Prefer!
```

You must [add `http://self` or `http://self.alt` to the component's `allowed_outbound_hosts`](./http-outbound#intra-application-http-requests-by-route).

---

## Storing Data in Redis From JS/TS Components

> You can find a complete example for using outbound Redis from an HTTP component
> in the [spin-js-sdk repository on GitHub](https://github.com/spinframework/spin-js-sdk/blob/main/examples/spin-host-apis/spin-redis).

We can install and use the `@spinframework/spin-redis` package to use the Redis key/value store and to publish messages to Redis channels.

Let's see how we can use the JS/TS SDK to connect to Redis:

```javascript
import { AutoRouter } from 'itty-router';
import { Redis } from '@spinframework/spin-redis';

const encoder = new TextEncoder();
const redisAddress = 'redis://localhost:6379/';

let router = AutoRouter();

router
    .get("/", () => {
        try {
            let db = Redis.open(redisAddress);
            db.set('test', encoder.encode('Hello world'));
            let val = db.get('test');

            if (!val) {
                return new Response(null, { status: 404 });
            }
            return new Response(val);
        } catch (e: any) {
            return new Response(`Error: ${JSON.stringify(e.payload)}`, { status: 500 });
        }
    })

//@ts-ignore
addEventListener('fetch', async (event: FetchEvent) => {
    event.respondWith(router.fetch(event.request));
});

```

This HTTP component demonstrates fetching a value from Redis by key, setting a key with a value, and publishing a message to a Redis channel.

> When using Redis databases hosted on the internet (i.e) not on localhost, the `redisAddress` must be of the format "redis://\<USERNAME\>:\<PASSWORD\>@\<REDIS_URL\>" (e.g) `redis://myUsername:myPassword@redis-database.com`

As with all networking APIs, you must grant access to Redis hosts via the `allowed_outbound_hosts` field in the application manifest:

<!-- @nocpy -->

```toml
[component.storage-demo]
allowed_outbound_hosts = ["redis://localhost:6379"]
```

## Storing Data in the Spin Key-Value Store

Spin has a key-value store built in. For information about using it from TypeScript/JavaScript, see [the key-value store tutorial](key-value-store-tutorial).

## Storing Data in SQLite

We can use the `@spinframework/spin-sqlite` package to interact with Spin's SQLite interface. 

For more information about using SQLite from TypeScript/Javascript, see [SQLite storage](sqlite-api-guide).

## Storing Data in MySQL and PostgreSQL Relational Databases

We can use the `@spinframework/spin-mysql`, `@spinframework/spin-postgres` package to interact with Spin's RDBMS interfaces.

For more information about using relational databases from TypeScript/JavaScript, see [Relational Databases](rdbms-storage).

## AI Inferencing From JS/TS Components

We can use the `@spinframework/spin-llm` package to interact with Spin's LLM interface.

For more information about using Serverless AI from JS/TS, see the [Serverless AI](serverless-ai-api-guide) API guide.

## Node.js Compatibility

The SDK does not support the full specification of `Node.js`. A limited set of APIs can be polyfilled using the [`@fermyon/wasi-ext`](https://github.com/fermyon/js-wasi-ext) library which provides a webpack plugin. It can be used by installing the  library first using:

<!-- @selectiveCpy -->

```bash
$ npm install @spinframework/wasi-ext
```

Once installed, the plugin provided by it can be added to the webpack config: 

```js
import WasiExtPlugin from "@spinframework/wasi-ext/plugin/index.js";

export default config = () => {
    ...
    return {
        ...
        plugins: [
            new WasiExtPlugin()
        ],
        ...
    }
}
```

This library only currently supports the following polyfills:

- `Node.js` buffers
- `process` - certain methods are no-ops and few throw exceptions. For detailed list refer to the [upstream library](https://github.com/defunctzombie/node-process/blob/master/browser.js). **Note:** `process.env` is populated only inside the handler and returns an empty object outside the handler.
- `fs` - only implements `readFileSync` and `readdirSync`.
- `os` - Implements only `EOL` and `arch`.


## Using External NPM Libraries

> Not all the NPM packages are guaranteed to work with the SDK as it is not fully compatible with the browser or `Node.js`. It implements only a subset of the API.

Some NPM packages can be installed and used in the component. If a popular library does not work, please open an issue/feature request in the [spin-js-sdk repository](https://github.com/spinframework/spin-js-sdk/issues).


### Suggested Libraries for Common Tasks

These are some of the suggested libraries that have been tested and confirmed to work with the SDK for common tasks.

{{ details "HTML parsers" "- [node-html-parser](https://www.npmjs.com/package/node-html-parser)" }}

{{ details "Parsing formdata" "- [parse-multipart-data](https://www.npmjs.com/package/parse-multipart-data)" }} 

{{ details "Runtime schema validation" "- [zod](https://www.npmjs.com/package/zod)" }} 

{{ details "Unique ID generator" "- [nanoid](https://www.npmjs.com/package/nanoid)\n- [ulidx](https://www.npmjs.com/package/ulidx)\n- [uuid](https://www.npmjs.com/package/uuid)" }} 

## Caveats

- All `spin-sdk` related functions and methods (like `Variables`, `Redis`, `Mysql`, `Pg`, `Kv` and `Sqlite`) can be called only inside the fetch event handler. This includes `fetch`. Any attempts to use it outside the function will lead to an error. This is due to Wizer using only Wasmtime to execute the script at build time, which does not include any Spin SDK support.
- No crypto operation that involve handling private keys are supported. 
