// Подключаем markdown-it
const md = window.markdownit({ html: true, linkify: true });

// Новая структура меню — плоская, 1 уровень вложенности
const structure = {
  Справочники: {
    type: "folder",
    items: {
      Классы: "Классы/index.md",
      Расы: "Расы/Расы CRB/index.md",
      Навыки: "Навыки.md",
      Черты: "Черты/index.md",
      Темы: "Создание персонажей/Темы.md",
      Снаряжение: "Снаряжение/index.md",
      Звездолёты: "Звездолёты.md",
      "Магия и заклинания": "Заклинания/index.md",
    },
  },
  "Тактические правила": {
    type: "folder",
    items: {
      Бой: "Тактические правила/Бой.md",
      Состояния: "Тактические правила/Состояния.md",
      Передвижение: "Тактические правила/Передвижение.md",
    },
  },
  "Миры игры": {
    type: "folder",
    items: {
      Планеты: "Миры игры/Планеты.md",
      Фракции: "Миры игры/Фракции.md",
      Локации: "Миры игры/Локации.md",
    },
  },
};

const menu = document.getElementById("menu");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearSearch");
const content = document.getElementById("content");

const openState = JSON.parse(localStorage.getItem("sidebarState") || "{}");

// Загружаем Markdown → HTML
async function loadMarkdown(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load: ${path}`);
    const text = await res.text();
    content.innerHTML = md.render(text);
  } catch (err) {
    console.error(err);
    content.innerHTML = `<p>Ошибка загрузки: ${path}</p>`;
  }
}

// Рекурсивное построение меню
function createMenuItem(itemName, itemValue, level = 0) {
  const div = document.createElement("div");

  if (typeof itemValue === "string") {
    // Это файл — обычный пункт
    div.className = "item";
    div.textContent = itemName;
    div.addEventListener("click", () => loadMarkdown(itemValue));
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
