/* ==========================================================================
   app.js
   Entry point: loads state, generates the roadmap, wires navigation and
   global controls, and renders the initial page.
   ========================================================================== */

let AppState = null;

const App = {
  currentPage: "dashboard",

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const target = document.getElementById("page-" + page);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.getAttribute("data-page") === page));
    document.querySelectorAll(".mobile-nav-item").forEach(b => b.classList.toggle("active", b.getAttribute("data-page") === page));

    UI.renderCurrentPage();
    document.getElementById("sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  },

  init() {
    AppState = Storage.load();
    Planner.init(generateDays());

    // Apply theme
    if (AppState.settings.darkMode) {
      document.body.setAttribute("data-theme", "dark");
      document.getElementById("darkToggle").setAttribute("aria-pressed", "true");
    }

    // Sidebar / mobile nav
    document.querySelectorAll(".nav-item, .mobile-nav-item").forEach(btn => {
      btn.addEventListener("click", () => this.navigate(btn.getAttribute("data-page")));
    });

    // Hamburger (mobile sidebar toggle)
    const hamburger = document.getElementById("hamburger");
    const sidebar = document.getElementById("sidebar");
    hamburger.addEventListener("click", () => {
      const open = sidebar.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", String(open));
    });

    // Dark mode toggle
    document.getElementById("darkToggle").addEventListener("click", () => {
      const isDark = document.body.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.body.removeAttribute("data-theme");
        document.getElementById("darkToggle").setAttribute("aria-pressed", "false");
      } else {
        document.body.setAttribute("data-theme", "dark");
        document.getElementById("darkToggle").setAttribute("aria-pressed", "true");
      }
      AppState.settings.darkMode = !isDark;
      Storage.save(AppState);
    });

    // Modal close
    document.getElementById("modalClose").addEventListener("click", () => UI.hideModal());
    document.getElementById("modalOverlay").addEventListener("click", (e) => {
      if (e.target.id === "modalOverlay") UI.hideModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") UI.hideModal();
    });

    // Global search
    const searchInput = document.getElementById("globalSearch");
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => UI.runSearch(searchInput.value), 150);
    });
    document.addEventListener("click", (e) => {
      const wrap = document.querySelector(".search-wrap");
      if (!wrap.contains(e.target)) document.getElementById("searchResults").hidden = true;
    });

    UI.refreshChrome();
    this.navigate("dashboard");
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
