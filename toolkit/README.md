- [Supporting Documentation](#supporting-documentation)
  - [Prerequisites](#prerequisites)
    - [Python3](#python3)
    - [Curl](#curl)
- [Write Codeblocks](#write-codeblocks)
  - [Install Python Dependencies](#install-python-dependencies)
  - [Write Codeblocks Usage](#write-codeblocks-usage)
- [Check CLI Output](#check-cli-output)
  - [Check CLI Output Usage](#check-cli-output-usage)

# Supporting Documentation

If you are using this toolkit to add/edit the current documentation, please read the [contributing documentation](https://spinframework.com/v2/contributing-docs) page (and perhaps leave it open for reference when forking, cloning, committing, etc.).

# Developer Repository Location

We will use the system's home directory for demonstration purposes (and assume that the developer repository is also in the home directory for demonstration purposes i.e. `~/developer`). Let's change to the home directory and clone the repository:

```bash
cd ~
git clone https://github.com/fermyon/developer.git
```

## Prerequisites

### Python3

Ensure that you have installed Python 3.10 or later on your system. You can check your Python version by running:

```bash
python3 --version
```

### Curl

Ensure that you have `curl` installed. For example, the `curl` dependency can be installed on Ubuntu Linux using the following commands:

```bash
sudo apt update
sudo apt install curl
curl --version
```

# Write Codeblocks

The `update_spin_cli_reference.py` script will fetch the current [Spin CLI Reference](https://spinframework.com/v2/cli-reference) document from the web and write a fresh copy of the source markdown file (a new file called `updated_markdown.md` with the new version of code blocks added). The fresh markdown file, generated by this script, is the basis of a PR that contains the CLI commands for the new version of Spin.

## Install Python Dependencies

The Python code that writes the codeblocks needs to have the Python `requests` library installed. We do this inside a Python Virtual Environment (`venv`) dir.

Change into an arbitrary working directory so as not to add versioned files to this repository. (The files created by this toolkit are auxiliary and are manually inserted into the versioned documentation files.)

Set up and activate a Python virtual environment and then install the dependencies:

```bash
# Using home
cd ~
# Create venv
python3 -m venv venv-dir
# Activate venv
source venv-dir/bin/activate
# Install requests library
pip3 install requests
```

## Write Codeblocks - Usage

Run the script and pass in the two versions of Spin.

**Note**: Use two number characters `vX.X` only i.e. `v2.6`:

```bash
python3 developer/toolkit/update_spin_cli_reference.py v2.6 v2.7
```

The above script generates a new file called `updated_markdown.md`. Open this file and use the markdown as the basis for your new Spin CLI Reference PR.

# Check CLI Output

The `script_to_check_cli_outputs.sh` script will tell you what the changes are (between two different Spin versions) the script is designed to quickly provide the necessary information for a new Spin CLI Reference PR.

## Check CLI Output - Usage

Run the script using the `vX.X.X` format. Please note, the Spin versions you use must exist as a Spin release in the Spin GitHub repo.

**Note**: Use three number characters `vX.X.X` i.e. `v2.6.0`:

```bash
# Assuming this repo is cloned to your home directory (as per the first example also)
cd ~
cd developer/toolkit
# Run the script
./script_to_check_cli_outputs.sh v2.5.0 v2.6.0
```

The output will show old content on the `<` prefixed lines and new content on the `>` prefixed lines. If there have been no changes to the CLI (other than the version and checksum) you will see something similar to the following:

```bash
< Output: spin 2.5.0 (83eb68d 2024-05-08)

> Output: spin 2.6.0 (a4ddd39 2024-06-20)
```
