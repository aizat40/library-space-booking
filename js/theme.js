(() => {
  "use strict";

  const STORAGE_KEY = "ptta-theme";
  const root = document.documentElement;

  const savedTheme = localStorage.getItem(STORAGE_KEY);
  const initialTheme = savedTheme === "dark" ? "dark" : "light";

  const applyTheme = (theme, persist = false) => {
    const nextTheme = theme === "dark" ? "dark" : "light";
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    if (persist) localStorage.setItem(STORAGE_KEY, nextTheme);

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const darkMode = nextTheme === "dark";
      button.setAttribute("aria-label", darkMode ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("title", darkMode ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("aria-pressed", String(darkMode));
    });
  };

  applyTheme(initialTheme);

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-theme-toggle]");
    if (!toggle) return;
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
  });

  document.addEventListener("DOMContentLoaded", () => applyTheme(root.dataset.theme));

  window.PTTATheme = {
    sync: () => applyTheme(root.dataset.theme),
  };
})();
