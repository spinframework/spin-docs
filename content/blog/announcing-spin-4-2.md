title = "Announcing Spin v4.2"
date = "2026-10-01T00:00:00Z"
template = "blog_post"
description = "Announcing Spin v4.2: simplifying using dependencies in Spin."
tags = []

[extra]
type = "post"
author = "The Spin Project"

---

The CNCF Spin project just released [Spin v4.2](https://github.com/spinframework/spin/releases/tag/v4.2.1).

Spin has, for a long time, had a way to specify dependencies for your components - essentially
Wasm libraries that your component can call. In Spin 4.1 we extended this to middleware,
where instead of your component calling the library, the library runs automatically in
the HTTP pipeline.

In Spin 4.2, to help with setting up these dependencies, we introduce a new `spin dependencies` command.
Let's take a look.

- [Introducing `spin dependencies`](#introducing-spin-dependencies)
- [Navigating a more complicated situation](#navigating-a-more-complicated-situation)
- [Using `spin deps` to set up middleware](#using-spin-deps-to-set-up-middleware)
- [Upgrading to Spin 4.2](#upgrading-to-spin-42)
- [Thank you](#thank-you)
- [Stay in touch](#stay-in-touch)

## Introducing `spin dependencies`

There's a lot of ways you can set up Wasm dependencies, and the `spin dependencies`
command - `spin deps` to its friends - provides an interactive user interface which
allows you to think about what you need one step at a time.

> You can still add and edit dependencies by editing `spin.toml` if you prefer.
> `spin deps` is just an interactive way of doing the same thing.

Let's suppose we have an existing Spin application, and we want to be able to use a Wasm
library component from that application. For this example, I'll use a local Wasm file,
but `spin deps` works equally well with remote sources (URL or registry reference).

```console
spin deps add ~/testing/my-dep/auth.wasm
```

If my Wasm library exported more than one interface, I'd have some choices to make at this
point, but that's not the case here. But I do have to make a choice about what permissions
to grant it:

```console
This dependency uses the following capabilities: allowed_outbound_hosts, environment
If inherited, it gets the same access to them as component 'spin-deps-test'.
Which capabilities should the dependency inherit?:
> Inherit all of them
  Inherit none of them (the dependency will fail if it tries to use them)
  Choose individually
```

`spin deps` detects that the dependency may try to access environment variables and
make outbound network requests, and asks me if I want to grant permissions. If I do,
the dependency will gain access to the parent component's capabilities. If I don't,
it will fail to gain access at runtime.

In this case, I know that the `auth` component has legitimate reasons to access
the network (gotta talk to the login server somehow), but I suspect that the environment
variables requirement is spurious (something in the standard library forcing the import).
I select "Choose individually" to allow one and deny the other:

```console
Select the capabilities to inherit:
> [x] allowed_outbound_hosts
  [ ] environment
```

And for this basic case that's all the information `spin deps` needs:

```console
Added service:auth/authenticate@1.0.0 to component 'spin-deps-test'
Run `spin build` to generate language bindings for the new dependency.

Warning: The dependency inherits allowed_outbound_hosts from component 'spin-deps-test',
but component 'spin-deps-test' has none configured in spin.toml. Configure them on component
'spin-deps-test' so the dependency can use them.

Note: The dependency also uses environment, which you chose not to inherit. If it tries
to use them at runtime, those calls will fail.
```

`spin deps` notices that, although I specified to inherit the `allowed_outbound_hosts`
list, I haven't actually allowed any hosts on the parent component yet. So my choice to
allow networking is only going to be effective if I add the relevant service to that list.
Other than that, the dependency is ready for use.

## Navigating a more complicated situation

Many applications are more complicated than a single-component sample. And many library
components are more complicated than a single interface. In such situations, `spin deps`
needs to ask a few more questions. Let's take a look, with an updated app and a new
version of our dependency.

When you add a dependency, you add it to a specific component, not application wide, so
the first thing `spin deps` now needs to ask is: which component?

```console
spin deps add ~/testing/my-dep/auth.wasm
Which component should the dependency be added to?:
  shopping
> account-mgmt
```

And once I've made that choice, `spin deps` lets me know that the Wasm library exports
two interfaces, and asks me if I want to use all of them, or only a specific one.

```console
Which interface do you want to import?:
  All from service:auth@1.0.0
  service:auth/authenticate@1.0.0
> service:auth/logout@1.0.0
```

Once I've made these choices, though, I'm back to the permissions flow described above.

## Using `spin deps` to set up middleware

If the dependency being added appears to be middleware, `spin deps` instead follows a
different flow.

> A component is middleware if it both imports and exports a HTTP `handler` interface.
> Components that make outbound HTTP requests import a different (`client`)
> interface and won't be mistaken for middleware!

Middleware is attached to a HTTP trigger, rather than a component:

```console
spin deps add ~/testing/my-dep/cors.wasm
Detected HTTP middleware.

Which HTTP route should the middleware be added to?:
> /...
  /account
```

And middleware has an order, so `spin deps` asks you where you want the new middleware to
go in the pipeline:

```console
Where should this middleware run in the pipeline?:
  Before prevalidate.wasm
> Before authn.wasm
  Before authz.wasm
  At the end (closest to the application component)
```

(This question is skipped if this is the first piece of middleware on that trigger.)

Also, `spin deps` doesn't ask which interfaces you want to use, because it's implicit
in middleware that it gets plugged together via the HTTP interface.

We hope you enjoy trying out the `spin deps` command. As ever, please let us know
if you run into problems, or have ideas for how to make it better!

## Upgrading to Spin 4.2

1. Install Spin 4.2 from [spinframework.dev/install](https://spinframework.dev/install) or
   grab a binary from the
   [release page](https://github.com/spinframework/spin/releases/tag/v4.1.0).
2. Update your templates:
   ```console
   spin templates install --git https://github.com/spinframework/spin --update
   ```
3. That's it for app developers. Applications built for earlier versions of Spin
   run on 4.2 unchanged.

## Thank you

Spin 4.2 is the work of contributors across a lot of organizations: to Spin itself, to
`wasmtime`, to `wit-bindgen`, to the SDKs, and to the WASIp3 standardization effort in the
Bytecode Alliance. Thank you all, and thank you to the CNCF
for continuing to support the project.

A special welcome and congratulations to [@ChihweiLHBird](https://github.com/ChihweiLHBird) on
joining as a Spin maintainer.

## Stay in touch

Join us at weekly
[project meetings](https://github.com/spinframework/spin#getting-involved-and-contributing),
say hi on the [Spin CNCF Slack channel](https://cloud-native.slack.com/archives/C089NJ9G1V0),
and follow [@spinframework](https://twitter.com/spinframework) on X.

Ready to build? Head to the [Spin quickstart](https://spinframework.dev/v4/quickstart), or
browse the [Spin Hub](https://spinframework.dev/hub) for inspiration.
