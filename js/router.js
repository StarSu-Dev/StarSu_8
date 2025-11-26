// js/router.js
class Router {
  constructor() {
    this.init();
  }

  // Навигация
  navigate(path) {
    window.history.pushState({}, "", path);
    this.handleRoute(path);
  }

  // Обработка маршрута
  handleRoute(path) {
    if (path === "/" || path === "" || path === "/index.html") {
      return;
    }

    // Разделяем путь и якорь
    const [pathWithoutHash, hash] = path.split("#");
    const cleanPath = pathWithoutHash.startsWith("/")
      ? pathWithoutHash.slice(1)
      : pathWithoutHash;
    const segments = cleanPath.split("/").filter((segment) => segment);

    if (segments.length === 0) return;

    this.findAndLoadContent(segments, window.structure, hash);
  }

  // Поиск и загрузка контента
  findAndLoadContent(segments, structure, hash = null) {
    if (!structure || segments.length === 0) return;

    const currentSegment = segments[0].toLowerCase().replace(/-/g, " ");
    const remainingSegments = segments.slice(1);

    for (const [key, value] of Object.entries(structure)) {
      const searchKey = key.toLowerCase();

      if (searchKey === currentSegment) {
        if (remainingSegments.length === 0) {
          // Загружаем контент
          if (typeof value === "string" && window.loadContent) {
            window.loadContent(value, hash);
          } else if (
            value &&
            value.type === "card-list" &&
            window.renderCards
          ) {
            window.renderCards(value.items);
          }
          return;
        } else if (value && value.items) {
          this.findAndLoadContent(remainingSegments, value.items, hash);
          return;
        }
      }
    }
  }

  // Инициализация
  init() {
    window.addEventListener("popstate", () => {
      this.handleRoute(window.location.pathname + window.location.hash);
    });

    // Обработка начального URL
    setTimeout(() => {
      this.handleRoute(window.location.pathname + window.location.hash);
    }, 100);
  }
}

// Глобальная функция для навигации
function navigateTo(path) {
  window.router.navigate(path);
}

// Создаем роутер
window.router = new Router();
window.navigateTo = navigateTo;
