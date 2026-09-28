// Theme bootstrap. This is built as its own entry point and inlined into the
// document <head> (see esbuild.mjs -> templates/asset_theme.hbs) so the saved
// theme is applied *before first paint* — loading it with the main bundle at
// the end of <body> would cause a flash of the wrong theme on every page load.

type Theme = "dark" | "light";

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light";
}

function setTheme(mode: Theme): void {
  localStorage.setItem("theme", mode);
  savedTheme = mode;
  document.documentElement.classList.toggle("dark-theme", mode === "dark");
}

const systemTheme: Theme = window.matchMedia("(prefers-color-scheme: dark)")
  .matches
  ? "dark"
  : "light";

// The default theme is the system theme, unless the user has explicitly
// overridden it.
const stored = localStorage.getItem("theme");
let savedTheme: Theme = isTheme(stored) ? stored : systemTheme;
setTheme(savedTheme);

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector<HTMLElement>(".dark-mode");
  btn?.addEventListener("click", () => {
    setTheme(savedTheme === "dark" ? "light" : "dark");
  });
});

// Follow the system theme when it changes.
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (event) => {
    setTheme(event.matches ? "dark" : "light");
  });

// Keep in sync when another tab changes the theme.
window.addEventListener("storage", () => {
  const next = localStorage.getItem("theme");
  if (isTheme(next)) {
    setTheme(next);
  }
});
