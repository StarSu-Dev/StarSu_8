class App {
  constructor() {
    this.init();
  }

  init() {
    this.renderSidebar();
    this.setupEventListeners();
    this.setupRouting();
  }

  renderSidebar() {
    const menu = document.getElementById("menu");
    if (!menu || !window.structure) return;

    menu.innerHTML = "";

    Object.entries(window.structure).forEach(([name, data]) => {
      if (data.type === "card-list") {
        this.renderCardList(menu, name, data);
      } else {
        this.renderSingleItem(menu, name, data);
      }
    });
  }

  renderCardList(container, name, data) {
    const section = document.createElement("div");
    section.className = "section";
    section.innerHTML = `
      <div class="head">
        <span>${name}</span>
        <span class="chev">▼</span>
      </div>
      <div class="items"></div>
    `;

    const itemsContainer = section.querySelector(".items");

    Object.entries(data.items).forEach(([itemName, itemData]) => {
      if (typeof itemData === "string") {
        const item = document.createElement("div");
        item.className = "item";
        item.textContent = itemName;
        item.dataset.file = itemData;
        // Добавляем data-section для роутинга
        item.dataset.section = this.slugify(name);
        itemsContainer.appendChild(item);
      } else if (itemData.type === "card-list") {
        // Обрабатываем вложенные card-list
        this.renderCardList(itemsContainer, itemName, itemData);
      }
    });

    // Сворачивание секций
    section.querySelector(".head").addEventListener("click", () => {
      section.classList.toggle("collapsed");
    });

    container.appendChild(section);
  }

  renderSingleItem(container, name, filePath) {
    const item = document.createElement("div");
    item.className = "item";
    item.textContent = name;
    item.dataset.file = filePath;
    item.dataset.section = this.slugify(name);
    container.appendChild(item);
  }

  setupEventListeners() {
    // Делегирование событий для элементов меню
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("item") && e.target.dataset.file) {
        const section = e.target.dataset.section;
        const filePath = e.target.dataset.file;

        // Обновляем URL
        window.location.hash = section;

        // Обновляем поисковую строку
        this.updateSearchInput(section);

        // Загружаем контент
        this.loadContent(filePath);

        // Активируем элемент
        this.setActiveItem(e.target);
      }
    });

    // Обработка изменений хеша в URL
    window.addEventListener("hashchange", () => {
      this.handleHashChange();
    });

    // Обработка поиска
    this.setupSearch();
  }

  setupSearch() {
    const searchInput = document.querySelector(".search input");
    const clearButton = document.querySelector(".search button");

    if (searchInput && clearButton) {
      searchInput.addEventListener("input", (e) => {
        this.filterMenuItems(e.target.value);
      });

      clearButton.addEventListener("click", () => {
        searchInput.value = "";
        this.filterMenuItems("");
        searchInput.focus();
      });
    }
  }

  filterMenuItems(searchTerm) {
    const items = document.querySelectorAll(".item");
    const sections = document.querySelectorAll(".section");

    const searchLower = searchTerm.toLowerCase();

    items.forEach((item) => {
      const text = item.textContent.toLowerCase();
      if (text.includes(searchLower)) {
        item.style.display = "block";
        // Показываем родительскую секцию
        const section = item.closest(".section");
        if (section) {
          section.style.display = "block";
          section.classList.remove("collapsed");
        }
      } else {
        item.style.display = "none";
      }
    });

    // Скрываем пустые секции
    sections.forEach((section) => {
      const visibleItems = section.querySelectorAll(
        '.item[style="display: block"]'
      );
      if (visibleItems.length === 0 && searchTerm) {
        section.style.display = "none";
      } else {
        section.style.display = "block";
      }
    });
  }

  setupRouting() {
    // Обрабатываем начальный хеш при загрузке
    this.handleHashChange();
  }

  handleHashChange() {
    const hash = window.location.hash.substring(1); // Убираем #

    if (hash) {
      // Обновляем поисковую строку
      this.updateSearchInput(hash);

      // Находим и активируем соответствующий элемент
      this.activateSection(hash);
    } else {
      // Если хеша нет, показываем приветственную страницу
      this.showWelcomePage();
    }
  }

  updateSearchInput(section) {
    const searchInput = document.querySelector(".search input");
    if (searchInput) {
      // Преобразуем slug обратно в читаемое название
      const readableName = this.unslugify(section);
      searchInput.value = readableName;
      searchInput.placeholder = `Поиск в ${readableName}...`;
    }
  }

  activateSection(sectionSlug) {
    // Находим элемент с соответствующим data-section
    const targetItem = document.querySelector(
      `.item[data-section="${sectionSlug}"]`
    );
    if (targetItem && targetItem.dataset.file) {
      this.setActiveItem(targetItem);
      this.loadContent(targetItem.dataset.file);
    }
  }

  setActiveItem(item) {
    // Снимаем активный класс со всех элементов
    document.querySelectorAll(".item").forEach((i) => {
      i.classList.remove("active");
    });

    // Добавляем активный класс текущему элементу
    item.classList.add("active");

    // Раскрываем родительскую секцию если она свернута
    const section = item.closest(".section");
    if (section) {
      section.classList.remove("collapsed");
    }
  }

  showWelcomePage() {
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `
        <h1>Добро пожаловать в Starfinder!</h1>
        <p>Выберите раздел в боковой панели для начала работы.</p>
        <div class="welcome-info">
          <h2>Доступные разделы:</h2>
          <ul>
            ${Object.keys(window.structure || {})
              .map((section) => `<li>${section}</li>`)
              .join("")}
          </ul>
        </div>
      `;
    }
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/\s+/g, "-") // Заменяем пробелы на дефисы
      .replace(/[^\w\u0400-\u04FF\-]+/g, "") // Разрешаем кириллицу
      .replace(/\-\-+/g, "-") // Заменяем множественные дефисы на один
      .replace(/^-+/, "") // Убираем дефисы с начала
      .replace(/-+$/, ""); // Убираем дефисы с конца
  }

  unslugify(slug) {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  async loadContent(filePath) {
    try {
      // Показываем индикатор загрузки
      document.getElementById("content").innerHTML =
        '<div class="loading">Загрузка...</div>';

      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      this.renderMarkdown(text);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      document.getElementById("content").innerHTML = `
        <div class="error">
          <h2>Ошибка загрузки</h2>
          <p>Не удалось загрузить файл: ${filePath}</p>
        </div>
      `;
    }
  }

  renderMarkdown(text) {
    if (window.markdownit) {
      const md = window.markdownit();
      document.getElementById("content").innerHTML = md.render(text);
    } else {
      document.getElementById("content").innerHTML = `<pre>${text}</pre>`;
    }
  }
}

// Запуск приложения
document.addEventListener("DOMContentLoaded", () => {
  new App();
});
