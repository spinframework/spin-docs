title = "Hello World"
date = "2025-10-30T12:00:00Z"
template = "blog_post"
description = "This is a hello world blog post with example contents and formatting references."

[extra]
author = "Michelle Dhanani"
type = "post"

---

This is the beginning of our community blog. Welcome to the Spin Framework Community! This introductory paragraph demonstrates how body text appears with our new Medium-inspired typography. The comfortable 18px font size and 1.58 line height create an optimal reading experience.

Typography is the craft of endowing human language with a durable visual form. When done well, it enhances the reading experience without drawing attention to itself. Our new blog layout emphasizes readability through thoughtful spacing, appropriate font sizes, and a narrow reading pane that prevents eye strain.

## Understanding Typography Fundamentals

Good typography serves the content. It's not about making things look "designed" but about creating a seamless reading experience. The key principles include proper hierarchy, consistent spacing, and appropriate line length. Research suggests that lines between 50-75 characters are optimal for reading comfort.

### The Importance of Hierarchy

Headings establish visual hierarchy and help readers scan content quickly. Notice how this H3 heading is smaller than the H2 above, creating a clear content structure. Each level should be visually distinct but harmonious with the overall design.

#### Fourth Level Headings

Even at the fourth level, headings maintain the typographic rhythm. They're smaller still, but remain bold and clear, guiding readers through nested sections of content.

## Working with Lists

Lists are essential for organizing information. Here's an unordered list demonstrating proper spacing and readability:

- **WebAssembly** enables running compiled code at near-native speed in web browsers
- **Spin Framework** provides a lightweight runtime for building and deploying WebAssembly applications
- **Component Model** standardizes how WebAssembly modules communicate and share functionality
- **WASI** (WebAssembly System Interface) allows Wasm to interact with system resources safely

Ordered lists work equally well for sequential information:

1. First, install the Spin CLI on your development machine
2. Create a new Spin application using `spin new`
3. Write your application logic in your preferred language
4. Build the application with `spin build`
5. Deploy locally with `spin up` or to Fermyon Cloud

Nested lists maintain proper indentation:

- Backend technologies
  - Go provides excellent performance for system-level programming
  - Rust ensures memory safety without garbage collection
  - Python offers rapid development and extensive libraries
- Frontend frameworks
  - Vue.js for progressive web applications
  - React for component-based UIs
  - Svelte for compiled, lightweight applications

## Code Examples

Inline code like `spin build` or `const greeting = "Hello World"` integrates seamlessly with body text. For longer examples, code blocks provide syntax highlighting:

```rust
use spin_sdk::{
    http::{Request, Response},
    http_component,
};

#[http_component]
fn handle_request(req: Request) -> Response {
    Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body("Hello, World!")
        .build()
}
```

Here's a JavaScript example:

```javascript
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}
```

And a command-line example:

```bash
# Install Spin
curl -fsSL https://developer.fermyon.com/downloads/install.sh | bash

# Create a new application
spin new http-rust my-app
cd my-app

# Build and run
spin build
spin up
```

## Blockquotes for Emphasis

Blockquotes highlight important information or quotations:

> The best way to predict the future is to invent it. This principle applies perfectly to WebAssembly and the Spin Framework—we're not just waiting for the future of serverless, we're building it today.

Longer blockquotes maintain readability:

> Typography exists to honor content. When text is beautifully presented, readers engage more deeply with ideas. The Medium platform understood this intuitively, creating a reading experience that prioritized comfort and clarity over flashy design. Our blog adopts these same principles.

## Links and References

Links should be [clearly marked and understandable](https://developer.fermyon.com) in context. Learn more about [Spin Framework](https://github.com/fermyon/spin) or explore the [WebAssembly specification](https://webassembly.org/).

## Emphasis and Strong Text

Use *italic emphasis* for subtle highlighting and **bold text** for stronger emphasis. Combine them ***sparingly*** for maximum impact. The key is restraint—too much emphasis dilutes its effectiveness.

## Tables for Data

| Language | Spin Support | Compile Target | Use Case |
|----------|--------------|----------------|----------|
| Rust     | Excellent    | wasm32-wasi    | Systems programming, high performance |
| Go       | Good         | wasm32-wasi    | Network services, APIs |
| JavaScript | Good       | SpiderMonkey   | Familiar syntax, quick prototyping |
| Python   | Experimental | wasm32-wasi    | Data processing, scripting |

## Horizontal Rules

Use horizontal rules sparingly to separate major sections:

---

## Images and Media

Images enhance content when used purposefully. They should support the narrative rather than distract from it. Captions provide context and attribution.

## Conclusion

Great typography isn't about following strict rules—it's about understanding principles and applying them thoughtfully. Our blog design prioritizes readability through careful attention to font size, line height, line length, and spacing. The result is a comfortable reading experience that lets the content shine.

Whether you're writing about WebAssembly, serverless computing, or web development, these typographic foundations ensure your message reaches readers clearly and effectively. Welcome to the Spin Framework community blog—we're excited to share ideas, tutorials, and insights with you.
