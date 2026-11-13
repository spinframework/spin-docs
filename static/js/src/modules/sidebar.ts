import { $ } from "./dom";

// Expand the side menu around the active item and scroll it into view.
export function scrollSideMenu(): void {
  const active = $("aside.menu .active");
  if (!active) return;

  const group = active.parentElement?.parentElement;
  const collapsible = group?.parentElement?.firstElementChild;
  if (collapsible instanceof HTMLInputElement) {
    collapsible.checked = true;
  }
  group?.classList.add("stay-open");
  group?.previousElementSibling?.classList.add("stay-open");

  active.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
}
