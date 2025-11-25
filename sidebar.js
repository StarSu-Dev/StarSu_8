// Подключаем markdown-it
const md = window.markdownit({ html: true, linkify: true });

// Новая структура — с card-list для Классов, Рас и т.д.
const structure = {
  Справочники: {
    type: "folder",
    items: {
      Классы: {
        type: "card-list",
        items: {
          Механик: "sources/Классы/Механик.md",
          Мистик: "sources/Классы/Мистик.md",
          Техномант: "sources/Классы/Техномант.md",
          Солдат: "sources/Классы/Солдат.md",
          Оператор: "sources/Классы/Оператор.md",
          Охотник: "sources/Классы/Охотник.md",
          "Боец ближнего боя": "sources/Классы/Боец ближнего боя.md",
        },
      },
      Расы: {
        type: "card-list",
        items: {
          Андроид: "sources/Расы/Расы CRB/Андроид.md",
          Человек: "sources/Расы/Расы CRB/Человек.md",
          Касата: "sources/Расы/Расы CRB/Касата.md",
        },
      },
      Навыки: "sources/Навыки.md",
      Черты: "sources/Черты/index.md",
      Темы: "sources/Создание персонажей/Темы.md",
      Снаряжение: {
        type: "card-list",
        items: {
          Броня: "sources/Снаряжение/Броня.md",
          Оружие: "sources/Снаряжение/Оружие.md",
        },
      },
      Звездолёты: "sources/Звездолёты.md",
      "Магия и заклинания": "sources/Заклинания/index.md",
    },
  },
  "Тактические правила": {
    type: "folder",
    items: {
      Бой: "sources/Тактические правила/Бой.md",
      Состояния: "sources/Тактические правила/Состояния.md",
      Передвижение: "sources/Тактические правила/Передвижение.md",
    },
  },
  "Миры игры": {
    type: "folder",
    items: {
      Планеты: "sources/Миры игры/Планеты.md",
      Фракции: "sources/Миры игры/Фракции.md",
      Локации: "sources/Миры игры/Локации.md",
    },
  },
};

const menu = document.getElementById("menu");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearSearch");
const content = document.getElementById("content");

const openState = JSON.parse(localStorage.getItem("sidebarState") || "{}");

// Функция, которая отвечает за отображение контента
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
  }
}

// Функция для отображения карточек в сетке
function renderCards(items) {
  content.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "card-grid";

  // Создаем карточки для всех классов
  for (const name in items) {
    const path = items[name];

    const card = document.createElement("div");
    card.className = "card";
    card.textContent = name;

    card.addEventListener("click", () => {
      if (typeof path === "string") {
        loadContent(path);
      }
    });

    grid.appendChild(card);
  }

  content.appendChild(grid);
}

// Рекурсивное построение меню
function createMenuItem(itemName, itemValue, level = 0) {
  const div = document.createElement("div");

  if (typeof itemValue === "string") {
    // Это файл — обычный пункт
    div.className = "item";
    div.textContent = itemName;
    div.addEventListener("click", () => loadContent(itemValue));
  } else if (itemValue.type === "card-list") {
    // Это список карточек — отображаем карточки
    div.className = "item";
    div.textContent = itemName;
    div.addEventListener("click", () => loadContent(itemValue));
  } else if (itemValue.type === "folder") {
    // Это раздел — сворачиваемый блок
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

function buildMenu() {
  menu.innerHTML = "";
  for (const sectionName in structure) {
    const item = createMenuItem(sectionName, structure[sectionName]);
    menu.appendChild(item);
  }
}

// Поиск
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
      // Это .item
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

// Инициализация
buildMenu();
