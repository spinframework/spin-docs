import { $$ } from "./dom";

const anchorSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width=16 height=16 viewBox="0 0 640 512"><!--! Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l-1.1-1.6c-10.3-14.4-6.9-34.4 7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.9l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l-1.1 1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z"/></svg>';

// Turn text into a URL-safe slug matching the ids emitted by the index builder.
function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function idFor(element: HTMLElement): string {
  if (element.tagName.toLowerCase() !== "tr") {
    return slugify(element.textContent ?? "");
  }

  const row = element as HTMLTableRowElement;
  const firstColumn = slugify(row.cells[0]?.textContent ?? "");

  let heading = row.closest("table")?.previousElementSibling ?? null;
  while (heading && !heading.matches("h1, h2, h3, h4")) {
    heading = heading.previousElementSibling;
  }

  const headingId = heading?.getAttribute("id");
  return headingId ? `${headingId}-${firstColumn}` : firstColumn;
}

export function addAnchorLinks(): void {
  const elements = $$<HTMLElement>(
    ".content h1, .content h2, .content h3, .content h4, .content tr",
  );

  elements.forEach((element) => {
    const uniqueId = idFor(element);
    element.classList.add("heading-anchor");
    element.setAttribute("id", uniqueId);

    const anchor = document.createElement("a");
    anchor.className = "anchor-link";
    anchor.href = "#" + uniqueId;
    anchor.innerHTML = anchorSvg;
    element.append(anchor);

    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.hash = uniqueId;
      document.getElementById(uniqueId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}
