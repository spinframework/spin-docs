[![styleguide-logo](https://user-images.githubusercontent.com/686194/159795633-67623aca-bf98-4e92-954f-3e1bbbcc8901.png)](https://design.fermyon.dev/)

## A live design reference manual for [Fermyon](https://fermyon.com)-related materials.

> Styleguides are real-life pattern libraries, code standards documents and content style guides &mdash; [styleguides.io](http://styleguides.io/), a wonderful collection.

This styleguide is built as a living, working codebase rather than a simple reference document. It is published as an npm [package](https://www.npmjs.com/package/@fermyon/styleguide), so it can be easily imported into other projects and applied as a baseline branded CSS layer.

The styleguide also contains a `/docs` page (visible [here](https://design.fermyon.dev/) as a website), which contains our brand guidelines, logos, and design resources.

## Using The Styleguide

#### 1. Add the styleguide to your project:

```
npm install -D @fermyon/styleguide
npm install
```

#### 2. Once installed, the core `.scss` file can be imported into your project stylesheet as a dependency:

```
@import "../../node_modules/@fermyon/styleguide/scss/fermyon";
```

You can see examples of the styleguide being imported into other projects [here](https://github.com/fermyon/fermyon.com/blob/main/static/sass/styles.scss#L16) (fermyon.com site) and [here](https://github.com/fermyon/spin/blob/main/docs/static/sass/styles.scss#L16) (Spin docs).

#### 3. Re-Compiling Sass to CSS

If your project requires the addition of special, localized styles (which is pretty common), they can be added to your stylesheet _underneath_ the imports shown above. You'll need to re-compile the styles to generate your CSS.

This will likely require the addition of asset build configuration to your project &mdash; which depends on the particulars of which tools are being used to generate and run that site/app (for us, that usually means [Bartholomew](https://github.com/fermyon/bartholomew)).

Example using [vanilla Sass](https://sass-lang.com/documentation/cli/dart-sass) ([see fermyon.com here](https://github.com/fermyon/fermyon.com/blob/main/package.json#L19)):

```
sass --watch static/sass/styles.scss static/css/style.css --style compressed
```

Example using [Parcel JS](https://en.parceljs.org/getting_started.html): ([see Spin docs](https://github.com/fermyon/spin/blob/main/docs/package.json#L35)):

```
npx parcel build static/sass/styles.scss --dist-dir static/css --no-optimize
```

#### 4. Alternatively, just use the CSS as-is:

You can avoid working with Sass/Scss and just use the styleguide as-is by importing the CSS version (along with Bulma) directly into your page. Copy the `css/fermyon.css` file from the styleguide into your project and include it in the `head` of the page:

```
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.3/css/bulma.min.css"
        integrity="sha512-IgmDkwzs96t4SrChW29No3NXBIBv8baW490zk5aXvhCD8vuZM3yUSkbyTBcXohkySecyzIrUwiF/qV0cuPcL3Q==" crossorigin="anonymous" referrerpolicy="no-referrer" />
<link href="https://fonts.googleapis.com/css2?family=Sen:wght@400;700&amp;display=swap" rel="stylesheet" />
<link rel="stylesheet" href="YOUR_PROJECT_FILEPATH/fermyon.css" />
```

Note: the CSS should be linked _after_ (i) the bulma.min.css  and (ii) Sen webfont CDN requests, as shown above.

### Working on Styleguide

To build the styleguide assets, and open the `docs/index.html` page run:

```
cd docs
npm run dev
```

If you just want to rebuild CSS your edits, run:

```
npm run styles
```

Changes can be viewed and tested at [http://localhost:1234/](http://localhost:1234/).

When you have made edits, **please commit** the updated CSS (css/fermyon.css) in addition to any `.scss` changes.
