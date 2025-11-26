class App {
  constructor() {
    this.init();
  }

  init() {
    // sidebar.js инициализируется сам, но мы привязываем слушатели UI, если нужно
    this.setupEventListeners();
    this.setupRouting();
  }

  setupEventListeners() {
    // Делегирование клика по элементам .item внутри меню (поддержка старых шаблонов)
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!target) return;

      if (
        target.classList.contains("item") ||
        target.classList.contains("card")
      ) {
        const slug = target.dataset.slug;
        if (slug && window.openBySlug) {
          window.openBySlug(slug);
        } else {
          // fallback: если есть data-file
          const file = target.dataset.file;
          if (file && window.loadContent) {
            window.loadContent(file);
          }
        }
      }
    });

    // Hash change -> открываем по слагу
    window.addEventListener("hashchange", () => {
      const hash = (window.location.hash || "").replace(/^#/, "");
      if (hash && window.openBySlug) {
        window.openBySlug(decodeURIComponent(hash));
      }
    });
  }

  setupRouting() {
    // при загрузке проверяем URL (path/hash/query) и просим sidebar открыть нужный элемент
    document.addEventListener("DOMContentLoaded", () => {
      // если sidebar уже экспортировал openBySlug — вызываем его, иначе ждём пару сотен мс
      const tryOpen = () => {
        if (window.openBySlug) {
          // Router/Sidebar сам обработает deep link при инициализации; просто вызываем на всякий случай
          window.openBySlug(
            (window.location.hash || "").replace(/^#/, "") || ""
          );
          return true;
        }
        return false;
      };

      if (!tryOpen()) {
        setTimeout(() => {
          tryOpen();
        }, 200);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Создаем экземпляр приложения (вторичный слой UI)
  new App();
});
