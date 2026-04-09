title = "Building Spin Components in Python"
template = "main"
date = "2023-11-04T00:00:01Z"
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v4/python-components.md"

---
- [Prerequisite](#prerequisite)
- [Spin's Python HTTP Request Handler Template](#spins-python-http-request-handler-template)
- [Creating a New Python Component](#creating-a-new-python-component)
  - [System Housekeeping (Use a Virtual Environment)](#system-housekeeping-use-a-virtual-environment)
  - [Requirements](#requirements)
- [Structure of a Python Component](#structure-of-a-python-component)
- [A Simple HTTP Components Example](#a-simple-http-components-example)
  - [Building and Running the Application](#building-and-running-the-application)
- [A HTTP Request Parsing Example](#a-http-request-parsing-example)
  - [Building and Running the Application](#building-and-running-the-application-1)
- [An Outbound HTTP Example](#an-outbound-http-example)
  - [Configuring Outbound Requests](#configuring-outbound-requests)
  - [Building and Running the Application](#building-and-running-the-application-2)
- [An Outbound Redis Example](#an-outbound-redis-example)
  - [Configuring Outbound Redis](#configuring-outbound-redis)
  - [Building and Running the Application](#building-and-running-the-application-3)
- [Async and Streaming Idioms in Python](#async-and-streaming-idioms-in-python)
  - [Spawning Asynchronous Tasks](#spawning-asynchronous-tasks)
  - [Creating Futures and Streams](#creating-futures-and-streams)
- [Storing Data in the Spin Key-Value Store](#storing-data-in-the-spin-key-value-store)
- [Storing Data in SQLite](#storing-data-in-sqlite)
- [AI Inferencing From Python Components](#ai-inferencing-from-python-components)
- [Troubleshooting](#troubleshooting)

With <a href="https://www.python.org/" target="_blank">Python</a> being a very popular language, Spin provides support for building components with Python; [using an experimental SDK](https://github.com/spinframework/spin-python-sdk). The development of the Python SDK is continually being worked on to improve user experience and also add new features. 

> This guide assumes you have Spin installed. If this is your first encounter with Spin, please see the [Quick Start](quickstart), which includes information about installing Spin with the Python templates, installing required tools, and creating Python applications.

> This guide assumes you are familiar with the Python programming language, but if you are just getting started, be sure to check out <a href="https://docs.python.org/3/" target="_blank">the official Python documentation</a> and comprehensive <a href="https://docs.python.org/3/reference/" target="_blank">language reference</a>.

[**Want to go straight to the Spin SDK reference documentation?**  Find it here.](https://spinframework.github.io/spin-python-sdk/v4)

## Prerequisite

Ensure that you have Python 3.10 or later installed on your system. You can check your Python version by running:

```bash
python3 --version
```

If you do not have Python 3.10 or later, you can install it by following the instructions [here](https://www.python.org/downloads/).

## Spin's Python HTTP Request Handler Template

Spin's Python HTTP Request Handler Template can be installed from [spin-python-sdk repository](https://github.com/spinframework/spin-python-sdk) using the following command:

<!-- @selectiveCpy -->

```bash
$ spin templates install --git https://github.com/spinframework/spin-python-sdk --update
```

The above command will install the `http-py` template and produce an output similar to the following:

<!-- @nocpy -->

```text
Copying remote template source
Installing template http-py...
Installed 1 template(s)

+---------------------------------------------+
| Name      Description                       |
+=============================================+
| http-py   HTTP request handler using Python |
+---------------------------------------------+
```

**Please note:** For more information about managing Spin templates, see the [templates guide](./managing-templates).

## Creating a New Python Component

A new Python component can be created using the following command:

<!-- @selectiveCpy -->

```bash
$ spin new -t http-py hello-world --accept-defaults
```

### System Housekeeping (Use a Virtual Environment)

Once the component is created, we can change into the `hello-world` directory, create and activate a virtual environment and then install the component's requirements:

<!-- @selectiveCpy -->

```console
$ cd hello-world
```

Create a virtual environment directory (we are still inside the Spin app directory):

<!-- @selectiveCpy -->

```console
# python<version> -m venv <virtual-environment-name>
$ python3 -m venv venv-dir
```

Activate the virtual environment (this command depends on which operating system you are using):

<!-- @selectiveCpy -->

```console
# macOS command to activate
$ source venv-dir/bin/activate
```

If you are using Windows, use the following commands:

```bash
C:\Work> python3 -m venv venv
C:\Work> venv\Scripts\activate
```

The `(venv-dir)` will prefix your terminal prompt now:

<!-- @nocpy -->

```console
(venv-dir) user@123-456-7-8 hello-world %
```

### Requirements

The `requirements.txt`, by default, contains the references to the `spin-sdk` and [`componentize-py`](https://github.com/bytecodealliance/componentize-py) packages. These can be installed in your virtual environment using the following command:

<!-- @selectiveCpy -->

```bash
$ pip3 install -r requirements.txt 
```

## Structure of a Python Component

The `hello-world` directory structure created by the Spin `http-py` template is shown below:

<!-- @nocpy -->

```text
├── app.py
├── spin.toml
└── requirements.txt 
```

The `spin.toml` file will look similar to the following:

<!-- @nocpy -->

```toml
spin_manifest_version = 2

[application]
name = "hello-world"
version = "0.1.0"
authors = ["Your Name <your-name@example.com>"]
description = ""

[[trigger.http]]
route = "/..."
component = "hello-world"

[component.hello-world]
source = "app.wasm"
[component.hello-world.build]
command = "componentize-py -w spin:up/http-trigger@4.0.0 componentize app -o app.wasm"
```

## A Simple HTTP Components Example

In Spin, HTTP components are triggered by the occurrence of an HTTP request and must return an HTTP response at the end of their execution. Components can be built in any language that compiles to WASI. If you would like additional information about building HTTP applications you may find [the HTTP trigger page](./http-trigger.md) useful.

Building a Spin HTTP component using the Python SDK means defining a top-level class named HttpHandler which inherits from [`HttpHandler`](https://spinframework.github.io/spin-python-sdk/v4/wit/exports/index.html#spin_sdk.wit.exports.HttpHandler), overriding the `handle_request` method. Here is an example of the default Python code which the previous `spin new` created for us; a simple example of a request/response:

<!-- @nocpy -->

```python
from spin_sdk.http import Handler, Request, Response

class HttpHandler(Handler):
    async def handle_request(self, request: Request) -> Response:
        return Response(
            200,
            {"content-type": "text/plain"},
            bytes("Hello from Python!", "utf-8")
        )
```

The important things to note in the implementation above:

- the `handle_request` method is the entry point for the Spin component.
- the component returns a `spin_sdk.http.Response`.

### Building and Running the Application

All you need to do is run the `spin build` command from within the project's directory; as shown below:

<!-- @selectiveCpy -->

```bash
$ spin build
```

Essentially, we have just created a new Spin compatible module which can now be run using the `spin up` command, as shown below:

<!-- @selectiveCpy -->

```bash
$ spin up
```

With Spin running our application in our terminal, we can now go ahead (grab a new terminal) and call the Spin application via an HTTP request:

<!-- @selectiveCpy -->

```bash
$ curl -i localhost:3000

HTTP/1.1 200 OK
content-type: text/plain
content-length: 25

Hello from Python!
```

## A HTTP Request Parsing Example

The following snippet shows how you can access parts of the request e.g. the `request.method` and the `request.body`:

<!-- @nocpy -->

```python
import json
from spin_sdk import http
from spin_sdk.http import Request, Response

class HttpHandler(http.Handler):
    async def handle_request(self, request: Request) -> Response:
        # Access the request.method
        if request.method == 'POST':
            # Read the request.body as a string
            json_str = request.body.decode('utf-8')
            # Create a JSON object representation of the request.body
            json_object = json.loads(json_str)
            # Access a value in the JSON object
            name = json_object['name']
            # Print the variable to console logs
            print(name)
            # Print the type of the variable to console logs
            print(type(name))
            # Print the available methods of the variable to the console logs
            print(dir(name))
        return Response(200,
                    {"content-type": "text/plain"},
                    bytes(f"Practicing reading the request object", "utf-8"))
```

### Building and Running the Application

All you need to do is run the `spin build --up` command from within the project's directory; as shown below:

<!-- @selectiveCpy -->

```bash
$ spin build --up
```

With Spin running our application in our terminal, we can now go ahead (grab a new terminal) and call the Spin application via an HTTP request:

<!-- @selectiveCpy -->

```bash
$ curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"name":"Python"}' \
  http://localhost:3000/

HTTP/1.1 200 OK
content-type: text/plain
content-length: 37
date: Mon, 15 Apr 2024 04:26:00 GMT

Practicing reading the request object
```

The response "Practicing reading the request object" is returned as expected. In addition, if we check the terminal where Spin is running, we will see that the console logs printed the following:

The value of the variable called `name`:

<!-- @nocpy -->

```bash
Python
```

The `name` variable type (in this case a Python string):

<!-- @nocpy -->

```bash
<class 'str'>
```

The methods available to that type:

<!-- @nocpy -->

```bash
['__add__', '__class__', '__contains__', '__delattr__', '__dir__', '__doc__', '__eq__', '__format__',
... abbreviated ...
'rstrip', 'split', 'splitlines', 'startswith', 'strip', 'swapcase', 'title', 'translate', 'upper', 'zfill']
```

> **Please note:** All examples from this documentation page can be found in [the Python SDK repository on GitHub](https://github.com/spinframework/spin-python-sdk/tree/main/examples). If you are following along with these examples and don't get the desired result perhaps compare your own code with our previously built examples (mentioned above). Also please feel free to reach out on [Spin CNCF Slack channel](https://cloud-native.slack.com/archives/C089NJ9G1V0) if you have any questions or need any additional support.

## An Outbound HTTP Example

This next example will create an outbound request, to obtain a random fact about animals, which will be returned to the calling code. If you would like to try this out, you can go ahead and update your existing `app.py` file from the previous step; using the following source code:

<!-- @nocpy -->

```python
from spin_sdk import http   
from spin_sdk.http import Request, Response, send

class HttpHandler(http.Handler):
    async def handle_request(self, request: Request) -> Response:
        resp = await send(Request("GET", "https://random-data-api.fermyon.app/animals/json", {}, None))

        return Response(
            200,
            {"content-type": "text/plain"},
            bytes(f"Here is an animal fact: {str(resp.body, 'utf-8')}", "utf-8")
        )
```

### Configuring Outbound Requests

The Spin framework protects your code from making outbound requests to just any URL. For example, if we try to run the above code **without any additional configuration**, we will correctly get the following error `AssertionError: HttpError::DestinationNotAllowed`. To allow our component to request the `random-data-api.fermyon.app` domain, all we have to do is add that domain to the specific component of the application that is making the request. Here is an example of an updated `spin.toml` file where we have added `allowed_outbound_hosts`:

<!-- @nocpy -->

```toml
spin_manifest_version = 2

[application]
name = "hello-world"
version = "0.1.0"
authors = ["Your Name <your-name@example.com>"]
description = ""

[[trigger.http]]
route = "/..."
component = "hello-world"

[component.hello-world]
source = "app.wasm"
allowed_outbound_hosts = ["https://random-data-api.fermyon.app"]
[component.hello-world.build]
command = "componentize-py -w spin:up/http-trigger@4.0.0 componentize app -o app.wasm"
watch = ["*.py", "requirements.txt"]
```

### Building and Running the Application

Run the `spin build --up` command from within the project's directory; as shown below:

<!-- @selectiveCpy -->

```bash
$ spin build --up
```

With Spin running our application in our terminal, we can now go ahead (grab a new terminal) and call the Spin application via an HTTP request:

<!-- @selectiveCpy -->

```bash
$ curl -i localhost:3000
HTTP/1.1 200 OK
content-type: text/plain
content-length: 99
date: Mon, 15 Apr 2024 04:52:45 GMT

Here is an animal fact: {"timestamp":1713156765221,"fact":"Bats are the only mammals that can fly"}
```

## An Outbound Redis Example

In this final example, we talk to an existing Redis instance. You can find the official [instructions on how to install Redis here](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/). We also gave a quick run-through on setting up Redis with Spin in our previous article called [Persistent Storage in Webassembly Applications](https://www.fermyon.com/blog/persistent-storage-in-webassembly-applications), so please take a look at that blog if you need a hand.

### Configuring Outbound Redis

After installing Redis on localhost, we add two entries to the `spin.toml` file:

* `variables = { redis_address = "redis://127.0.0.1:6379" }` externalizes the URL of the server to access
* `allowed_outbound_hosts = ["redis://127.0.0.1:6379"]` enables network access to the host and port where Redis is running

<!-- @nocpy -->

```toml
spin_manifest_version = 2

[application]
name = "hello-world"
version = "0.1.0"
authors = ["Your Name <your-name@example.com>"]
description = ""

[[trigger.http]]
route = "/..."
component = "hello-world"

[component.hello-world]
source = "app.wasm"
variables = { redis_address = "redis://127.0.0.1:6379" }
allowed_outbound_hosts = ["redis://127.0.0.1:6379"]
[component.hello-world.build]
command = "componentize-py -w spin:up/http-trigger@4.0.0 componentize app -o app.wasm"
```

If you are still following along, please go ahead and update your `app.py` file one more time, as follows:

<!-- @nocpy -->

```python
from spin_sdk import http, redis, variables
from spin_sdk.http import Request, Response

class HttpHandler(http.Handler):
    async def handle_request(self, request: Request) -> Response:
        with await redis.open(await variables.get("redis_address")) as db:
            await db.set("foo", b"bar")
            value = await db.get("foo")
            await db.incr("testIncr")
            await db.sadd("testSets", ["hello", "world"])
            content = await db.smembers("testSets")
            await db.srem("testSets", ["hello"])
            assert value == b"bar", f"expected \"bar\", got \"{str(value, 'utf-8')}\""

        return Response(
            200,
            {"content-type": "text/plain"},
            bytes(f"Executed outbound Redis commands: {request.uri}", "utf-8")
        )
```

### Building and Running the Application

Run the `spin build --up` command from within the project's directory; as shown below:

<!-- @selectiveCpy -->

```bash
$ spin build --up
```

In a new terminal, make the request via the curl command, as shown below:

<!-- @selectiveCpy -->

```bash
$ curl -i localhost:3000
HTTP/1.1 200 OK
content-type: text/plain
content-length: 35
date: Mon, 15 Apr 2024 05:53:17 GMT

Executed outbound Redis commands: /
```

If we go into our Redis CLI on localhost we can see that the value `foo` which was set in the Python source code ( `redis_set(redis_address, "foo", b"bar")` ) is now correctly set to the value of `bar`:

<!-- @nocpy -->

```bash
redis-cli
127.0.0.1:6379> get foo
"bar"
```

## Async and Streaming Idioms in Python

When a Spin API returns a potentially large number of values, such as database query APIs, the convention is to return the values as a asynchronous iterator (`componentize_py_async_support.streams.StreamReader`), plus a future (`componentize_py_async_support.futures.FutureReader`) containing the result of the operation. For example, the key-value `Store::get_keys` function returns a stream of strings and a future of 'either OK or error'. This signature is likely to be unfamiliar. The way to read it is:

- Spin will stream values to you until either there are no more values, or an error occurs.
- When that happens, you must `await` the future to find out which one it was.

For example, here's how you might use `Store::get_keys`:

```python
stream, future = await store.get_keys()

with stream, future:
    while not stream.writer_dropped: # check if at the end of the stream
        batch = await stream.read(max_count=100)
        # do something with `batch`

    result = await result.read() # check if the key stream hit an error
    if isinstance(result, Err):
        raise result
    else:
        pass
```

The future does not resolve until the stream ends, so be sure not to await it until you've finished with the stream.

> If the data set is small enough to fit in memory and you are happy to wait for the last item, use `spin_sdk.util.collect` function that collects all the streamed values into a list, and checks for an error. For example, `all_keys = spin_sdk.util.collect(await store.get_keys())`.

### Spawning Asynchronous Tasks

You can spawn an asynchronous task in a component using the `componentize_py_async_support.spawn()` function, passing it a future. The future is then run to completion in the background.  The task may outlive the entry point of your component - this is crucial in, for example, the HTTP trigger, where your handler function doesn't necessarily want to wait for all response data to be available before it starts sending.

### Creating Futures and Streams

The Python SDK provides `spin_sdk.wit.*` functions for creating Wasm Component Model futures and streams. The bindings contain a corresponding function for each concrete future or stream type mentioned in the Spin and WASI APIs.

To create a future, call `spin_sdk.wit.<type>_future()` - for example, `spin_sdk.wit.fields_future()`. This returns a writer (which you can use later to complete the future) and a reader (representing the future which will eventually resolve to a value).

To create a stream, call `spin_sdk.wit.<type>_stream()` - for example, `spin_sdk.wit.byte_stream()` is a byte stream. Again, this returns a writer and a reader. The writer is typically handed to a background task (created using `spawn`) to asynchronously send values into the stream. The reader is typically passed to an API that takes a stream parameter, for example acting as the body in an HTTP response.

For generic types, the type name in the function is formed by concatenation, so you may see things like `result_option_wasi_http_types_fields_wasi_http_types_error_code_future` at the bindings level.

## Storing Data in the Spin Key-Value Store

Spin has a key-value store built in. For information about using it from Python, see [the key-value store API guide](kv-store-api-guide).

## Storing Data in SQLite

For more information about using SQLite from Python, see [SQLite storage](sqlite-api-guide).

## AI Inferencing From Python Components

For more information about using Serverless AI from Python, see the [Serverless AI](serverless-ai-api-guide) API guide.

## Troubleshooting

If you bump into issues when installing the requirements.txt. For example:

<!-- @nocpy -->

```console
error: externally-managed-environment
× This environment is externally managed
```

Please note, this error is specific to Homebrew-installed Python installations and occurs because installing a **non-brew-packaged** Python package requires you to either:
- create a virtual environment using `python3 -m venv path/to/venv`, or
- use the `--break-system-packages` option in your `pip3 install` command i.e. `pip3 install -r requirements.txt --break-system-packages`

We recommend installing a virtual environment using `venv`, as shown in the [system housekeeping section](#system-housekeeping-use-a-virtual-environment) above.

For all Python examples, please ensure that you have Python 3.10 or later installed on your system. You can check your Python version by running:

```bash
python3 --version
```

If you do not have Python 3.10 or later, you can install it by following the instructions [here](https://www.python.org/downloads/).
