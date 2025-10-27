title = "Command Line Reference"
template = "main"
date = "2025-01-01T00:00:01Z"
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v3/cli-reference.md"

---
# Command-Line Help for `spin`

This document contains the help content for the `spin` command-line program.

**Command Overview:**

* [`spin`↴](#spin)
* [`spin add`↴](#spin-add)
* [`spin build`↴](#spin-build)
* [`spin deploy`↴](#spin-deploy)
* [`spin doctor`↴](#spin-doctor)
* [`spin login`↴](#spin-login)
* [`spin new`↴](#spin-new)
* [`spin plugins`↴](#spin-plugins)
* [`spin plugins install`↴](#spin-plugins-install)
* [`spin plugins list`↴](#spin-plugins-list)
* [`spin plugins search`↴](#spin-plugins-search)
* [`spin plugins show`↴](#spin-plugins-show)
* [`spin plugins uninstall`↴](#spin-plugins-uninstall)
* [`spin plugins update`↴](#spin-plugins-update)
* [`spin plugins upgrade`↴](#spin-plugins-upgrade)
* [`spin registry`↴](#spin-registry)
* [`spin registry login`↴](#spin-registry-login)
* [`spin registry pull`↴](#spin-registry-pull)
* [`spin registry push`↴](#spin-registry-push)
* [`spin templates`↴](#spin-templates)
* [`spin templates install`↴](#spin-templates-install)
* [`spin templates list`↴](#spin-templates-list)
* [`spin templates uninstall`↴](#spin-templates-uninstall)
* [`spin templates upgrade`↴](#spin-templates-upgrade)
* [`spin up`↴](#spin-up)
* [`spin watch`↴](#spin-watch)

## `spin`

The Spin CLI

**Usage:** `USAGE:
    spin <SUBCOMMAND>`

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

###### **Options:**

* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin add`

Scaffold a new component into an existing application

**Usage:** `spin USAGE:
    add [OPTIONS] [NAME]`

###### **Arguments:**

* `<NAME>` — The name of the new application or component
* `<NAME_BACK_COMPAT>` — The name of the new application or component. If present, `name` is instead treated as the template ID. This provides backward compatibility with Spin 1.x syntax, so that existing content continues to work

###### **Options:**

* `-a`, `--accept-defaults <ACCEPT-DEFAULTS>` — An optional argument that allows to skip prompts for the manifest file by accepting the defaults if available on the template
* `--allow-overwrite <ALLOW-OVERWRITE>` — If the output directory already contains files, generate the new files into it without confirming, overwriting any existing files with the same names
* `-f`, `--file <APP_MANIFEST_FILE>` — Path to spin.toml
* `--help <HELP>` — Print help information
* `--init <INIT>` — Create the new application or component in the current directory
* `--no-vcs <NO-VCS>` — An optional argument that allows to skip creating .gitignore
* `-o`, `--output <OUTPUT_PATH>` — The directory in which to create the new application or component. The default is the name argument
* `-t`, `--template <TEMPLATE_ID>` — The template from which to create the new application or component. Run `spin templates list` to see available options
* `--tag <TAGS>` — Filter templates to select by tags
* `-v`, `--value <VALUES>` — Parameter values to be passed to the template (in name=value format)
* `--values-file <VALUES_FILE>` — A TOML file which contains parameter values in name = "value" format. Parameters passed as CLI option overwrite parameters specified in the file
* `--version <VERSION>` — Print version information



## `spin build`

Build the Spin application

**Usage:** `spin USAGE:
    build [OPTIONS] [UP_ARGS]...`

###### **Arguments:**

* `<UP_ARGS>`

###### **Options:**

* `-c`, `--component-id <COMPONENT_ID>` — Component ID to build. This can be specified multiple times. The default is all components
* `-f`, `--from <APP_MANIFEST_FILE>` — The application to build. This may be a manifest (spin.toml) file, or a directory containing a spin.toml file. If omitted, it defaults to "spin.toml"
* `--help <HELP>` — Print help information
* `--skip-target-checks <SKIP-TARGET-CHECKS>` — By default, if the application manifest specifies one or more deployment targets, Spin checks that all components are compatible with those deployment targets. Specify this option to bypass those target checks
* `-u`, `--up <UP>` — Run the application after building
* `--version <VERSION>` — Print version information



## `spin deploy`

Package and upload an application to a deployment environment.

**Usage:** `spin USAGE:
    deploy`

###### **Arguments:**

* `<ARGS>` — All args to be passed through to the plugin

###### **Options:**

* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin doctor`

Detect and fix problems with Spin applications

**Usage:** `spin USAGE:
    doctor [OPTIONS]`

###### **Options:**

* `-f`, `--from <APP_MANIFEST_FILE>` — The application to check. This may be a manifest (spin.toml) file, or a directory containing a spin.toml file. If omitted, it defaults to "spin.toml"
* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin login`

Log into a deployment environment.

**Usage:** `spin USAGE:
    login`

###### **Arguments:**

* `<ARGS>` — All args to be passed through to the plugin

###### **Options:**

* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin new`

Scaffold a new application based on a template

**Usage:** `spin USAGE:
    new [OPTIONS] [NAME]`

###### **Arguments:**

* `<NAME>` — The name of the new application or component
* `<NAME_BACK_COMPAT>` — The name of the new application or component. If present, `name` is instead treated as the template ID. This provides backward compatibility with Spin 1.x syntax, so that existing content continues to work

###### **Options:**

* `-a`, `--accept-defaults <ACCEPT-DEFAULTS>` — An optional argument that allows to skip prompts for the manifest file by accepting the defaults if available on the template
* `--allow-overwrite <ALLOW-OVERWRITE>` — If the output directory already contains files, generate the new files into it without confirming, overwriting any existing files with the same names
* `--help <HELP>` — Print help information
* `--init <INIT>` — Create the new application or component in the current directory
* `--no-vcs <NO-VCS>` — An optional argument that allows to skip creating .gitignore
* `-o`, `--output <OUTPUT_PATH>` — The directory in which to create the new application or component. The default is the name argument
* `-t`, `--template <TEMPLATE_ID>` — The template from which to create the new application or component. Run `spin templates list` to see available options
* `--tag <TAGS>` — Filter templates to select by tags
* `-v`, `--value <VALUES>` — Parameter values to be passed to the template (in name=value format)
* `--values-file <VALUES_FILE>` — A TOML file which contains parameter values in name = "value" format. Parameters passed as CLI option overwrite parameters specified in the file
* `--version <VERSION>` — Print version information



## `spin plugins`

Install/uninstall Spin plugins

**Usage:** `spin USAGE:
    plugins <SUBCOMMAND>`

###### **Subcommands:**

* `install` — Install plugin from a manifest
* `list` — List available or installed plugins
* `search` — Search for plugins by name
* `show` — Print information about a plugin
* `uninstall` — Remove a plugin from your installation
* `update` — Fetch the latest Spin plugins from the spin-plugins repository
* `upgrade` — Upgrade one or all plugins

###### **Options:**

* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin plugins install`

Install plugin from a manifest.

The binary file and manifest of the plugin is copied to the local Spin plugins directory.

**Usage:** `spin plugins USAGE:
    install [OPTIONS] [PLUGIN_NAME]`

###### **Arguments:**

* `<PLUGIN_NAME>` — Name of Spin plugin

###### **Options:**

* `--auth-header-value <AUTH_HEADER_VALUE>` — Provide the value for the authorization header to be able to install a plugin from a private repository. (e.g) --auth-header-value "Bearer <token>"
* `-f`, `--file <LOCAL_PLUGIN_MANIFEST>` — Path to local plugin manifest
* `--help <HELP>` — Print help information
* `--override-compatibility-check <OVERRIDE-COMPATIBILITY-CHECK>` — Overrides a failed compatibility check of the plugin with the current version of Spin
* `-u`, `--url <REMOTE_PLUGIN_MANIFEST>` — URL of remote plugin manifest to install
* `-v`, `--version <VERSION>` — Specific version of a plugin to be install from the centralized plugins repository
* `--version <VERSION>` — Print version information
* `-y`, `--yes <YES-TO-ALL>` — Skips prompt to accept the installation of the plugin



## `spin plugins list`

List available or installed plugins

**Usage:** `spin plugins USAGE:
    list [OPTIONS]`

###### **Options:**

* `--all <ALL>` — List all versions of plugins. This is the default behaviour
* `--filter <FILTER>` — Filter the list to plugins containing this string
* `--format <FORMAT>` — The format in which to list the templates

  Default value: `plain`
* `--help <HELP>` — Print help information
* `--installed <INSTALLED>` — List only installed plugins
* `--summary <SUMMARY>` — List latest and installed versions of plugins
* `--version <VERSION>` — Print version information



## `spin plugins search`

Search for plugins by name

**Usage:** `spin plugins USAGE:
    search [OPTIONS] [FILTER]`

###### **Arguments:**

* `<FILTER>` — The text to search for. If omitted, all plugins are returned

###### **Options:**

* `--format <FORMAT>` — The format in which to list the plugins

  Default value: `plain`
* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin plugins show`

Print information about a plugin

**Usage:** `spin plugins USAGE:
    show <NAME>`

###### **Arguments:**

* `<NAME>` — Name of Spin plugin

###### **Options:**

* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin plugins uninstall`

Remove a plugin from your installation

**Usage:** `spin plugins USAGE:
    uninstall <NAME>`

###### **Arguments:**

* `<NAME>` — Name of Spin plugin

###### **Options:**

* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin plugins update`

Fetch the latest Spin plugins from the spin-plugins repository

**Usage:** `spin plugins USAGE:
    update`

###### **Options:**

* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin plugins upgrade`

Upgrade one or all plugins

**Usage:** `spin plugins USAGE:
    upgrade [OPTIONS] [PLUGIN_NAME]`

###### **Arguments:**

* `<PLUGIN_NAME>` — Name of Spin plugin to upgrade

###### **Options:**

* `-a`, `--all <ALL>` — Upgrade all plugins
* `--auth-header-value <AUTH_HEADER_VALUE>` — Provide the value for the authorization header to be able to install a plugin from a private repository. (e.g) --auth-header-value "Bearer <token>"
* `-d`, `--downgrade <DOWNGRADE>` — Allow downgrading a plugin's version
* `-f`, `--file <LOCAL_PLUGIN_MANIFEST>` — Path to local plugin manifest
* `--help <HELP>` — Print help information
* `--override-compatibility-check <OVERRIDE-COMPATIBILITY-CHECK>` — Overrides a failed compatibility check of the plugin with the current version of Spin
* `-u`, `--url <REMOTE_PLUGIN_MANIFEST>` — Path to remote plugin manifest
* `-v`, `--version <VERSION>` — Specific version of a plugin to be install from the centralized plugins repository
* `--version <VERSION>` — Print version information
* `-y`, `--yes <YES-TO-ALL>` — Skips prompt to accept the installation of the plugin[s]



## `spin registry`

Commands for working with OCI registries to distribute applications

**Usage:** `spin USAGE:
    registry <SUBCOMMAND>`

###### **Subcommands:**

* `login` — Log in to a registry
* `pull` — Pull a Spin application from a registry
* `push` — Push a Spin application to a registry

###### **Options:**

* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin registry login`

Log in to a registry

**Usage:** `spin registry USAGE:
    login [OPTIONS] <SERVER>`

###### **Arguments:**

* `<SERVER>` — OCI registry server (e.g. ghcr.io)

###### **Options:**

* `--help <HELP>` — Print help information
* `-p`, `--password <PASSWORD>` — Password for the registry
* `--password-stdin <PASSWORD-STDIN>` — Take the password from stdin
* `-u`, `--username <USERNAME>` — Username for the registry
* `--version <VERSION>` — Print version information



## `spin registry pull`

Pull a Spin application from a registry

**Usage:** `spin registry USAGE:
    pull [OPTIONS] <REFERENCE>`

###### **Arguments:**

* `<REFERENCE>` — Reference in the registry of the published Spin application. This is a string whose format is defined by the registry standard, and generally consists of <registry>/<username>/<application-name>:<version>. E.g. ghcr.io/ogghead/spin-test-app:0.1.0

###### **Options:**

* `--cache-dir <CACHE_DIR>` — Cache directory for downloaded registry data
* `--help <HELP>` — Print help information
* `-k`, `--insecure <INSECURE>` — Ignore server certificate errors
* `--version <VERSION>` — Print version information



## `spin registry push`

Push a Spin application to a registry

**Usage:** `spin registry USAGE:
    push [OPTIONS] <REFERENCE>`

###### **Arguments:**

* `<REFERENCE>` — Reference in the registry of the Spin application. This is a string whose format is defined by the registry standard, and generally consists of <registry>/<username>/<application-name>:<version>. E.g. ghcr.io/ogghead/spin-test-app:0.1.0

###### **Options:**

* `--annotation <ANNOTATIONS>` — Specifies the OCI image manifest annotations (in key=value format). Any existing value will be overwritten. Can be used multiple times
* `--build <BUILD>` — Specifies to perform `spin build` (with the default options) before pushing the application
* `--cache-dir <CACHE_DIR>` — Cache directory for downloaded registry data
* `--compose <COMPOSE>` — Compose component dependencies before pushing the application.

   The default is to compose before pushing, which maximises compatibility with different Spin runtime hosts. Turning composition off can optimise bandwidth for shared dependencies, but makes the pushed image incompatible with hosts that cannot carry out composition themselves.

  Default value: `true`
* `-f`, `--from <APP_MANIFEST_FILE>` — The application to push. This may be a manifest (spin.toml) file, or a directory containing a spin.toml file. If omitted, it defaults to "spin.toml"
* `--help <HELP>` — Print help information
* `-k`, `--insecure <INSECURE>` — Ignore server certificate errors
* `--version <VERSION>` — Print version information



## `spin templates`

Commands for working with WebAssembly component templates

**Usage:** `spin USAGE:
    templates <SUBCOMMAND>`

###### **Subcommands:**

* `install` — Install templates from a Git repository or local directory
* `list` — List the installed templates
* `uninstall` — Remove a template from your installation
* `upgrade` — Upgrade templates to match your current version of Spin

###### **Options:**

* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin templates install`

Install templates from a Git repository or local directory.

The files of the templates are copied to the local template store: a directory in your data or home directory.

**Usage:** `spin templates USAGE:
    install [OPTIONS]`

###### **Options:**

* `--branch <BRANCH>` — The optional branch of the git repository
* `--dir <FROM_DIR>` — Local directory containing the template(s) to install
* `--git <FROM_GIT>` — The URL of the templates git repository. The templates must be in a git repository in a "templates" directory
* `--help <HELP>` — Print help information
* `--tar <FROM_TAR>` — URL to a tarball in .tar.gz format containing the template(s) to install
* `--upgrade <UPDATE>` — If present, updates existing templates instead of skipping
* `--version <VERSION>` — Print version information



## `spin templates list`

List the installed templates

**Usage:** `spin templates USAGE:
    list [OPTIONS]`

###### **Options:**

* `--help <HELP>` — Print help information
* `--tag <TAGS>` — Filter templates matching all provided tags
* `--verbose <VERBOSE>` — Whether to show additional template details in the list
* `--version <VERSION>` — Print version information



## `spin templates uninstall`

Remove a template from your installation

**Usage:** `spin templates USAGE:
    uninstall <TEMPLATE_ID>`

###### **Arguments:**

* `<TEMPLATE_ID>` — The template to uninstall

###### **Options:**

* `--help <HELP>` — Print help information
* `--version <VERSION>` — Print version information



## `spin templates upgrade`

Upgrade templates to match your current version of Spin.

The files of the templates are copied to the local template store: a directory in your data or home directory.

**Usage:** `spin templates USAGE:
    upgrade [OPTIONS]`

###### **Options:**

* `--all <ALL>` — By default, Spin displays the list of installed repositories and prompts you to choose which to upgrade.  Pass this flag to upgrade all repositories without prompting
* `--branch <BRANCH>` — The optional branch of the git repository, if a specific repository is given
* `--help <HELP>` — Print help information
* `--repo <GIT_URL>` — By default, Spin displays the list of installed repositories and prompts you to choose which to upgrade.  Pass this flag to upgrade only the specified repository without prompting
* `--version <VERSION>` — Print version information



## `spin up`

Start the Spin application

**Usage:** `spin USAGE:
    up [OPTIONS]`

###### **Arguments:**

* `<TRIGGER_ARGS>` — All other args, to be passed through to the trigger

###### **Options:**

* `--build <BUILD>` — For local apps, specifies to perform `spin build` (with the default options) before running the application.

   This is ignored on remote applications, as they are already built.
* `-c`, `--component-id <COMPONENTS>` — [Experimental] Component ID to run. This can be specified multiple times. The default is all components
* `--cache-dir <CACHE_DIR>` — Cache directory for downloaded components and assets
* `--direct-mounts <DIRECT-MOUNTS>` — For local apps with directory mounts and no excluded files, mount them directly instead of using a temporary directory.

   This allows you to update the assets on the host filesystem such that the updates are visible to the guest without a restart.  This cannot be used with registry apps or apps which use file patterns and/or exclusions.
* `-e`, `--env <ENV>` — Pass an environment variable (key=value) to all components of the application
* `-f`, `--from <APPLICATION>` — The application to run. This may be a manifest (spin.toml) file, a directory containing a spin.toml file, a remote registry reference, or a Wasm module (a .wasm file). If omitted, it defaults to "spin.toml"
* `-h`, `--help <HELP>`
* `--help <HELP>` — Print help information
* `-k`, `--insecure <INSECURE>` — Ignore server certificate errors from a registry
* `--temp <TMP>` — Temporary directory for the static assets of the components
* `--version <VERSION>` — Print version information



## `spin watch`

Build and run the Spin application, rebuilding and restarting it when files change

**Usage:** `spin USAGE:
    watch [OPTIONS] [UP_ARGS]...`

###### **Arguments:**

* `<UP_ARGS>` — Arguments to be passed through to spin up

###### **Options:**

* `-c`, `--clear <CLEAR>` — Clear the screen before each run
* `-d`, `--debounce <DEBOUNCE>` — Set the timeout between detected change and re-execution, in milliseconds

  Default value: `100`
* `-f`, `--from <APP_MANIFEST_FILE>` — The application to watch. This may be a manifest (spin.toml) file, or a directory containing a spin.toml file. If omitted, it defaults to "spin.toml"
* `--help <HELP>` — Print help information
* `--skip-build <SKIP_BUILD>` — Only run the Spin application, restarting it when build artifacts change
* `--version <VERSION>` — Print version information



<hr/>

<small><i>
    This document was generated automatically by
    <a href="https://crates.io/crates/clap-markdown"><code>clap-markdown</code></a>.
</i></small>
