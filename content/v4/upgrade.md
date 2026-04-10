title = "Upgrade Spin"
template = "main"
date = "2023-11-04T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v4/upgrade.md"

---
- [Are You on the Latest Version?](#are-you-on-the-latest-version)
- [Upgrading Using the Installer](#upgrading-using-the-installer)
- [Upgrading Using Homebrew](#upgrading-using-homebrew)
- [Upgrading Using `cargo`](#upgrading-using-cargo)
- [Upgrading by Building From Source](#upgrading-by-building-from-source)
- [If You're Not Sure](#if-youre-not-sure)
- [Troubleshooting](#troubleshooting)
  - [Not Seeing the Latest Version?](#not-seeing-the-latest-version)

Spin can be installed in many ways, and therefore the upgrade procedure can differ between users. Here are a few suggested ways to upgrade Spin to the latest version.

## Are You on the Latest Version?

The best way to know if you're on the latest version of Spin is to run `spin --version`:

<!-- @selectiveCpy -->

```bash
$ spin --version
```

You can compare the output from the above command with the [latest release release](https://github.com/spinframework/spin/releases/latest) listed in the Spin GitHub repository (which is also shown in the image below):

![spin version image](https://img.shields.io/github/v/release/fermyon/spin)

## Upgrading Using the Installer

If you originally followed the documentation's [installer script method](./install#installing-spin), please revisit to reinstall.

> The installer downloads to the current directory, which is probably not where you're running it from day-to-day. After downloading, move the downloaded Spin binary to the same place as you moved it before, for example `/usr/local/bin/spin`. You can use `which spin` (Linux and MacOS) or `where spin` (Windows) to remind yourself where that was!

## Upgrading Using Homebrew

If you originally installed Spin via [Homebrew](https://brew.sh/), you should use Homebrew to upgrade it:

<!-- @selectiveCpy -->

```bash
$ brew update
$ brew upgrade spinframework/tap/spin
```

## Upgrading Using `cargo`

If you originally [installed Spin via `cargo install`](./install#using-cargo-to-install-spin), please revisit to reinstall.

## Upgrading by Building From Source

If you followed the documentation's [install from source method](./install#building-spin-from-source) please revisit to reinstall.

## If You're Not Sure

If you can't remember how you originally installed Spin, run `which spin` (Linux or MacOS) or `where spin` (Windows) to see where your current install is, and look it up on the following chart:

| Current location is...           | Install / upgrade method                   |
|----------------------------------|--------------------------------------------|
| `~/.cargo/bin/spin`              | You used `cargo install`. Re-run the instructions for using Cargo. |
| `C:/Users/.../.cargo/bin/spin`   | You used `cargo install`. Re-run the instructions for using Cargo. |
| `/opt/homebrew/Cellar/...`       | You used Homebrew. [See above.](#homebrew) |
| `/usr/local/Cellar/...`          | You used Homebrew. [See above.](#homebrew) |
| `/home/linuxbrew/.linuxbrew/...` | You used Homebrew. [See above.](#homebrew) |
| `.../target/release/spin`        | You built from source. Re-run the instructions for building from source. |
| Anywhere else                    | You used the install script. Re-run it, then move the `spin` file to replace your current one. |

## Troubleshooting

If you have upgraded Spin and don't see the newer version, please consider the following.

### Not Seeing the Latest Version?

It may be possible that you have installed Spin **using more than one** of the above methods. In this case, the Spin executable that runs is the one that is listed first in your `PATH` system variable. 

If you have upgraded Spin yet still see the old version using `spin --version` this can be due to the order of precedence in your `PATH`. Try echoing your path to the screen and checking to see whether the location of your intended Spin executable is listed before or after other pre-existing installation paths:

```bash
echo $PATH
/Users/my_user/.cargo/bin:/usr/local/bin
```

> Paths are separated by the `:` (colon) on Linux and MacOS, and `;` (semi-colon) on Windows.

In the above case, the [Cargo install method](./install#using-cargo-to-install-spin)'s installation will take precedence over the [installer script method](./install#installing-spin)'s installation. 

In this case, you can either remove the Cargo installation of Spin using `cargo uninstall spin-cli` or update your system path to prioritize the Spin binary path that you prefer.
