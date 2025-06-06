date = "2023-11-04T00:00:01Z"
title = "Build your first AI app using Serverless AI Inferencing"
description = "Getting Started with building your AI app in Python, Rust or TypeScript"
template = "main"
tags = ["ai", "serverless", "getting started"]
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v3/serverless-ai-hello-world.md"

---

- [Tutorial Prerequisites](#tutorial-prerequisites)
  - [Spin](#spin)
  - [Dependencies](#dependencies)
- [Licenses](#licenses)
- [Serverless AI Inferencing With Spin](#serverless-ai-inferencing-with-spin)
  - [Creating a New Spin Application](#creating-a-new-spin-application)
  - [Configuring Your Application](#configuring-your-application)
  - [Source Code](#source-code)
  - [Building and Deploying Your Spin Application](#building-and-deploying-your-spin-application)
- [Next Steps](#next-steps)

This tutorial will show you how to use Fermyon Serverless AI to quickly build your first AI-enabled serverless application that can run on Fermyon Cloud.
In this tutorial we will:

* Install Spin (and dependencies) on your local machine
* Create a ‘Hello World’ Serverless AI application
* Learn about the Serverless AI SDK (in Rust, TypeScript and Python)

Here's a video walkthrough of this tutorial

<iframe width="560" height="315" src="https://www.youtube.com/embed/TyP-BSy-gi4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe> 

## Tutorial Prerequisites

### Spin

You will need to [install the latest version of Spin](install#installing-spin). Serverless AI is supported on Spin v1.5 and above
If you already have Spin installed, [check what version you are on and upgrade](upgrade#are-you-on-the-latest-version) if required.

### Dependencies
 
**Rust**
The above installation script automatically installs the latest SDKs for Rust, which enables Serverless AI functionality. 

**TypeScript/Javascript**
 
To enable Serverless AI functionality via TypeScript/Javascript, please ensure you have the latest TypeScript/JavaScript template installed:
 
<!-- @selectiveCpy -->
 
```bash
$ spin templates install --git https://github.com/spinframework/spin-js-sdk --upgrade
```
 
**Python**

Ensure that you have Python 3.10 or later installed on your system. You can check your Python version by running:

```bash
python3 --version
```

If you do not have Python 3.10 or later, you can install it by following the instructions [here](https://www.python.org/downloads/).


To enable Serverless AI functionality via Python, please ensure you have the latest Python template installed:

<!-- @selectiveCpy -->

```bash
$ spin templates install --git https://github.com/spinframework/spin-python-sdk --update
```
 
As a standard practice for Python, create and activate a virtual env:

If you are on a Mac/linux based operating system use the following commands:

```bash
$ python3 -m venv venv
$ source venv/bin/activate
```

If you are using Windows, use the following commands:

```bash
C:\Work> python3 -m venv venv
C:\Work> venv\Scripts\activate
```
 
## Licenses
 
> This tutorial uses Meta AI's Llama 2, Llama Chat and Code Llama models you will need to visit Meta's Llama webpage and agree to Meta's License, Acceptable Use Policy, and to Meta’s privacy policy before fetching and using Llama models.
 
## Serverless AI Inferencing With Spin 
 
Now, let's write your first Serverless AI application with Spin.
 
### Creating a New Spin Application
 
{{ tabs "sdk-type" }}
 
{{ startTab "Rust"}}

The Rust code snippets below are taken from the [Fermyon Serverless AI Examples](https://github.com/fermyon/ai-examples/).
 
<!-- @selectiveCpy -->
 
```bash
$ spin new -t http-rust
Enter a name for your new application: hello-world
Description: My first Serverless AI app
HTTP path: /...
```
 
{{ blockEnd }}
 
{{ startTab "Python" }}
 
The Python code snippets below are taken from the [Fermyon Serverless AI Examples](https://github.com/fermyon/ai-examples/).
 
<!-- @selectiveCpy -->
 
```bash
# Create new app
$ spin new -t http-py hello-world --accept-defaults
# Change into app directory
$ cd hello-world
Enter a name for your new application: hello-world
Description: My first Serverless AI app
HTTP path: /...
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

The `(venv-dir)` will prefix your terminal prompt now:

<!-- @nocpy -->

```console
(venv-dir) user@123-456-7-8 hello-world %
```

The `requirements.txt`, by default, contains the references to the `spin-sdk` and `componentize-py` packages. These can be installed in your virtual environment using the following command:

<!-- @selectiveCpy -->

```bash
$ pip3 install -r requirements.txt 
```
 
{{ blockEnd }}
 
{{ startTab "TypeScript" }}
 
The TypeScript code snippets below are taken from the [Fermyon Serverless AI Examples](https://github.com/fermyon/ai-examples/).
 
<!-- @selectiveCpy -->
 
```bash
$ spin new -t http-ts
Enter a name for your new application: hello-world
Description: My first Serverless AI app
HTTP path: /...
```
 
{{ blockEnd }}
{{ blockEnd }}
 
### Configuring Your Application
 
The `spin.toml` file is the manifest file which tells Spin what events should trigger what components. Configure the `[component.hello-world]` section of our application's manifest explicitly naming our model of choice. For this example, we specify the `llama2-chat` value for our `ai_models` configuration:
 
```toml
ai_models = ["llama2-chat"]
```
 
This is what your `spin.toml` file should look like, based on whether you’re using Rust, TypeScript or Python:
 
{{ tabs "sdk-type" }}
 
{{ startTab "Rust"}}
 
<!-- @selectiveCpy -->
 
```toml
spin_manifest_version = 2

[application]
name = "hello-world"
version = "0.1.0"
authors = ["Your Name <your-name@example.com>"]
description = "My first Serverless AI app"

[[trigger.http]]
route = "/..."
component = "hello-world"

[component.hello-world]
source = "target/wasm32-wasip1/release/hello_world.wasm"
allowed_outbound_hosts = []
ai_models = ["llama2-chat"]
[component.hello-world.build]
command = "cargo build --target wasm32-wasip1 --release"
watch = ["src/**/*.rs", "Cargo.toml"]
```
 
{{ blockEnd }}
 
{{ startTab "TypeScript" }}
 
<!-- @selectiveCpy -->
 
```toml
spin_manifest_version = 2

[application]
authors = ["Your Name <your-name@example.com>"]
description = "My first Serverless AI app"
name = "hello-world"
version = "0.1.0"

[[trigger.http]]
route = "/..."
component = "hello-world"

[component.hello-world]
source = "target/hello-world.wasm"
exclude_files = ["**/node_modules"]
ai_models = ["llama2-chat"]
[component.hello-world.build]
command = "npm run build"
```
 
{{ blockEnd }}
 
{{ startTab "Python" }}
 
<!-- @selectiveCpy -->
 
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
source = "app.wasm"
ai_models = ["llama2-chat"]
[component.hello-world.build]
command = "componentize-py -w spin-http componentize app -o app.wasm"
watch = ["*.py", "requirements.txt"]
```
 
{{ blockEnd }}
{{ blockEnd }}
 
### Source Code
 
Now let's use the Spin SDK to access the model from our app. Executing inference from a LLM is a single line of code. Add the `Llm` and the `InferencingModels` to your app and use the `Llm.infer` to execute an inference. Here’s how the code looks:
 
{{ tabs "sdk-type" }}
 
{{ startTab "Rust"}}
 
```rust
use spin_sdk::{http::{IntoResponse, Request, Response}, http_component, llm};

#[http_component]
fn hello_world(_req: Request) -> anyhow::Result<impl IntoResponse> {
   let model = llm::InferencingModel::Llama2Chat;
   let inference = llm::infer(model, "Can you tell me a joke about cats");
    Ok(Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body(format!("{:?}", inference))
        .build())
}
```
 
{{ blockEnd }}
 
{{ startTab "TypeScript"}}
 
```typescript

import { AutoRouter } from 'itty-router';
import { Llm } from '@fermyon/spin-sdk';

const  model = InferencingModels.Llama2Chat

let router = AutoRouter();

router
    .get("/", () => {
        const out = Llm.infer(model, prompt)

        return new Response(out.text);
    })

//@ts-ignore
addEventListener('fetch', async (event: FetchEvent) => {
    event.respondWith(router.fetch(event.request));
});

```
 
{{ blockEnd }}
 
{{ startTab "Python"}}
 
```python
from spin_sdk import http
from spin_sdk.http import Request, Response
from spin_sdk import llm

class IncomingHandler(http.IncomingHandler):
    def handle_request(self, request: Request) -> Response:
        res = llm.infer_with_options("llama2-chat", "Can you tell me a joke about cats?", llm.LLMInferencingParams(temperature=0.5))
        return Response(
            200,
            {"content-type": "text/plain"},
            bytes(res.text, "utf-8")
        )


```
 
{{ blockEnd }}
 
{{ blockEnd }}
 
### Building and Deploying Your Spin Application
 
Now that you have written your first Serverless AI app, it’s time to build and deploy it. To build your app run the following commands from inside your app’s folder (where the `spin.toml` file is located):
 
{{ tabs "sdk-type" }}
 
{{ startTab "Rust"}}
 
<!-- @selectiveCpy -->
 
```bash
$ spin build
```
 
{{ blockEnd }}
 
{{ startTab "TypeScript" }}
 
<!-- @selectiveCpy -->
 
```bash

$ npm install
$ spin build

```

{{ blockEnd }}
{{ startTab "Python" }}

<!-- @selectiveCpy -->
 
```bash
$ spin build
```

{{ blockEnd }}
 
Now that your app is built, there are three ways to test your Serverless AI app. One way to test the app is to run inferencing locally. This means running a LLM on your CPU. This is not as optimal compared to deploying to Fermyon’s Serverless AI, which uses high-powered GPUs in the cloud. To know more about this method, including downloading LLMs to your local machine, check out [the in-depth tutorial](ai-sentiment-analysis-api-tutorial) on Building a Sentiment Analysis API using Serverless AI.
 
Here are the two other methods for testing your app:
 
**Deploy the app to the Fermyon Cloud**
 
You can deploy the app to the cloud by using the `spin deploy` command. In case you have not logged into your account before deploying your application, you need to grant access via a one-time token. Follow the instructions in the prompt to complete the auth process.
 
Once you have logged in and the app is deployed, you will see a URL, upon successful deployment. The app is now deployed and can be accessed by anyone with the URL:
 
```bash
$ spin deploy

>Uploading hello-world version 0.1.0+ra01f74e2...
Deploying...
Waiting for application to become ready...... ready
Available Routes:
hello-world: https://hello-world-XXXXXX.fermyon.app (wildcard)
```
 
The app’s manifest file reads the line `ai_models = ["llama2-chat"]` and uses that model in the cloud. For any changes to take effect in the app, it needs to be re-deployed to the cloud.
 
**Using the Cloud-GPU plugin to test locally**
 
To avoid having to deploy the app for every change, you can use the [Cloud-GPU plugin](https://github.com/fermyon/spin-cloud-gpu) to deploy locally, with the LLM running in the cloud. While the app is hosted locally (running on `localhost`), every inferencing request is sent to the LLM that is running in the cloud. Follow the steps to use the `cloud-gpu` plugin.
 
**Note**: This plugin works only with spin v1.5.1 and above.
 
First, install the plugin using the command:
 
```bash
$ spin plugins install -u https://github.com/fermyon/spin-cloud-gpu/releases/download/canary/cloud-gpu.json -y
```
 
Let’s initialize the plugin. This command essentially deploys the Spin app to a Cloud GPU proxy and generates a runtime-config:
 
```bash
$ spin cloud-gpu init

[llm_compute]
type = "remote_http"
url = "https://fermyon-cloud-gpu-<AUTO_GENERATED_STRING>.fermyon.app"
auth_token = "<AUTO_GENERATED_TOKEN>"
```
 
In the root of your Spin app directory, create a file named `runtime-config.toml` and paste the runtime-config generated in the previous step.
 
Now you are ready to test the Serverless AI app locally, using a GPU that is running in the cloud. To deploy the app locally you can use `spin up` (or `spin watch`) but with the following flag:
 
```bash
$ spin up --runtime-config-file <path/to/runtime-config.toml>

Logging component stdio to  ".spin/logs/"
Serving http://127.0.0.1:3000
Available Routes:
hello-world: http://127.0.0.1:3000 (wildcard)
```
 
## Next Steps
 
This was just a small example of what Serverless AI Inferencing can do. To check out more detailed code samples:
 
- Read [our in-depth tutorial](ai-sentiment-analysis-api-tutorial) on building a Sentiment Analysis API with Serverless AI
- Look at the [Serverless AI API Guide](serverless-ai-api-guide)
- Try the numerous Serverless AI examples in our GitHub repository called [ai-examples](https://github.com/fermyon/ai-examples).
- [Contribute](../../hub/contributing) your Serverless AI app to our [Spin Hub](../../hub/index).
- Ask questions and share your thoughts in [Spin's CNCF Slack channel](https://cloud-native.slack.com/archives/C089NJ9G1V0).
---
