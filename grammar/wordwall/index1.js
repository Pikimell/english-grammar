const container = document.querySelector(".js-wordwall-tasks");

const items = [
  "https://wordwall.net/embed/c29fc725f7a54ab588b3fd0ed2504db9",
  "https://wordwall.net/embed/477349934c1946aa9558e62a4bbca8e7",
  "https://wordwall.net/embed/17b88107e1e94774b493decf13c6ae07",
  "https://wordwall.net/embed/592ab360dba44221839b4929c9e143ca",
  "https://wordwall.net/embed/2eaef2e541ae4a54988847b2d69a1899",
  "https://wordwall.net/embed/120a396837704425a6823acb9550ca25",
  "https://wordwall.net/embed/120a396837704425a6823acb9550ca25",
  "https://wordwall.net/embed/f4f8b15f3b794842afc2d38b2c71f2e9",
];

function prepareUrl(url, themeId = 55) {
  return url + `?themeId=${themeId}&templateId=5&fontStackId=0`;
}

function itemTemplate(url) {
  const fullUrl = prepareUrl(url);

  return `<iframe
            style="max-width: 100%"
            src="${fullUrl}"
            width="${500 * 2}"
            height="${380 * 2}"
            frameborder="0"
            allowfullscreen
          ></iframe>`;
}

function itemsTemplate(arr) {
  return arr.map(itemTemplate).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const markup = itemsTemplate(items);
  container.innerHTML = markup;
});
