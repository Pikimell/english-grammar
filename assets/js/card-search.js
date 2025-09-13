// Simple client-side filter for main page cards

function normalize(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("card-search");
  const btnClear = document.getElementById("card-search-clear");
  const counter = document.getElementById("card-search-count");
  if (!input) return;

  // Collect all link items grouped by their parent section
  const sections = Array.from(document.querySelectorAll(".container > section"));
  const groups = sections.map((section) => {
    const items = Array.from(section.querySelectorAll("ul.link-grid > li"));
    return { section, items };
  });

  const allItems = groups.flatMap((g) => g.items);
  const itemText = new Map();
  allItems.forEach((li) => {
    const a = li.querySelector("a");
    const text = normalize(a ? a.textContent : li.textContent);
    itemText.set(li, text);
  });

  function applyFilter(q) {
    const query = normalize(q);
    let visibleCount = 0;

    if (!query) {
      // Reset: show all
      allItems.forEach((li) => (li.style.display = ""));
      groups.forEach(({ section, items }) => {
        section.style.display = items.length ? "" : "none";
      });
      counter.textContent = "";
      return;
    }

    // Item-level filtering
    allItems.forEach((li) => {
      const ok = itemText.get(li).includes(query);
      li.style.display = ok ? "" : "none";
      if (ok) visibleCount++;
    });

    // Section-level visibility: hide if no visible items
    groups.forEach(({ section, items }) => {
      const hasVisible = items.some((li) => li.style.display !== "none");
      section.style.display = hasVisible ? "" : "none";
    });

    counter.textContent = `Знайдено: ${visibleCount}`;
  }

  input.addEventListener("input", (e) => applyFilter(e.target.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      applyFilter("");
    }
  });
  btnClear && btnClear.addEventListener("click", () => {
    input.value = "";
    input.focus();
    applyFilter("");
  });
});

