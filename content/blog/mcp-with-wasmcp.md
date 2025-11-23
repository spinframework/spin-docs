title = "Build MCP Servers with Wasmcp and Spin"
date = "2025-11-20T10:15:47Z"
template = "blog_post"
description = "Introducing a new approach to building MCP servers on the WebAssembly component model."
tags = ["agents", "ai", "llm", "mcp", "model"]

[extra]
type = "post"
author = "Ian McDonald"

---

[Wasmcp](https://github.com/wasmcp/wasmcp) is a [WebAssembly Component](https://component-model.bytecodealliance.org/) Development Kit for the [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro).

It works with [Spin](https://github.com/spinframework/spin) to let you:

* Build composable MCP servers as WebAssembly components.
* Mix tools and features written in Rust, Python, TypeScript, etc. in a single server binary.
* Plug in shared components for authorization, sessions, logging, and more across multiple MCP servers.
* Run the same sandboxed MCP server binary locally, on [Fermyon Wasm Functions](https://www.fermyon.com/wasm-functions), on Kubernetes clusters (e.g. via [SpinKube](https://www.spinkube.dev/)), or on any runtime that speaks WASI + components.
* Expose both stdio and Streamable HTTP transports via standard [WASI](https://wasi.dev/) exports.

See the [quickstart](#quickstart) or read on for some context.

* [What are Tools?](#what-are-tools)
* [The Model Context Protocol](#the-model-context-protocol)
* [Challenges](#challenges)
* [WebAssembly Components](#webassembly-components)
* [Wasmcp](#wasmcp)
* [Quickstart](#quickstart)
* [Compatible Runtimes and Deployments](#compatible-runtimes-and-deployments)
* [Related Projects](#related-projects)
* [Why?](#why)

## What are Tools?

Large language models (LLMs) are trained on vast heaps of data that they use to generate responses to input queries. But that knowledge is static once training is over. They are unable to answer simple questions that require current data, like “What time is it?” or “What's the weather tomorrow in Atlanta?”. This highlights the gap between a simple model and an intelligent system that can actually *do* things and acquire new information, or context, dynamically. This is generally where the term *agent* starts to enter the conversation.

All LLMs depend on calling external [functions](https://gorilla.cs.berkeley.edu/leaderboard.html), also called tools, to interact with the outside world beyond the prompt and to perform deterministic actions. Just like you might use a calculator to accurately crunch numbers, or a web browser to explore the internet, an LLM might use its own calculator and HTTP fetch tools in the same way. Even basic capabilities like reading a file from disk are implemented via tools.

Without tools a language model is like someone sitting in an empty, windowless box with only their memories from an array of random encyclopedias, books, and other training data to pull from. Our interactions with them are something along the lines of: A human slips a question written on a piece of paper under the door for the model to read, and the model slips back a response using only their prior knowledge and imagination.

That's a long way from the promise of autonomous systems that understand and act on the world in realtime, let alone transform it.

Our first thought might be to implement a simple HTTP fetch tool for our target model. Now that model can search the internet in a loop against user queries and, voilà, we have an *agent*. Fresh data and the means of interacting with the current state of the world become available.

That windowless box gets a desktop with a browser.

Problem solved, right? Not quite.

### Communication Hurdles

**Problem 1**: The internal representation of tools is not standard across models. In other words, their hands look different. How do we build a hammer that each of them can grip?

We’d need to write a new implementation of each tool for OpenAI’s GPT models, another for the Claude family, another for Gemini, etc. So the number of total tool implementations is  `M x N`, where `M` is the number of models and `N` is the number of unique tools.

[AI SDKs](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) can alleviate this problem for a given programming language by implementing tool calling support for multiple models and exposing a common interface for tools over them.

**Problem 2**: Tool calling implemented by an AI SDK couples tool instances to an application's runtime. Tools must run alongside the same code that calls inference to implement the agent's loop. We cannot take one application's tools and call them from an external process.

We want to implement a given tool only once and make it discoverable and accessible dynamically for any AI application, potentially across the network, at scale.

The [Fundamental Theorem of Software Engineering](https://en.wikipedia.org/wiki/Fundamental_theorem_of_software_engineering) states:

> We can solve any problem by introducing an extra level of [indirection](https://en.wikipedia.org/wiki/Indirection).

We need a layer of indirection between models and their tools.

## The Model Context Protocol

In November 2024, Anthropic suggested an open-source standard for connecting AI applications to external systems: The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/docs/getting-started/intro). It aims to be the USB-C for tool calling, and more.

MCP defines a set of context [primitives](https://modelcontextprotocol.io/specification/draft/server) that are implemented as server features.

| Primitive | Control                | Description                                        | Example                         |
| --------- | ---------------------- | -------------------------------------------------- | ------------------------------- |
| Prompts   | User-controlled        | Interactive templates invoked by user choice       | Slash commands, menu options    |
| Resources | Application-controlled | Contextual data attached and managed by the client | File contents, git history      |
| Tools     | Model-controlled       | Functions exposed to the LLM to take actions       | API POST requests, file writing |

Beyond server features, MCP defines client-hosted features that servers can call directly. For example, [elicitations](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation) can be implemented by a client to allow a server to directly prompt for user input during the course of a tool call, bypassing the model as an intermediary.

These bidirectional features are possible because MCP is designed as an inherently bidirectional protocol based on [JSON-RPC](https://www.jsonrpc.org/specification).

MCP is architected as two [layers](https://modelcontextprotocol.io/docs/learn/architecture#layers): the Transport layer and the Data layer. Multiple interchangeable transports can be used to serve the same underlying features. The [stdio](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#stdio) transport allows a client to launch a local MCP server as a subprocess. The [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http) transport allows multiple clients to connect to a potentially remote MCP server, with support for sessions and authorization. Additional [custom transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#custom-transports) can be implemented to support unique needs.

Since its release, MCP has become the only tool calling protocol with near-consensus adoption and broad client support. It continues to attract interest from both individual developers and organizations. For example, AWS [joined](https://aws.amazon.com/blogs/opensource/open-protocols-for-agent-interoperability-part-1-inter-agent-communication-on-mcp/) the MCP steering committee earlier this year in May, and OpenAI's new [apps](https://openai.com/index/introducing-apps-in-chatgpt/) are MCP-based. 

Many popular agents, including ChatGPT/Codex, Claude Code/Desktop, and Gemini CLI, already support MCP out of the box. In addition, agent SDKs like the OpenAI Agents SDK, Google’s Agent Development Kit, and many others have adopted MCP either as their core tool calling mechanism or else as a first-class option.

Inference APIs like the OpenAI [Responses API](https://platform.openai.com/docs/api-reference/responses/create#responses_create-tools) have also rolled out initial support for directly calling remote MCP servers during inference itself.

## Challenges

Local MCP servers are relatively simple to implement. Official SDKs and advanced third-party frameworks are available in nearly every programming language. But local MCP servers can be an attack vector for exploiting host resources, unless they run in a sandboxed environment. Current solutions to MCP sandboxing involve running the server in a container or virtual machine.

Running an MCP server as a service over the network unlocks new distribution potential but also presents new challenges:

1. Session-enabled features over Streamable HTTP are an [open problem](https://github.com/modelcontextprotocol/python-sdk/issues/880) across MCP SDKs, with various solutions fragmented across language ecosystems or otherwise remaining unsolved. These implementations generally require either long-lived compute or specific external session backends with corresponding glue. This complicates the horizontal scalability of servers that use session-dependent bidirectional features and tool discovery mechanisms.
2. Scaling and performance matter. We may not initially think of the response time of remote tool calls as being important, given inference itself (especially with thinking / reasoning features enabled) is generally slow anyway. But consider that in answering a single query, an agent may need to make many consecutive tool calls to one or more remote MCP servers. The latency of even a few hundred milliseconds for each tool call can quickly snowball to seconds of lag. In realtime use cases like a voice or stock trading agent, even small response delays for tool calls can translate to the success or failure of the overall interaction or goal.
3. Authorization is not straightforward to implement. The spec-compliant auth flow requires an authorizer that supports [Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591). Support for a simplified flow via [OAuth Client ID Metadata Documents](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/) is confirmed for the November 2025 spec release. Sharing an authorizer across multiple servers is a common goal usually achieved using an HTTP gateway.

To make full-featured MCP servers that are safe, fast, and composable, we'd like an efficient sandbox plus a way build servers within that sandbox from reusable building blocks. This is exactly what the WebAssembly component model gives us.

## WebAssembly Components

While WebAssembly (Wasm) is commonly thought of as a browser technology, it has evolved into a versatile platform for building applications more generally. Self-contained binaries can be compiled from various programming languages and run portably and efficiently across a range of host devices while remaining sandboxed from host resources. This sandboxing capability presents a lighter alternative to containers and virtual machines that works without having to bundle layers of the operating system and its dependencies.

The Wasm [component model](https://component-model.bytecodealliance.org/) builds on these strengths to implement a broad-reaching architecture for building interoperable WebAssembly libraries, applications, and environments. Wasm components within a single sandboxed process are further isolated from each other and interop only through explicit interfaces. A visual analogy for this idea might look like a bento box (independent compartments sharing a box but not mixing contents).

The component model shares architectural similarities with MCP’s [server design principles](https://modelcontextprotocol.io/specification/2025-06-18/architecture#design-principles):

> 1. Servers should be extremely easy to build
> 2. Servers should be highly composable
> 3. Servers should not be able to read the whole conversation, nor “see into” other servers
> 4. Features can be added to servers and clients progressively

Imagine mapping individual MCP features to Wasm components, which can be composed together to form a complete MCP server component.

But first we need the tooling to make this possible. While existing MCP server SDKs are increasingly compatible with WebAssembly runtimes, they do not take advantage of the strengths of the component model.

This is where [wasmcp](https://github.com/wasmcp/wasmcp) comes in.

## [Wasmcp](https://github.com/wasmcp/wasmcp)

Wasmcp isn’t a runtime, and it’s not exactly an SDK. It is a polyglot framework for developing and composing MCP servers from a collection of WebAssembly components.

The result of composition is a standalone MCP server as a single WebAssembly component binary that can be deployed to any runtime that supports WebAssembly components.

Many composition patterns that would normally require external gateways can instead happen in-memory by composing component binaries inside a single sandboxed process. That means less glue, fewer moving parts, and fewer network hops.

With wasmcp we can implement a polyglot MCP server composed of Python tools that use [Pandas](https://pandas.pydata.org/), TypeScript tools that use [Zod](https://zod.dev/), and performance-critical tools or [Regorus](https://github.com/microsoft/regorus)-enabled authorization middleware in Rust.

We can also interchangeably compose different transports, authorizers, and middleware into the server binary.

We can push and pull component binaries from OCI registries just like container images. But unlike containers or virtual machines, components encapsulate only their own functionality and can be mere kilobytes in size. Full servers can weigh in under 1MB.

These components can be served from the network edge or run directly on edge devices themselves.

Because runtimes like Spin implement [wasi:keyvalue](https://github.com/WebAssembly/wasi-keyvalue), wasmcp can support session-enabled features without baking in any particular external session store. We get portable sessions across runtimes rather than a hard dependency on a specific external ‘state bucket X’ service.

This enables the full range of bidirectional and session-enabled features over both stdio and Streamable HTTP.

## Quickstart

Install wasmcp via script to get the latest release binary.
```shell
curl -fsSL https://raw.githubusercontent.com/wasmcp/wasmcp/main/install.sh | bash
```
Or build it from source.
```shell
cargo install --git https://github.com/wasmcp/wasmcp
```

Open a new terminal and then scaffold out a tool component with `wasmcp new`. Only basic dependencies and build tooling from Bytecode Alliance are included. TypeScript uses [jco](https://github.com/bytecodealliance/jco), Rust uses [wit-bindgen](https://github.com/bytecodealliance/wit-bindgen), and Python uses [componentize-py](https://github.com/bytecodealliance/componentize-py).

Wasmcp does not include any language-specific SDKs. The [WIT](https://component-model.bytecodealliance.org/design/wit.html) language describes the framework boundary.

We'll target Rust for our first component.

```shell
wasmcp new rust-tools --language rust
```

If you open up `rust-tools/src/lib.rs`, you’ll see some boilerplate similar to the code block below that you can fill in with your tool implementations. A single tool component can define multiple MCP tools. This pattern also applies to the other MCP primitives, [resources](https://github.com/wasmcp/wasmcp/blob/main/cli/templates/rust-resources/src/lib.rs) and [prompts](https://github.com/wasmcp/wasmcp/blob/main/cli/templates/rust-prompts/src/lib.rs), as well as server-side utility features like [completion](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/completion).

```rust
/// rust-tools/src/lib.rs
impl Guest for Calculator {
    fn list_tools(
        _ctx: RequestCtx,
        _request: ListToolsRequest,
    ) -> Result<ListToolsResult, ErrorCode> {
        Ok(ListToolsResult {
            tools: vec![
                Tool {
                    name: "add".to_string(),
                    input_schema: r#"{
                        "type": "object",
                        "properties": {
                            "a": {"type": "number", "description": "First number"},
                            "b": {"type": "number", "description": "Second number"}
                        },
                        "required": ["a", "b"]
                    }"#
                    .to_string(),
                    options: None,
                },
                Tool {
                    name: "subtract".to_string(),
                    input_schema: r#"{
                        "type": "object",
                        "properties": {
                            "a": {"type": "number", "description": "Number to subtract from"},
                            "b": {"type": "number", "description": "Number to subtract"}
                        },
                        "required": ["a", "b"]
                    }"#
                    .to_string(),
                    options: None,
                },
            ],
            next_cursor: None,
            meta: None,
        })
    }

    fn call_tool(
        _ctx: RequestCtx,
        request: CallToolRequest,
    ) -> Result<Option<CallToolResult>, ErrorCode> {
        match request.name.as_str() {
            "add" => Ok(Some(execute_operation(&request.arguments, |a, b| a + b))),
            "subtract" => Ok(Some(execute_operation(&request.arguments, |a, b| a - b))),
            _ => Ok(None), // We don't handle this tool
        }
    }
}
```

Now let’s build this component and compose it into a full MCP server. The `wasmcp compose server` command
1. Pulls the default [wasmcp framework components](https://github.com/wasmcp/wasmcp/tree/main/crates), like the MCP transport and related plumbing, from [GitHub Container Registry](https://github.com/orgs/wasmcp/packages?repo_name=wasmcp).
2. Plugs your component binary into the wasmcp framework components, producing a complete `server.wasm` component.

This is accomplished with Bytecode Alliance’s [wac](https://github.com/bytecodealliance/wac) tooling, which you can also use directly for composition.

Note that any of the framework-level components can also be interchanged with your own custom implementations, like a custom transport component. See `wasmcp compose server --help` for details.

```shell
cd rust-tools/
make
wasmcp compose server target/wasm32-wasip2/release/rust_tools.wasm -o server.wasm
```

Now that we have a complete `server.wasm` component, we can run it directly with `spin up`.

```shell
spin up --from server.wasm
```

Just like _that_, we have a functional MCP server over the Streamable HTTP transport.

We can provide more detailed runtime configuration with a [spin.toml](https://spinframework.dev/v3/writing-apps) file.

```toml
# rust-tools/spin.toml
spin_manifest_version = 2

[application]
name = "mcp"
version = "0.1.0"
authors = ["You <you@gmail.com>"]
description = "My MCP server"

[[trigger.http]]
route = "/mcp"
component = "mcp"

[component.mcp]
source = "server.wasm"
allowed_outbound_hosts = [] # Update for outbound HTTP
```

```shell
spin up --from spin.toml
```

These AI applications are some of the many that can use our new MCP server to extend their capabilities:
* [Antigravity](https://antigravity.google/docs/mcp)
* [ChatGPT (developer mode)](https://platform.openai.com/docs/guides/developer-mode)
* [Claude Code](https://code.claude.com/docs/en/mcp)
* [Claude Desktop](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
* [Codex](https://developers.openai.com/codex/mcp/)
* [Cursor](https://cursor.com/docs/context/mcp)
* [Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html)
* [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses/create#responses_create-tools)
* [Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
* [Zed](https://zed.dev/docs/ai/mcp)

## Compatible Runtimes and Deployments

The MCP server component we just created exports the standard [`wasi:http/incoming-handler`](https://github.com/WebAssembly/wasi-http) interface. This means any WebAssembly runtime that supports `wasi:http` can serve the component to MCP clients over the Streamable HTTP transport.

For example, we can use [`wasmtime serve`](https://github.com/bytecodealliance/wasmtime) which calls `wasi:http/incoming-handler`:

```shell
wasmtime serve -Scli -Shttp -Skeyvalue server.wasm
```

Our server also exports [`wasi:cli/run`](https://github.com/WebAssembly/wasi-cli), which lets it operate over the stdio MCP transport using `wasmtime run`:

```shell
wasmtime run server.wasm
```

To deploy an MCP server as a Wasm component over the network, we can target a Spin-compatible cloud platform like [Fermyon Wasm Functions](https://www.fermyon.com/wasm-functions), which will scale a server component horizontally across [Akamai](https://www.akamai.com/why-akamai/global-infrastructure)'s distributed network edge with application-scoped key-value storage.

```
$ spin aka deploy
Name of new app: rust-tools
Creating new app rust-tools in account my-fwf-user
Note: If you would instead like to deploy to an existing app, cancel this deploy and link this workspace to the app with `spin aka app link`
OK to continue? yes
Workspace linked to app rust-tools
Waiting for app to be ready... ready

App Routes:
- mcp: https://65d837d6-0862-4d76-acc0-xxxxxxxxxxxx.fwf.app/mcp
```

Projects like [SpinKube](https://www.spinkube.dev/) and [wasmCloud](https://github.com/wasmCloud/wasmCloud) allow MCP server components to be deployed on self-hosted Kubernetes clusters. A hypothetical MCP platform could leverage this architecture to manage user-submitted MCP components.

This story will expand as the ecosystems around both WebAssembly components and MCP continue to grow.

## Publishing to OCI Registries

With a `spin.toml` file like the one above, we can use the `spin registry` command to publish our server component to an [OCI](https://opencontainers.org/) registry like [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [Docker Hub](https://docs.docker.com/docker-hub/repos/manage/hub-images/oci-artifacts/), or [Amazon Elastic Container Registry](https://aws.amazon.com/ecr/).

```shell
echo $GHCR_PAT | spin registry login --username mygithub --password-stdin ghcr.io
spin registry push ghcr.io/mygithub/rust-tools:0.1.0
```

`spin up` can automatically resolve a component from the registry.

```shell
spin up --from ghcr.io/mygithub/rust-tools:0.1.0
```

We can also use [wkg](https://github.com/bytecodealliance/wasm-pkg-tools) directly to publish our server.

```shell
wkg oci push ghcr.io/mygithub/rust-tools:0.1.0 server.wasm
```

Anyone with read access to this artifact can then pull the component using `wkg` to run it with their runtime of choice.

```shell
wkg oci pull ghcr.io/mygithub/rust-tools:0.1.0
wasmtime serve -Scli mygithub:rust-tools@0.1.0.wasm
```

We can publish any individual MCP feature component, or any sequence of composed components, in the same way.

## Tool Composition

The unique advantages of the component model and wasmcp's component architecture become apparent when adding another tool component to our server. We'll use Python this time.

```shell
wasmcp new python-tools --language python
cd python-tools
make
```

```python
# python-tools/app.py
class StringUtils(exports.Tools):
    def list_tools(
        self,
        ctx: server_handler.RequestCtx,
        request: mcp.ListToolsRequest,
    ) -> mcp.ListToolsResult:
        return mcp.ListToolsResult(
            tools=[
                mcp.Tool(
                    name="reverse",
                    input_schema=json.dumps({
                        "type": "object",
                        "properties": {
                            "text": {"type": "string", "description": "Text to reverse"}
                        },
                        "required": ["text"]
                    }),
                    options=None,
                ),
                mcp.Tool(
                    name="uppercase",
                    input_schema=json.dumps({
                        "type": "object",
                        "properties": {
                            "text": {"type": "string", "description": "Text to convert to uppercase"}
                        },
                        "required": ["text"]
                    }),
                    options=None,
                ),
            ],
            meta=None,
            next_cursor=None,
        )

    def call_tool(
        self,
        ctx: server_handler.RequestCtx,
        request: mcp.CallToolRequest,
    ) -> Optional[mcp.CallToolResult]:
        input_text = json.loads(request.arguments)["text"]
        
        def make_result(text: str) -> mcp.CallToolResult:
            return mcp.CallToolResult(
                content=[mcp.ContentBlock_Text(mcp.TextContent(
                    text=mcp.TextData_Text(text),
                    options=None,
                ))],
                is_error=None,
                meta=None,
                structured_content=None,
            )

        if request.name == "reverse":
            return make_result(input_text[::-1])
        if request.name == "uppercase":
            return make_result(input_text.upper())
```

We compose our Python tool component together with our Rust tool component by adding the paths to both component binaries in the `wasmcp compose server` arguments. Note that these local paths can be substituted for OCI registry references. See `wasmcp compose server --help` for details.

```shell
wasmcp compose server ./python-tools/python-tools.wasm ./rust-tools/target/wasm32-wasip2/release/rust_tools.wasm -o polyglot.wasm
```

Run `polyglot.wasm` with `spin up`.
```shell
spin up --from polyglot.wasm
```

Now our single MCP server binary exposes four tools: `add`, `subtract`, `reverse`, and `uppercase`, implemented in two different languages and composed into a single component.

### How?

Server features like tools, resources, prompts, and completions are implemented by individual WebAssembly components that export narrow [WIT](https://component-model.bytecodealliance.org/design/wit.html) interfaces mapped from the MCP spec's [schema](https://modelcontextprotocol.io/specification/draft/schema).

`wasmcp compose server` plugs these feature components into framework middleware components and composes them together as a [chain of responsibility](https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern) that implements an MCP server.

```
Transport<Protocol>
        ↓
    Middleware₀
        ↓
    Middleware<Feature>₁
        ↓
    Middleware<Feature>₂
        ↓
       ...
        ↓
    Middlewareₙ
        ↓
    MethodNotFound
```

Each component:
- Handles requests it understands (e.g., `tools/call`)
- Delegates others downstream
- Merges results (e.g., combining tool lists)

Any of the components in the chain, like the transport, can be swapped out during composition. Sequences of middleware components can be composed together to form reusable functionality that can be saved and plugged into multiple servers.

Check out some [examples](https://github.com/wasmcp/wasmcp/tree/main/examples) to see advanced patterns featuring custom middleware components, session-enabled features, and SSE streaming.

## Related Projects

[Wassette](https://github.com/microsoft/wassette) is a security-oriented runtime that runs WebAssembly Components via MCP. It can dynamically load and execute components as individual tools on-demand with deeply integrated access controls. Wassette itself is not a component. It is an MCP server that runs components.

Wasmcp is not an MCP server. It is a toolchain for producing an MCP server as a component that exports the standard [WASI](https://wasi.dev/) interfaces for HTTP and CLI commands. This server component runs on any runtime or platform that supports WASI and the component model.

## Why?

We built wasmcp because we want to run agent-facing applications at scale in a future where MCP is the foundation for distributed intelligent systems. That means enabling powerful new MCP servers that are first-class applications rather than just proxies for REST APIs. Wasmcp is a step toward a polyglot AI application architecture that works consistently across local, cloud, and self-hosted platforms.
