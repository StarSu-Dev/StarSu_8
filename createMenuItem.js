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
