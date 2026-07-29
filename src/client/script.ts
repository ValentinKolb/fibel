export const clientScript = String.raw`
const state = window.__FIBEL__ || {};
const root = document.documentElement;
const themeIcon = (mode) => mode === "dark"
  ? '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.2m0 13.6V21m6.36-15.36-1.55 1.55M7.19 16.81l-1.55 1.55M21 12h-2.2M5.2 12H3m15.36 6.36-1.55-1.55M7.19 7.19 5.64 5.64M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></svg>'
  : '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M21 13.2A7.5 7.5 0 0 1 10.8 3 8.5 8.5 0 1 0 21 13.2Z"/></svg>';
const setTheme = (mode) => {
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  document.cookie = (state.cookieName || "fibel_theme") + "=" + mode + "; Path=/; Max-Age=31536000; SameSite=Lax";
  document.querySelectorAll("[data-theme-icon]").forEach((node) => {
    node.innerHTML = themeIcon(mode);
  });
};

document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  button.addEventListener("click", () => setTheme(root.classList.contains("dark") ? "light" : "dark"));
});

const sidebar = document.querySelector("[data-sidebar]");
const sidebarBackdrop = document.querySelector("[data-sidebar-backdrop]");
const navToggles = document.querySelectorAll("[data-nav-toggle]");
const sidebarScrollKey = sidebar?.dataset.sidebarScrollKey;
const saveSidebarScroll = () => {
  if (!sidebar || !sidebarScrollKey) return;
  try {
    sessionStorage.setItem(sidebarScrollKey, String(sidebar.scrollTop));
  } catch {}
};
let sidebarScrollFrame;
sidebar?.addEventListener("scroll", () => {
  cancelAnimationFrame(sidebarScrollFrame);
  sidebarScrollFrame = requestAnimationFrame(saveSidebarScroll);
}, { passive: true });
document.addEventListener("click", (event) => {
  if (event.target?.closest?.("a[href]")) saveSidebarScroll();
}, { capture: true });
window.addEventListener("pagehide", saveSidebarScroll);
const setSidebar = (open) => {
  sidebar?.classList.toggle("-translate-x-full", !open);
  sidebar?.setAttribute("data-open", open ? "true" : "false");
  sidebarBackdrop?.classList.toggle("hidden", !open);
  navToggles.forEach((button) => button.setAttribute("aria-expanded", open ? "true" : "false"));
};
document.querySelectorAll("[data-nav-toggle]").forEach((button) => {
  button.addEventListener("click", () => setSidebar(sidebar?.getAttribute("data-open") !== "true"));
});
sidebarBackdrop?.addEventListener("click", () => setSidebar(false));

const closeLocaleMenus = () => {
  document.querySelectorAll("[data-locale-menu]").forEach((menu) => {
    const trigger = menu.querySelector("[data-locale-trigger]");
    const list = menu.querySelector("[data-locale-list]");
    trigger?.setAttribute("aria-expanded", "false");
    list?.setAttribute("hidden", "");
  });
};

document.querySelectorAll("[data-locale-menu]").forEach((menu) => {
  const trigger = menu.querySelector("[data-locale-trigger]");
  const list = menu.querySelector("[data-locale-list]");
  const options = () => Array.from(menu.querySelectorAll("[role='option']"));
  const open = () => {
    closeLocaleMenus();
    trigger?.setAttribute("aria-expanded", "true");
    list?.removeAttribute("hidden");
  };
  const close = () => {
    trigger?.setAttribute("aria-expanded", "false");
    list?.setAttribute("hidden", "");
  };

  trigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = trigger.getAttribute("aria-expanded") === "true";
    isOpen ? close() : open();
  });

  trigger?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
      options()[0]?.focus();
    }
    if (event.key === "Escape") close();
  });

  list?.addEventListener("keydown", (event) => {
    const items = options();
    const index = items.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      trigger?.focus();
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      items[(index + delta + items.length) % items.length]?.focus();
    }
  });
});

document.addEventListener("click", closeLocaleMenus);

const dialog = document.querySelector("[data-search-dialog]");
const input = document.querySelector("[data-search-input]");
const results = document.querySelector("[data-search-results]");
const searchScopes = Array.from(document.querySelectorAll("[data-search-scope]"));
let searchItems = [];
let selectedSearchIndex = -1;
let activeCollection = state.collection || "";
let searchSequence = 0;
const openSearch = () => {
  dialog?.classList.remove("hidden");
  input?.focus();
};
const closeSearch = () => {
  dialog?.classList.add("hidden");
  selectedSearchIndex = -1;
};

document.querySelectorAll("[data-search-open]").forEach((button) => button.addEventListener("click", openSearch));
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) closeSearch();
});
window.addEventListener("keydown", (event) => {
  if (!dialog) return;
  const modK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) {
    event.preventDefault();
    openSearch();
  }
  if (modK) {
    event.preventDefault();
    openSearch();
  }
  if (event.key === "Escape") closeSearch();
});

let searchTimer;
const selectSearchIndex = (nextIndex) => {
  searchItems = Array.from(results?.querySelectorAll("[data-search-result]") || []);
  if (searchItems.length === 0) {
    selectedSearchIndex = -1;
    return;
  }
  selectedSearchIndex = (nextIndex + searchItems.length) % searchItems.length;
  searchItems.forEach((item, index) => {
    const active = index === selectedSearchIndex;
    item.setAttribute("aria-selected", active ? "true" : "false");
    item.classList.toggle("is-active", active);
    if (active) item.scrollIntoView({ block: "nearest" });
  });
};

const emptySearchMessage = () => !state.collections?.length
  ? "Type to search the current language."
  : activeCollection
    ? "Type to search this collection."
    : "Type to search all collections.";

const runSearch = async () => {
  const q = input.value.trim();
  const sequence = ++searchSequence;
  if (!q) {
    results.innerHTML = '<p class="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">' + emptySearchMessage() + '</p>';
    selectedSearchIndex = -1;
    return;
  }
  let url = state.searchUrl + "?locale=" + encodeURIComponent(state.locale) + "&q=" + encodeURIComponent(q);
  if (activeCollection) url += "&collection=" + encodeURIComponent(activeCollection);
  const response = await fetch(url);
  const data = await response.json();
  if (sequence !== searchSequence) return;
  const items = data.results || [];
  results.innerHTML = items.length
    ? items.map((item, index) => {
        const section = !activeCollection && item.collectionLabel
          ? item.collectionLabel + " · " + item.section
          : item.section;
        return '<a class="search-result block rounded-lg px-3 py-3 outline-none hover:bg-zinc-100 dark:hover:bg-white/10" href="' + item.href + '" data-search-result role="option" aria-selected="' + (index === 0 ? "true" : "false") + '"><span class="search-result-section text-xs font-medium">' + escapeText(section) + '</span><strong class="mt-1 block text-zinc-950 dark:text-white">' + escapeText(item.title) + '</strong><span class="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">' + escapeText(item.description) + '</span></a>';
      }).join("")
    : '<p class="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No matches.</p>';
  searchItems = Array.from(results.querySelectorAll("[data-search-result]"));
  selectedSearchIndex = searchItems.length > 0 ? 0 : -1;
  if (selectedSearchIndex === 0) searchItems[0].classList.add("is-active");
};

const scheduleSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 120);
};

input?.addEventListener("input", scheduleSearch);

searchScopes.forEach((button) => {
  button.addEventListener("click", () => {
    clearTimeout(searchTimer);
    activeCollection = button.getAttribute("data-search-scope") || "";
    searchScopes.forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle("is-active", active);
      candidate.setAttribute("aria-pressed", active ? "true" : "false");
    });
    runSearch();
    input?.focus();
  });
});

input?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    selectSearchIndex(selectedSearchIndex + (event.key === "ArrowDown" ? 1 : -1));
  }
  if (event.key === "Enter" && selectedSearchIndex >= 0) {
    event.preventDefault();
    searchItems[selectedSearchIndex]?.click();
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-copy-code], [data-copy-page], [data-copy-markdown], [data-copy-heading]");
  if (!button) return;

  event.preventDefault();

  const text = copyValueForButton(button);
  const icon = button.querySelector(".code-copy-icon, .copy-feedback-icon, .heading-copy-icon");
  const old = icon?.innerHTML;

  try {
    await copyText(text);
    button.setAttribute("data-copied", "true");
    if (icon) icon.innerHTML = '<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>';
    window.setTimeout(() => {
      button.removeAttribute("data-copied");
      if (icon && old) icon.innerHTML = old;
    }, 1200);
  } catch {
    button.setAttribute("data-copy-error", "true");
    window.setTimeout(() => button.removeAttribute("data-copy-error"), 1200);
  }
});

function copyValueForButton(button) {
  const encoded = button.getAttribute("data-copy-code");
  if (encoded) return decodeBase64Utf8(encoded);

  const markdownPath = button.getAttribute("data-copy-markdown");
  if (markdownPath) return absoluteUrl(markdownPath);

  const heading = button.getAttribute("data-copy-heading");
  if (heading) {
    const url = new URL(window.location.href);
    url.hash = heading;
    return url.toString();
  }

  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

function absoluteUrl(path) {
  return new URL(path, window.location.origin).toString();
}

function decodeBase64Utf8(encoded) {
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function copyText(text) {
  let fallbackError;

  try {
    copyWithTextarea(text);
  } catch (error) {
    fallbackError = error;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some embedded browsers expose Clipboard API but reject it without a
      // permission prompt. The synchronous fallback above still covers those.
    }
  }

  if (!fallbackError) return;
  throw fallbackError;
}

function copyWithTextarea(text) {
  const selection = document.getSelection();
  const ranges = [];
  if (selection) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      ranges.push(selection.getRangeAt(index));
    }
  }
  const activeElement = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto 0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const ok = document.execCommand("copy");
  textarea.remove();
  if (selection) {
    selection.removeAllRanges();
    ranges.forEach((range) => selection.addRange(range));
  }
  if (activeElement instanceof HTMLElement) activeElement.focus();
  if (!ok) throw new Error("Copy command failed.");
}

function escapeText(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
`;
