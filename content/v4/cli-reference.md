title = "Command Line Reference"
template = "main"
date = "2025-01-01T00:00:01Z"
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v4/cli-reference.md"

---
# Command-Line Help for `spin`

This document contains the help content for the `spin` command-line program.

**Command Overview:**

<!-- no toc -->
- [`spin`](#spin)
- [`spin add`](#spin-add)
- [`spin build`](#spin-build)
- [`spin deploy`](#spin-deploy)
- [`spin doctor`](#spin-doctor)
- [`spin login`](#spin-login)
- [`spin new`](#spin-new)
- [`spin plugins`](#spin-plugins)
- [`spin plugins install`](#spin-plugins-install)
- [`spin plugins list`](#spin-plugins-list)
- [`spin plugins search`](#spin-plugins-search)
- [`spin plugins show`](#spin-plugins-show)
- [`spin plugins uninstall`](#spin-plugins-uninstall)
- [`spin plugins update`](#spin-plugins-update)
- [`spin plugins upgrade`](#spin-plugins-upgrade)
- [`spin registry`](#spin-registry)
- [`spin registry login`](#spin-registry-login)
- [`spin registry pull`](#spin-registry-pull)
- [`spin registry push`](#spin-registry-push)
- [`spin templates`](#spin-templates)
- [`spin templates install`](#spin-templates-install)
- [`spin templates list`](#spin-templates-list)
- [`spin templates uninstall`](#spin-templates-uninstall)
- [`spin templates upgrade`](#spin-templates-upgrade)
- [`spin up`](#spin-up)
- [`spin watch`](#spin-watch)

## `spin`

The Spin CLI

**Usage:** `spin <COMMAND>`

###### **Subcommands:**

* `add` — Scaffold a new component into an existing application
* `build` — Build the Spin application
* `deploy` — Package and upload an application to a deployment environment.
* `doctor` — Detect and fix problems with Spin applications
* `login` — Log into a deployment environment.
* `new` — Scaffold a new application based on a template
* `plugins` — Install/uninstall Spin plugins
* `registry` — Commands for working with OCI registries to distribute applications
* `templates` — Commands for working with WebAssembly component templates
* `up` — Start the Spin application
* `watch` — Build and run the Spin application, rebuilding and restarting it when files change



## `spin add`

Scaffold a new component into an existing application

**Usage:** `spin add [OPTIONS] [NAME]`

###### **Arguments:**

* `<NAME>` — The name of the new application or component
* `<NAME_BACK_COMPAT>` — The name of the new application or component. If present, `name` is instead treated as the template ID. This provides backward compatibility with Spin 1.x syntax, so that existing content continues to work

###### **Options:**

* `-a`, `--accept-defaults` — An optional argument that allows to skip prompts for the manifest file by accepting the defaults if available on the template
* `--allow-overwrite` — If the output directory already contains files, generate the new files into it without confirming, overwriting any existing files with the same names
* `-f`, `--file <APP_MANIFEST_FILE>` — Path to spin.toml
* `--init` — Create the new application or component in the current directory
* `--no-vcs` — An optional argument that allows to skip creating .gitignore
* `-o`, `--output <OUTPUT_PATH>` — The directory in which to create the new application or component. The default is the name argument
* `-t`, `--template <TEMPLATE_ID>` — The template from which to create the new application or component. Run `spin templates list` to see available options
* `--tag <TAGS>` — Filter templates to select by tags
* `-v`, `--value <VALUES>` — Parameter values to be passed to the template (in name=value format)
* `--values-file <VALUES_FILE>` — A TOML file which contains parameter values in name = "value" format. Parameters passed as CLI option overwrite parameters specified in the file



## `spin build`

Build the Spin application

**Usage:** `spin build [OPTIONS] [UP_ARGS]...`

###### **Arguments:**

* `<UP_ARGS>`

###### **Options:**

* `-c`, `--component-id <COMPONENT_ID>` — Component ID to build. This can be specified multiple times. The default is all components
* `-f`, `--from <APP_MANIFEST_FILE>` — The application to build. This may be a manifest (spin.toml) file, or a directory containing a spin.toml file. If omitted, it defaults to "spin.toml"
* `--profile <PROFILE>` — The build profile to build. The default is the anonymous profile (usually the release build)
* `--skip-generate-wits` — By default, the build command generates WIT files for components' dependencies. Specify this option to bypass generating WITs
* `--skip-target-checks` — By default, if the application manifest specifies one or more deployment targets, Spin checks that all components are compatible with those deployment targets. Specify this option to bypass those target checks
* `-u`, `--up` — Run the application after building



## `spin deploy`

Package and upload an application to a deployment environment.

**Usage:** `spin deploy`

###### **Arguments:**

* `<ARGS>` — All args to be passed through to the plugin



## `spin doctor`

Detect and fix problems with Spin applications

**Usage:** `spin doctor [OPTIONS]`

###### **Options:**

* `-f`, `--from <APP_MANIFEST_FILE>` — The application to check. This may be a manifest (spin.toml) file, or a directory containing a spin.toml file. If omitted, it defaults to "spin.toml"



## `spin login`

Log into a deployment environment.

**Usage:** `spin login`

###### **Arguments:**

* `<ARGS>` — All args to be passed through to the plugin



## `spin new`

Scaffold a new application based on a template

**Usage:** `spin new [OPTIONS] [NAME]`

###### **Arguments:**

* `<NAME>` — The name of the new application or component
* `<NAME_BACK_COMPAT>` — The name of the new application or component. If present, `name` is instead treated as the template ID. This provides backward compatibility with Spin 1.x syntax, so that existing content continues to work

###### **Options:**

* `-E`, `--target-environment <TARGET_ENVIRONMENT>` — The Spin platform or runtime for which you want to develop the application. If present, Spin will offer only templates tailored for that environment
* `-a`, `--accept-defaults` — An optional argument that allows to skip prompts for the manifest file by accepting the defaults if available on the template
* `--allow-overwrite` — If the output directory already contains files, generate the new files into it without confirming, overwriting any existing files with the same names
* `--init` — Create the new application or component in the current directory
* `--no-vcs` — An optional argument that allows to skip creating .gitignore
* `-o`, `--output <OUTPUT_PATH>` — The directory in which to create the new application or component. The default is the name argument
* `-t`, `--template <TEMPLATE_ID>` — The template from which to create the new application or component. Run `spin templates list` to see available options
* `--tag <TAGS>` — Filter templates to select by tags
* `-v`, `--value <VALUES>` — Parameter values to be passed to the template (in name=value format)
* `--values-file <VALUES_FILE>` — A TOML file which contains parameter values in name = "value" format. Parameters passed as CLI option overwrite parameters specified in the file



## `spin plugins`

Install/uninstall Spin plugins

**Usage:** `spin plugins <COMMAND>`

###### **Subcommands:**

* `install` — Install plugin from a manifest
* `list` — List available or installed plugins
* `search` — Search for plugins by name
* `show` — Print information about a plugin
* `uninstall` — Remove a plugin from your installation
* `update` — Fetch the latest Spin plugins from the spin-plugins repository
* `upgrade` — Upgrade one or all plugins



## `spin plugins install`

Install plugin from a manifest.

The binary file and manifest of the plugin is copied to the local Spin plugins directory.

**Usage:** `spin plugins install [OPTIONS] [PLUGIN_NAME]`

###### **Arguments:**

* `<PLUGIN_NAME>` — Name of Spin plugin

###### **Options:**

* `-E`, `--TARGET_ENV <TARGET_ENV>` — The Spin platform or runtime for which you want to install plugins

  Default value: `<< flag not present >>`
* `--auth-header-value <AUTH_HEADER_VALUE>` — Provide the value for the authorization header to be able to install a plugin from a private repository. (e.g) --auth-header-value "Bearer <token>"
* `-f`, `--file <LOCAL_PLUGIN_MANIFEST>` — Path to local plugin manifest
* `--override-compatibility-check` — Overrides a failed compatibility check of the plugin with the current version of Spin
* `-u`, `--url <REMOTE_PLUGIN_MANIFEST>` — URL of remote plugin manifest to install
* `-v`, `--version <VERSION>` — Specific version of a plugin to be install from the centralized plugins repository
* `-y`, `--yes` — Skips prompt to accept the installation of the plugin



## `spin plugins list`

List available or installed plugins

**Usage:** `spin plugins list [OPTIONS]`

###### **Options:**

* `-E`, `--target-environment <TARGET_ENVIRONMENT>` — The Spin platform or runtime for which you want to list plugins

  Default value: `<< flag not present >>`
* `--all` — List all versions of plugins. This is the default behaviour
* `--filter <FILTER>` — Filter the list to plugins containing this string
* `--format <FORMAT>` — The format in which to list the plugins

  Default value: `plain`

  Possible values: `plain`, `json`

* `--installed` — List only installed plugins
* `--summary` — List latest and installed versions of plugins



## `spin plugins search`

Search for plugins by name

**Usage:** `spin plugins search [OPTIONS] [FILTER]`

###### **Arguments:**

* `<FILTER>` — The text to search for. If omitted, all plugins are returned

###### **Options:**

* `--format <FORMAT>` — The format in which to list the plugins

  Default value: `plain`

  Possible values: `plain`, `json`




## `spin plugins show`

Print information about a plugin

**Usage:** `spin plugins show <NAME>`

###### **Arguments:**

* `<NAME>` — Name of Spin plugin



## `spin plugins uninstall`

Remove a plugin from your installation

**Usage:** `spin plugins uninstall <NAME>`

###### **Arguments:**

* `<NAME>` — Name of Spin plugin



## `spin plugins update`

Fetch the latest Spin plugins from the spin-plugins repository

**Usage:** `spin plugins update`



## `spin plugins upgrade`

Upgrade one or all plugins

**Usage:** `spin plugins upgrade [OPTIONS] [PLUGIN_NAME]`

###### **Arguments:**

* `<PLUGIN_NAME>` — Name of Spin plugin to upgrade

###### **Options:**

* `-a`, `--all` — Upgrade all plugins
* `--auth-header-value <AUTH_HEADER_VALUE>` — Provide the value for the authorization header to be able to install a plugin from a private repository. (e.g) --auth-header-value "Bearer <token>"
* `-d`, `--downgrade` — Allow downgrading a plugin's version
* `-f`, `--file <LOCAL_PLUGIN_MANIFEST>` — Path to local plugin manifest
* `--override-compatibility-check` — Overrides a failed compatibility check of the plugin with the current version of Spin
* `-u`, `--url <REMOTE_PLUGIN_MANIFEST>` — Path to remote plugin manifest
* `-v`, `--version <VERSION>` — Specific version of a plugin to be install from the centralized plugins repository
* `-y`, `--yes` — Skips prompt to accept the installation of the plugin[s]



## `spin registry`

Commands for working with OCI registries to distribute applications

**Usage:** `spin registry <COMMAND>`

###### **Subcommands:**

* `login` — Log in to a registry
* `pull` — Pull a Spin application from a registry
* `push` — Push a Spin application to a registry



## `spin registry login`

Log in to a registry

**Usage:** `spin registry login [OPTIONS] <SERVER>`

###### **Arguments:**

* `<SERVER>` — OCI registry server (e.g. ghcr.io)

###### **Options:**

* `-p`, `--password <PASSWORD>` — Password for the registry
* `--password-stdin` — Take the password from stdin
* `-u`, `--username <USERNAME>` — Username for the registry



## `spin registry pull`

Pull a Spin application from a registry

**Usage:** `spin registry pull [OPTIONS] <REFERENCE>`

###### **Arguments:**

* `<REFERENCE>` — Reference in the registry of the published Spin application. This is a string whose format is defined by the registry standard, and generally consists of <registry>/<username>/<application-name>:<version>. E.g. ghcr.io/ogghead/spin-test-app:0.1.0

###### **Options:**

* `--cache-dir <CACHE_DIR>` — Cache directory for downloaded registry data
* `-k`, `--insecure` — Ignore server certificate errors



## `spin registry push`

Push a Spin application to a registry

**Usage:** `spin registry push [OPTIONS] <REFERENCE>`

###### **Arguments:**

* `<REFERENCE>` — Reference in the registry of the Spin application. This is a string whose format is defined by the registry standard, and generally consists of <registry>/<username>/<application-name>:<version>. E.g. ghcr.io/ogghead/spin-test-app:0.1.0

###### **Options:**

* `--annotation <ANNOTATIONS>` — Specifies the OCI image manifest annotations (in key=value format). Any existing value will be overwritten. Can be used multiple times
* `--build` — Specifies to perform `spin build` (with the default options) before pushing the application
* `--cache-dir <CACHE_DIR>` — Cache directory for downloaded registry data
* `--compose` — Compose component dependencies before pushing the application.

   The default is to compose before pushing, which maximises compatibility with different Spin runtime hosts. Turning composition off can optimise bandwidth for shared dependencies, but makes the pushed image incompatible with hosts that cannot carry out composition themselves.

  Default value: `true`
* `-f`, `--from <APP_MANIFEST_FILE>` — The application to push. This may be a manifest (spin.toml) file, or a directory containing a spin.toml file. If omitted, it defaults to "spin.toml"
* `-k`, `--insecure` — Ignore server certificate errors
* `--profile <PROFILE>` — The build profile to push. The default is the anonymous profile (usually the release build)



## `spin templates`

Commands for working with WebAssembly component templates

**Usage:** `spin templates <COMMAND>`

###### **Subcommands:**

* `install` — Install templates from a Git repository or local directory
* `list` — List the installed templates
* `uninstall` — Remove a template from your installation
* `upgrade` — Upgrade templates to match your current version of Spin



## `spin templates install`

Install templates from a Git repository or local directory.

The files of the templates are copied to the local template store: a directory in your data or home directory.

**Usage:** `spin templates install [OPTIONS]`

###### **Options:**

* `--branch <BRANCH>` — The optional branch of the git repository
* `--dir <FROM_DIR>` — Local directory containing the template(s) to install
* `--git <FROM_GIT>` — The URL of the templates git repository. The templates must be in a git repository in a "templates" directory
* `--tar <FROM_TAR>` — URL to a tarball in .tar.gz format containing the template(s) to install
* `--upgrade` — If present, updates existing templates instead of skipping



## `spin templates list`

List the installed templates

**Usage:** `spin templates list [OPTIONS]`

###### **Options:**

* `--tag <TAGS>` — Filter templates matching all provided tags
* `--verbose` — Whether to show additional template details in the list



## `spin templates uninstall`

Remove a template from your installation

**Usage:** `spin templates uninstall <TEMPLATE_ID>`

###### **Arguments:**

* `<TEMPLATE_ID>` — The template to uninstall



## `spin templates upgrade`

Upgrade templates to match your current version of Spin.

The files of the templates are copied to the local template store: a directory in your data or home directory.

**Usage:** `spin templates upgrade [OPTIONS]`

###### **Options:**

* `--all` — By default, Spin displays the list of installed repositories and prompts you to choose which to upgrade.  Pass this flag to upgrade all repositories without prompting
* `--branch <BRANCH>` — The optional branch of the git repository, if a specific repository is given
* `--repo <GIT_URL>` — By default, Spin displays the list of installed repositories and prompts you to choose which to upgrade.  Pass this flag to upgrade only the specified repository without prompting



## `spin up`

Start the Spin application

**Usage:** `spin up [OPTIONS]`

###### **Options:**

* `--build` — For local apps, specifies to perform `spin build` (with the default options) before running the application.

   This is ignored on remote applications, as they are already built.
* `-c`, `--component-id <COMPONENTS>` — [Experimental] Component ID to run. This can be specified multiple times. The default is all components
* `--cache-dir <CACHE_DIR>` — Cache directory for downloaded components and assets
* `--direct-mounts` — For local apps with directory mounts and no excluded files, mount them directly instead of using a temporary directory.

   This allows you to update the assets on the host filesystem such that the updates are visible to the guest without a restart.  This cannot be used with registry apps or apps which use file patterns and/or exclusions.
* `-e`, `--env <ENV>` — Pass an environment variable (key=value) to all components of the application
* `-f`, `--from <APPLICATION>` — The application to run. This may be a manifest (spin.toml) file, a directory containing a spin.toml file, a remote registry reference, or a Wasm module (a .wasm file). If omitted, it defaults to "spin.toml"
* `-h`, `--help`
* `-k`, `--insecure` — Ignore server certificate errors from a registry
* `--profile <PROFILE>` — The build profile to run. The default is the anonymous profile (usually the release build)
* `--temp <TMP>` — Temporary directory for the static assets of the components



## `spin watch`

Build and run the Spin application, rebuilding and restarting it when files change

**Usage:** `spin watch [OPTIONS] [UP_ARGS]...`

###### **Arguments:**

* `<UP_ARGS>` — Arguments to be passed through to spin up

###### **Options:**

* `-c`, `--clear` — Clear the screen before each run
* `-d`, `--debounce <DEBOUNCE>` — Set the timeout between detected change and re-execution, in milliseconds

  Default value: `100`
* `-f`, `--from <APP_MANIFEST_FILE>` — The application to watch. This may be a manifest (spin.toml) file, or a directory containing a spin.toml file. If omitted, it defaults to "spin.toml"
* `--profile <PROFILE>` — The build profile to build and run. The default is the anonymous profile (usually the release build)
* `--skip-build` — Only run the Spin application, restarting it when build artifacts change



<hr/>

<small><i>
    This document was generated automatically by
    <a href="https://crates.io/crates/clap-markdown"><code>clap-markdown</code></a>.
</i></small>
