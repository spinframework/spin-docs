title = "Build MCP Servers with Wasmcp and Spin"
date = "2025-11-20T10:15:47Z"
template = "blog_post"
description = "Introducing a new approach to building MCP servers on the WebAssembly component model."
tags = ["agents", "ai", "llm", "mcp", "model"]

[extra]
type = "post"
author = "Ian McDonald"

---

[Spin](https://github.com/spinframework/spin) is an open source framework for building and running fast, secure, and composable cloud microservices with WebAssembly.

[Wasmcp](https://github.com/wasmcp/wasmcp) is a [WebAssembly Component](https://component-model.bytecodealliance.org/) development kit for the [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro).

Together they form a polyglot toolchain for extending the capabilities of language models in a composable, portable, and secure way.

See the [quickstart](#quickstart) or read on for some context.

## What are tools?

Large language models (LLMs) are trained on vast heaps of data that they use to generate natural language responses to input queries. But that knowledge is static once training is over. They are unable to answer simple questions that require current data, like “What time is it?” or “What's the weather tomorrow in Atlanta?”. This highlights the gap between a simple model and an intelligent system that can actually *do* things and acquire new information, or context, dynamically. This is generally where the term *agent* starts to enter the conversation.

All LLMs depend on calling external [functions](https://gorilla.cs.berkeley.edu/leaderboard.html), also called tools, to interact with the outside world beyond the prompt and to perform deterministic actions. Just like you might use a calculator to accurately crunch numbers, or a web browser to explore the internet, an LLM might use its own calculator and fetch tools in the same way. Even basic capabilities like reading a file from disk are implemented via tools.

Without tools a language model is like someone sitting in an empty, windowless box with only their memories from an array of random encyclopedias, books, etc. (training data) to pull from. Our interactions with them are something along the lines of: A human slips a question written on a piece of paper under the door for the model to read, and the model slips back a response using only their prior knowledge and imagination.

That's a far cry from the promise of autonomous systems that understand and act on the world in realtime, let alone transform it.

Our first thought might be to implement a simple HTTP fetch tool for our target model. Now that model can search the internet in a loop against user queries and, voilà, we have an *agent*. Fresh data and the means of interacting with the current state of the world become available.

That windowless box gets a desktop with a browser.

Problem solved, right? Not quite…

## Communication Hurdles

**Problem 1**: The internal representation of tools is not standard across models. In other words, their hands look different. How do we build a hammer that each of them can grip?

We’d need to implement a new version of our tool for OpenAI’s GPT models, and another for the Claude family, another for Gemini, etc. So M models x N tools = T total tool implementations. Consider that fetch is only one example, and we might want many different kinds of tools available for various tasks.

[AI SDKs](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) can solve this problem directly for a given programming language by implementing support for multiple models and exposing a common interface for tools over them.

**Problem 2**: Even if tool implementations are not coupled to specific models, they become coupled to the specific SDK used to implement them, and by extension to the runtime of that SDK. Because models themselves have no built-in way of discovering and connecting to new tools over the wire, the tools must run alongside the same code that calls inference to implement the agent's loop.

We want tools to be discoverable and accessible to existing agent processes, potentially across the air, at scale. We need a layer of indirection between models and their tools.

## The Model Context Protocol

In November 2024, Anthropic suggested an open-source standard for connecting AI applications to external systems: The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/docs/getting-started/intro).

MCP defines a set of context [primitives](https://modelcontextprotocol.io/specification/draft/server) that are implemented as server features.

| Primitive | Control                | Description                                        | Example                         |
| --------- | ---------------------- | -------------------------------------------------- | ------------------------------- |
| Prompts   | User-controlled        | Interactive templates invoked by user choice       | Slash commands, menu options    |
| Resources | Application-controlled | Contextual data attached and managed by the client | File contents, git history      |
| Tools     | Model-controlled       | Functions exposed to the LLM to take actions       | API POST requests, file writing |

Beyond server features, MCP defines client-hosted features that servers can call directly. For example, [elicitations](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation) can be implemented by a client to allow a server to directly prompt for user input during the course of a tool call, bypassing the model as an intermediary.

These bidirectional features are possible because MCP is designed as an inherently bidirectional protocol based on [JSON-RPC](https://www.jsonrpc.org/specification).

MCP is architected as two [layers](https://modelcontextprotocol.io/docs/learn/architecture#layers): Multiple interchangeable transports ([stdio](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#stdio), [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http), additional custom transports) can be used to serve the same underlying features.

Since its release, MCP has become the only tool calling protocol with near-consensus adoption and broad client support. It continues to attract interest from both individual developers and organizations. For example, AWS [joined](https://aws.amazon.com/blogs/opensource/open-protocols-for-agent-interoperability-part-1-inter-agent-communication-on-mcp/) the MCP steering committee earlier this year in May, and OpenAI's new [apps](https://openai.com/index/introducing-apps-in-chatgpt/) are MCP-based. 

Many popular agents, including ChatGPT/Codex, Claude Code/Desktop, and Gemini CLI, already support MCP out-of-the-box. In addition, agent SDKs like the OpenAI Agents SDK, Google’s Agent Development Kit, and many others have adopted MCP either as their core tool calling mechanism or else as a first-class option. Inference APIs like the OpenAI [Responses API](https://platform.openai.com/docs/api-reference/responses/create#responses_create-tools) have also rolled out initial support for directly using remote MCP servers during inference itself.

So why don't we see every org implementing MCP servers to integrate their applications and data with agents?

## The Current State of MCP

Local MCP servers are relatively simple to implement over the stdio transport. Official SDKs and advanced third party frameworks are available in nearly every programming language. But distributing an MCP server, either as a local installation or as a service over the network, presents a number of new challenges.

1. Local MCP servers can be an attack vector for exploiting host resources, unless they run in a sandboxed environment.
2. Many of MCP's advanced bidirectional features and tool discovery mechanisms are locked behind a dependency on server-managed sessions. This means that we either need servers to run as long-lived processes, keeping their session state directly onboard, or else we need to manage the infrastructure for external session state plus the server code that interacts with it, which may incur additional network latency and complexity.
3. Scaling and and response latency matter. We may not initially think of the response time of remote tool calls as being important, given inference itself (especially with thinking enabled) is generally slow anyway. But consider that in answering a single query, an agent may need to make many consecutive tool calls to one or more remote MCP servers. The latency of even a few hundred milliseconds for each tool call can quickly snowball to seconds of lag. In realtime use cases like a voice or stock trading agent, even small response delays for tool calls can translate to the success or failure of the overall interaction or goal.
4. Authorization is painful. While the MCP spec does define OAuth flows, authorization is not yet straightforward to implement in practice. Currently, it requires an authorizer that supports [Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591). Support for a simplified flow via [OAuth Client ID Metadata Documents](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/) is confirmed for the November 2025 spec release.

There is a unique intersection of emerging technologies that could address some of this pain and more.

## WebAssembly Components

While WebAssembly (Wasm) is commonly thought of as a browser technology, it has evolved into a versatile platform for building applications more generally. Wasm components are composable, self-contained binaries that can be compiled from various programming languages and run portably and efficiently across a range of host devices while remaining sandboxed from host resources.

The architectural goals of Wasm's [component model](https://component-model.bytecodealliance.org/) align clearly with MCP’s [server design principles](https://modelcontextprotocol.io/specification/2025-06-18/architecture#design-principles). MCP servers are intended to be progressively composed of features, which we can directly map to individual Wasm component binaries. We could author a few components covering various MCP tools, and some others for MCP resources, then compose them together as binaries into a complete MCP server component.

Wasm components are inherently sandboxed from host resources with least privilege access by default, resulting in a light and secure way for agents to run untrusted code on a given machine. Moreover, individual components within that sandboxed process can only interop through explicit interfaces. A visual analogy for this idea might look like a bento box.

We can push, pull, and compose component binaries from OCI registries just like container images. But unlike full container images or micro VMs, which bundle layers of the operating system and its dependencies, components encapsulate only their own functionality and can be mere kilobytes in size. Full servers can weigh in under 1MB.

This means that dynamic composition of published artifacts can happen truly on-the-fly relative to other virtualization options. In only a few seconds we can pull a set of OCI-hosted component binaries that implement individual MCP [server features](https://modelcontextprotocol.io/docs/learn/server-concepts#core-server-features), compose them into a sandboxed MCP server, and start it up. We can also distribute fully composed server components on OCI registries in the same way.

Existing MCP SDKs are fragmented across language ecosystems and generally require long-lived compute or external session backends to implement advanced bidirectional features over the network, if they are supported at all. By contrast, the component model opens the door to safely composing MCP features as component binaries against standard [WASI](https://wasi.dev/) interfaces like [wasi:keyvalue](https://github.com/WebAssembly/wasi-keyvalue), which runtimes and platforms implement under the hood. This architecture allows for session-enabled features to be implemented portably without being tied to some particular implementation of the external session state bucket.

But first we need a way to author MCP server features as WebAssembly components, and we need the tooling to compose these components into functional, spec-compliant servers that run portably across WebAssembly runtimes.

Simply using existing MCP server SDKs on WebAssembly is increasingly possible, but this approach treats runtime compatibility as an obstacle to overcome, with basic parity as the final goal. Instead we want to leverage the strengths of the component model itself as a paradigm to enable the patterns we just explored.

This is where [wasmcp](https://github.com/wasmcp/wasmcp) comes in.

## [Wasmcp](https://github.com/wasmcp/wasmcp)

Wasmcp isn’t a runtime, and it’s not exactly an SDK. It’s a collection of WebAssembly components and tooling that work together to function as a polyglot framework for authoring MCP features as WebAssembly components. The result is a single MCP server as a WebAssembly component binary.

Many MCP patterns that would otherwise require external gateways become possible in memory within a single binary via composition.

These servers can run on any component-enabled runtime, like Spin.

With wasmcp we can implement a polyglot MCP server composed of Python tools that use [Pandas](https://pandas.pydata.org/), TypeScript tools that use [Zod](https://zod.dev/), and performance critical tools or [Regorus](https://github.com/microsoft/regorus)-enabled authorization middleware in Rust.

We can also interchangeably compose different transports and middlewares into the server binary.

Because the [Spin](https://github.com/spinframework/spin) runtime implements [wasi:keyvalue](https://github.com/WebAssembly/wasi-keyvalue), we get a pluggable backend for MCP session state. This means the full range of spec features, including server-sent requests and notifications, work out of the box with compatible MCP clients over the Streamable HTTP transport.

## Quickstart

Install wasmcp via script to get the latest release binary.
```shell
curl -fsSL https://raw.githubusercontent.com/wasmcp/wasmcp/main/install.sh | bash
```
Or build it from source.
```shell
cargo install --git https://github.com/wasmcp/wasmcp
```

Open a new terminal and then scaffold out a tool component with `wasmcp new`. Only basic dependencies and build tooling from Bytecode Alliance are included. TypesScript uses [jco](https://github.com/bytecodealliance/jco), Rust uses [wit-bindgen](https://github.com/bytecodealliance/wit-bindgen), and Python uses [componentize-py](https://github.com/bytecodealliance/componentize-py).

wasmcp does not maintain any language-specific SDKs. The [WIT](https://component-model.bytecodealliance.org/design/wit.html) language describes the framework boundary.

We'll target Rust for our first one.

```shell
wasmcp new my-first-tools --language rust
```

If you open up `my-first-tools/src/lib.rs`, you’ll see some boilerplate similar to the code block below that you can fill in with your tool implementations. A single tool component can define multiple MCP tools. As we’ll see, multiple tool components can then be chained together and their tools aggregated. This pattern also applies to the other MCP primitives: [resources](https://github.com/wasmcp/wasmcp/blob/main/cli/templates/rust-resources/src/lib.rs) and [prompts](https://github.com/wasmcp/wasmcp/blob/main/cli/templates/rust-prompts/src/lib.rs)

```rust
/// my-first-tools/src/lib.rs
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
cd my-first-tools/
make
wasmcp compose server target/wasm32-wasip2/release/my-first-tools.wasm -o server.wasm
```

Now that we have a complete `server.wasm` component, we can run it directly with `spin up`.

```shell
spin up --from server.wasm
```

We can provide more detailed runtime configuration with a [spin.toml](https://spinframework.dev/v3/writing-apps) file.

```toml
# my-first-tools/spin.toml
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

Just like _that_, we have a functional MCP server over the Streamable HTTP transport.

These AI applications are just some of the many that can use this MCP server to extend their capabilities:
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

## Runtime Portability and Deployment Targets

The MCP server component we just created exports the standard [`wasi:http/incoming-handler`](https://github.com/WebAssembly/wasi-http) interface. This means any WebAssembly runtime that supports `wasi:http` can serve the component to MCP clients over the Streamable HTTP transport.

For example, we can use [`wasmtime serve`](https://github.com/bytecodealliance/wasmtime):

```shell
wasmtime serve -Scli server.wasm
```

Our server also exports [`wasi:cli/run`](https://github.com/WebAssembly/wasi-cli), which lets it support the stdio MCP transport.

```shell
wasmtime run server.wasm
```

To deploy an MCP server as a Wasm component over the network, we can target a Spin-compatible cloud platform like [Fermyon Wasm Functions](https://www.fermyon.com/wasm-functions), which will scale a server component efficiently across [Akamai](https://www.akamai.com/why-akamai/global-infrastructure)'s distributed network edge with application-scoped key-value storage. Projects like [SpinKube](https://www.spinkube.dev/) and [wasmCloud](https://github.com/wasmCloud/wasmCloud) allow MCP server components to be deployed on self-hosted Kubernetes clusters. A hypothetical MCP-specific platform could potentially leverage this architecture to manage user-submitted MCP components.

This story will expand as the ecosystems around both WebAssembly components and MCP continue to grow.

## Publishing to OCI Registries

With a `spin.toml` file like the one above, we can use the `spin registry` command to publish our server component to an [OCI](https://opencontainers.org/) registry like [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [Docker Hub](https://docs.docker.com/docker-hub/repos/manage/hub-images/oci-artifacts/), or [Amazon Elastic Container Registry](https://aws.amazon.com/ecr/).

```shell
echo $GHCR_PAT | spin registry login --username mygithub --password-stdin ghcr.io
spin registry push ghcr.io/mygithub/basic-utils:0.1.0
```

`spin up` can automatically resolve a component from the registry.

```shell
spin up --from ghcr.io/mygithub/basic-utils:0.1.0
```

We can also use [wkg](https://github.com/bytecodealliance/wasm-pkg-tools) directly to publish our server.

```shell
wkg oci push ghcr.io/mygithub/basic-utils:0.1.0 polyglot.wasm
```

Anyone with read access to this artifact can then pull the component using `wkg` to run it with their runtime of choice.

```shell
wkg oci pull ghcr.io/mygithub/basic-utils:0.1.0
wasmtime serve -Scli mygithub:basic-utils@0.1.0.wasm
```

We can publish any individual MCP feature component, or any sequence of composed components (which need not be servers) as a standalone artifact in the same way. This allows for composition and distribution of pre-built middleware stacks which are further composable into servers. See `wasmcp compose --help` for details.

## Advanced Composition and Wasmcp Architecture

The real power of the component model and wasmcp's composition architecture becomes apparent when adding another tool component to our server. We'll use Python this time.

```shell
wasmcp new python-tools –-language python
cd python-tools
make
```

```python
# python-tools/app.py
class StringsTools(exports.Tools):
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
        if not request.arguments:
            return error_result("Missing tool arguments")

        try:
            args = json.loads(request.arguments)
        except json.JSONDecodeError as e:
            return error_result(f"Invalid JSON arguments: {e}")

        if request.name == "reverse":
            return reverse_string(args.get("text"))
        elif request.name == "uppercase":
            return uppercase_string(args.get("text"))
        else:
            return None  # We don't handle this tool
```

We compose our first and second tool components together by adding the paths to both tool component binaries in the `wasmcp compose server` arguments. Note that these local paths can be substituted for OCI registry artifacts. See `wasmcp compose server -–help` for details.

```shell
wasmcp compose server ./my-first-tools/target/wasm32-wasip2/release/my-first-tools.wasm ./python-tools/python-tools.wasm -o polyglot.wasm
```

Run `polyglot.wasm` with `spin up`.
```shell
spin up -f polyglot.wasm
```

Now our server has four tools: `add`, `subtract`, `reverse`, and `uppercase`! Two are implemented in Python, and two in Rust.

### How?

Server features like tools, resources, prompts, and completions are implemented by individual WebAssembly components that export narrow [WIT](https://component-model.bytecodealliance.org/design/wit.html) interfaces mapped from the MCP spec's [schema types](https://modelcontextprotocol.io/specification/draft/schema).

`wasmcp compose` plugs these feature components into framework middleware components and composes them together as a [chain of responsibility](https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern) that implements an MCP server.

Any of the components in the chain, like the transport, can be swapped out during composition.

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

This enables dynamic composition of component binaries into a single MCP server. Sequences of middleware components can be composed together to form reusable functionality that can be saved and plugged into multiple servers.

Advanced patterns featuring custom middleware components, session-enabled features, and SSE streaming are available at [examples](https://github.com/wasmcp/wasmcp/tree/main/examples).

## Related Projects

Microsoft's [Wassette](https://github.com/microsoft/wassette) is a security-oriented runtime that runs WebAssembly Components via MCP. It can dynamically load and execute components as individual tools on demand with deeply integrated access controls. Wassette itself is not a component. It is an MCP server than runs components.

By contrast, Wasmcp is a toolchain for producing an MCP server as a component that exports the standard [WASI](https://wasi.dev/) interfaces for HTTP and CLI commands: [`wasi:http`](https://github.com/WebAssembly/wasi-http) and [`wasi:cli`](https://github.com/WebAssembly/wasi-cli). This component runs on any server runtime that supports WASI and the component model.

## Futures

The ecosystems around both WebAssembly components and MCP continue to grow rapidly. As developers continue to adopt these technologies, we can expect to see more innovative projects and applications emerge across a variety of use cases.
