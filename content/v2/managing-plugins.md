title = "Managing Plugins"
template = "main"
date = "2023-11-04T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/spin/v2/managing-plugins.md"

---
- [Installing Plugins](#installing-plugins)
  - [Installing Well Known Plugins](#installing-well-known-plugins)
  - [Installing a Specific Version of a Plugin](#installing-a-specific-version-of-a-plugin)
  - [Installing a Plugin From a URL](#installing-a-plugin-from-a-url)
  - [Installing a Plugin From a File](#installing-a-plugin-from-a-file)
- [Running a Plugin](#running-a-plugin)
- [Viewing Available Plugins](#viewing-available-plugins)
  - [Viewing Installed Plugins](#viewing-installed-plugins)
- [Uninstalling Plugins](#uninstalling-plugins)
- [Refreshing the Catalogue](#refreshing-the-catalogue)
- [Upgrading Plugins](#upgrading-plugins)
- [Downgrading Plugins](#downgrading-plugins)
- [Next Steps](#next-steps)

Plugins are a way to extend the functionality of Spin. Spin provides commands for installing and removing them, so you don't need to use separate installation tools. When you have installed a plugin into Spin, you can call it as if it were a Spin subcommand. For example, the JavaScript SDK uses a tool called `js2wasm` to package JavaScript code into a Wasm module, and JavaScript applications run it via the `spin js2wasm` command.

## Installing Plugins

To install plugins, use the `spin plugins install` command. You can install plugins by name from a curated repository, or other plugins from a URL or file system.

### Installing Well Known Plugins

The Spin maintainers curate a catalogue of "known" plugins. You can install plugins from this catalogue by name:

<!-- @selectiveCpy -->

```bash
$ spin plugins install js2wasm
```

Spin checks that the plugin is available for your version of Spin and your operating system, and prompts you to confirm the installation. To skip the prompt, pass the `--yes` flag.

> The curated plugins catalogue is stored in a GitHub repository. The first time you install a plugin from the catalogue, Spin clones this repository into a local cache and uses it for future install, list and upgrade commands (similar to OS package managers such as `apt`). If you want to see new catalogue entries - new plugins or new versions - you must update the local cache by running the `spin plugins update` command.

### Installing a Specific Version of a Plugin

To install a specific version of a plugin, pass the `--version` flag:

<!-- @nocpy -->

```bash
$ spin plugins install js2wasm --version 0.4.0
```

### Installing a Plugin From a URL

If the plugin you want has been published on the Web but has not been added to the catalogue, you can install it from its manifest URL. The manifest is the JSON document that links to the binaries for different operating systems and processors. For example:

<!-- @nocpy -->

```bash
$ spin plugins install --url https://github.com/spinframework/spin-befunge-sdk/releases/download/v1.4.0/befunge2wasm.json
```

### Installing a Plugin From a File

If the plugin you want is in your local file system, you can install it from its manifest file path. The manifest is the JSON document that links to the binaries for different operating systems and processors. For example:

<!-- @nocpy -->

```bash
$ spin plugins install --file ~/dev/spin-befunge-sdk/befunge2wasm.json
```

## Running a Plugin

You run plugins in the same way as built-in Spin subcommands. For example:

<!-- @selectiveCpy -->

```bash
$ spin js2wasm --help
```

## Viewing Available Plugins

To see what plugins are available in the catalogue, run `spin plugins search`:

<!-- @selectiveCpy -->

```bash
$ spin plugins search
befunge2wasm 1.4.0 [incompatible]
js2wasm 0.3.0 [installed]
js2wasm 0.4.0
trigger-sqs 0.1.0
```

The annotations by the plugins show their status and compatibility:

| Annotation                      | Meaning |
|---------------------------------|---------|
| `[incompatible]`                | The plugin does not run on your operating system or processor. |
| `[installed]`                   | You have the plugin already installed and available to run. |
| `[requires other Spin version]` | The plugin can run on your operating system and processor, but is not compatible with the version of Spin you are running. The annotation indicates which versions of Spin it is compatible with. |

### Viewing Installed Plugins

To see only the plugins you have installed, run `spin plugins list --installed`.

## Uninstalling Plugins

You can uninstall plugins using `spin plugins uninstall` with the plugin name:

<!-- @nocpy -->

```bash
$ spin plugins uninstall befunge2wasm
```

## Refreshing the Catalogue

The first time you install a plugin from the catalogue, Spin creates a local cache of the catalogue. It continues to use this local cache for future install, list and upgrade commands; this is similar to OS package managers such as `apt`, and avoids rate limiting on the catalogue. However, this means that in order to see new catalogue entries - new plugins or new versions - you must first update the cache. 

To update your local cache of the catalogue, run `spin plugins update`.

## Upgrading Plugins

To upgrade a plugin to the latest version, first run `spin plugins update` (to refresh the catalogue), then `spin plugins upgrade`. 

The `spin plugins upgrade` command has the same options as the `spin plugins install` command (according to whether the plugin comes from the catalogue, a URL, or a file). For more information, see the plugins section of the [Spin CLI Reference documentation](cli-reference#spin-plugins). 

> The `upgrade` command uses your local cache of the catalogue. This might not include recently added plugins or versions. So always remember to run `spin plugins update` to refresh your local cache of the catalogue before performing the `spin plugins upgrade` command.

The following example shows how to upgrade one plugin at a time (i.e. the `js2wasm` plugin):

<!-- @selectiveCpy -->

```bash
$ spin plugins update
$ spin plugins upgrade js2wasm
```

The following example shows how to upgrade all installed plugins at once:

<!-- @selectiveCpy -->

```bash
$ spin plugins update
$ spin plugins upgrade --all
```

> Note: The above example only installs plugins from the catalogue

The following example shows additional upgrade options. Specifically, how to upgrade using the path to a remote plugin manifest and how to upgrade using the path to a local plugin manifest:

<!-- @selectiveCpy -->

```bash
$ spin plugins upgrade --url https://github.com/spinframework/spin-befunge-sdk/releases/download/v1.7.0/befunge2wasm.json
$ spin plugins upgrade --file ~/dev/spin-befunge-sdk/befunge2wasm.json
```

## Downgrading Plugins

By default, Spin will only _upgrade_ plugins. Pass the `--downgrade` flag and specify the `--version` if you want Spin to roll back to an earlier version. The following abridged example (which doesn't list the full console output for simplicity) lists the versions of plugins, downgrades the `js2wasm` to an older version (`0.6.0`) and then lists the versions again to show the results:

<!-- @nocpy -->

```bash
$ spin plugins update
$ spin plugins list
// --snip--
js2wasm 0.6.0
js2wasm 0.6.1 [installed]
$ spin plugins upgrade js2wasm --downgrade --version 0.6.0
$ spin plugins list
// --snip--
js2wasm 0.6.0 [installed]
js2wasm 0.6.1
```

After downgrading, the `[installed]` indicator is aligned with the `0.6.0` version of `js2wasm`, as intended in the example.

## Next Steps

- [Install the JavaScript or Python plugins](quickstart)
- [Use the JavaScript or Python plugins to build a Wasm module](build)
- [Checkout the spin cloud plugin](https://github.com/fermyon/cloud-plugin)
