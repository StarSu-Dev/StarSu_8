const md = window.markdownit({ html: true, linkify: true });

const menu = document.getElementById("menu");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearSearch");
const content = document.getElementById("content");

const openState = JSON.parse(localStorage.getItem("sidebarState") || "{}");

// Функция для загрузки динамической структуры
async function loadDynamicStructure() {
  try {
    if (window.structure) {
      return window.structure;
    }

    const response = await fetch("structure.js");
    if (response.ok) {
      const jsContent = await response.text();
      eval(jsContent);
      return window.structure;
    }
  } catch (error) {
    console.warn("Динамическая структура не найдена, используем статическую");
  }

  return structure;
}

// Функция загрузки контента
async function loadContent(itemValue) {
  if (typeof itemValue === "string") {
    try {
      const res = await fetch(itemValue);
      if (!res.ok) throw new Error(`Failed to load: ${itemValue}`);
      const text = await res.text();
      content.innerHTML = md.render(text);
    } catch (err) {
      console.error(err);
      content.innerHTML = `<p>Ошибка загрузки: ${itemValue}</p>`;
    }
  } else if (itemValue.type === "card-list") {
    renderCards(itemValue.items);
  } else if (itemValue.type === "folder") {
    // Если кликнули на папку, показываем её содержимое как карточки
    renderFolderContent(itemValue.items, itemValue.name);
  }
}

// Функция для отображения карточек в ОСНОВНОМ КОНТЕНТЕ
function renderCards(items) {
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

// Функция для отображения содержимого папки как карточки
function renderFolderContent(items, folderName) {
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

// Рекурсивное построение меню в САЙДБАРЕ
function createMenuItem(itemName, itemValue, level = 0) {
  const div = document.createElement("div");

  if (typeof itemValue === "string") {
    // Файл - клик загружает контент
    div.className = "item";
    div.textContent = itemName;
    div.addEventListener("click", () => loadContent(itemValue));
  } else if (itemValue.type === "card-list") {
    // Список карточек - клик показывает карточки в основном контенте
    div.className = "item";
    div.textContent = itemName;
    div.addEventListener("click", () => renderCards(itemValue.items));
  } else if (itemValue.type === "folder") {
    // Папка - сворачиваемый блок в сайдбаре
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

    head.addEventListener("click", () => {
      div.classList.toggle("collapsed");
      openState[`${itemName}-${level}`] = !div.classList.contains("collapsed");
      localStorage.setItem("sidebarState", JSON.stringify(openState));
    });

    div.appendChild(head);
    div.appendChild(itemsContainer);
  }

  return div;
}

// Построение меню в САЙДБАРЕ
async function buildMenu() {
  menu.innerHTML = "";

  const currentStructure = await loadDynamicStructure();

  for (const sectionName in currentStructure) {
    const item = createMenuItem(sectionName, currentStructure[sectionName]);
    menu.appendChild(item);
  }
}

// Поиск по меню в САЙДБАРЕ
function filterMenu() {
  const q = searchInput.value.toLowerCase();

  document.querySelectorAll(".section, .item").forEach((el) => {
    if (el.classList.contains("section")) {
      const title = el.querySelector(".head span").textContent.toLowerCase();
      const items = [...el.querySelectorAll(".item")];
      let match = title.includes(q);
      items.forEach((item) => {
        const visible = item.textContent.toLowerCase().includes(q);
        item.style.display = visible ? "" : "none";
        if (visible) match = true;
      });
      el.style.display = match ? "" : "none";
    } else {
      const visible = el.textContent.toLowerCase().includes(q);
      el.style.display = visible ? "" : "none";
    }
  });
}

clearBtn.onclick = () => {
  searchInput.value = "";
  filterMenu();
};

searchInput.addEventListener("input", filterMenu);

// Управление мобильным меню
function initMobileMenu() {
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "mobile-menu-toggle";
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
    toggleBtn.classList.toggle("active");
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
    document.body.style.overflow = sidebar.classList.contains("active")
      ? "hidden"
      : "";
  }

  toggleBtn.addEventListener("click", toggleMenu);
  overlay.addEventListener("click", toggleMenu);

  // Закрываем меню при клике на ссылку
  document.querySelectorAll(".sidebar .item").forEach((item) => {
    item.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        toggleMenu();
      }
    });
  });
}

// Настройка Markdown рендерера для таблиц
function setupMarkdownRenderer() {
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

  // Улучшенный рендеринг ячеек
  md.renderer.rules.th_open = function (tokens, idx, options, env, self) {
    return '<th style="border: 1px solid #374151; padding: 12px; background: #1f2937;">';
  };

  md.renderer.rules.td_open = function (tokens, idx, options, env, self) {
    return '<td style="border: 1px solid #374151; padding: 10px;">';
  };

  return md;
}

// Инициализация
async function init() {
  // Настраиваем markdown рендерер
  window.md = setupMarkdownRenderer();

  // Строим меню
  await buildMenu();

  // Инициализируем мобильное меню
  initMobileMenu();

  // Показываем приветственный экран
  content.innerHTML = `
    <div style="padding: 40px; text-align: center;">
      <h1>Добро пожаловать в Starfinder</h1>
      <p>Выберите раздел в меню слева для просмотра контента.</p>
      <p>Карточки будут отображаться в этой области.</p>
    </div>
  `;
}

// Запускаем инициализацию
init();
