import { mount } from "redom";
import { searchButton, searchModal } from "./modules/search";
import { addAnchorLinks } from "./modules/anchor-links";
import { addCopyButtons } from "./modules/copy-buttons";
import { highlightAll } from "./modules/highlight";
import { initHeader, initBlogAd, unpinHeader } from "./modules/headroom";
import { scrollSideMenu } from "./modules/sidebar";
import { removeExpiredEvents } from "./modules/events";
import { MultiTabContentHandler } from "./modules/multi-tab";
import { createFeedbackElement } from "./modules/feedback";
import { $, $$ } from "./modules/dom";

// Generic modal open/close wiring.
$$(".modal-button").forEach((el) => {
  el.addEventListener("click", () => {
    const target = $(el.getAttribute("data-target") ?? "");
    if (!target) return;
    target.classList.add("is-active");
    target.querySelector(".modal-close")?.addEventListener("click", () => {
      target.classList.remove("is-active");
    });
    target.querySelector(".modal-background")?.addEventListener("click", () => {
      target.classList.remove("is-active");
    });
  });
});

if ($("#blogSlogan")) {
  initBlogAd();
}

function initBurger(): void {
  const burger = $(".burger");
  const menu = burger?.dataset.target ? $("#" + burger.dataset.target) : null;
  if (!burger || !menu) return;
  burger.addEventListener("click", () => {
    burger.classList.toggle("is-active");
    menu.classList.toggle("is-active");
  });
}

function initSearch(): void {
  const buttonContainer = $("#search-button-container");
  const modalContainer = $("#search-modal-container");
  if (buttonContainer) mount(buttonContainer, searchButton);
  if (modalContainer) mount(modalContainer, searchModal);

  document.onkeydown = (e) => {
    if (e.key === "Escape") {
      searchModal.close();
    }
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      searchModal.open();
    }
    if (e.key === "s" || e.key === "S") {
      const searchBar = $<HTMLInputElement>("#hub-search-input");
      if (searchBar && document.activeElement !== searchBar) {
        e.preventDefault();
        searchBar.focus();
      }
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initBurger();
  initHeader();
  highlightAll();
  if (navigator.clipboard) {
    addCopyButtons();
  }
  removeExpiredEvents();
  addAnchorLinks();
  scrollSideMenu();
  new MultiTabContentHandler();

  if (window.location.hash.length > 0) {
    setTimeout(() => {
      $<HTMLAnchorElement>(`a[href="${window.location.hash}"]`)?.click();
    }, 150);
    unpinHeader();
  }

  initSearch();

  const feedback = $("#feedback-wrapper");
  if (feedback) {
    createFeedbackElement(feedback);
  }
});

// Exposed for the Spin Up Hub, which renders markdown content client-side.
declare global {
  interface Window {
    addAnchorLinks: typeof addAnchorLinks;
    addCopyButtons: typeof addCopyButtons;
  }
}
window.addAnchorLinks = addAnchorLinks;
window.addCopyButtons = addCopyButtons;
