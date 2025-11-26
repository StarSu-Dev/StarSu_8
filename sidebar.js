// sidebar.js
const contentCache = new Map();
let currentMd = null;
let openState = {};

// Загрузка динамической структуры
async function loadDynamicStructure() {
  try {
    if (window.structure) {
      return window.structure;
    }

    const response = await fetch("structure.js");
    if (response.ok) {
      const jsContent = await response.text();
      const module = {};
      new Function(
        "module",
        jsContent.replace("const structure =", "module.exports =")
      )(module);
      window.structure = module.exports;
      return window.structure;
    }
  } catch (error) {
    console.warn("Динамическая структура не найдена:", error);
  }

  return window.structure || {};
}

// Настройка Markdown рендерера
function setupMarkdownRenderer() {
  if (!window.markdownit) return null;

  const md = window.markdownit({
    html: true,
    linkify: true,
    typographer: true,
  });

  md.renderer.rules.table_open = function () {
    return '<div class="table-container"><table class="markdown-table">';
  };

  md.renderer.rules.table_close = function () {
    return "</table></div>";
  };

  return md;
}

// Загрузка контента с поддержкой якорей
async function loadContent(itemValue, anchor = null) {
  const content = document.getElementById("content");
  if (!content) return;

  content.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <span class="loading-text">Загрузка...</span>
    </div>
  `;

  try {
    let htmlContent = "";

    if (typeof itemValue === "string") {
      if (contentCache.has(itemValue)) {
        htmlContent = contentCache.get(itemValue);
      } else {
        const res = await fetch(itemValue);
        if (!res.ok) throw new Error(`Не удалось загрузить: ${itemValue}`);
        const text = await res.text();
        htmlContent = currentMd.render(text);
        contentCache.set(itemValue, htmlContent);
      }
    } else if (itemValue.type === "card-list") {
      renderCards(itemValue.items);
      return;
    }

    content.innerHTML = htmlContent;

    // Прокрутка к якорю после загрузки
    if (anchor) {
      setTimeout(() => {
        const element =
          document.getElementById(anchor) ||
          document.querySelector(`[name="${anchor}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  } catch (err) {
    console.error("Ошибка загрузки контента:", err);
    content.innerHTML = `<div class="error-message">Ошибка загрузки: ${err.message}</div>`;
  }
}

// Функция для отображения карточек
function renderCards(items) {
  const content = document.getElementById("content");
  if (!content) return;

  content.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "card-grid";

  for (const name in items) {
    const path = items[name];

    const card = document.createElement("div");
    card.className = "card";
    card.textContent = name;

    card.addEventListener("click", () => {
      const routePath = `/${name.toLowerCase().replace(/ /g, "-")}`;
      if (window.navigateTo) {
        window.navigateTo(routePath);
      }
      loadContent(path);
    });

    grid.appendChild(card);
  }

  content.appendChild(grid);
}

// Создание пунктов меню с навигацией
function createMenuItem(itemName, itemValue, level = 0) {
  const div = document.createElement("div");

  if (typeof itemValue === "string") {
    div.className = "item";
    div.textContent = itemName;
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".item").forEach((item) => {
        item.classList.remove("active");
      });
      div.classList.add("active");

      const path = `/${itemName.toLowerCase().replace(/ /g, "-")}`;
      if (window.navigateTo) {
        window.navigateTo(path);
      }
      loadContent(itemValue);
    });
  } else if (itemValue.type === "card-list") {
    div.className = "item";
    div.textContent = itemName;
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".item").forEach((item) => {
        item.classList.remove("active");
      });
      div.classList.add("active");

      const path = `/${itemName.toLowerCase().replace(/ /g, "-")}`;
      if (window.navigateTo) {
        window.navigateTo(path);
      }
      renderCards(itemValue.items);
    });
  } else if (itemValue.type === "folder") {
    div.className = "section";
    const isOpen = openState[`${itemName}-${level}`] !== false;
    if (!isOpen) div.classList.add("collapsed");

    const head = document.createElement("div");
    head.className = "head";
    head.innerHTML = `<span>${itemName}</span><span class="chev">▶</span>`;

    const itemsContainer = document.createElement("div");
    itemsContainer.className = "items";

    for (const subName in itemValue.items) {
      const subItem = createMenuItem(
        subName,
        itemValue.items[subName],
        level + 1
      );
      itemsContainer.appendChild(subItem);
    }

    head.addEventListener("click", (e) => {
      e.stopPropagation();
      div.classList.toggle("collapsed");
      openState[`${itemName}-${level}`] = !div.classList.contains("collapsed");
      localStorage.setItem("sidebarState", JSON.stringify(openState));
    });

    div.appendChild(head);
    div.appendChild(itemsContainer);
  }

  return div;
}

