import { glob } from 'glob'
import fs from 'fs'
import path from 'path'
import fm from 'front-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import args from 'args-parser'
import lunr from 'lunr'

// Versions for which a standalone search index is produced. Pages outside of
// these (blog, landing pages, ...) fall back to the default version at runtime.
const VERSIONS = ['v1', 'v2', 'v3', 'v4']

// Elements that have child elements
const blockElements = ["paragraph", "blockquote", "list", "listItem", "link"]
// Elements who's value is just text
const inlineElements = ["inlineCode", "text", "code"]

function parseMdFile(file, filepath) {
    let data = fs.readFileSync(file,
        { encoding: 'utf8', flag: 'r' });
    let fmIndex = data.indexOf("---")

    // Make the extra section parsable as frontmatter
    if (data.slice(0, fmIndex).includes("[extra]")) {
        data = data.replace("[extra]", "extra_Section: \"OK\"")
        fmIndex += 12
    }

    // Make it valid frontmatter as per jekyll standards
    let fmReplace = data.slice(0, fmIndex)
    fmReplace = fmReplace.replaceAll("=", ":")
    data = fmReplace + data.slice(fmIndex, -1)
    data = "---\n\n" + data

    // Parse markdown into json tree
    let content = fm(data)
    let myResult = unified()
        .use(remarkParse)
        .parse(content.body);

    // Create default document index for the page
    let documentIndex = { project: file.split("/")[2], title: content.attributes["title"], subheading: "", content: "", keywords: content.attributes["keywords"], subsectionKeywords: "", url: "/" + file.replace(filepath, "").replace(".md", "") }
    let searchIndex = []

    // For each heading create a new search index
    myResult.children.map(k => {
        if (!(k.type == "heading")) {
            // If inline element just append content
            if (inlineElements.includes(k.type)) {
                documentIndex.content = documentIndex.content.concat(k.value)
            }
            // Add in content search terms
            else if (k.type == "html") {
                let text = k.value.trim()
                if (text.includes("@searchTerm")) {
                    text = text.replace("<!-- @searchTerm", "").replace("-->", "").replaceAll("\"","")
                    documentIndex.subsectionKeywords = documentIndex.subsectionKeywords.concat(" ", text)
                }
            }
            else {
                if (blockElements.includes(k.type)) {
                    k.children.map(inlineElement => {
                        documentIndex.content = documentIndex.content.concat(inlineElement.value)
                    })
                }
            }
        } else {
            // If new heading create a new index
            searchIndex.push(documentIndex)

            let subtitle = k.children.map(k => {
                if (k.children) {
                    return k.children[0].value
                }
                return k.value
            })
            subtitle = subtitle.join(" ")

            documentIndex = {
                project: file.split("/")[2],
                title: content.attributes["title"], subheading: subtitle, content: "", keywords: "", subsectionKeywords: "",
                url: "/" + file.replace(filepath, "").replace(".md", "") + "#" + subtitle.toLowerCase().replace(/[`~!@#$%^&*()_|+=?;:'",.<>\{\}\[\]\\\/]/g, '')
                    .replace(/ +/g, '-')
            }
        }
    })
    // If there are unpushed document index push it
    if (documentIndex.content) {
        searchIndex.push(documentIndex)
    }
    return searchIndex
}

// Build a serialized lunr index plus a slim metadata map for a single version.
// The index consumes the (large) `content` field; the metadata map holds only
// what the client needs to render a result, keeping the shipped payload small.
function buildVersion(docs, version, outdir) {
    const versionDocs = docs.filter(doc => doc.url && doc.url.split("/")[1] === version)

    const idx = lunr(function () {
        this.field("title")
        this.field("subheading")
        this.field("content")
        this.field("keywords", { boost: 100 })
        this.field("subsectionKeywords", { boost: 100 })
        this.ref("url")

        versionDocs.forEach(function (doc) {
            this.add(doc)
        }, this)
    })

    const meta = {}
    versionDocs.forEach(doc => {
        meta[doc.url] = { title: doc.title, subheading: doc.subheading, project: doc.project }
    })

    fs.writeFileSync(path.join(outdir, `index-${version}.json`), JSON.stringify(idx))
    fs.writeFileSync(path.join(outdir, `meta-${version}.json`), JSON.stringify(meta))
    console.log(`search index ${version}: ${versionDocs.length} documents`)
}

async function main() {
    const argparse = args(process.argv)
    if (!argparse.dir || !argparse.outdir) {
        console.error("--dir and --outdir must be specified")
        return
    }

    let consolidatedSearchIndex = []

    let files = await glob(argparse.dir + '/**/*.md', {ignore: argparse.ignore})
    files.forEach(file => {
        consolidatedSearchIndex = consolidatedSearchIndex.concat(parseMdFile(file, argparse.dir))
    })

    fs.mkdirSync(argparse.outdir, { recursive: true })
    VERSIONS.forEach(version => buildVersion(consolidatedSearchIndex, version, argparse.outdir))
}

main()