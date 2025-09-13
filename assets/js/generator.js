// UI to generate a new practice task via ChatGPT and append to the page
import { generateTask } from "../../api/chatGpt.js";

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const ch of children) {
    if (ch == null) continue;
    node.appendChild(typeof ch === "string" ? document.createTextNode(ch) : ch);
  }
  return node;
}

function attachToolbar(topic = "Present Simple") {
  const root = document.getElementById("practice");
  if (!root) return;

  const bar = el(
    "div",
    {
      class: "gen-toolbar",
      style:
        "display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 2px;",
    },
    el("strong", {}, "Генератор завдань:"),
    el(
      "select",
      { id: "gen-type", style: "padding:6px;border:1px solid #cbd5e1;border-radius:6px;" },
      ...[
        ["mcq", "MCQ — вибір відповіді"],
        ["gap", "Gap — заповни пропуски"],
        ["transform", "Transform — перетвори"],
        ["match", "Match — зістав"],
        ["error", "Error — виправ помилки"],
        ["order", "Order — порядок слів"],
        ["short", "Short — короткі відповіді"],
        ["writing", "Writing — міні-письмо"],
      ].map(([val, text]) => {
        const o = document.createElement("option");
        o.value = val;
        o.textContent = text;
        return o;
      })
    ),
    el("input", {
      id: "gen-count",
      type: "number",
      min: "1",
      max: "20",
      value: "10",
      style: "width:72px;padding:6px;border:1px solid #cbd5e1;border-radius:6px;",
    }),
    el(
      "button",
      { id: "gen-btn", class: "btn primary", type: "button" },
      "Згенерувати"
    ),
    el("span", { id: "gen-status", class: "muted", style: "margin-left:6px;color:#475569;" })
  );

  // Insert toolbar at the top of the practice section
  if (root.firstChild) root.insertBefore(bar, root.firstChild);
  else root.appendChild(bar);

  async function onClick() {
    const btn = document.getElementById("gen-btn");
    const type = document.getElementById("gen-type").value;
    const count = parseInt(document.getElementById("gen-count").value, 10) || 10;
    const status = document.getElementById("gen-status");

    if (!localStorage.getItem("gptToken")) {
      status.textContent = "Додай gptToken у localStorage (ключ gptToken).";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Генерую...";
    status.textContent = "";
    try {
      const task = await generateTask(topic, type, { items: count, language: "uk", seedId: "ps" });
      if (!task || !task.type) throw new Error("Невірний формат відповіді");
      if (window.practice && typeof window.practice.appendTask === "function") {
        window.practice.appendTask(task);
        status.textContent = "Додано ✔";
      } else {
        status.textContent = "Не знайдено рендерер practice.";
      }
    } catch (e) {
      console.error(e);
      status.textContent = "Помилка генерації";
    } finally {
      btn.disabled = false;
      btn.textContent = "Згенерувати";
    }
  }

  document.getElementById("gen-btn").addEventListener("click", onClick);
}

document.addEventListener("DOMContentLoaded", () => {
  // Try to detect topic from H1, fallback to Present Simple
  const h1 = document.querySelector("h1");
  const topic = h1 ? h1.textContent.replace(/\s+—.*/, "").trim() : "Present Simple";
  attachToolbar(topic || "Present Simple");
});

