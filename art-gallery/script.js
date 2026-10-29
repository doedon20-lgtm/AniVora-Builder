(() => {
  "use strict";

  const navbar = document.querySelector(".navbar");
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const searchInput = document.getElementById("searchInput");
  const gallery = document.getElementById("galleryGrid");
  const categoryButtons = [...document.querySelectorAll(".category-tab")];
  const cards = [...document.querySelectorAll(".art-card")];
  const emptyState = document.getElementById("emptyState");
  const promptInput = document.getElementById("promptInput");
  const formNote = document.getElementById("formNote");
  let activeCategory = "all";

  // Blur the sticky navigation after the visitor begins scrolling.
  const updateNavbar = () => navbar.classList.toggle("scrolled", window.scrollY > 12);
  updateNavbar();
  window.addEventListener("scroll", updateNavbar, { passive: true });

  // Fade gallery images in once their placeholder image has loaded.
  document.querySelectorAll("img").forEach((img) => {
    const reveal = () => img.classList.add("loaded");
    if (img.complete && img.naturalWidth > 0) reveal();
    else {
      img.addEventListener("load", reveal, { once: true });
      img.addEventListener("error", reveal, { once: true });
    }
  });

  // Mobile navigation menu.
  menuToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    menuToggle.textContent = open ? "×" : "☰";
  });
  navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    menuToggle.textContent = "☰";
  }));

  // Combine category and search filters so they work together.
  function filterGallery() {
    const query = (searchInput.value || "").trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const categoryMatch = activeCategory === "all" || card.dataset.category === activeCategory;
      const prompt = (card.dataset.prompt || "").toLowerCase();
      const tag = (card.querySelector(".art-tag")?.textContent || "").toLowerCase();
      const searchMatch = !query || prompt.includes(query) || tag.includes(query);
      const show = categoryMatch && searchMatch;
      card.hidden = !show;
      if (show) visible++;
    });
    emptyState.hidden = visible !== 0;
  }

  categoryButtons.forEach((button) => button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    categoryButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    filterGallery();
  }));
  searchInput.addEventListener("input", filterGallery);

  // Prompt suggestion chips fill the creator input.
  document.querySelectorAll("[data-prompt].chip").forEach((chip) => chip.addEventListener("click", () => {
    promptInput.value = chip.dataset.prompt;
    promptInput.focus();
    formNote.textContent = "Prompt added. Edit it to make it your own.";
  }));

  // A live image-generation backend is not connected yet; never fake a generated result.
  document.getElementById("promptForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();
    if (!prompt) {
      formNote.textContent = "Add a description first, then you can continue.";
      promptInput.focus();
      return;
    }
    formNote.textContent = "Your prompt is ready. Connect AniVora's image-generation API to generate a real image.";
  });
  promptInput.addEventListener("input", () => { formNote.textContent = ""; });

  // Like buttons keep their own visual and accessible pressed state.
  document.querySelectorAll(".like-button").forEach((button) => button.addEventListener("click", () => {
    const liked = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!liked));
    const count = button.querySelector("span");
    const value = Number(count.textContent) || 0;
    count.textContent = String(Math.max(0, value + (liked ? -1 : 1)));
    button.firstChild.textContent = liked ? "♡ " : "♥ ";
  }));

  // Remix transfers the artwork prompt to the creator rather than pretending to generate.
  document.querySelectorAll(".remix-button").forEach((button) => button.addEventListener("click", () => {
    const card = button.closest(".art-card");
    promptInput.value = card.dataset.prompt || "";
    formNote.textContent = "Prompt remixed into the creator. Tweak it to make a new direction.";
    document.getElementById("create").scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => promptInput.focus({ preventScroll: true }), 350);
  }));

  document.getElementById("resetGallery").addEventListener("click", () => {
    activeCategory = "all";
    searchInput.value = "";
    categoryButtons.forEach((button) => {
      const selected = button.dataset.category === "all";
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    filterGallery();
  });
  document.getElementById("showAllButton").addEventListener("click", () => {
    activeCategory = "all";
    searchInput.value = "";
    categoryButtons.forEach((button) => {
      const selected = button.dataset.category === "all";
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    filterGallery();
  });
  document.querySelectorAll("[data-footer-category]").forEach((link) => link.addEventListener("click", () => {
    activeCategory = link.dataset.footerCategory;
    const button = categoryButtons.find((item) => item.dataset.category === activeCategory);
    if (button) button.click();
  }));

  document.getElementById("year").textContent = new Date().getFullYear();
})();