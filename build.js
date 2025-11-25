const fs = require("fs");
const path = require("path");

class StarfinderBuilder {
  constructor() {
    this.sourcesPath = "./sources";
    this.outputFile = "./structure.js";
  }

  build() {
    console.log("🔨 Запуск сборки Starfinder...");

    if (!fs.existsSync(this.sourcesPath)) {
      this.createExampleStructure();
    }

    const structure = this.scanDirectory(this.sourcesPath);
    this.generateStructureFile(structure);

    console.log("✅ Сборка завершена!");
  }

  scanDirectory(dirPath, basePath = "sources") {
    const items = {};

    try {
      const files = fs.readdirSync(dirPath);

      files.forEach((file) => {
        if (file.startsWith(".") || file === "node_modules") return;

        const fullPath = path.join(dirPath, file);
        const relativePath = path.join(basePath, file);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            // Это папка - сканируем и создаем card-list
            const subItems = this.scanDirectory(fullPath, relativePath);
            if (Object.keys(subItems).length > 0) {
              const folderName = this.formatName(file);
              items[folderName] = {
                type: "card-list",
                items: subItems,
              };
            }
          } else if (file.endsWith(".md")) {
            // Это MD файл
            const name = this.formatName(path.basename(file, ".md"));
            items[name] = relativePath;
          }
        } catch (error) {
          console.log(`⚠️ Пропускаем ${file}: ${error.message}`);
        }
      });
    } catch (error) {
      console.error(`Ошибка сканирования ${dirPath}:`, error.message);
    }

    return items;
  }

  formatName(name) {
    if (!name) return "";
    return name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .replace(/\.md$/, "")
      .trim();
  }

  organizeStructure(items) {
    // Собираем все card-list для верхнего уровня
    const topLevelItems = {};

    Object.entries(items).forEach(([name, value]) => {
      if (this.isMainCategory(name)) {
        topLevelItems[name] = {
          type: "card-list",
          items: value.items || value,
        };
      } else {
        topLevelItems[name] = value;
      }
    });

    return {
      Справочники: {
        type: "folder",
        items: topLevelItems,
      },
    };
  }

  isMainCategory(name) {
    const mainCategories = [
      "бестиарий",
      "классы",
      "расы",
      "навыки",
      "черты",
      "темы",
      "снаряжение",
      "звездолёты",
      "заклинания",
      "магия",
      "тактические правила",
      "миры игры",
      "фракции",
      "планеты",
    ];

    const lowerName = name.toLowerCase();
    return mainCategories.some((category) => lowerName.includes(category));
  }

  generateStructureFile(structure) {
    const jsContent = `// Auto-generated structure for Starfinder
// Generated: ${new Date().toISOString()}

const structure = ${JSON.stringify(structure, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = structure;
}

if (typeof window !== 'undefined') {
  window.structure = structure;
}`;

    fs.writeFileSync(this.outputFile, jsContent, "utf8");
    console.log("📄 structure.js создан");
    this.printStats(structure);
  }

  printStats(structure) {
    let fileCount = 0;
    let cardListsCount = 0;

    const countItems = (obj) => {
      Object.values(obj).forEach((value) => {
        if (typeof value === "string") {
          fileCount++;
        } else if (value && typeof value === "object") {
          if (value.type === "card-list") {
            cardListsCount++;
            fileCount += Object.keys(value.items).length;
          } else if (value.type === "folder") {
            countItems(value.items);
          }
        }
      });
    };

    countItems(structure);
    console.log("📊 Статистика:");
    console.log(`   📄 Файлов: ${fileCount}`);
    console.log(`   🎯 Разделов с карточками: ${cardListsCount}`);

    // Показываем основные разделы
    if (structure.Справочники && structure.Справочники.items) {
      const sections = Object.keys(structure.Справочники.items).filter(
        (name) => structure.Справочники.items[name].type === "card-list"
      );
      console.log(`   📋 Основные разделы: ${sections.join(", ")}`);
    }
  }

  createExampleStructure() {
    console.log("📝 Создаем примерную структуру...");

    const exampleFiles = {
      // Бестиарий - card-list с существами
      "Бестиарий/Вампир.md": "# Вампир\n\nОпасное ночное существо...",
      "Бестиарий/Дракон.md": "# Дракон\n\nМогучее крылатое существо...",
      "Бестиарий/Гоблин.md": "# Гоблин\n\nМелкое хитрое существо...",

      // Классы - card-list с классами
      "Классы/Механик.md": "# Механик\n\nСпециалист по технологиям...",
      "Классы/Солдат.md": "# Солдат\n\nБоевой специалист...",

      // Расы - card-list с расами
      "Расы/Андроид.md": "# Андроид\n\nИскусственная раса...",
      "Расы/Человек.md": "# Человек\n\nУниверсальная раса...",

      // Одиночные файлы
      "Навыки.md": "# Навыки\n\nСистема навыков персонажа...",
      "Черты.md": "# Черты\n\nЧерты и особенности...",
    };

    Object.entries(exampleFiles).forEach(([filePath, content]) => {
      const fullPath = path.join(this.sourcesPath, filePath);
      const dir = path.dirname(fullPath);

      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content, "utf8");
      console.log(`   📄 Создан: ${filePath}`);
    });
  }
}

// Запуск
if (require.main === module) {
  const builder = new StarfinderBuilder();
  builder.build();
}

module.exports = StarfinderBuilder;
