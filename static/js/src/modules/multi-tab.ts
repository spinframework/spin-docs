import { el, list, setStyle, List, RedomComponentClass } from "redom";
import { $$ } from "./dom";

type TabCallback = (index: number, target: EventTarget | null) => void;
type GlobalCallback = (
  tabClass: string,
  value: string,
  updateLocalStorage: boolean,
  isUserEvent?: boolean,
  element?: HTMLElement,
) => void;

const STORAGE_KEY = "toggleTabSelections";

interface TabContext {
  active: number;
}

class MultiTabTab {
  el: HTMLElement;
  private index = 0;
  private lang: HTMLAnchorElement;
  constructor(parentCallback: TabCallback) {
    this.lang = el("a") as HTMLAnchorElement;
    this.el = el(
      "li",
      { onclick: (e: Event) => parentCallback(this.index, e.target) },
      this.lang,
    );
  }
  update(data: string, index: number, _items: unknown, context: TabContext): void {
    this.index = index;
    this.lang.textContent = data;
    this.lang.classList.toggle("is-active", context.active === this.index);
  }
}

class MultiTabBlock {
  el: HTMLElement;
  private tabClass: string;
  private parentCallback: GlobalCallback;
  private nodes: HTMLElement[];
  private langs: string[];
  private active: number;
  private tabs: List;
  constructor(
    nodes: NodeListOf<HTMLElement> | HTMLElement[],
    tabClass: string,
    activeValue: string | null,
    parentCallback: GlobalCallback,
  ) {
    this.tabClass = tabClass;
    this.parentCallback = parentCallback;
    this.nodes = Array.from(nodes);
    this.langs = this.nodes.map((k) => k.dataset.title ?? "");
    this.active = this.langs.indexOf(activeValue ?? "");
    if (tabClass !== "spin-version") {
      this.active = this.active > 0 ? this.active : 0;
    } else {
      this.active = this.active > 0 ? this.active : this.nodes.length - 1;
    }
    this.tabs = list(
      "ul",
      MultiTabTab as unknown as RedomComponentClass, // redom passes initData (the callback) to the constructor
      undefined,
      this.childEventHandler.bind(this),
    );
    this.el = el("div.tabs.is-boxed", this.tabs);

    // The `spin-version` tabs read newest-first.
    if (tabClass === "spin-version") {
      setStyle(this.tabs, { display: "flex", "flex-direction": "row-reverse" });
    }

    this.tabs.update(this.langs, { active: this.active });
    this.updateTabContent(this.active);
  }
  private childEventHandler(data: number, element: EventTarget | null): void {
    this.tabs.update(this.langs, { active: data });
    this.updateTabContent(data);
    this.parentCallback(this.tabClass, this.langs[data], true, true, element as HTMLElement);
  }
  private updateTabContent(active: number): void {
    this.nodes.forEach((node, i) => setStyle(node, { display: i === active ? "block" : "none" }));
  }
  globalTabUpdate(value: string): void {
    const activeIndex = this.langs.indexOf(value);
    if (activeIndex < 0) return;
    this.tabs.update(this.langs, { active: activeIndex });
    this.updateTabContent(activeIndex);
  }
}

interface Handler {
  class: string;
  tabBlock: MultiTabBlock;
}

type Selections = Record<string, string | null>;

function detectOS(): string | null {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf("win") !== -1) return "Windows";
  if (userAgent.indexOf("mac") !== -1) return "macOS";
  if (userAgent.indexOf("linux") !== -1) return "Linux";
  return null;
}

// Read `?multitab_<class>=<value>` query params into a selection map.
function filterMultitabQuery(): Selections {
  const params = new URLSearchParams(window.location.search);
  const selections: Selections = {};
  for (const [key, value] of params.entries()) {
    if (key.startsWith("multitab_")) {
      selections[key.replace("multitab_", "")] = value;
    }
  }
  return selections;
}

function readSelections(): Selections {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "") || { os: null };
  } catch {
    return { os: null };
  }
}

export class MultiTabContentHandler {
  private selectedTab: Selections;
  private handler: Handler[] = [];
  constructor() {
    this.selectedTab = readSelections();

    // Defaults specified via query parameter win over stored preferences.
    Object.assign(this.selectedTab, filterMultitabQuery());

    if (this.selectedTab.os == null) {
      this.selectedTab.os = detectOS();
    }

    $$<HTMLElement>("div.multitab-content-wrapper").forEach((wrapper) => {
      const tabs = wrapper.querySelectorAll<HTMLElement>("div.multitab-content");
      const cls = (wrapper.dataset.class ?? "").toLowerCase();
      const tabBlock = new MultiTabBlock(
        tabs,
        cls,
        this.selectedTab[cls] ?? null,
        this.updateTabs.bind(this),
      );
      wrapper.insertBefore(tabBlock.el, wrapper.firstChild);
      this.handler.push({ class: cls, tabBlock });
    });

    for (const key of Object.keys(this.selectedTab)) {
      const value = this.selectedTab[key];
      if (value) this.updateTabs(key, value, false);
    }

    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY) return;
      this.selectedTab = readSelections();
      for (const key of Object.keys(this.selectedTab)) {
        const value = this.selectedTab[key];
        if (value) this.updateTabs(key, value, false);
      }
    });
  }
  private updateTabs(
    tabClass: string,
    value: string,
    updateLocalStorage: boolean,
    isUserEvent?: boolean,
    element?: HTMLElement,
  ): void {
    if (tabClass === "soloblock") return;
    this.selectedTab[tabClass] = value;

    const originalOffset = isUserEvent && element ? element.getBoundingClientRect().top : 0;

    this.handler.forEach((h) => {
      if (h.class === tabClass) h.tabBlock.globalTabUpdate(value);
    });

    if (isUserEvent && element) {
      const newOffset = element.getBoundingClientRect().top + document.documentElement.scrollTop;
      window.scroll(0, newOffset - originalOffset);
    }
    if (updateLocalStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.selectedTab));
    }
  }
}
