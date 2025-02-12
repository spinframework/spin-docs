# markdownlint-rule-titlecase

Custom title case rule for markdownlint headers

![npm](https://img.shields.io/npm/v/markdownlint-rule-titlecase)

## Usage

Once installed using `npm install markdownlint-rule-titlecase`, run markdownlint with `--rules "markdownlint-rule-titlecase"`:

```console
$ markdownlint . --rules "markdownlint-rule-titlecase"

chapters/00-introduction.md:60 titlecase-rule Titlecase rule [Title Case: 'Expected ### How Skilled Do I Need to Be in Python to Use This Book?, found ### How skilled do I need to be in Python to use this book?']
chapters/00-introduction.md:64 titlecase-rule Titlecase rule [Title Case: 'Expected ### Do I Need to Know C to Use This Book?, found ### Do I Need to Know C to Use This book?']
chapters/00-introduction.md:74 titlecase-rule Titlecase rule [Title Case: 'Expected ### Won't The Content in This Book Be Out of Date Really Quickly?, found ### Won't The Content in This Book be Out of Date Really Quickly?']
```