title = "PHP Spin"
description = "In this post, we’ll create a new PHP application with Spin and then run it in Fermyon Cloud."
date = "2022-12-22T18:13:50.393377Z"
template = "blog_post"

[extra]
type = "post"

---

In this post, we’ll create a new PHP application with Spin and then run it in [Fermyon Cloud](https://fermyon.com/cloud). VMware’s Wasm Labs maintains a version of PHP that is compiled to WebAssembly, and we will use that.  We will create a new Spin application that loads the PHP-Wasm runtime, and then we will write a couple of scripts and look at a few configuration options. We will test it locally until we are happy with our result. Then we’ll deploy to a publicly accessible Fermyon Cloud app.

<!-- break -->

## WebAssembly and Scripting Languages Like PHP
Before we dive into the practical side, it is helpful to understand how PHP and WebAssembly work. PHP is a scripting language, which typically means we need to [compile the language interpreter itself](https://www.fermyon.com/blog/scripts-vs-compiled-wasm) to WebAssembly. Then we write our code the usual PHP way. When we run our application, the Wasm version of PHP runs our code just like we would expect in PHP’s other runtime versions. For that reason, the bulk of our setup here is just configuring Spin to use the Wasm version of PHP.

## Getting Started
Make sure you have the [latest Spin](https://developer.fermyon.com/spin/install) installed. Since there is not yet a Spin PHP starter template, we’ll create an empty HTTP project and add PHP.

```console
$ spin new http-empty hello-php
Project description: PHP for Fermyon Cloud
HTTP base: /
```

Next, we need to edit the generated `spin.toml` to tell it how to fetch PHP from [VMware Labs](https://github.com/vmware-labs/webassembly-language-runtimes/releases). Find the release you want to install and copy the download link. We recommended downloading the version optimized for speed, but any of them will work. 

You will also need to get the SHA-256 digest of the file you are going to download. You can check the [release page](https://github.com/vmware-labs/webassembly-language-runtimes/releases), or you can generate your own by downloading the file and running `shasum -a 256 php-cgi-7.4.32.speed-optimized.wasm`.

```toml
# This part was generated for us by "spin new http-empty"
spin_version = "1"
authors = ["Matt Butcher <matt.butcher@fermyon.com>"]
description = "PHP for Fermyon Cloud"
name = "hello-php"
trigger = { type = "http", base = "/" }
version = "0.1.0"

# This is the stuff we are adding.
[[component]]
# Latest PHP-Wasm
id = "PHP"
files = [ { source = "./src", destination = "/" } ]
[component.source]
# URL to download the .wasm file
url = "https://github.com/vmware-labs/webassembly-language-runtimes/releases/download/php%2F7.4.32%2B20221124-2159d1c/php-cgi-7.4.32.speed-optimized.wasm"
# digest of the .wasm file we expect to get from the URL
digest = "sha256:511720698dee56134ed8a08a87131d33c3ea8a64b6726cd6710d624bca4ceb6c"
[component.trigger]
# Make sure the executor is wagi
executor = { type = "wagi"}
# This means PHP will be used for all requests.
route = "/..."

```

Importantly, the `component.source` has two required parts:
* `url` is the URL where Spin can fetch the PHP runtime.
* `digest` is the SHA-256 digest of the download file. This is a security feature that makes sure nothing was corrupted for compromised during download.

We mapped a source directory called `src/` in our local project to the remote path `/`. That means that any PHP files we put locally in `./src/` will be loaded into the root of the PHP-Wasm server. So let’s create that directory and write our first PHP script:

```console
$ mkdir src
$ cd src
```

Inside of `src/`, we can create `index.php`. Let’s start with a “Hello World”:

```php
<?php
echo “Hello World”;
?>
```

Now we have everything we need to test things out. In a console window,  run `spin up`. Since we’re currently in the `src/` directory, we need to change directories up a level so that we are in the same directory as the `spin.toml`:

```console
$ cd ..
$ ls
modules   spin.toml src
$ spin up
Serving http://127.0.0.1:3000
Available Routes:
  PHP: http://127.0.0.1:3000 (wildcard)
```

If we point a web browser at `http://127.0.0.1:3000/index.php`, we should see “Hello World”. Here’s what it looks like with `curl`:

```console
$ curl localhost:3000/index.php
Hello World
```

We now have a Spin PHP app. We’ll get on to more features, but first let’s look at a couple frequent configuration issues.

## The Most Common Configuration Issues
Getting an error message instead of the “Hello World” message? Here are the first things to check:

1. The `source` attribute in your `spin.toml` _must_ have both a URL and a digest if you want to fetch the latest version from GitHub. However, you can also download the php-wasm binary to your local working directory and just use `source = “/path/to/php-wasm.wasm”`
2. The `component.trigger` in `spin.toml` _must_ use the Wagi trigger: `executor = { type = "wagi"}`
3. The `files` list needs to map a local path where your PHP files are to the `/` path on the runtime: `files = [ { source = "./src", destination = "/" } ]`. That copies, for example, your local `src/index.php` to `/index.php` in the PHP engine.

## Mapping `/` to `/index.php`
In our example above, in order to access our new app, we need to add `/index.php` to the URL. What if you want to configure  `http://localhost:3000/` to run `index.php`? By default, Spin will not assume that `index.php` is the path it should run. There are a few ways to work around this, but the easiest is to just redirect from `/` to `/index.php`. And we can do that with the `spin add redirect` command:

```console
$ spin add redirect
Enter a name for your new project: redirect-root
Redirect from: /
Redirect to: /index.php
```

Now when we run `spin up localhost:3000`, it will execute our PHP code.

How does this work? When we did  `spin add redirect`, Spin added a redirector to our `spin.toml` file. Taking a look at `spin.toml`, we’ll see the new redirect component:

```toml
[[component]]
source = { url = "https://github.com/fermyon/spin-redirect/releases/download/v0.0.1/redirect.wasm", digest = "sha256:d57c3d91e9b62a6b628516c6d11daf6681e1ca2355251a3672074cddefd7f391" }
id = "redirect-root"
environment = { DESTINATION = "/index.php" }
[component.trigger]
route = "/"
executor = { type = "wagi" }
```

>> Twice we have seen `url` used in `source`. This is a new feature in Spin 0.7 that allows Spin to fetch a Wasm component directly from its source. Doing so makes it easy to include standard components without having to keep them all locally downloaded.

## Using PHP Features
We have now got a simple PHP “hello world”. Just for fun, let’s build something slightly more sophisticated. This example will show a few features of PHP:

* Setting HTTP headers
* Accessing query parameters (the part after `?` in a URL)
* Using built-in PHP libraries. In this case, it’ll the JSON encoder

```php
<?php
header("Content-Type: application/json");

$name = $_GET["name"];

if (empty($name)) {
    $name = "Unknown";
}

$data = array(
    "name" => $name,
    "platform" => "PHP",
);


echo json_encode($data);
```

This example writes a JSON object instead of plain text. Additionally, `name` is set to whatever gets passed in on the query string’s `name` parameter. Here’s what the output looks like with curl:

```console
$ curl localhost:3000/index.php\?name=Matt
{"name":"Matt","platform":"PHP"}
```

The code above is nothing extraordinary. In fact the reason for giving this example is to show that once you have PHP running in Wasm, you can for the most part use it normally. 

Be aware, though, that not all of the libraries that can be run in PHP are compiled into this version of PHP-Wasm. The easiest way to see which libraries are supported is to create another script in `src/` named `info.php` and add this:

```php
<?php phpinfo(); ?>
```

Accessing `http://localhost:3000/info.php` in your browser will display the configuration of PHP-Wasm.

## Deploying to Fermyon Cloud
We’ve done the hard part. Now all we need to do is deploy it to Fermyon Cloud, and we’ll have our first PHP app online and ready for use!

```console
$ spin deploy

Copy your one-time code:

XXXXXXXX

...and open the authorization page in your browser:

https://cloud.fermyon.com/device-authorization

Waiting for device authorization...
Device authorized!
Uploading hello-php version 0.1.0+r4a15e354...
Deploying...
Waiting for application to become ready............. ready
Available Routes:
  PHP: https://hello-php-gpye1en3.fermyon.app/(wildcard)
  redirect-root: https://hello-php-gpye1en3.fermyon.app/
```

And that’s it! We’ve got PHP on Fermyon Cloud.

## Conclusion
PHP has been one of the most popular programming languages for decades. And it is no wonder. Web developers can be highly productive with PHP’s rich libraries and easy programming model. Furthermore, PHP lends itself to the serverless functions model.

This post introduced how to configure Spin for PHP-Wasm, and then walked through creating a simple app. If you’re interested in chatting about this, or if you have questions, don’t hesitate to [hit us up in Discord](https://discord.gg/AAFNfS7NGf).