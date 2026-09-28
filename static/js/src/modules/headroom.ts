import Headroom from "headroom.js";
import { $ } from "./dom";

function create(selector: string, offset: number): Headroom | null {
  const elem = $(selector);
  return elem ? new Headroom(elem, { tolerance: 5, offset }) : null;
}

// The topbar exists on every page; the blog slogan only on blog pages.
const header = create("#topbar", 80);
const blogAd = create("#blogSlogan", 300);

export function initHeader(): void {
  header?.init();
}

export function unpinHeader(): void {
  header?.unpin();
}

export function initBlogAd(): void {
  blogAd?.init();
}
