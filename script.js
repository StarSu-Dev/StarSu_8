const md = window.markdownit({ html: true, linkify: true });

document.querySelectorAll("#sidebar a").forEach((link) => {
  link.addEventListener("click", async (event) => {
    event.preventDefault();

    const file = event.target.dataset.file;

    const response = await fetch(file);
    const text = await response.text();

    document.getElementById("content").innerHTML = md.render(text);
  });
});