// Построение меню
async function buildMenu() {
  const menu = document.getElementById("menu");
  if (!menu) return;

  menu.innerHTML = '<div class="menu-loading">Загрузка структуры...</div>';

  try {
    const currentStructure = await loadDynamicStructure();
    menu.innerHTML = "";

    if (Object.keys(currentStructure).length === 0) {
      menu.innerHTML = '<div class="menu-error">Структура не найдена</div>';
      return;
    }

    for (const sectionName in currentStructure) {
      const item = createMenuItem(sectionName, currentStructure[sectionName]);
      menu.appendChild(item);
    }
  } catch (error) {
    console.error("Ошибка построения меню:", error);
    menu.innerHTML = '<div class="menu-error">Ошибка загрузки меню</div>';
  }
}

// Поиск по меню
function filterMenu() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  const query = searchInput.value.toLowerCase().trim();

  if (query === "") {
    document.querySelectorAll(".section, .item").forEach((el) => {
      el.style.display = "";
    });
    return;
  }

  document.querySelectorAll(".section, .item").forEach((el) => {
    if (el.classList.contains("section")) {
      const title =
        el.querySelector(".head span")?.textContent.toLowerCase() || "";
      const items = [...el.querySelectorAll(".item")];
      let hasMatch = title.includes(query);

      items.forEach((item) => {
        const isVisible = item.textContent.toLowerCase().includes(query);
        item.style.display = isVisible ? "" : "none";
        if (isVisible) hasMatch = true;
      });

      el.style.display = hasMatch ? "" : "none";
      if (hasMatch) el.classList.remove("collapsed");
    } else {
      const isVisible = el.textContent.toLowerCase().includes(query);
      el.style.display = isVisible ? "" : "none";
    }
  });
}

// Настройка мобильного меню
function initMobileMenu() {
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "mobile-menu-toggle";
  toggleBtn.setAttribute("aria-label", "Открыть меню");
  toggleBtn.innerHTML = `<span></span><span></span><span></span>`;

  const overlay = document.createElement("div");
  overlay.className = "mobile-overlay";

  document.body.appendChild(toggleBtn);
  document.body.appendChild(overlay);

  const sidebar = document.querySelector(".sidebar");

  function toggleMenu() {
    const isActive = toggleBtn.classList.toggle("active");
    sidebar.classList.toggle("active", isActive);
    overlay.classList.toggle("active", isActive);
    document.body.style.overflow = isActive ? "hidden" : "";
    toggleBtn.setAttribute("aria-expanded", isActive);
    toggleBtn.setAttribute(
      "aria-label",
      isActive ? "Закрыть меню" : "Открыть меню"
    );
  }

  function closeMenu() {
    toggleBtn.classList.remove("active");
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("aria-label", "Открыть меню");
  }

  toggleBtn.addEventListener("click", toggleMenu);
  overlay.addEventListener("click", closeMenu);

  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains("active") &&
      e.target.classList.contains("item")
    ) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("active")) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && sidebar.classList.contains("active")) {
      closeMenu();
    }
  });
}

// Очистка поиска
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearch");

  if (!searchInput || !clearBtn) return;

  function updateClearButton() {
    clearBtn.style.display = searchInput.value ? "" : "none";
  }

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    filterMenu();
    updateClearButton();
    searchInput.focus();
  });

  searchInput.addEventListener("input", () => {
    filterMenu();
    updateClearButton();
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      filterMenu();
      updateClearButton();
    }
  });

  updateClearButton();
}

// Инициализация приложения
async function init() {
  try {
    currentMd = setupMarkdownRenderer();
    if (!currentMd) throw new Error("Markdown парсер не загружен");

    openState = JSON.parse(localStorage.getItem("sidebarState") || "{}");
    setupSearch();
    await buildMenu();
    initMobileMenu();

    console.log("Приложение Starfinder успешно инициализировано!");
  } catch (error) {
    console.error("Ошибка инициализации:", error);
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `<div class="error-message">Ошибка инициализации: ${error.message}</div>`;
    }
  }
}

// Запуск
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
