import { el, list, setChildren, setStyle, List } from "redom";
import lunr from "lunr";
import { $ } from "./dom";

const projectList = ["Spin"];

interface DocMeta {
  title: string;
  subheading: string;
  project: string;
}
type MetaMap = Record<string, DocMeta>;

interface SubResult {
  subheading: string;
  url: string;
}
interface MatchGroup {
  title: string;
  project: string;
  url: string;
  score: number;
  data: SubResult[];
}

let idx: lunr.Index | null = null;
let meta: MetaMap = {};
let indexPromise: Promise<void> | null = null;

function currentVersion(): string {
  const match = window.location.pathname.match(/^\/(v\d+)\//);
  return match ? match[1] : "v3";
}

// The index and metadata are built at deploy time (see md_parser.mjs), one pair
// of files per version. We fetch and rehydrate them lazily on first use so page
// load never pays for search that may not be used.
async function loadIndex(): Promise<void> {
  const version = currentVersion();
  try {
    const [indexRes, metaRes] = await Promise.all([
      fetch(`/static/search/index-${version}.json`),
      fetch(`/static/search/meta-${version}.json`),
    ]);
    idx = lunr.Index.load(await indexRes.json());
    meta = (await metaRes.json()) as MetaMap;
  } catch (err) {
    console.error("Could not load search index", err);
  }
}

function ensureIndex(): Promise<void> {
  if (!indexPromise) indexPromise = loadIndex();
  return indexPromise;
}

class SearchButton {
  el: HTMLElement;
  constructor(modal: SearchModal) {
    this.el = el("button.search-button", {
      onclick: () => modal.open(),
    });

    const mobileSearch = $("#mobile-search");
    if (mobileSearch) {
      mobileSearch.classList.add("enable");
      mobileSearch.addEventListener("click", () => modal.open());
    }
  }
}

class SearchResultSubHeading {
  el: HTMLAnchorElement;
  private itemIcon: HTMLElement;
  private link: HTMLElement;
  constructor() {
    this.itemIcon = el("span.result-item-icon", "#");
    this.link = el("span");
    this.el = el(
      "a.result-subitem",
      { onclick: () => searchModal.close() },
      [this.itemIcon, this.link],
    ) as HTMLAnchorElement;
  }
  update(data: SubResult): void {
    this.link.textContent = data.subheading;
    this.el.href = data.url;
    // Hide listing where the subheading is empty
    setStyle(this.el, { display: data.subheading === "" ? "none" : "flex" });
  }
}

class SearchResultItem {
  el: HTMLElement;
  private subheading: List;
  private projectName: HTMLElement;
  private pageTitle: HTMLElement;
  private title: HTMLAnchorElement;
  constructor() {
    this.subheading = list("div.result-subheading-container", SearchResultSubHeading);
    this.projectName = el("code.project-name");
    this.pageTitle = el("span");
    this.title = el("a", this.pageTitle, this.projectName) as HTMLAnchorElement;
    this.el = el("div.result-block", [this.title, this.subheading]);
  }
  update(data: MatchGroup): void {
    this.pageTitle.textContent = data.title;
    this.projectName.textContent = data.project;
    this.title.href = data.url;
    this.subheading.update(data.data);
  }
}

interface FilterContext {
  callback: (index: number, active: boolean) => void;
  reset?: boolean;
}

class ResultFilterItem {
  el: HTMLElement;
  private index = 0;
  private active = true;
  private parentCallback: FilterContext["callback"] = () => {};
  constructor() {
    this.el = el("code.active", { onclick: () => this.toggle() });
  }
  update(data: string, index: number, _item: unknown, context: FilterContext): void {
    this.parentCallback = context.callback;
    this.index = index;
    if (context.reset) this.active = true;
    this.el.classList.toggle("active", this.active);
    this.el.textContent = data;
  }
  private toggle(): void {
    this.active = !this.active;
    this.el.classList.toggle("active", this.active);
    this.parentCallback(this.index, this.active);
  }
}

class SearchResultFilter {
  el: HTMLElement;
  private categories: string[];
  private parentCallback: (activeFilters: string[]) => void;
  private active: boolean[];
  private filters: List;
  constructor(categories: string[], callback: (activeFilters: string[]) => void) {
    this.categories = categories;
    this.parentCallback = callback;
    this.active = categories.map(() => true);
    this.filters = list("div.filter-categories", ResultFilterItem);
    this.filters.update(this.categories, {
      callback: this.updateFilterSearch.bind(this),
    });
    const resetFilter = el(
      "span.reset-filter",
      { onclick: () => this.resetFilters() },
      "Clear filters",
    );
    this.el = el("div.result-filters", this.filters, resetFilter);
  }
  private activeCategories(): string[] {
    return this.categories.filter((_k, i) => this.active[i]).map((k) => k.toLowerCase());
  }
  private updateFilterSearch(index: number, status: boolean): void {
    this.active[index] = status;
    this.parentCallback(this.activeCategories());
  }
  private resetFilters(): void {
    this.active = this.categories.map(() => true);
    this.parentCallback(this.activeCategories());
    this.filters.update(this.categories, {
      callback: this.updateFilterSearch.bind(this),
      reset: true,
    });
  }
}

class SearchResult {
  el: HTMLElement;
  private data: MatchGroup[] = [];
  private resultItems: List;
  constructor() {
    this.resultItems = list("div.result-section", SearchResultItem);
    const resultFilters = new SearchResultFilter(projectList, this.filter.bind(this));
    this.el = el("div.result-section-container", resultFilters, this.resultItems);
  }
  update(data: MatchGroup[]): void {
    this.data = data;
    this.resultItems.update(this.data);
  }
  private filter(filters: string[]): void {
    this.resultItems.update(
      this.data.filter((k) => filters.includes(k.project.toLowerCase())),
    );
  }
}

interface ProjectSuggestion {
  project: string;
  links: [string, string][];
}

class ProjectRecommendations {
  el: HTMLElement;
  private projectTitle: HTMLElement;
  private links: HTMLAnchorElement[];
  constructor() {
    this.links = Array.from({ length: 4 }, () =>
      el("a.suggested-project-link") as HTMLAnchorElement,
    );
    const projectLinks = el("div.recommended-navs", ...this.links);
    this.projectTitle = el("div.project-title");
    this.el = el("div.suggested-project", this.projectTitle, projectLinks);
  }
  update(data: ProjectSuggestion): void {
    this.projectTitle.textContent = data.project;
    data.links.forEach(([label, href], i) => {
      const link = this.links[i];
      if (!link) return;
      link.textContent = label;
      link.href = href;
    });
  }
}

// Empty-state suggestions shown before the user types a query.
class ModalSuggest {
  el: HTMLElement;
  constructor() {
    const projectData: ProjectSuggestion[] = [
      {
        project: "Spin",
        links: [
          ["Install", "/install"],
          ["Quickstart", "/quickstart"],
          ["Develop", "/writing-apps"],
          ["Deploy", "/deploying"],
        ],
      },
    ];
    const recommendations = list("div.result-section", ProjectRecommendations);
    recommendations.update(projectData);
    this.el = el("div.result-section-container", recommendations);
  }
}

class SearchModal {
  el: HTMLElement;
  private container: HTMLElement | null;
  private modalSearchBar: HTMLInputElement;
  private searchResults: SearchResult;
  private modalSuggest: ModalSuggest;
  private modal: HTMLElement;
  constructor() {
    this.container = $("#search-modal-container");
    this.modalSearchBar = el("input.modal-search-bar", {
      type: "text",
      spellcheck: false,
      placeholder: "Search Spin Docs",
      oninput: () => this.updateSearch(),
    }) as HTMLInputElement;
    this.searchResults = new SearchResult();
    this.modalSuggest = new ModalSuggest();
    this.modal = el("div.modal-box", {
      onclick: (e: Event) => e.stopPropagation(),
    });
    this.el = el(
      "div.modal-wrapper",
      {
        onclick: () => this.close(),
        onkeydown: (e: KeyboardEvent) => {
          if (e.key !== "Escape") e.stopPropagation();
        },
      },
      this.modal,
    );
  }
  open(): void {
    if (this.container) setStyle(this.container, { display: "block" });
    setStyle(document.body, { overflow: "hidden", height: "100%" });
    this.modalSearchBar.value = "";
    setChildren(this.modal, [this.modalSearchBar, this.modalSuggest]);
    this.modalSearchBar.focus();
    // Kick off (or reuse) the index load; re-run search if the user has typed
    // by the time it resolves.
    ensureIndex().then(() => {
      if (this.modalSearchBar.value) this.updateSearch();
    });
  }
  close(): void {
    if (this.container) setStyle(this.container, { display: "none" });
    setStyle(document.body, { "overflow-y": "auto", height: "auto" });
    setChildren(this.modal, []);
  }
  updateSearch(): void {
    const query = this.modalSearchBar.value;
    if (query === "") {
      setChildren(this.modal, [this.modalSearchBar, this.modalSuggest]);
      return;
    }
    if (!idx) return; // index still loading

    const updatedQuery = query
      .split(" ")
      .map((word) => `${word}^2 ${word}* ${word}~2`)
      .join(" ");

    const groups: Record<string, MatchGroup> = {};
    for (const hit of idx.search(updatedQuery)) {
      if (hit.score < 0.5) continue;
      const doc = meta[hit.ref];
      if (!doc) continue;

      const key = doc.title.replaceAll(" ", "");
      const group = (groups[key] ??= {
        title: doc.title,
        project: doc.project,
        url: doc.subheading === "" ? hit.ref : hit.ref.slice(0, hit.ref.indexOf("#")),
        score: hit.score,
        data: [],
      });
      group.data.push({ subheading: doc.subheading, url: hit.ref });
      group.score = Math.max(group.score, hit.score);
    }

    const matches = Object.values(groups).sort((a, b) => b.score - a.score);
    this.searchResults.update(matches);
    setChildren(this.modal, [this.modalSearchBar, this.searchResults]);
  }
}

const searchModal = new SearchModal();
const searchButton = new SearchButton(searchModal);

export { searchButton, searchModal };
