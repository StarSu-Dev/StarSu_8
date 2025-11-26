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

      // Безопасное выполнение кода структуры
      const module = {};
      new Function(
        "module",
        jsContent.replace("const structure =", "module.exports =")
      )(module);
      window.structure = module.exports;

      return window.structure;
    }
  } catch (error) {
    console.warn(
      "Динамическая структура не найдена, используем статическую:",
      error
    );
  }

  return window.structure || {};
}

// Настройка Markdown рендерера
function setupMarkdownRenderer() {
  if (!window.markdownit) {
    console.error("MarkdownIt not loaded!");
    return null;
  }

  const md = window.markdownit({
    html: true,
    linkify: true,
    typographer: true,
  });

  // Кастомный рендеринг для таблиц
  md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
    return '<div class="table-container"><table class="markdown-table">';
  };

  md.renderer.rules.table_close = function (tokens, idx, options, env, self) {
    return "</table></div>";
  };

  return md;
}

// Инжект стилей для загрузки
function injectLoadingStyles() {
  if (!document.getElementById("loading-styles")) {
    const style = document.createElement("style");
    style.id = "loading-styles";
    style.textContent = `
      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
      }
      .loading-text {
        margin-left: 10px;
        color: var(--text-secondary);
      }
      .error-message {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        margin: 20px 0;
      }
      .error-message button {
        background: var(--accent-secondary);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        margin-top: 10px;
        transition: background 0.3s ease;
      }
      .error-message button:hover {
        background: #3b82f6;
      }
    `;
    document.head.appendChild(style);
  }
}

// Загрузка контента с кэшированием
async function loadContent(itemValue) {
  const content = document.getElementById("content");
  if (!content) return;

  // Инжектим стили если нужно
  injectLoadingStyles();

  // Показываем индикатор загрузки
  content.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <span class="loading-text">Загрузка...</span>
    </div>
  `;

  try {
    let htmlContent = "";

    if (typeof itemValue === "string") {
      // Проверяем кэш
      if (contentCache.has(itemValue)) {
        htmlContent = contentCache.get(itemValue);
      } else {
        const res = await fetch(itemValue);
        if (!res.ok) throw new Error(`Не удалось загрузить: ${itemValue}`);
        const text = await res.text();

        if (!currentMd) {
          throw new Error("Markdown рендерер не инициализирован");
        }

        htmlContent = currentMd.render(text);
        contentCache.set(itemValue, htmlContent);
      }
    } else if (itemValue.type === "card-list") {
      renderCards(itemValue.items);
      return;
    } else if (itemValue.type === "folder") {
      renderFolderContent(itemValue.items, itemValue.name);
      return;
    }

    content.innerHTML = htmlContent;

    // Добавляем индикатор скролла для таблиц на мобильных
    if (window.innerWidth <= 768) {
      addTableScrollIndicators();
    }
  } catch (err) {
    console.error("Ошибка загрузки контента:", err);
    showError(`Ошибка загрузки: ${err.message}`);
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
      loadContent(path);
    });

    grid.appendChild(card);
  }

  content.appendChild(grid);
}

// Функция для отображения содержимого папки
function renderFolderContent(items, folderName) {
  const content = document.getElementById("content");
  if (!content) return;

  content.innerHTML = `<h1>${folderName}</h1>`;

  const grid = document.createElement("div");
  grid.className = "card-grid";

  for (const name in items) {
    const itemValue = items[name];

    const card = document.createElement("div");
    card.className = "card";
    card.textContent = name;

    card.addEventListener("click", () => {
      loadContent(itemValue);
    });

    grid.appendChild(card);
  }

  content.appendChild(grid);
}

// Создание пунктов меню
function createMenuItem(itemName, itemValue, level = 0) {
  const div = document.createElement("div");

  if (typeof itemValue === "string") {
    div.className = "item";
    div.textContent = itemName;
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      // Убираем активный класс у всех элементов
      document.querySelectorAll(".item").forEach((item) => {
        item.classList.remove("active");
      });
      // Добавляем активный класс текущему элементу
      div.classList.add("active");
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

  // Показываем индикатор загрузки
  menu.innerHTML = '<div class="menu-loading">Загрузка структуры...</div>';

  try {
    const currentStructure = await loadDynamicStructure();

    // Очищаем меню
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
    // Показываем все элементы при пустом поиске
    document.querySelectorAll(".section, .item").forEach((el) => {
      el.style.display = "";
      if (el.classList.contains("section")) {
        el.classList.remove("collapsed");
      }
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
      if (hasMatch) {
        el.classList.remove("collapsed");
      }
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
  toggleBtn.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

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

    // Обновляем ARIA атрибуты
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

  // Закрываем меню при клике на ссылку или нажатии Escape
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

  // Закрываем меню при изменении размера окна на десктоп
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && sidebar.classList.contains("active")) {
      closeMenu();
    }
  });
}

// Добавление индикаторов скролла для таблиц
function addTableScrollIndicators() {
  document.querySelectorAll(".table-container").forEach((container) => {
    if (container.scrollWidth > container.clientWidth) {
      container.classList.add("scrollable");
    }
  });
}

// Показать ошибку
function showError(message) {
  const content = document.getElementById("content");
  if (!content) return;

  injectLoadingStyles();

  content.innerHTML = `
    <div class="error-message">
      <h3>Ошибка загрузки</h3>
      <p>${message}</p>
      <button onclick="location.reload()">Перезагрузить страницу</button>
    </div>
  `;
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

  // Инициализируем состояние кнопки очистки
  updateClearButton();
}

// Инициализация приложения
async function init() {
  console.log("Инициализация приложения Starfinder...");

  try {
    // Сначала настраиваем markdown рендерер
    currentMd = setupMarkdownRenderer();

    if (!currentMd) {
      throw new Error(
        "Markdown парсер не загружен. Проверьте подключение к интернету."
      );
    }

    // Инициализация состояния меню
    openState = JSON.parse(localStorage.getItem("sidebarState") || "{}");

    // Настройка поиска
    setupSearch();

    // Строим меню
    await buildMenu();

    // Инициализируем мобильное меню
    initMobileMenu();

    // Показываем приветственный экран
    const content = document.getElementById("content");
    if (content && content.innerHTML.includes("welcome-message")) {
      // Контент уже отображает приветствие, ничего не делаем
    }

    // Обработчик изменения размера окна
    window.addEventListener("resize", addTableScrollIndicators);

    console.log("Приложение Starfinder успешно инициализировано!");
  } catch (error) {
    console.error("Ошибка инициализации:", error);
    showError(`Ошибка инициализации: ${error.message}`);
  }
}

// Стили для меню
function injectMenuStyles() {
  if (!document.getElementById("menu-styles")) {
    const style = document.createElement("style");
    style.id = "menu-styles";
    style.textContent = `
      .menu-loading, .menu-error {
        text-align: center;
        padding: 20px;
        color: var(--text-secondary);
        font-style: italic;
      }
      .menu-error {
        color: #ef4444;
      }
    `;
    document.head.appendChild(style);
  }
}

// Запускаем инициализацию когда DOM загружен
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    injectMenuStyles();
    init();
  });
} else {
  injectMenuStyles();
  init();
}

// Экспорт для тестирования
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    loadContent,
    renderCards,
    filterMenu,
    setupMarkdownRenderer,
  };
}
